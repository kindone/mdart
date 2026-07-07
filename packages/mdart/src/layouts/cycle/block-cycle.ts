import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, escapeXml, titleEl, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared } from '../shared'
import { render as renderCircleCycle } from './cycle'

function svgWrap(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  // For odd n, fall back to circle cycle
  const n = items.length
  if (n % 2 !== 0) return renderCircleCycle(spec, theme)

  const W = 560
  const topN = n / 2
  const COLS = topN
  const GAP_X = 28
  const BOX_W = Math.floor((W - 16 - (COLS - 1) * GAP_X) / COLS)
  const BOX_H = 68
  const HEADER_H = 20
  const GAP_Y = 28
  const titleH = spec.title ? 28 : 8
  const H = titleH + 2 * BOX_H + GAP_Y + 8

  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  // Arrowhead marker
  parts.push(`<defs>
    <marker id="bc-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L7,3 L0,6 Z" fill="${theme.primary}"/>
    </marker>
  </defs>`)

  const rowY = [titleH, titleH + BOX_H + GAP_Y]

  // Calculate box positions
  const boxPos: Array<{ x: number; y: number; col: number; row: number }> = []

  // Top row: items 0..topN-1 left to right
  for (let col = 0; col < COLS; col++) {
    const x = 8 + col * (BOX_W + GAP_X)
    boxPos.push({ x, y: rowY[0], col, row: 0 })
  }
  // Bottom row: items topN..n-1 right to left
  for (let col = COLS - 1; col >= 0; col--) {
    const x = 8 + col * (BOX_W + GAP_X)
    boxPos.push({ x, y: rowY[1], col, row: 1 })
  }

  const animate = shouldAnimate(spec)

  // Draw boxes
  for (let i = 0; i < n; i++) {
    const item = items[i]
    const { x, y } = boxPos[i]
    const t = i / (n - 1 || 1)
    const headerFill = lerpColor(theme.primary, theme.secondary, t)

    // Per-node fitting: every box shares BOX_W, so header/body text is sized
    // independently per box rather than a flat 5.0/4.4 px-per-char budget
    // (fixed font-size 10/9). Header stays single-line (HEADER_H=20 leaves
    // no real room to grow lines); body rows are each an independent short
    // text (a child label or the value) rather than one wrapped block, so
    // they're batch-fit together to share one size within this box.
    const headerBoxW = BOX_W - 8
    const bodyBoxW = BOX_W - 12
    // Body shows children OR value; pass shows so ellipsis only fires if attrs are dropped.
    const showsValue = item.children.length > 0 || !!item.value
    const { display: lblDisplay, url: lblUrl } = displayLabel(item, { value: showsValue })
    const { fontSize: headerFS, results: [{ lines: headerLines, truncated: headerTruncated }] } =
      fitTextToWidthShared([lblDisplay], headerBoxW, { maxSize: 10, minSize: 7, maxLines: 1 })
    const headerTip = headerTruncated ? `<title>${escapeXml(lblDisplay)}</title>` : ''

    // Body content: children or value — each its own row, not a wrapped block
    const bodyTexts: string[] = item.children.length > 0
      ? item.children.slice(0, 2).map(c => c.label)
      : (item.value ? [item.value] : [])
    const bodyAreaH = BOX_H - HEADER_H - 4
    const { fontSize: bodyFS, lineHeight: lineH, results: bodyFits } = bodyTexts.length
      ? fitTextToWidthShared(bodyTexts, bodyBoxW, { maxSize: 9, minSize: 6.5, maxLines: 1, boxH: bodyAreaH })
      : { fontSize: 9, lineHeight: 9 * 1.3, results: [] as ReturnType<typeof fitTextToWidthShared>['results'] }

    // Vertically centre the text block inside the body area
    const bodyMidY = y + HEADER_H + (BOX_H - HEADER_H) / 2
    const firstBaselineY = bodyMidY - (bodyFits.length * lineH) / 2 + bodyFS * 0.75  // 0.75 ≈ cap-height ratio

    let nodeStr = ''
    // Box bg — tooltip carries full label/value/attrs even when body shows only one
    nodeStr += `<rect x="${x}" y="${y}" width="${BOX_W}" height="${BOX_H}" rx="5" fill="${theme.surface}" stroke="${headerFill}" stroke-opacity="0.55" stroke-width="1">${itemTitleTag(item)}</rect>`
    // Colored header (top corners rounded)
    nodeStr += `<path d="M ${x + 5} ${y} L ${x + BOX_W - 5} ${y} Q ${x + BOX_W} ${y} ${x + BOX_W} ${y + 5} L ${x + BOX_W} ${y + HEADER_H} L ${x} ${y + HEADER_H} L ${x} ${y + 5} Q ${x} ${y} ${x + 5} ${y} Z" fill="${headerFill}"/>`
    nodeStr += aWrap(`<text x="${x + BOX_W / 2}" y="${y + HEADER_H - 5}" text-anchor="middle" font-size="${headerFS}" fill="#ffffff" font-family="system-ui,sans-serif" font-weight="600">${headerTip}${escapeXml(headerLines[0])}</text>`, lblUrl)
    bodyFits.forEach(({ lines, truncated }, li) => {
      const bodyTip = truncated ? `<title>${escapeXml(bodyTexts[li])}</title>` : ''
      nodeStr += `${bodyTip}<text x="${x + 6}" y="${(firstBaselineY + li * lineH).toFixed(1)}" font-size="${bodyFS}" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(lines[0])}</text>`
    })
    parts.push(animate ? `<g class="mdart-n${i}">${nodeStr}</g>` : nodeStr)
  }

  // Draw arrows between consecutive items (clockwise). Each arrow fades in
  // with its destination node; the closing arrow uses a trailing arrow-only slot.
  for (let i = 0; i < n; i++) {
    const from = boxPos[i]
    const to = boxPos[(i + 1) % n]

    let arrowEl: string
    if (from.row === to.row) {
      // Same row: horizontal arrow
      let x1: number, x2: number, arrowY: number
      if (from.x < to.x) {
        // left to right
        x1 = from.x + BOX_W + 2
        x2 = to.x - 6
        arrowY = from.y + BOX_H / 2
      } else {
        // right to left
        x1 = from.x - 2
        x2 = to.x + BOX_W + 6
        arrowY = from.y + BOX_H / 2
      }
      arrowEl = `<line x1="${x1.toFixed(1)}" y1="${arrowY.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${arrowY.toFixed(1)}" stroke="${theme.primary}" stroke-width="1.5" marker-end="url(#bc-arr)"/>`
    } else {
      // Different rows: vertical arrow (transition between rows)
      const colCenter = from.x + BOX_W / 2
      let y1: number, y2: number
      if (from.row === 0) {
        // going down
        y1 = from.y + BOX_H + 2
        y2 = to.y - 6
      } else {
        // going up
        y1 = from.y - 2
        y2 = to.y + BOX_H + 6
      }
      arrowEl = `<line x1="${colCenter.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${colCenter.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${theme.primary}" stroke-width="1.5" marker-end="url(#bc-arr)"/>`
    }
    const arrIndex = i === n - 1 ? n : i + 1
    parts.push(animate ? `<g class="mdart-arr-n${arrIndex}">${arrowEl}</g>` : arrowEl)
  }

  if (animate) parts.unshift(seqSpotlightCSS(n, spec, { trailingArrowSlot: true }))
  return svgWrap(W, H, theme, parts)
}
