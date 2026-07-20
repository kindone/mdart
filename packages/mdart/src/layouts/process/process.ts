import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import {
  escapeXml,
  lerpColor,
  contrastColor,
  itemTitleTag,
  displayLabel,
  shouldAnimate,
  shouldInstrument,
  seqSpotlightCSS,
  fitLabelValueBlock,
  renderFitBlock,
  FONT_SANS_ATTR,
} from '../shared'

const H_W = 700
const H_PAD = 20
const H_ARROW_W = 18
const H_NODE_H = 60
const H_TITLE_H = 30
const H_MAX_ITEMS = 5

const V_W = 400
const V_ROW_H = 54
const V_PAD = 16
const V_NODE_W = 280
const V_ARROW_H = 16
const V_TITLE_H = 30

interface ProcessNode {
  item: MdArtItem
  index: number
  x: number
  y: number
  w: number
  h: number
  cx: number
  cy: number
  fill: string
  display: ReturnType<typeof displayLabel>
}

interface ProcessLayout {
  width: number
  height: number
  titleH: number
  nodes: ProcessNode[]
  direction: 'horizontal' | 'vertical'
}

function titleHeight(spec: MdArtSpec, direction: ProcessLayout['direction']): number {
  if (!spec.title) return 0
  return direction === 'horizontal' ? H_TITLE_H : V_TITLE_H
}

function renderNoItems(theme: MdArtTheme): string {
  return `<svg viewBox="0 0 400 80" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="80" fill="${theme.bg}" rx="6"/>
    <text x="200" y="44" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>No items</text>
  </svg>`
}

function colorForIndex(index: number, count: number, theme: MdArtTheme): string {
  const t = count > 1 ? index / (count - 1) : 0.5
  return lerpColor(theme.secondary, theme.primary, t)
}

function resolveHorizontalLayout(spec: MdArtSpec, theme: MdArtTheme): ProcessLayout {
  const n = spec.items.length
  const nodeW = Math.min(130, Math.floor((H_W - H_PAD * 2 - H_ARROW_W * (n - 1)) / n))
  const titleH = titleHeight(spec, 'horizontal')
  const height = H_NODE_H + H_PAD * 2 + titleH
  const totalW = n * nodeW + (n - 1) * H_ARROW_W
  const startX = (H_W - totalW) / 2
  const cy = H_PAD + titleH + H_NODE_H / 2
  const displays = spec.items.map(item => displayLabel(item, { value: !!item.value }))
  const nodes = spec.items.map((item, index) => {
    const x = startX + index * (nodeW + H_ARROW_W)
    return {
      item,
      index,
      x,
      y: cy - H_NODE_H / 2,
      w: nodeW,
      h: H_NODE_H,
      cx: x + nodeW / 2,
      cy,
      fill: colorForIndex(index, n, theme),
      display: displays[index],
    }
  })

  return { width: H_W, height, titleH, nodes, direction: 'horizontal' }
}

function resolveVerticalLayout(spec: MdArtSpec, theme: MdArtTheme): ProcessLayout {
  const n = spec.items.length
  const titleH = titleHeight(spec, 'vertical')
  const height = V_PAD + titleH + n * V_ROW_H + (n - 1) * V_ARROW_H + V_PAD
  const nodeX = (V_W - V_NODE_W) / 2
  const displays = spec.items.map(item => displayLabel(item, { value: !!item.value }))
  const nodes = spec.items.map((item, index) => {
    const y = V_PAD + titleH + index * (V_ROW_H + V_ARROW_H)
    return {
      item,
      index,
      x: nodeX,
      y,
      w: V_NODE_W,
      h: V_ROW_H,
      cx: V_W / 2,
      cy: y + V_ROW_H / 2,
      fill: colorForIndex(index, n, theme),
      display: displays[index],
    }
  })

  return { width: V_W, height, titleH, nodes, direction: 'vertical' }
}

function resolveLayout(spec: MdArtSpec, theme: MdArtTheme): ProcessLayout {
  return spec.items.length > H_MAX_ITEMS
    ? resolveVerticalLayout(spec, theme)
    : resolveHorizontalLayout(spec, theme)
}

function renderTitle(spec: MdArtSpec, layout: ProcessLayout, theme: MdArtTheme): string {
  if (!spec.title) return ''
  const y = layout.direction === 'horizontal' ? H_PAD + 16 : V_PAD + 16
  return `<text x="${layout.width / 2}" y="${y}" text-anchor="middle" font-size="13" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(spec.title)}</text>`
}

function renderHorizontalArrow(node: ProcessNode, previous: ProcessNode | undefined): string {
  if (!previous) return ''
  const ax = node.x - H_ARROW_W + 2
  return `<polygon points="${ax},${node.cy - 7} ${ax + H_ARROW_W - 2},${node.cy} ${ax},${node.cy + 7}" fill="${previous.fill}" />`
}

function renderVerticalArrow(node: ProcessNode, previous: ProcessNode | undefined): string {
  if (!previous) return ''
  const ay = node.y - V_ARROW_H + 2
  return `<polygon points="${V_W / 2 - 8},${ay} ${V_W / 2 + 8},${ay} ${V_W / 2},${ay + V_ARROW_H - 2}" fill="${previous.fill}" />`
}

function renderIncomingArrow(node: ProcessNode, previous: ProcessNode | undefined, layout: ProcessLayout): string {
  return layout.direction === 'horizontal'
    ? renderHorizontalArrow(node, previous)
    : renderVerticalArrow(node, previous)
}

function renderNode(node: ProcessNode, previous: ProcessNode | undefined, layout: ProcessLayout, animate: boolean, instrument: boolean): string {
  const fit = fitLabelValueBlock(node.display.display, node.item.value, node.w - (layout.direction === 'vertical' ? 24 : 12), node.h - 12, {
    labelUrl: node.display.url,
    labelMaxSize: 12,
    labelMinSize: 6.5,
    labelMaxLines: 1,
    labelMaxLinesNoValue: 2,
    valueMaxSize: 10.5,
    valueMinSize: 6,
    valueMaxLines: 3,
    valueShare: 0.65,
    gap: 3,
  })
  const attrs = `${animate ? ` class="mdart-n${node.index}"` : ''}${instrument ? ` data-item-index="${node.index}"` : ''}`
  return `<g${attrs}>` +
    renderIncomingArrow(node, previous, layout) +
    `<rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="6" fill="${node.fill}" >${itemTitleTag(node.item)}</rect>` +
    renderFitBlock(node.cx, node.cy, fit, {
      labelFullText: node.display.display,
      valueFullText: node.item.value,
      labelFill: contrastColor(node.fill),
      valueFill: contrastColor(node.fill),
      labelWeight: '600',
      valueExtraAttrs: 'opacity="0.85"',
      shapeBounds: { x: node.x, y: node.y, w: node.w, h: node.h, label: 'process-node' },
    }) +
  '</g>'
}

function renderNodes(layout: ProcessLayout, animate: boolean, instrument: boolean): string[] {
  return layout.nodes.map((node, index) => renderNode(node, layout.nodes[index - 1], layout, animate, instrument))
}

function renderSvg(layout: ProcessLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  const animate = shouldAnimate(spec)
  return `<svg viewBox="0 0 ${layout.width} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${layout.width}" height="${layout.height}" fill="${theme.bg}" rx="8"/>
    ${animate ? seqSpotlightCSS(layout.nodes.length, spec) : ''}
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderNoItems(theme)

  const layout = resolveLayout(spec, theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  return renderSvg(layout, spec, theme, [
    renderTitle(spec, layout, theme),
    ...renderNodes(layout, animate, instrument),
  ].filter(Boolean))
}
