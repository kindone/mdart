import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, contrastColor, renderEmpty, itemTitleTag, displayLabel, shouldAnimate, shouldInstrument, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, FONT_SANS_ATTR } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const n = items.length
  const W = 400
  const H = 360
  const cx = W / 2
  const cy = H / 2
  const outerR = 140
  const innerR = 70
  const GAP_ANGLE = 0.03  // radians gap between wedges

  // Per-node fitting: every wedge spans the same angle (2π/n), so the
  // usable chord width at labelR is identical for every wedge in a given
  // diagram — each label/value pair is still sized independently rather
  // than batched, replacing the old flat 10/12-char truncation (fixed
  // font-size 10/8, single line only, no <title> tooltip so truncated text
  // had no way to be seen in full).
  const angleSpan = (2 * Math.PI) / n - GAP_ANGLE
  const labelRForBox = (outerR + innerR) / 2
  const wedgeBoxW = Math.max(20, 2 * labelRForBox * Math.sin(angleSpan / 2) * 0.85)
  const wedgeBoxH = Math.max(16, (outerR - innerR) * 0.7)

  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  let svgContent = ''

  for (let i = 0; i < n; i++) {
    const item = items[i]
    const startAngle = (2 * Math.PI * i) / n - Math.PI / 2 + GAP_ANGLE / 2
    const endAngle = (2 * Math.PI * (i + 1)) / n - Math.PI / 2 - GAP_ANGLE / 2
    const t = i / (n - 1 || 1)
    const fill = lerpColor(theme.secondary, theme.primary, t)

    const x1 = cx + innerR * Math.cos(startAngle)
    const y1 = cy + innerR * Math.sin(startAngle)
    const x2 = cx + outerR * Math.cos(startAngle)
    const y2 = cy + outerR * Math.sin(startAngle)
    const x3 = cx + outerR * Math.cos(endAngle)
    const y3 = cy + outerR * Math.sin(endAngle)
    const x4 = cx + innerR * Math.cos(endAngle)
    const y4 = cy + innerR * Math.sin(endAngle)

    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0

    const path = `M ${x1} ${y1} L ${x2} ${y2} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x3} ${y3} L ${x4} ${y4} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x1} ${y1} Z`

    // Label at wedge midpoint. Wedge text room is tight; if a value is set
    // we render it as a smaller subtitle just below the label, both within
    // the wedge's labelR ring.
    const midAngle = (startAngle + endAngle) / 2
    const labelR = (outerR + innerR) / 2
    const lx = cx + labelR * Math.cos(midAngle)
    const ly = cy + labelR * Math.sin(midAngle)
    const { display: lblDisplay, url: lblUrl } = displayLabel(item, { value: true })
    const fit = fitLabelValueBlock(lblDisplay, item.value, wedgeBoxW, wedgeBoxH, {
      labelUrl: lblUrl,
      labelMaxSize: 10,
      labelMinSize: 6.5,
      labelMaxLines: 2,
      labelMaxLinesNoValue: 3,
      valueMaxSize: 8,
      valueMinSize: 6,
      valueMaxLines: 1,
      gap: 2,
    })

    svgContent += `<g${animate ? ` class="mdart-n${i}"` : ''}${instrument ? ` data-item-index="${i}"` : ''}>`
    svgContent += `<path d="${path}" fill="${fill}">${itemTitleTag(item)}</path>`
    // Segments have solid fills — pick text colour by fill luminance.
    const textColor = contrastColor(fill)
    svgContent += renderFitBlock(lx, ly, fit, {
      labelFullText: lblDisplay,
      valueFullText: item.value,
      labelFill: textColor,
      valueFill: textColor,
      labelWeight: '600',
      valueExtraAttrs: 'opacity="0.85"',
    })
    svgContent += `</g>`
  }

  // Center label
  if (spec.title) {
    svgContent += `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="12" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(spec.title)}</text>`
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${animate ? seqSpotlightCSS(n, spec) : ''}
    ${svgContent}
  </svg>`
}
