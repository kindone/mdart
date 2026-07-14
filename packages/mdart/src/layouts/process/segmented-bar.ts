import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, titleEl, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, roundedRectPath } from '../shared'

function svgWrapProcess(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const W = 560, BAR_H = 32, LABEL_H = 22
  const titleH = spec.title ? 28 : 8
  const H = titleH + BAR_H + LABEL_H + 20
  const BAR_Y = titleH + 12, PAD = 8
  const BAR_W = W - PAD * 2
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  const weights = items.map(it => parseFloat(it.value ?? '') || 1)
  const total = weights.reduce((s, w) => s + w, 0)

  // Per-node fitting: segment widths vary per item (proportional to
  // weight) — a genuinely varying, per-item width. Sizing every label to
  // the single narrowest segment across the bar would crush the wider
  // segments' text down to whatever the tightest one needs; instead each
  // segment's label is sized to its OWN width.
  const segWidths = weights.map(w => (w / total) * BAR_W)
  const displays = items.map(item => displayLabel(item, { value: true }))
  const pctLabels = items.map((item, i) => item.value ?? Math.round(weights[i] / total * 100) + '%')

  let curX = PAD
  items.forEach((item, i) => {
    const segW = segWidths[i]
    const fitW = Math.max(20, segW - 6)
    const t = items.length > 1 ? i / (items.length - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    const isFirst = i === 0, isLast = i === items.length - 1
    const rl = isFirst ? 5 : 0, rr = isLast ? 5 : 0
    const { url: itmUrl, display: itmDisplay } = displays[i]
    const { fontSize: labelFS, results: [{ lines: labelLines, truncated: labelTruncated }] } =
      fitTextToWidthShared([itmDisplay], fitW, { maxSize: 10, minSize: 6.5, maxLines: 1 })
    const { fontSize: pctFS, results: [{ lines: pctLines, truncated: pctTruncated }] } =
      fitTextToWidthShared([pctLabels[i]], fitW, { maxSize: 9, minSize: 6, maxLines: 1 })
    const labelTip = labelTruncated ? `<title>${escapeXml(itmDisplay)}</title>` : ''
    const pctTip = pctTruncated ? `<title>${escapeXml(pctLabels[i])}</title>` : ''
    // Per-corner rounding keeps only the bar's outer edges rounded; inner segment joins remain flat.
    let segStr = `<path class="mdart-glow-stroke" d="${roundedRectPath(curX, BAR_Y, segW, BAR_H, { tl: rl, bl: rl, tr: rr, br: rr })}" fill="${fill}">${itemTitleTag(item)}</path>`
    const lx = curX + segW / 2
    segStr += aWrap(`${labelTip}<text x="${lx.toFixed(1)}" y="${(BAR_Y + BAR_H / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="${labelFS}" fill="#fff" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(labelLines[0])}</text>`, itmUrl)
    segStr += `${pctTip}<text x="${lx.toFixed(1)}" y="${(BAR_Y + BAR_H + 14).toFixed(1)}" text-anchor="middle" font-size="${pctFS}" fill="${fill}" font-family="system-ui,sans-serif">${escapeXml(pctLines[0])}</text>`
    parts.push(wrapItem(segStr, i, animate, instrument))
    curX += segW
  })
  if (animate) parts.unshift(seqSpotlightCSS(items.length, spec, { scale: false }))
  return svgWrapProcess(W, H, theme, parts)
}
