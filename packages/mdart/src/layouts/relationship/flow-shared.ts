import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { aWrap, itemTitleTag, renderEmpty, seqSpotlightCSS, shouldAnimate, shouldInstrument, svgWrap, wrapItem } from '../shared'
import { relationshipItemLabel, renderRelationshipBoxText } from './shared'

const W = 520
const TITLE_H_WITH_TITLE = 28
const TITLE_H_NO_TITLE = 8
const MIN_H = 200
const ROW_SPACE_H = 340
const ROW_PAD = 40
const HUB_W = 116
const HUB_MIN_H = 44
const HUB_MAX_H = 84
const NODE_W = 112
const NODE_H = 42
const LEFT_X = 10
const RIGHT_X_CONVERGING = W - 130
const RIGHT_X_DIVERGING = W - 122

interface FlowLayout {
  n: number
  titleH: number
  height: number
  cy: number
  rowH: number
}

interface FlowContent {
  hub: MdArtItem
  spokes: MdArtItem[]
}

function fallbackItem(label: string): MdArtItem {
  return { label, children: [], attrs: [], flowChildren: [] }
}

function resolveLayout(spec: MdArtSpec, n: number): FlowLayout {
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const rowH = Math.max(54, Math.min(74, ROW_SPACE_H / n))
  const height = Math.max(MIN_H, n * rowH + titleH + ROW_PAD)
  return { n, titleH, rowH, height, cy: titleH + (height - titleH) / 2 }
}

function rowY(layout: FlowLayout, index: number): number {
  return layout.n === 1
    ? layout.cy
    : layout.titleH + 20 + index * (layout.height - layout.titleH - 40) / (layout.n - 1)
}

function markerDef(id: string, color: string): string {
  return `<defs><marker id="${id}" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L7,4 L0,8 Z" fill="${color}cc"/></marker></defs>`
}

function renderHub(item: MdArtItem, x: number, y: number, height: number, fill: string, stroke: string, theme: MdArtTheme): string {
  const { url } = relationshipItemLabel(item)
  return `<rect x="${x}" y="${(y - height / 2).toFixed(1)}" width="${HUB_W}" height="${height}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="1.5">${itemTitleTag(item)}</rect>`
    + aWrap(renderRelationshipBoxText(x + HUB_W / 2, y - height / 2, HUB_W, height, item, theme, '700'), url)
}

function renderSpoke(item: MdArtItem, x: number, y: number, stroke: string, theme: MdArtTheme): string {
  const { url } = relationshipItemLabel(item)
  return `<rect x="${x}" y="${(y - NODE_H / 2).toFixed(1)}" width="${NODE_W}" height="${NODE_H}" rx="5" fill="${theme.surface}" stroke="${stroke}" stroke-width="1.2">${itemTitleTag(item)}</rect>`
    + aWrap(renderRelationshipBoxText(x + NODE_W / 2, y - NODE_H / 2, NODE_W, NODE_H, item, theme), url)
}

function connectorPath(x1: number, y1: number, x2: number, y2: number, stroke: string, markerId: string): string {
  const mid = (x1 + x2) / 2
  return `<path d="M${x1},${y1.toFixed(1)} C${mid},${y1.toFixed(1)} ${mid},${y2.toFixed(1)} ${x2},${y2.toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="1.5" marker-end="url(#${markerId})"/>`
}

function convergingContent(spec: MdArtSpec): FlowContent {
  const items = spec.items
  const hub = items[0].children.length > 0 ? items[0]
    : items.length > 1 ? items[items.length - 1]
    : fallbackItem(spec.title ?? 'Result')
  const spokes = items[0].children.length > 0 ? items[0].children
    : items.length > 1 ? items.slice(0, -1) : items
  return { hub, spokes }
}

function divergingContent(spec: MdArtSpec): FlowContent {
  const source = spec.items[0]
  const spokes = source.children.length > 0 ? source.children
    : spec.items.length > 1 ? spec.items.slice(1)
    : [fallbackItem(spec.title ?? 'Output')]
  return { hub: source, spokes }
}

export function renderConverging(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const content = convergingContent(spec)
  const layout = resolveLayout(spec, content.spokes.length)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const hubH = Math.min(HUB_MAX_H, Math.max(HUB_MIN_H, layout.n * 18 + 24))
  const parts = [
    ...(animate ? [seqSpotlightCSS(layout.n + 1, spec, { scale: false })] : []),
    markerDef('arr-c', theme.accent),
    wrapItem(renderHub(content.hub, RIGHT_X_CONVERGING, layout.cy, hubH, `${theme.accent}28`, theme.accent, theme), 0, animate, instrument),
    ...content.spokes.map((item, index) => {
      const y = rowY(layout, index)
      const x1 = LEFT_X + NODE_W
      const x2 = RIGHT_X_CONVERGING - 4
      const unit = renderSpoke(item, LEFT_X, y, `${theme.primary}66`, theme)
        + connectorPath(x1, y, x2, layout.cy, `${theme.primary}66`, 'arr-c')
      return wrapItem(unit, index + 1, animate, instrument)
    }),
  ]
  return svgWrap(W, layout.height, theme, spec.title, parts)
}

export function renderDiverging(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const content = divergingContent(spec)
  const layout = resolveLayout(spec, content.spokes.length)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const hubH = Math.min(HUB_MAX_H, Math.max(HUB_MIN_H, layout.n * 18 + 24))
  const parts = [
    ...(animate ? [seqSpotlightCSS(layout.n + 1, spec, { scale: false })] : []),
    markerDef('arr-d', theme.primary),
    wrapItem(renderHub(content.hub, LEFT_X, layout.cy, hubH, `${theme.primary}28`, theme.primary, theme), 0, animate, instrument),
    ...content.spokes.map((item, index) => {
      const y = rowY(layout, index)
      const x1 = LEFT_X + HUB_W + 4
      const x2 = RIGHT_X_DIVERGING
      const unit = renderSpoke(item, RIGHT_X_DIVERGING, y, `${theme.secondary}66`, theme)
        + connectorPath(x1, layout.cy, x2, y, `${theme.secondary}66`, 'arr-d')
      return wrapItem(unit, index + 1, animate, instrument)
    }),
  ]
  return svgWrap(W, layout.height, theme, spec.title, parts)
}
