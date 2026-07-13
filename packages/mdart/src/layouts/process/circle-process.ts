import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, titleEl, renderEmpty, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, roundTextBox, wrapItem, shouldInstrument } from '../shared'

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
  const { w: circleBoxW, h: circleBoxH } = roundTextBox(R)
  const displays = items.map(item => displayLabel(item, { value: !!item.value }))

  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  items.forEach((item, i) => {
    const cx = 16 + i * spacing + spacing / 2
    const cy = titleH + R + 6
    const t = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    const { url: itmUrl, display: itmDisplay } = displays[i]

    const fit = fitLabelValueBlock(itmDisplay, item.value, circleBoxW, circleBoxH, {
      labelUrl: itmUrl,
      labelMaxSize: 10,
      labelMinSize: 6.5,
      labelMaxLines: 3,
      labelMaxLinesNoValue: 3,
      valueMaxSize: 9.5,
      valueMinSize: 6,
      valueMaxLines: 2,
      gap: 3,
    })
    let nodeStr = `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${R}" fill="${fill}33" stroke="${fill}" stroke-width="1.5">${itemTitleTag(item)}</circle>`
    nodeStr += renderFitBlock(cx, cy, fit, {
      labelFullText: itmDisplay,
      valueFullText: item.value,
      labelFill: theme.text,
      valueFill: theme.textMuted,
      labelWeight: '700',
    })
    parts.push(wrapItem(nodeStr, i, animate, instrument))
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
