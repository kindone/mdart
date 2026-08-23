import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, titleEl, renderEmpty, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, roundTextBox, wrapItem, shouldInstrument } from '../shared'

const W = 560
const SIDE_PAD = 16
const TITLE_H_WITH_TITLE = 28
const TITLE_H_NO_TITLE = 8
const TOP_GAP = 6
const BOTTOM_PAD = 20
const R_MAX = 40
const R_EXTRA_GAP = 10
const ARROW_ID = 'cp-arr'

interface CircleProcessLayout {
  n: number
  titleH: number
  height: number
  radius: number
  spacing: number
  cy: number
  textW: number
  textH: number
}

interface CircleNode {
  item: MdArtItem
  index: number
  cx: number
  fill: string
  display: ReturnType<typeof displayLabel>
}

function titleHeight(spec: MdArtSpec): number {
  return spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
}

function resolveLayout(spec: MdArtSpec): CircleProcessLayout {
  const n = spec.items.length
  const radius = Math.min(R_MAX, (W - SIDE_PAD) / n / 2 - R_EXTRA_GAP)
  const titleH = titleHeight(spec)
  const { w: textW, h: textH } = roundTextBox(radius)
  return {
    n,
    titleH,
    height: titleH + radius * 2 + BOTTOM_PAD,
    radius,
    spacing: (W - SIDE_PAD) / n,
    cy: titleH + radius + TOP_GAP,
    textW,
    textH,
  }
}

function placeNodes(spec: MdArtSpec, layout: CircleProcessLayout, theme: MdArtTheme): CircleNode[] {
  return spec.items.map((item, index) => {
    const t = layout.n > 1 ? index / (layout.n - 1) : 0
    return {
      item,
      index,
      cx: SIDE_PAD + index * layout.spacing + layout.spacing / 2,
      fill: lerpColor(theme.primary, theme.secondary, t),
      display: displayLabel(item, { value: !!item.value }),
    }
  })
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  return spec.title ? titleEl(W, spec.title, theme) : ''
}

function renderDefs(theme: MdArtTheme): string {
  return `<defs><marker id="${ARROW_ID}" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><polygon points="0,0 7,3.5 0,7" fill="${theme.accent}"/></marker></defs>`
}

function renderCircle(node: CircleNode, layout: CircleProcessLayout): string {
  return `<circle cx="${node.cx.toFixed(1)}" cy="${layout.cy.toFixed(1)}" r="${layout.radius}" fill="${node.fill}28" stroke="${node.fill}" stroke-width="1.5">${itemTitleTag(node.item)}</circle>`
}

function renderText(node: CircleNode, layout: CircleProcessLayout, theme: MdArtTheme): string {
  const fit = fitLabelValueBlock(node.display.display, node.item.value, layout.textW, layout.textH, {
    labelUrl: node.display.url,
    labelMaxSize: 10,
    labelMinSize: 6.5,
    labelMaxLines: 3,
    labelMaxLinesNoValue: 3,
    valueMaxSize: 9.5,
    valueMinSize: 6,
    valueMaxLines: 2,
    gap: 3,
  })
  return renderFitBlock(node.cx, layout.cy, fit, {
    labelFullText: node.display.display,
    valueFullText: node.item.value,
    labelFill: theme.text,
    valueFill: theme.textMuted,
    labelWeight: '700',
    shapeBounds: { x: node.cx - layout.radius, y: layout.cy - layout.radius, w: layout.radius * 2, h: layout.radius * 2, label: 'circle-node' },
  })
}

function renderArrow(node: CircleNode, layout: CircleProcessLayout, theme: MdArtTheme, animate: boolean): string {
  if (node.index >= layout.n - 1) return ''
  const x1 = node.cx + layout.radius + 2
  const x2 = node.cx + layout.spacing - layout.radius - 6
  const arrow = `<line x1="${x1.toFixed(1)}" y1="${layout.cy.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${layout.cy.toFixed(1)}" stroke="${theme.accent}" stroke-width="2" marker-end="url(#${ARROW_ID})"/>`
  return animate ? `<g class="mdart-arr-n${node.index + 1}">${arrow}</g>` : arrow
}

function renderNode(node: CircleNode, layout: CircleProcessLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string[] {
  return [
    wrapItem(renderCircle(node, layout) + renderText(node, layout, theme), node.index, animate, instrument),
    renderArrow(node, layout, theme, animate),
  ].filter(Boolean)
}

function renderSvg(layout: CircleProcessLayout, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${layout.height}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)

  const layout = resolveLayout(spec)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const nodes = placeNodes(spec, layout, theme)
  const parts = [
    ...(animate ? [seqSpotlightCSS(layout.n, spec)] : []),
    renderTitle(spec, theme),
    renderDefs(theme),
    ...nodes.flatMap(node => renderNode(node, layout, theme, animate, instrument)),
  ].filter(Boolean)

  return renderSvg(layout, theme, parts)
}
