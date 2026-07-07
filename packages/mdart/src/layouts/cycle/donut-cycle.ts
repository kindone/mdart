import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared } from '../shared'

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
    const valueFitFull = item.value
      ? fitTextToWidthShared([item.value], wedgeBoxW, { maxSize: 8, minSize: 6, maxLines: 1 })
      : null
    const valueFS = valueFitFull?.fontSize ?? 8
    const valueLH = valueFitFull?.lineHeight ?? 8 * 1.3
    const valueFit = valueFitFull?.results[0] ?? null
    const reservedBoxH = valueFit ? Math.max(10, wedgeBoxH - valueLH - 2) : wedgeBoxH
    const { fontSize: labelFS, lineHeight: labelLH, results: [{ lines: labelLines, truncated: labelTruncated }] } =
      fitTextToWidthShared([lblDisplay], wedgeBoxW, {
        maxSize: 10, minSize: 6.5, maxLines: item.value ? 2 : 3, boxH: reservedBoxH,
      })
    const labelTip = labelTruncated ? `<title>${escapeXml(lblDisplay)}</title>` : ''
    const totalH = labelLines.length * labelLH + (valueFit ? valueLH + 2 : 0)

    svgContent += `<g${animate ? ` class="mdart-n${i}"` : ''}>`
    svgContent += `<path d="${path}" fill="${fill}">${itemTitleTag(item)}</path>`
    let lblContent = labelTip
    labelLines.forEach((line, li) => {
      const ty = ly - totalH / 2 + li * labelLH + labelLH * 0.8
      lblContent += `<text x="${lx}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="${labelFS}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(line)}</text>`
    })
    svgContent += aWrap(lblContent, lblUrl)
    if (valueFit) {
      const valueTip = valueFit.truncated ? `<title>${escapeXml(item.value!)}</title>` : ''
      const ty = ly - totalH / 2 + labelLines.length * labelLH + valueLH * 0.8
      svgContent += `${valueTip}<text x="${lx}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="${valueFS}" fill="${theme.text}" opacity="0.7" font-family="system-ui,sans-serif">${escapeXml(valueFit.lines[0])}</text>`
    }
    svgContent += `</g>`
  }

  // Center label
  if (spec.title) {
    svgContent += `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="12" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(spec.title)}</text>`
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${animate ? seqSpotlightCSS(n, spec) : ''}
    ${svgContent}
  </svg>`
}
