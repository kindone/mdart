import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, titleEl, renderEmpty, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, wrapItem, shouldInstrument } from '../shared'
import { render as renderVerticalFallback } from './process'

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
  if (n > 6) return renderVerticalFallback(spec, theme)

  const W = 600
  const titleH = spec.title ? 28 : 8
  const ARROW_W = 38
  const BOX_H = 70
  const BOX_W = Math.min(116, Math.floor((W - 20 - (n - 1) * ARROW_W) / n))
  const H = BOX_H + titleH + 32
  const totalW = n * BOX_W + (n - 1) * ARROW_W
  const startX = (W - totalW) / 2
  const bY = titleH + 14

  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  // Per-node fitting: every box shares BOX_W, but each label/value pair is
  // sized independently rather than to the diagram's worst-case label — a
  // short label stays large instead of being dragged down to match a long
  // neighbor.
  //
  // The label fit was also capped at a flat maxLines (2 with a value, 3
  // without) with no boxH — so a smaller font never unlocked an extra line
  // beyond that flat cap, and (worse) that same flat cap applied even at
  // the LARGEST font size, so a 2-3 line label at max size could overflow
  // BOX_H vertically with nothing stopping it. arrowBoxH below gives
  // fitTextToWidthShared the real vertical budget, and raises the ceiling
  // one further (3/4) since BOX_H's 70px comfortably fits more lines once
  // the font is small enough — same mechanism as circle-process/waterfall/
  // chevron-process/funnel.
  const displays = items.map(it => displayLabel(it, { value: !!it.value }))
  const arrowBoxH = BOX_H - 16

  items.forEach((item, i) => {
    const x = startX + i * (BOX_W + ARROW_W)
    const t = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    const cy = bY + BOX_H / 2
    const { url: itmUrl, display: itmDisplay } = displays[i]
    const fit = fitLabelValueBlock(itmDisplay, item.value, BOX_W - 10, arrowBoxH, {
      labelUrl: itmUrl,
      labelMaxSize: 10.5,
      labelMinSize: 6.5,
      labelMaxLines: 3,
      labelMaxLinesNoValue: 4,
      valueMaxSize: 10.5,
      valueMinSize: 6,
      valueMaxLines: 3,
      valueShare: 0.65,
      gap: 4,
    })

    let nodeStr = ''
    nodeStr += `<rect x="${x.toFixed(1)}" y="${bY}" width="${BOX_W}" height="${BOX_H}" rx="7" fill="${fill}28" stroke="${fill}" stroke-width="2">${itemTitleTag(item)}</rect>`
    nodeStr += renderFitBlock(x + BOX_W / 2, cy, fit, {
      labelFullText: itmDisplay,
      valueFullText: item.value,
      labelFill: theme.text,
      valueFill: theme.text,
      labelWeight: '600',
      valueExtraAttrs: 'fill-opacity="0.72"',
    })
    parts.push(wrapItem(nodeStr, i, animate, instrument))

    // Arrow between nodes fades in with its destination node.
    if (i < n - 1) {
      const ax = x + BOX_W + 4
      const arrowH = 30
      const shaftH = Math.round(arrowH * 0.46)
      const headBase = ax + ARROW_W - 20
      const arrEl = `<polygon points="${ax},${(cy - shaftH).toFixed(1)} ${headBase},${(cy - shaftH).toFixed(1)} ${headBase},${(cy - arrowH).toFixed(1)} ${(ax + ARROW_W - 8).toFixed(1)},${cy.toFixed(1)} ${headBase},${(cy + arrowH).toFixed(1)} ${headBase},${(cy + shaftH).toFixed(1)} ${ax},${(cy + shaftH).toFixed(1)}" fill="${fill}99"/>`
      parts.push(animate ? `<g class="mdart-arr-n${i + 1}">${arrEl}</g>` : arrEl)
    }
  })

  if (animate) parts.unshift(seqSpotlightCSS(n, spec))
  return svgWrapProcess(W, H, theme, parts)
}
