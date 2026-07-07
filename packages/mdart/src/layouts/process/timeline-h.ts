import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, titleEl, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared } from '../shared'

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

  const W    = 600
  const PAD  = 34
  const spacing = (W - PAD * 2) / Math.max(n - 1, 1)
  const colW = Math.max(30, spacing - 8)

  // Vertical budget per side of the spine:
  //   tick (18) + label line (11) + up to 2 wrapped value lines (20) + padding
  const titleH  = spec.title ? 30 : 8
  const sideH   = 60
  const SPINE_Y = titleH + sideH
  const H       = titleH + sideH * 2

  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  // Spine with end arrowhead
  parts.push(`<line x1="${PAD}" y1="${SPINE_Y}" x2="${W - PAD}" y2="${SPINE_Y}" stroke="${theme.border}" stroke-width="2"/>`)
  parts.push(`<polygon points="${(W - PAD - 2).toFixed(1)},${(SPINE_Y - 5).toFixed(1)} ${(W - PAD + 6).toFixed(1)},${SPINE_Y} ${(W - PAD - 2).toFixed(1)},${(SPINE_Y + 5).toFixed(1)}" fill="${theme.border}"/>`)

  // Per-node fitting: every column shares colW, but each label/value pair
  // is sized independently rather than to the diagram's worst-case label —
  // a short label stays large instead of being dragged down to match a
  // long neighbor. Replaces the old flat spacing/5.2 char budget.
  const displays = items.map(it => displayLabel(it, { value: !!it.value }))

  const animate = shouldAnimate(spec)
  items.forEach((item, i) => {
    const x    = n === 1 ? W / 2 : PAD + i * spacing
    const t    = n > 1 ? i / (n - 1) : 0
    const fill = i === n - 1 ? theme.accent : lerpColor(theme.primary, theme.secondary, t)
    const above = i % 2 === 0
    const tickStart = above ? SPINE_Y - 6  : SPINE_Y + 6
    const tickEnd   = above ? SPINE_Y - 18 : SPINE_Y + 18
    const { url: itmUrl, display: itmDisplay } = displays[i]
    const { fontSize: labelFS, results: [{ lines: labelLines, truncated: labelTruncated }] } =
      fitTextToWidthShared([itmDisplay], colW, { maxSize: 10, minSize: 6.5, maxLines: 1 })
    const valueFitFull = item.value
      ? fitTextToWidthShared([item.value], colW, { maxSize: 9, minSize: 6, maxLines: 2 })
      : null
    const valueFS = valueFitFull?.fontSize ?? 9
    const valueLines = valueFitFull?.results[0].lines ?? []
    const valueTruncated = valueFitFull?.results[0].truncated ?? false
    const labelTip = labelTruncated ? `<title>${escapeXml(itmDisplay)}</title>` : ''
    const valueTip = valueTruncated ? `<title>${escapeXml(item.value!)}</title>` : ''

    let nodeStr = `<circle cx="${x.toFixed(1)}" cy="${SPINE_Y}" r="6" fill="${fill}">${itemTitleTag(item)}</circle>`
    nodeStr += `<line x1="${x.toFixed(1)}" y1="${tickStart}" x2="${x.toFixed(1)}" y2="${tickEnd}" stroke="${fill}" stroke-width="1"/>`
    if (above) {
      const labelY = tickEnd - 4
      nodeStr += aWrap(`${labelTip}<text x="${x.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" font-size="${labelFS}" fill="${fill}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(labelLines[0])}</text>`, itmUrl)
      const L = valueLines.length
      valueLines.forEach((line, j) => {
        const vy = labelY - 11 - (L - 1 - j) * 10
        nodeStr += `${j === 0 ? valueTip : ''}<text x="${x.toFixed(1)}" y="${vy.toFixed(1)}" text-anchor="middle" font-size="${valueFS}" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(line)}</text>`
      })
    } else {
      const labelY = tickEnd + 12
      nodeStr += aWrap(`${labelTip}<text x="${x.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" font-size="${labelFS}" fill="${fill}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(labelLines[0])}</text>`, itmUrl)
      valueLines.forEach((line, j) => {
        const vy = labelY + 11 + j * 10
        nodeStr += `${j === 0 ? valueTip : ''}<text x="${x.toFixed(1)}" y="${vy.toFixed(1)}" text-anchor="middle" font-size="${valueFS}" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(line)}</text>`
      })
    }
    parts.push(animate ? `<g class="mdart-n${i}">${nodeStr}</g>` : nodeStr)
  })

  if (animate) parts.unshift(seqSpotlightCSS(n, spec))
  return svgWrapProcess(W, H, theme, parts)
}
