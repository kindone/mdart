import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, contrastColor, renderEmpty, itemTitleTag, displayLabel, shouldAnimate, shouldInstrument, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, FONT_SANS_ATTR } from '../shared'

const NODE_W = 100
const NODE_H = 44
const NODE_HW = NODE_W / 2
const NODE_HH = NODE_H / 2
const GAP = 6
const MIN_ARC_SHARE = 0.4
const MIN_R = 140
const MIN_W = 500
const MIN_H = 400
const OUTER_PAD_W = 40
const OUTER_PAD_H = 40
const ARROW_ID = 'cycle-arr'

interface CycleLayout {
  n: number
  radius: number
  width: number
  height: number
  cx: number
  cy: number
  textW: number
  textH: number
}

interface CycleNode {
  item: MdArtItem
  index: number
  angle: number
  x: number
  y: number
  fill: string
  display: ReturnType<typeof displayLabel>
}

function resolveRadius(n: number): number {
  const angularStep = (2 * Math.PI) / n
  return Math.max(MIN_R, Math.ceil((2 * (NODE_HW + GAP)) / (angularStep * (1 - MIN_ARC_SHARE))))
}

function resolveLayout(spec: MdArtSpec): CycleLayout {
  const n = spec.items.length
  const radius = resolveRadius(n)
  const width = Math.max(MIN_W, radius * 2 + NODE_W + OUTER_PAD_W)
  const height = Math.max(MIN_H, radius * 2 + NODE_H + OUTER_PAD_H)
  return {
    n,
    radius,
    width,
    height,
    cx: width / 2,
    cy: height / 2,
    textW: NODE_W - 12,
    textH: NODE_H - 8,
  }
}

function angleFor(index: number, n: number): number {
  return (2 * Math.PI * index) / n - Math.PI / 2
}

function rectEdge(dx: number, dy: number): number {
  const adx = Math.abs(dx)
  const ady = Math.abs(dy)
  if (adx < 1e-9) return NODE_HH
  if (ady < 1e-9) return NODE_HW
  return Math.min(NODE_HW / adx, NODE_HH / ady)
}

function placeNodes(spec: MdArtSpec, layout: CycleLayout, theme: MdArtTheme): CycleNode[] {
  return spec.items.map((item, index) => {
    const angle = angleFor(index, layout.n)
    const t = index / (layout.n - 1 || 1)
    return {
      item,
      index,
      angle,
      x: layout.cx + layout.radius * Math.cos(angle),
      y: layout.cy + layout.radius * Math.sin(angle),
      fill: lerpColor(theme.secondary, theme.primary, t),
      display: displayLabel(item, { value: true }),
    }
  })
}

function renderDefs(theme: MdArtTheme): string {
  return `<defs>
    <marker id="${ARROW_ID}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L7,3 L0,6 Z" fill="${theme.primary}"/>
    </marker>
  </defs>`
}

function renderArc(node: CycleNode, next: CycleNode, layout: CycleLayout, theme: MdArtTheme, animate: boolean): string {
  const t1x = -Math.sin(node.angle)
  const t1y = Math.cos(node.angle)
  const t2x = -Math.sin(next.angle)
  const t2y = Math.cos(next.angle)
  const startAngle = node.angle + (rectEdge(t1x, t1y) + GAP) / layout.radius
  const endAngle = next.angle - (rectEdge(t2x, t2y) + GAP) / layout.radius
  const span = ((endAngle - startAngle) + 4 * Math.PI) % (2 * Math.PI)
  if (span < 0.02) return ''

  const ax1 = layout.cx + layout.radius * Math.cos(startAngle)
  const ay1 = layout.cy + layout.radius * Math.sin(startAngle)
  const ax2 = layout.cx + layout.radius * Math.cos(endAngle)
  const ay2 = layout.cy + layout.radius * Math.sin(endAngle)
  const largeArc = span > Math.PI ? 1 : 0
  const t = node.index / (layout.n - 1 || 1)
  const stroke = lerpColor(theme.secondary, theme.primary, t)
  const arc = `<path d="M${ax1.toFixed(1)},${ay1.toFixed(1)} A${layout.radius},${layout.radius} 0 ${largeArc},1 ${ax2.toFixed(1)},${ay2.toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="4,2" marker-end="url(#${ARROW_ID})"/>`
  const arrIndex = node.index === layout.n - 1 ? layout.n : node.index + 1
  return animate ? `<g class="mdart-arr-n${arrIndex}">${arc}</g>` : arc
}

function renderNode(node: CycleNode, layout: CycleLayout, animate: boolean, instrument: boolean): string {
  const fit = fitLabelValueBlock(node.display.display, node.item.value, layout.textW, layout.textH, {
    labelUrl: node.display.url,
    labelMaxSize: 11,
    labelMinSize: 6.5,
    labelMaxLines: 2,
    valueMaxSize: 9,
    valueMinSize: 6.5,
  })
  const textColor = contrastColor(node.fill)
  return `<g${animate ? ` class="mdart-n${node.index}"` : ''}${instrument ? ` data-item-index="${node.index}"` : ''}>` +
    `<rect x="${(node.x - NODE_HW).toFixed(1)}" y="${(node.y - NODE_HH).toFixed(1)}" width="${NODE_W}" height="${NODE_H}" rx="6" fill="${node.fill}">${itemTitleTag(node.item)}</rect>` +
    renderFitBlock(node.x, node.y, fit, {
      labelFullText: node.display.display,
      valueFullText: node.item.value ?? undefined,
      labelFill: textColor,
      valueFill: textColor,
      labelWeight: '600',
      valueExtraAttrs: 'opacity="0.85"',
      shapeBounds: { x: node.x - NODE_HW, y: node.y - NODE_HH, w: NODE_W, h: NODE_H, label: 'cycle-node' },
    }) +
    `</g>`
}

function renderTitle(spec: MdArtSpec, layout: CycleLayout, theme: MdArtTheme): string {
  if (!spec.title) return ''
  return `<text x="${layout.cx}" y="${layout.cy + 5}" text-anchor="middle" font-size="12" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${escapeXml(spec.title)}</text>`
}

function renderSvg(layout: CycleLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  const animate = shouldAnimate(spec)
  return `<svg viewBox="0 0 ${layout.width} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${layout.width}" height="${layout.height}" fill="${theme.bg}" rx="8"/>
    ${animate ? seqSpotlightCSS(layout.n, spec, { trailingArrowSlot: true }) : ''}
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
    renderDefs(theme),
    ...nodes.map((node, index) => renderArc(node, nodes[(index + 1) % layout.n], layout, theme, animate)),
    ...nodes.map(node => renderNode(node, layout, animate, instrument)),
    renderTitle(spec, layout, theme),
  ].filter(Boolean)

  return renderSvg(layout, spec, theme, parts)
}
