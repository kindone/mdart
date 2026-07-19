import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'
import { countLeaves, maxDepth, layoutNodes, flatNodes, type RenderedNode } from './shared'

const BOX_W = 124
const BOX_H = 38
const BOX_RX = 6
const BOX_TEXT_W = BOX_W - 16
const BOX_TEXT_H = BOX_H - 6
const NODE_FS_MAX = 11
const NODE_FS_MIN = 8
const MIN_W = 640
const MIN_H = 160
const LEAF_GAP = 8
const SIDE_PAD = 80
const LEVEL_H = 86
const TITLE_H_WITH_TITLE = 28
const TITLE_H_NO_TITLE = 10
const BOTTOM_PAD = 30
const HPAD_EXTRA = 4

interface OrgDiagramLayout {
  W: number
  H: number
  titleH: number
  nodes: RenderedNode[]
}

function measureDiagram(spec: MdArtSpec): OrgDiagramLayout {
  const depth = maxDepth(spec.items)
  const totalLeaves = spec.items.reduce((s, i) => s + countLeaves(i), 0) || 1
  const W = Math.max(MIN_W, totalLeaves * (BOX_W + LEAF_GAP) + SIDE_PAD)
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const H = Math.max(MIN_H, depth * LEVEL_H + titleH + BOTTOM_PAD)
  const startY = titleH + BOX_H / 2
  const hPad = BOX_W / 2 + HPAD_EXTRA
  return {
    W,
    H,
    titleH,
    nodes: flatNodes(layoutNodes(spec.items, hPad, startY, W - hPad * 2, LEVEL_H)),
  }
}

function renderConnector(node: RenderedNode, theme: MdArtTheme): string {
  if (node.parentX === undefined || node.parentY === undefined) return ''
  const x1 = node.parentX, y1 = node.parentY + BOX_H / 2
  const x2 = node.x,       y2 = node.y - BOX_H / 2
  const mid = (y1 + y2) / 2
  return `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} C${x1.toFixed(1)},${mid.toFixed(1)} ${x2.toFixed(1)},${mid.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${theme.textMuted}cc" stroke-width="1.5"/>`
}

function renderNodeBox(node: RenderedNode, theme: MdArtTheme): string {
  const bx = node.x - BOX_W / 2
  const by = node.y - BOX_H / 2
  return `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${BOX_W}" height="${BOX_H}" rx="${BOX_RX}" fill="${theme.surface}" stroke="${theme.accent}88" stroke-width="1.2">${itemTitleTag(node)}</rect>`
}

function renderNodeText(node: RenderedNode, theme: MdArtTheme): string {
  const { url, display } = displayLabel(node, { value: true })
  const fit = fitLabelValueBlock(display, node.value, BOX_TEXT_W, BOX_TEXT_H, {
    labelUrl: url,
    labelMaxSize: NODE_FS_MAX,
    labelMinSize: NODE_FS_MIN,
    labelMaxLines: 1,
    labelMaxLinesNoValue: 2,
    valueMaxSize: 9,
    valueMinSize: 7,
    valueMaxLines: 1,
    valueShare: 0.34,
  })
  return renderFitBlock(node.x, node.y, fit, {
    labelFullText: display,
    valueFullText: node.value,
    labelFill: theme.text,
    valueFill: theme.textMuted,
    labelWeight: '600',
  })
}

function renderNode(node: RenderedNode, index: number, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const unit = [
    renderConnector(node, theme),
    renderNodeBox(node, theme),
    renderNodeText(node, theme),
  ].join('')
  return wrapItem(unit, index, animate, instrument)
}

function renderTitle(spec: MdArtSpec, W: number, theme: MdArtTheme): string {
  return spec.title
    ? `<text x="${(W / 2).toFixed(1)}" y="18" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(spec.title)}</text>`
    : ''
}

function renderSvg(layout: OrgDiagramLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${layout.W} ${layout.H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${renderTitle(spec, layout.W, theme)}
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layout = measureDiagram(spec)
  const parts = layout.nodes.map((node, index) => renderNode(node, index, theme, animate, instrument))
  if (animate) parts.unshift(seqSpotlightCSS(layout.nodes.length, spec, { scale: false }))
  return renderSvg(layout, spec, theme, parts)
}

function renderEmpty(theme: MdArtTheme): string {
  return `<svg viewBox="0 0 300 80" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  <text x="150" y="42" text-anchor="middle" font-size="12" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>No items</text>
</svg>`
}
