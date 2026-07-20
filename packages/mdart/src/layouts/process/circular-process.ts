import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, svgWrap, titleEl, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 500
const H = 440
const TITLE_H_WITH_TITLE = 36
const TITLE_H_NO_TITLE = 8
const OUTER_PAD = 48
const R_MAX = 160
const BOX_W_MAX = 104
const BOX_ARC_RATIO = 0.70
const BOX_H_WITH_VALUE = 56
const BOX_H_NO_VALUE = 36
const BOX_PAD = 8
const ARROW_GAP = 6
const ARROW_ID = 'cp-arr'

interface CircularLayout {
  n: number
  titleH: number
  cx: number
  cy: number
  radius: number
  boxW: number
  boxH: number
  halfW: number
  halfH: number
  textH: number
}

interface CircularNode {
  item: MdArtItem
  index: number
  angle: number
  bx: number
  by: number
  fill: string
  display: ReturnType<typeof displayLabel>
}

/** Radial clearance from centre of a box to its silhouette edge at angle `a`. */
function boxRadius(halfW: number, halfH: number, angle: number): number {
  const cos = Math.abs(Math.cos(angle))
  const sin = Math.abs(Math.sin(angle))
  if (cos < 1e-9) return halfH
  if (sin < 1e-9) return halfW
  return Math.min(halfW / cos, halfH / sin)
}

function resolveLayout(spec: MdArtSpec): CircularLayout {
  const n = spec.items.length
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const radius = Math.min(R_MAX, (H - titleH - OUTER_PAD) / 2)
  const boxW = Math.min(BOX_W_MAX, Math.floor(2 * Math.PI * radius / n * BOX_ARC_RATIO))
  const boxH = spec.items.some(item => !!item.value) ? BOX_H_WITH_VALUE : BOX_H_NO_VALUE
  return {
    n,
    titleH,
    cx: W / 2,
    cy: titleH + (H - titleH) / 2,
    radius,
    boxW,
    boxH,
    halfW: boxW / 2,
    halfH: boxH / 2,
    textH: boxH - BOX_PAD,
  }
}

function angleFor(index: number, n: number): number {
  return (2 * Math.PI * index / n) - Math.PI / 2
}

function placeNodes(spec: MdArtSpec, layout: CircularLayout, theme: MdArtTheme): CircularNode[] {
  return spec.items.map((item, index) => {
    const angle = angleFor(index, layout.n)
    const t = layout.n > 1 ? index / layout.n : 0
    return {
      item,
      index,
      angle,
      bx: layout.cx + layout.radius * Math.cos(angle),
      by: layout.cy + layout.radius * Math.sin(angle),
      fill: lerpColor(theme.primary, theme.secondary, t),
      display: displayLabel(item, { value: !!item.value }),
    }
  })
}

function renderDefs(theme: MdArtTheme): string {
  return `<defs><marker id="${ARROW_ID}" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,1 L7,4 L0,7 Z" fill="${theme.accent}cc"/></marker></defs>`
}

function arrowAngles(node: CircularNode, next: CircularNode, layout: CircularLayout): { start: number, end: number, largeArc: number } | null {
  const offFrom = (boxRadius(layout.halfW, layout.halfH, node.angle + Math.PI / 2) + ARROW_GAP) / layout.radius
  const offTo = (boxRadius(layout.halfW, layout.halfH, next.angle + Math.PI / 2) + ARROW_GAP) / layout.radius
  const start = node.angle + offFrom
  const end = next.angle - offTo
  const arcLen = ((end - start + 4 * Math.PI) % (2 * Math.PI))
  if (arcLen < 0.05) return null
  return { start, end, largeArc: arcLen > Math.PI ? 1 : 0 }
}

function renderArrow(node: CircularNode, next: CircularNode, layout: CircularLayout, theme: MdArtTheme, animate: boolean): string {
  const angles = arrowAngles(node, next, layout)
  if (!angles) return ''
  const x1 = layout.cx + layout.radius * Math.cos(angles.start)
  const y1 = layout.cy + layout.radius * Math.sin(angles.start)
  const x2 = layout.cx + layout.radius * Math.cos(angles.end)
  const y2 = layout.cy + layout.radius * Math.sin(angles.end)
  const arrow = `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${layout.radius},${layout.radius} 0 ${angles.largeArc},1 ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${theme.accent}55" stroke-width="2" marker-end="url(#${ARROW_ID})"/>`
  const arrIndex = node.index === layout.n - 1 ? layout.n : node.index + 1
  return animate ? `<g class="mdart-arr-n${arrIndex}">${arrow}</g>` : arrow
}

function renderShape(node: CircularNode, layout: CircularLayout): string {
  const rx = (node.bx - layout.halfW).toFixed(1)
  const ry = (node.by - layout.halfH).toFixed(1)
  return `<rect x="${rx}" y="${ry}" width="${layout.boxW}" height="${layout.boxH}" rx="7" fill="${node.fill}28" stroke="${node.fill}" stroke-width="1.8">${itemTitleTag(node.item)}</rect>`
}

function renderBadge(node: CircularNode, layout: CircularLayout): string {
  const x = (node.bx - layout.halfW + 5).toFixed(1)
  const y = (node.by - layout.halfH + 9).toFixed(1)
  return `<text x="${x}" y="${y}" font-size="8" fill="${node.fill}" ${FONT_SANS_ATTR} font-weight="800" opacity="0.85">${node.index + 1}</text>`
}

function fitNodeText(node: CircularNode, layout: CircularLayout) {
  return fitLabelValueBlock(node.display.display, node.item.value, layout.boxW - 10, layout.textH, {
    labelMaxSize: 10.5,
    labelMinSize: 6.5,
    labelMaxLines: 2,
    labelMaxLinesNoValue: 3,
    valueMaxSize: 10.5,
    valueMinSize: 6,
    valueMaxLines: 2,
    valueShare: 0.45,
    gap: 0,
  })
}

function renderText(node: CircularNode, layout: CircularLayout, theme: MdArtTheme): string {
  const fit = fitNodeText(node, layout)
  return renderFitBlock(node.bx, node.by, fit, {
    labelFullText: node.display.display,
    valueFullText: node.item.value,
    labelFill: theme.text,
    valueFill: theme.text,
    labelWeight: '600',
    valueExtraAttrs: 'opacity="0.7"',
    shapeBounds: { x: node.bx - layout.halfW, y: node.by - layout.halfH, w: layout.boxW, h: layout.boxH, label: 'circular-node' },
  })
}

function renderNode(node: CircularNode, layout: CircularLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const nodeEl = aWrap(renderShape(node, layout) + renderBadge(node, layout) + renderText(node, layout, theme), node.display.url)
  return wrapItem(nodeEl, node.index, animate, instrument)
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)

  const layout = resolveLayout(spec)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const nodes = placeNodes(spec, layout, theme)
  const parts = [
    ...(animate ? [seqSpotlightCSS(layout.n, spec, { trailingArrowSlot: true })] : []),
    spec.title ? titleEl(W, spec.title, theme) : '',
    renderDefs(theme),
    ...nodes.map((node, index) => renderArrow(node, nodes[(index + 1) % layout.n], layout, theme, animate)),
    ...nodes.map(node => renderNode(node, layout, theme, animate, instrument)),
  ].filter(Boolean)

  return svgWrap(W, H, theme, undefined, parts)
}
