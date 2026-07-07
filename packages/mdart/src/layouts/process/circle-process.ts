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
  const W = 560
  const R = Math.min(40, (W - 16) / n / 2 - 10)
  const titleH = spec.title ? 28 : 8
  const H = titleH + R * 2 + 20
  const spacing = (W - 16) / n
  const arrowColor = theme.accent
  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))
  parts.push(`<defs><marker id="cp-arr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><polygon points="0,0 7,3.5 0,7" fill="${arrowColor}"/></marker></defs>`)

  // Per-node fitting (as opposed to the usual "one shared size for the whole
  // diagram" pattern used elsewhere): every circle here has the same radius,
  // so unlike chevron-process/funnel/segmented-bar there's no varying box
  // width to reconcile — each node's font size is free to depend only on
  // its own label/value length. Short labels ("Design") get to stay large;
  // only the genuinely long one shrinks/wraps. Trade-off: node text sizes
  // may visibly differ across the diagram, unlike the shared-size approach.
  const circleBoxW = Math.max(20, R * 1.6 - 4)
  const circleBoxH = Math.max(14, R * 1.4)  // vertical band, symmetric to the width approximation above
  const displays = items.map(item => displayLabel(item, { value: !!item.value }))

  const animate = shouldAnimate(spec)
  items.forEach((item, i) => {
    const cx = 16 + i * spacing + spacing / 2
    const cy = titleH + R + 6
    const t = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    const { url: itmUrl, display: itmDisplay } = displays[i]

    const valueFit = item.value
      ? fitTextToWidthShared([item.value], circleBoxW, { maxSize: 8, minSize: 6, maxLines: 1 })
      : null
    const reservedBoxH = valueFit ? Math.max(10, circleBoxH - valueFit.lineHeight - 3) : circleBoxH
    const labelFit = fitTextToWidthShared([itmDisplay], circleBoxW, {
      maxSize: 10, minSize: 6.5, maxLines: 3, boxH: reservedBoxH,
    })
    const labelFS = labelFit.fontSize, labelLH = labelFit.lineHeight
    const { lines: labelLines, truncated: labelTruncated } = labelFit.results[0]
    const labelTip = labelTruncated ? `<title>${escapeXml(itmDisplay)}</title>` : ''
    // Centre the whole block (label lines + optional value line) on cy —
    // generalized so it works for any line-count combination the fit above
    // lands on, instead of assuming exactly 1 label line.
    const totalH = labelLines.length * labelLH + (valueFit ? valueFit.lineHeight + 3 : 0)
    let nodeStr = `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${R}" fill="${fill}33" stroke="${fill}" stroke-width="1.5">${itemTitleTag(item)}</circle>`
    let textContent = labelTip
    labelLines.forEach((line, li) => {
      const ty = cy - totalH / 2 + li * labelLH + labelLH * 0.8
      textContent += `<text x="${cx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="${labelFS}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(line)}</text>`
    })
    nodeStr += aWrap(textContent, itmUrl)
    if (valueFit) {
      const { lines: valLines, truncated: valTruncated } = valueFit.results[0]
      const valTip = valTruncated ? `<title>${escapeXml(item.value!)}</title>` : ''
      const ty = cy - totalH / 2 + labelLines.length * labelLH + valueFit.lineHeight * 0.8
      nodeStr += `${valTip}<text x="${cx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="${valueFit.fontSize}" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(valLines[0])}</text>`
    }
    parts.push(animate ? `<g class="mdart-n${i}">${nodeStr}</g>` : nodeStr)
    // Arrow fades in with the destination node it points to.
    if (i < n - 1) {
      const x1 = cx + R + 2, x2 = cx + spacing - R - 6
      const arrEl = `<line x1="${x1.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${cy.toFixed(1)}" stroke="${arrowColor}" stroke-width="2" marker-end="url(#cp-arr)"/>`
      parts.push(animate ? `<g class="mdart-arr-n${i + 1}">${arrEl}</g>` : arrEl)
    }
  })
  if (animate) parts.unshift(seqSpotlightCSS(n, spec))
  return svgWrapProcess(W, H, theme, parts)
}
