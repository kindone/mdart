import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, titleEl, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

function svgWrapProcess(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const n = items.length
  const COLS = Math.ceil(Math.sqrt(n * 1.5))
  const TURN_EXT = 32
  const BASE_W = 560
  const W = BASE_W + TURN_EXT * 2
  // Grow box height when any item carries a value so label + subtitle fit cleanly.
  const anyValue = items.some(it => !!it.value)
  // Taller boxes when values exist: value boxH budget grows to 24px so
  // linesAtSize reaches 2 at size 8 (2×10.4=20.8px < 24px).
  const BOX_W = (BASE_W - 16) / COLS - 6, BOX_H = anyValue ? 60 : 44, ROW_GAP = 24
  const rows = Math.ceil(n / COLS)
  const titleH = spec.title ? 28 : 8
  const H = titleH + rows * (BOX_H + ROW_GAP) + 8
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))
  parts.push(`<defs>
    <marker id="bp-r" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><polygon points="0,0 8,4 0,8" fill="${theme.accent}"/></marker>
  </defs>`)

  const positions = items.map((_, i) => {
    const row = Math.floor(i / COLS)
    const col = row % 2 === 0 ? i % COLS : COLS - 1 - (i % COLS)
    const x = TURN_EXT + 8 + col * (BOX_W + 6)
    const y = titleH + 4 + row * (BOX_H + ROW_GAP)
    return { x, y }
  })

  // Per-node fitting: every box shares BOX_W, but each label/value pair is
  // sized independently rather than to the diagram's worst-case label — a
  // short label stays large instead of being dragged down to match a long
  // neighbor. Replaces the old flat BOX_W/6 char-budget truncation.
  const displays = items.map(item => displayLabel(item, { value: !!item.value }))

  items.forEach((item, i) => {
    const { x, y } = positions[i]
    const t = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    const isLast = i === n - 1
    const { url: itmUrl, display: itmDisplay } = displays[i]
    const { fontSize: labelFS, lineHeight: labelLH, results: [{ lines: labelLines, truncated: labelTruncated }] } =
      fitTextToWidthShared([itmDisplay], BOX_W - 8, { maxSize: 10, minSize: 6.5, maxLines: item.value ? 2 : 3, boxH: item.value ? 34 : BOX_H - 8 })
    const valueFitFull = item.value
      ? fitTextToWidthShared([item.value], BOX_W - 8, { maxSize: 9.5, minSize: 6, maxLines: 3, boxH: 30 })
      : null
    const valueFS = valueFitFull?.fontSize ?? 8.5
    const valueLH = valueFitFull?.lineHeight ?? valueFS * 1.3
    const labelTip = labelTruncated ? `<title>${escapeXml(itmDisplay)}</title>` : ''

    let nodeStr = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${BOX_W.toFixed(1)}" height="${BOX_H}" rx="5" fill="${isLast ? theme.accent + '33' : fill + '33'}" stroke="${isLast ? theme.accent : fill}" stroke-width="1.2">${itemTitleTag(item)}</rect>`
    if (item.value) {
      const { lines: valLines, truncated: valTruncated } = valueFitFull!.results[0]
      const valTip = valTruncated ? `<title>${escapeXml(item.value)}</title>` : ''
      const totalTextH = labelLines.length * labelLH + 2 + valLines.length * valueLH
      const labelStartY = y + BOX_H / 2 - totalTextH / 2 + labelLH * 0.8
      const labelSpans = labelLines
        .map((line, li) => `<tspan x="${(x + BOX_W / 2).toFixed(1)}" dy="${li === 0 ? 0 : labelLH.toFixed(1)}">${escapeXml(line)}</tspan>`)
        .join('')
      nodeStr += aWrap(`${labelTip}<text x="${(x + BOX_W / 2).toFixed(1)}" y="${labelStartY.toFixed(1)}" text-anchor="middle" font-size="${labelFS}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${labelSpans}</text>`, itmUrl)
      const valStartY = labelStartY + (labelLines.length - 1) * labelLH + valueLH + 2
      const valSpans = valLines
        .map((line, li) => `<tspan x="${(x + BOX_W / 2).toFixed(1)}" dy="${li === 0 ? 0 : valueLH.toFixed(1)}">${escapeXml(line)}</tspan>`)
        .join('')
      nodeStr += `${valTip}<text x="${(x + BOX_W / 2).toFixed(1)}" y="${valStartY.toFixed(1)}" text-anchor="middle" font-size="${valueFS}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${valSpans}</text>`
    } else {
      const labelStartY = y + BOX_H / 2 - ((labelLines.length - 1) * labelLH) / 2 + labelLH * 0.35
      const labelSpans = labelLines
        .map((line, li) => `<tspan x="${(x + BOX_W / 2).toFixed(1)}" dy="${li === 0 ? 0 : labelLH.toFixed(1)}">${escapeXml(line)}</tspan>`)
        .join('')
      nodeStr += aWrap(`${labelTip}<text x="${(x + BOX_W / 2).toFixed(1)}" y="${labelStartY.toFixed(1)}" text-anchor="middle" font-size="${labelFS}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${labelSpans}</text>`, itmUrl)
    }
    parts.push(wrapItem(nodeStr, i, animate, instrument))

    // Connectors fade in with the destination node they point to.
    if (i < n - 1) {
      const next = positions[i + 1]
      const sameRow = Math.floor(i / COLS) === Math.floor((i + 1) / COLS)
      let connEl: string
      if (sameRow) {
        const row = Math.floor(i / COLS)
        const goRight = row % 2 === 0
        const x1 = goRight ? x + BOX_W + 1 : x - 1
        const x2 = goRight ? next.x - 1 : next.x + BOX_W + 1
        connEl = `<line x1="${x1.toFixed(1)}" y1="${(y + BOX_H / 2).toFixed(1)}" x2="${x2.toFixed(1)}" y2="${(y + BOX_H / 2).toFixed(1)}" stroke="${theme.accent}99" stroke-width="1.5" marker-end="url(#bp-r)"/>`
      } else {
        const row = Math.floor(i / COLS)
        const goRight = row % 2 === 0
        const xPivot = x + (goRight ? BOX_W : 0)
        const yMid1 = y + BOX_H / 2
        const yMid2 = next.y + BOX_H / 2
        const ext = Math.round(TURN_EXT * 0.5)
        const r   = Math.round(ROW_GAP / 3)
        const d   = goRight ? 1 : -1
        const sw  = goRight ? 1 : 0
        const xA  = xPivot + d * ext
        const xB  = xPivot + d * (ext + r)
        const path = [
          `M${xPivot},${yMid1.toFixed(1)}`,
          `H${xA}`,
          `A${r},${r} 0 0,${sw} ${xB},${(yMid1 + r).toFixed(1)}`,
          `V${(yMid2 - r).toFixed(1)}`,
          `A${r},${r} 0 0,${sw} ${xA},${yMid2.toFixed(1)}`,
          `H${xPivot}`
        ].join(' ')
        connEl = `<path d="${path}" fill="none" stroke="${theme.accent}88" stroke-width="2" marker-end="url(#bp-r)"/>`
      }
      parts.push(animate ? `<g class="mdart-arr-n${i + 1}">${connEl}</g>` : connEl)
    }
  })
  if (animate) parts.unshift(seqSpotlightCSS(n, spec))
  return svgWrapProcess(W, H, theme, parts)
}
