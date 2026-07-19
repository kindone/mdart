import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, parseLink, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 580
const H = 420
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 8
const NODE_W = 130
const NODE_H = 44
const NODE_RX = 6
const NODE_TEXT_W = NODE_W - 14
const NODE_TEXT_H = NODE_H - 8
const EDGE_SRC_PAD_X = NODE_W / 2 + 2
const EDGE_SRC_PAD_Y = NODE_H / 2 + 2
const EDGE_DST_PAD_X = NODE_W / 2 + 10
const EDGE_DST_PAD_Y = NODE_H / 2 + 6
const R_BASE = 80
const R_PER_NODE = 18
const R_MIN = 100
const R_PAD_TOP = 12
const R_PAD_X = 8

interface Point {
  x: number
  y: number
}

interface NetworkLayout {
  titleH: number
  labels: string[]
  positions: Point[]
  labelIndex: Map<string, number>
  itemByLabel: Map<string, MdArtItem>
  topLevelLabels: Set<string>
}

function collectLabels(items: MdArtItem[]): string[] {
  const labels = items.map(item => item.label)
  items.forEach(item => {
    item.flowChildren.forEach(child => {
      if (!labels.includes(child.label)) labels.push(child.label)
    })
  })
  return labels
}

function circlePositions(labels: string[], titleH: number): Point[] {
  const cx = W / 2
  const cy = (H + titleH) / 2
  const maxRH = cy - titleH - NODE_H / 2 - R_PAD_TOP
  const maxRW = cx - NODE_W / 2 - R_PAD_X
  const r = Math.min(maxRH, maxRW, Math.max(R_MIN, R_BASE + labels.length * R_PER_NODE))
  return labels.map((_, i) => {
    const angle = (2 * Math.PI * i / labels.length) - Math.PI / 2
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  })
}

function measureNetwork(spec: MdArtSpec): NetworkLayout {
  const labels = collectLabels(spec.items)
  return {
    titleH: spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE,
    labels,
    positions: circlePositions(labels, spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE),
    labelIndex: new Map(labels.map((label, i) => [label, i])),
    itemByLabel: new Map(spec.items.map(item => [item.label, item])),
    topLevelLabels: new Set(spec.items.map(item => item.label)),
  }
}

function renderDefs(theme: MdArtTheme): string {
  return `<defs><marker id="net-arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${theme.textMuted}"/></marker></defs>`
}

function renderEdge(src: Point, dst: Point, theme: MdArtTheme): string {
  const dx = dst.x - src.x, dy = dst.y - src.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const x1 = src.x + (dx / len) * EDGE_SRC_PAD_X
  const y1 = src.y + (dy / len) * EDGE_SRC_PAD_Y
  const x2 = dst.x - (dx / len) * EDGE_DST_PAD_X
  const y2 = dst.y - (dy / len) * EDGE_DST_PAD_Y
  return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${theme.textMuted}99" stroke-width="1.5" marker-end="url(#net-arr)"/>`
}

function renderEdges(spec: MdArtSpec, layout: NetworkLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string[] {
  const edges: string[] = []
  spec.items.forEach(item => {
    const si = layout.labelIndex.get(item.label) ?? -1
    if (si < 0) return
    const src = layout.positions[si]
    item.flowChildren.forEach(child => {
      const ti = layout.labelIndex.get(child.label) ?? -1
      if (ti < 0) return
      edges.push(wrapItem(renderEdge(src, layout.positions[ti], theme), ti, animate, instrument))
    })
  })
  return edges
}

function renderNode(label: string, point: Point, index: number, layout: NetworkLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const isTop = layout.topLevelLabels.has(label)
  const stroke = isTop ? `${theme.accent}bb` : `${theme.muted}aa`
  const fill = isTop ? theme.surface : `${theme.surface}cc`
  const sourceItem = layout.itemByLabel.get(label)
  const { display: labelDisplay, url: labelUrl } = sourceItem
    ? displayLabel(sourceItem, { value: true })
    : parseLink(label)
  const fit = fitLabelValueBlock(labelDisplay, sourceItem?.value, NODE_TEXT_W, NODE_TEXT_H, {
    labelUrl,
    labelMaxSize: 11,
    labelMinSize: 7,
    labelMaxLines: 1,
    labelMaxLinesNoValue: 2,
    valueMaxSize: 9,
    valueMinSize: 7,
    valueMaxLines: 1,
    valueShare: 0.34,
  })
  const unit = [
    `<rect x="${(point.x - NODE_W / 2).toFixed(1)}" y="${(point.y - NODE_H / 2).toFixed(1)}" width="${NODE_W}" height="${NODE_H}" rx="${NODE_RX}" fill="${fill}" stroke="${stroke}" stroke-width="1.2">${sourceItem ? itemTitleTag(sourceItem) : ''}</rect>`,
    renderFitBlock(point.x, point.y, fit, {
      labelFullText: labelDisplay,
      valueFullText: sourceItem?.value,
      labelFill: theme.text,
      valueFill: theme.textMuted,
      labelWeight: '600',
    }),
  ].join('')
  return wrapItem(unit, index, animate, instrument)
}

function renderNodes(layout: NetworkLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string[] {
  return layout.labels.map((label, i) => renderNode(label, layout.positions[i], i, layout, theme, animate, instrument))
}

function renderTitle(title: string | undefined, theme: MdArtTheme): string {
  return title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
}

function renderSvg(theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${renderTitle(title, theme)}
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layout = measureNetwork(spec)
  const parts = [
    renderDefs(theme),
    ...renderEdges(spec, layout, theme, animate, instrument),
    ...renderNodes(layout, theme, animate, instrument),
  ]
  if (animate) parts.unshift(seqSpotlightCSS(layout.labels.length, spec, { scale: false }))
  return renderSvg(theme, spec.title, parts)
}
