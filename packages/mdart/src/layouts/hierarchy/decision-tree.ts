import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, aWrap, itemTitleTag, displayLabelValue, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'
import { countLeaves, maxDepth, layoutNodes, flatNodes } from './shared'
import type { RenderedNode } from './shared'

const LEAF_W = 90
const LEAF_H = 60
const DECISION_W = 60
const DECISION_H = 36
const MIN_W = 640
const MIN_H = 240
const LEAF_CANVAS_W = 130
const SIDE_PAD = 80
const LEVEL_H = 120
const TITLE_H_WITH_TITLE = 28
const TITLE_H_NO_TITLE = 10
const BOTTOM_PAD = 40
const DECISION_TEXT_W = DECISION_W * 2 - 42
const LEAF_TEXT_W = LEAF_W - 16

interface NodeFit {
  url: string | null
  fontSize: number
  lineHeight: number
  lines: string[]
  truncated: boolean
}

interface DecisionTreeLayout {
  W: number
  H: number
  titleH: number
  flat: RenderedNode[]
  decisionFitByNode: Map<RenderedNode, NodeFit>
  leafFitByNode: Map<RenderedNode, NodeFit>
}

function fitNodes(flat: RenderedNode[]): Pick<DecisionTreeLayout, 'decisionFitByNode' | 'leafFitByNode'> {
  const decisionNodes = flat.filter(node => node.children.length > 0)
  const leafNodes = flat.filter(node => node.children.length === 0)
  const decisionDisplays = decisionNodes.map(node => displayLabelValue(node))
  const leafDisplays = leafNodes.map(node => displayLabelValue(node))
  // Diamond text budget (DW*2 - 42 = 78px) is derived from the available
  // width at the extreme line positions of a 2-line block at maxSize=10:
  //   half_width = DW × (1 − v/DH) where v = half_visual_height ≈ 11.5px
  //   = 60 × (1 − 11.5/36) ≈ 40.8px → full ≈ 81.6px → budget 78px (3.6px margin)
  // With LH=60, leafBoxH=52 fits 3 lines even at maxSize=11:
  //   linesAtSize = ⌊52 / (11×1.3)⌋ = ⌊52/14.3⌋ = 3 → long labels wrap at full size.
  const leafBoxH = Math.max(LEAF_H - 8, 8 * 1.3 * 3)
  const decisionFits = decisionDisplays.map(d =>
    fitTextToWidthShared([d.display], DECISION_TEXT_W, { maxSize: 10, minSize: 7, maxLines: 2, boxH: DECISION_H * 1.7 }),
  )
  const leafFits = leafDisplays.map(d =>
    fitTextToWidthShared([d.display], LEAF_TEXT_W, { maxSize: 11, minSize: 8, maxLines: 3, boxH: leafBoxH }),
  )
  const decisionFitByNode = new Map<RenderedNode, { url: string | null; fontSize: number; lineHeight: number; lines: string[]; truncated: boolean }>(
    decisionNodes.map((n, idx) => {
      const { fontSize, lineHeight, results: [{ lines, truncated }] } = decisionFits[idx]
      return [n, { url: decisionDisplays[idx].url, fontSize, lineHeight, lines, truncated }]
    }),
  )
  const leafFitByNode = new Map<RenderedNode, { url: string | null; fontSize: number; lineHeight: number; lines: string[]; truncated: boolean }>(
    leafNodes.map((n, idx) => {
      const { fontSize, lineHeight, results: [{ lines, truncated }] } = leafFits[idx]
      return [n, { url: leafDisplays[idx].url, fontSize, lineHeight, lines, truncated }]
    }),
  )
  return { decisionFitByNode, leafFitByNode }
}

function measureTree(spec: MdArtSpec): DecisionTreeLayout {
  const depth = maxDepth(spec.items)
  const totalLeaves = spec.items.reduce((s, i) => s + countLeaves(i), 0) || 1
  const W = Math.max(MIN_W, totalLeaves * LEAF_CANVAS_W + SIDE_PAD)
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const H = Math.max(MIN_H, depth * LEVEL_H + titleH + BOTTOM_PAD)
  const startY = titleH + DECISION_H
  // HPAD must clear both leaf half-width and diamond half-width.
  const hPad = Math.max(LEAF_W / 2 + 4, DECISION_W + 8)
  const flat = flatNodes(layoutNodes(spec.items, hPad, startY, W - hPad * 2, LEVEL_H))
  return { W, H, titleH, flat, ...fitNodes(flat) }
}

function renderConnector(node: RenderedNode, flat: RenderedNode[], theme: MdArtTheme): string {
  if (node.parentX === undefined || node.parentY === undefined) return ''
  const isLeaf = node.children.length === 0
  const x1 = node.parentX, y1 = node.parentY + DECISION_H
  const x2 = node.x,       y2 = isLeaf ? node.y - LEAF_H / 2 : node.y - DECISION_H
  const mid = (y1 + y2) / 2
  let out = `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} C${x1.toFixed(1)},${mid.toFixed(1)} ${x2.toFixed(1)},${mid.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${theme.textMuted}cc" stroke-width="1.5"/>`
  const siblings = flat.filter(s => s.parentX === node.parentX && s.parentY === node.parentY)
  if (siblings.length === 2) {
    const isFirst = siblings[0] === node
    const lx = (x1 + x2) / 2 + (isFirst ? -18 : 12)
    const ly = (y1 + y2) / 2
    const lbl = isFirst ? 'Yes' : 'No'
    const lcolor = isFirst ? theme.primary : theme.secondary
    out += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="9" fill="${lcolor}" ${FONT_SANS_ATTR} font-weight="700">${lbl}</text>`
  }
  return out
}

function renderDecisionNode(node: RenderedNode, fit: NodeFit, theme: MdArtTheme): string {
  const { x, y } = node
  const itemTip = itemTitleTag(node)
  const startY = y - ((fit.lines.length - 1) * fit.lineHeight) / 2 + fit.fontSize * 0.35
  const truncTip = fit.truncated ? `<title>${escapeXml(node.label)}</title>` : ''
  const spans = fit.lines
    .map((line, li) => `<tspan x="${x}" dy="${li === 0 ? 0 : fit.lineHeight.toFixed(1)}">${escapeXml(line)}</tspan>`)
    .join('')
  return `<polygon points="${x},${(y - DECISION_H).toFixed(1)} ${(x + DECISION_W).toFixed(1)},${y} ${x},${(y + DECISION_H).toFixed(1)} ${(x - DECISION_W).toFixed(1)},${y}" fill="${theme.primary}28" stroke="${theme.primary}" stroke-width="1.5">${itemTip}</polygon>` +
    aWrap(`<text x="${x}" y="${startY.toFixed(1)}" text-anchor="middle" font-size="${fit.fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${itemTip}${truncTip}${spans}</text>`, fit.url)
}

function renderLeafNode(node: RenderedNode, fit: NodeFit, theme: MdArtTheme): string {
  const { x, y } = node
  const bx = x - LEAF_W / 2, by = y - LEAF_H / 2
  const itemTip = itemTitleTag(node)
  const startY = y - ((fit.lines.length - 1) * fit.lineHeight) / 2 + fit.fontSize * 0.35
  const truncTip = fit.truncated ? `<title>${escapeXml(node.label)}</title>` : ''
  const spans = fit.lines
    .map((line, li) => `<tspan x="${x.toFixed(1)}" dy="${li === 0 ? 0 : fit.lineHeight.toFixed(1)}">${escapeXml(line)}</tspan>`)
    .join('')
  return `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${LEAF_W}" height="${LEAF_H}" rx="5" fill="${theme.accent}28" stroke="${theme.accent}" stroke-width="1.2">${itemTip}</rect>` +
    aWrap(`<text x="${x.toFixed(1)}" y="${startY.toFixed(1)}" text-anchor="middle" font-size="${fit.fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR}>${itemTip}${truncTip}${spans}</text>`, fit.url)
}

function renderNode(node: RenderedNode, index: number, layout: DecisionTreeLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const unit = [
    renderConnector(node, layout.flat, theme),
    node.children.length > 0
      ? renderDecisionNode(node, layout.decisionFitByNode.get(node)!, theme)
      : renderLeafNode(node, layout.leafFitByNode.get(node)!, theme),
  ].join('')
  return wrapItem(unit, index, animate, instrument)
}

function renderTitle(spec: MdArtSpec, W: number, theme: MdArtTheme): string {
  return spec.title
    ? `<text x="${W / 2}" y="18" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(spec.title)}</text>`
    : ''
}

function renderSvg(layout: DecisionTreeLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${layout.W} ${layout.H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${renderTitle(spec, layout.W, theme)}
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layout = measureTree(spec)

  const parts: string[] = []

  for (const [i, node] of layout.flat.entries()) {
    parts.push(renderNode(node, i, layout, theme, animate, instrument))
  }
  if (animate) parts.unshift(seqSpotlightCSS(layout.flat.length, spec, { scale: false }))
  return renderSvg(layout, spec, theme, parts)
}

function renderEmpty(theme: MdArtTheme): string {
  return `<svg viewBox="0 0 300 80" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  <text x="150" y="42" text-anchor="middle" font-size="12" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>No items</text>
</svg>`
}
