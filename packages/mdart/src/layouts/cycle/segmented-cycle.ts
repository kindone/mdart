import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared } from '../shared'

function svgWrap(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const n = items.length
  const W = 440
  const H = 380
  const cx = W / 2
  const cy = H / 2
  const outerR = 120
  const innerR = 60
  const labelR = outerR + 20
  const connectorR = outerR + 5
  const GAP_ANGLE = 0.03

  const animate = shouldAnimate(spec)
  const parts: string[] = []
  if (spec.title) {
    parts.push(`<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="12" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(spec.title)}</text>`)
  }

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

    const path = `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x3.toFixed(1)} ${y3.toFixed(1)} L ${x4.toFixed(1)} ${y4.toFixed(1)} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x1.toFixed(1)} ${y1.toFixed(1)} Z`

    // Label OUTSIDE the wedge
    const midAngle = (startAngle + endAngle) / 2
    const lx = cx + labelR * Math.cos(midAngle)
    const ly = cy + labelR * Math.sin(midAngle)
    const cosA = Math.cos(midAngle)
    const anchor = cosA > 0.3 ? 'start' : cosA < -0.3 ? 'end' : 'middle'
    const { display: lblDisplay, url: lblUrl } = displayLabel(item, { value: true })
    // Labels float outside the ring with plenty of open room (not tightly
    // bounded by a shape like the other cycle types), so segBoxW/H below
    // are generous fixed budgets rather than geometry-derived — still a
    // big improvement over the old flat 14/16-char truncation (fixed
    // font-size 10/9, single line only).
    const segBoxW = 92
    const segBoxH = 40
    const valueFitFull = item.value
      ? fitTextToWidthShared([item.value], segBoxW, { maxSize: 9, minSize: 6.5, maxLines: 1 })
      : null
    const valueFS = valueFitFull?.fontSize ?? 9
    const valueLH = valueFitFull?.lineHeight ?? 9 * 1.3
    const valueFit = valueFitFull?.results[0] ?? null
    const reservedBoxH = valueFit ? Math.max(12, segBoxH - valueLH - 2) : segBoxH
    const { fontSize: labelFS, lineHeight: labelLH, results: [{ lines: labelLines, truncated: labelTruncated }] } =
      fitTextToWidthShared([lblDisplay], segBoxW, {
        maxSize: 10, minSize: 6.5, maxLines: item.value ? 2 : 3, boxH: reservedBoxH,
      })
    const lblTip = labelTruncated ? `<title>${escapeXml(lblDisplay)}</title>` : ''
    const totalH = labelLines.length * labelLH + (valueFit ? valueLH + 2 : 0)

    // Connector line from outer edge to label — included in group as it is part of this wedge
    const cx1 = cx + connectorR * Math.cos(midAngle)
    const cy1 = cy + connectorR * Math.sin(midAngle)

    let nodeStr = ''
    nodeStr += `<path d="${path}" fill="${fill}">${itemTitleTag(item)}</path>`
    nodeStr += `<line x1="${cx1.toFixed(1)}" y1="${cy1.toFixed(1)}" x2="${lx.toFixed(1)}" y2="${ly.toFixed(1)}" stroke="${fill}" stroke-width="1" opacity="0.7"/>`
    let lblContent = lblTip
    labelLines.forEach((line, li) => {
      const ty = ly - totalH / 2 + li * labelLH + labelLH * 0.8
      lblContent += `<text x="${lx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="${anchor}" font-size="${labelFS}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(line)}</text>`
    })
    nodeStr += aWrap(lblContent, lblUrl)
    if (valueFit) {
      const valueTip = valueFit.truncated ? `<title>${escapeXml(item.value!)}</title>` : ''
      const ty = ly - totalH / 2 + labelLines.length * labelLH + valueLH * 0.8
      nodeStr += `${valueTip}<text x="${lx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="${anchor}" font-size="${valueFS}" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(valueFit.lines[0])}</text>`
    }
    parts.push(animate ? `<g class="mdart-n${i}">${nodeStr}</g>` : nodeStr)
  }

  if (animate) parts.unshift(seqSpotlightCSS(n, spec))
  return svgWrap(W, H, theme, parts)
}
