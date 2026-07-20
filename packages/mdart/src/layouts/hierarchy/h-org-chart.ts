import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, aWrap, itemTitleTag, displayLabelValue, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, centeredTextY, FONT_SANS_ATTR } from '../shared'
import { countLeaves, maxDepth } from './shared'

// ── Node geometry ─────────────────────────────────────────────────────────────

const ROW_H  = 56   // vertical space per leaf node (must exceed NODE_H to guarantee gap)
const COL_W  = 150  // horizontal space per depth level
const NODE_W = 120  // node rectangle width
const NODE_H = 44   // node rectangle height — gap = ROW_H − NODE_H = 12 px
const FS_MAX = 10.5
const FS_MIN = 8
const MIN_H = 100
const LEFT_PAD = 10
const RIGHT_PAD = 20
const TITLE_H_WITH_TITLE = 28
const TITLE_H_NO_TITLE = 8
const TOP_LEAF_PAD = 10
const BOTTOM_PAD = 20
const TEXT_W = NODE_W - 8
const TEXT_MAX_LINES = 4
const TEXT_LINE_HEIGHT_RATIO = 1.3

interface HNode {
  label: string
  value?: string
  attrs?: string[]
  lines: string[]
  truncated: boolean
  url: string | null
  fontSize: number
  lineHeight: number
  x: number
  y: number
  parentX?: number
  parentY?: number
}

interface HDiagramLayout {
  W: number
  H: number
  titleH: number
  nodes: HNode[]
}

// ── Renderer ─────────────────────────────────────────────────────────────────

interface LabelSource {
  display: string
  url: string | null
}

/** Collect every item's visible label in the same pre-order
 *  traversal layoutH() below walks, so results line up index-for-index. */
function collectLabelsH(items: MdArtItem[]): LabelSource[] {
  const out: LabelSource[] = []
  for (const item of items) {
    out.push(displayLabelValue(item))
    if (item.children.length) out.push(...collectLabelsH(item.children))
  }
  return out
}

function fitLabels(labelSources: LabelSource[]) {
  // 4 lines at the font floor (8) need ~4×(8×1.3)=41.6px — a plain NODE_H
  // minus fixed padding lands just under that, so guarantee the minimum
  // line-count height explicitly.
  const hBoxH = Math.max(NODE_H - 6, FS_MIN * TEXT_LINE_HEIGHT_RATIO * TEXT_MAX_LINES)
  return labelSources.map(label =>
    fitTextToWidthShared([label.display], TEXT_W, {
      maxSize: FS_MAX,
      minSize: FS_MIN,
      maxLines: TEXT_MAX_LINES,
      boxH: hBoxH,
    }),
  )
}

function layoutHNodes(items: MdArtItem[], titleH: number, H: number): HNode[] {
  const labelSources = collectLabelsH(items)
  const nodeFits = fitLabels(labelSources)
  const hnodes: HNode[] = []
  let fitIdx = 0

  function visit(levelItems: MdArtItem[], level: number, leafStart: number, totalH: number, px?: number, py?: number) {
    const tot = levelItems.reduce((s, item) => s + countLeaves(item), 0) || 1
    let leafY = leafStart
    for (const item of levelItems) {
      const leaves = countLeaves(item)
      const span = (leaves / tot) * totalH
      const ny = leafY + span / 2
      const nx = LEFT_PAD + level * COL_W + NODE_W / 2
      const labelSource = labelSources[fitIdx]
      const { fontSize, lineHeight, results: [{ lines, truncated, url }] } = nodeFits[fitIdx++]
      hnodes.push({
        label: item.label,
        value: item.value,
        attrs: item.attrs,
        lines,
        truncated,
        url: labelSource.url ?? url,
        fontSize,
        lineHeight,
        x: nx,
        y: ny,
        parentX: px,
        parentY: py,
      })
      visit(item.children, level + 1, leafY, span, nx + NODE_W / 2, ny)
      leafY += span
    }
  }

  visit(items, 0, titleH + TOP_LEAF_PAD, H - titleH - BOTTOM_PAD)
  return hnodes
}

function measureDiagram(spec: MdArtSpec): HDiagramLayout {
  const depth = maxDepth(spec.items)
  const totalLeaves = spec.items.reduce((s, item) => s + countLeaves(item), 0) || 1
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const W = depth * COL_W + NODE_W + RIGHT_PAD
  const H = Math.max(MIN_H, totalLeaves * ROW_H + titleH + BOTTOM_PAD)
  return { W, H, titleH, nodes: layoutHNodes(spec.items, titleH, H) }
}

function renderConnector(node: HNode, theme: MdArtTheme): string {
  if (node.parentX === undefined || node.parentY === undefined) return ''
  const mid = (node.parentX + node.x - NODE_W / 2) / 2
  return `<path d="M${node.parentX.toFixed(1)},${node.parentY.toFixed(1)} H${mid.toFixed(1)} V${node.y.toFixed(1)} H${(node.x - NODE_W / 2).toFixed(1)}" fill="none" stroke="${theme.border}" stroke-width="1.5"/>`
}

function renderNodeBox(node: HNode, theme: MdArtTheme): string {
  const bx = node.x - NODE_W / 2
  const by = node.y - NODE_H / 2
  const itemTip = itemTitleTag({ label: node.label, value: node.value, attrs: node.attrs })
  return `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${NODE_W}" height="${NODE_H}" rx="5" fill="${theme.surface}" stroke="${theme.accent}88" stroke-width="1.2">${itemTip}</rect>`
}

function renderNodeText(node: HNode, theme: MdArtTheme): string {
  const by = node.y - NODE_H / 2
  const itemTip = itemTitleTag({ label: node.label, value: node.value, attrs: node.attrs })
  const startY = centeredTextY(by, NODE_H, node.lines.length, node.lineHeight)
  const spans = node.lines
    .map((line, li) => `<tspan x="${node.x.toFixed(1)}" dy="${li === 0 ? 0 : node.lineHeight}">${escapeXml(line)}</tspan>`)
    .join('')
  return aWrap(
    `<text x="${node.x.toFixed(1)}" y="${startY.toFixed(1)}" text-anchor="middle" font-size="${node.fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR}>${itemTip}${spans}</text>`,
    node.url,
  )
}

function renderNode(node: HNode, index: number, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
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

function renderSvg(layout: HDiagramLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
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
