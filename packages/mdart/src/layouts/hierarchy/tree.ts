import type { MdArtSpec, MdArtItem } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, itemTitleTag, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR, parseLink, displayLabel, fitLabelValueBlock, renderFitBlock, type FitBlockResult } from '../shared'
import { countLeaves, maxDepth, layoutNodes, flatNodes, type RenderedNode } from './shared'

// ── Layout constants ─────────────────────────────────────────────────────────

const BOX_W    = 124
const FONT_SIZE_MAX = 10
const FONT_SIZE_MIN = 8
const VPAD     = 7     // top + bottom inner padding
const MAX_LINES = 4
// Vertical space reserved for bezier connectors between levels. Sibling
// layout org-chart.ts uses an ~56px gap between box bottom and next box
// top; this was 30, giving a visibly tighter per-level rhythm than its
// sibling and making wide, shallow trees (many leaves, few levels — the
// common case) look flatter than intended relative to their width.
const CONN_GAP = 46
const MIN_W = 640
const MIN_H = 160
const LEAF_GAP = 10
const SIDE_PAD = 80
const TITLE_H_WITH_TITLE = 28
const TITLE_H_NO_TITLE = 10
const BOTTOM_PAD = 30
const HPAD_EXTRA = 4
const BOX_TEXT_W = BOX_W - 16
const BOX_TEXT_FIT_H = 48

interface TreeNodeFit {
  labelFullText: string
  valueFullText?: string
  block: FitBlockResult
}

interface TreeLayout {
  W: number
  H: number
  titleH: number
  boxH: number
  nodes: RenderedNode[]
  fits: TreeNodeFit[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Walk the whole item tree and collect every label, in the same pre-order
 *  traversal flatNodes(layoutNodes(...)) produces — so the result lines up
 *  index-for-index with `flat` in render() below without needing a lookup. */
function collectItems(items: MdArtItem[]): MdArtItem[] {
  const out: MdArtItem[] = []
  for (const item of items) {
    out.push(item)
    if (item.children.length) out.push(...collectItems(item.children))
  }
  return out
}

function fitLabels(items: MdArtItem[]): TreeNodeFit[] {
  return collectItems(items).map(item => {
    const { display: label, url } = parseLink(item.label)
    const display = displayLabel(item, { value: true }).display
    const block = item.value
      ? fitLabelValueBlock(label, item.value, BOX_TEXT_W, BOX_TEXT_FIT_H, {
        labelUrl: url,
        labelMaxSize: FONT_SIZE_MAX,
        labelMinSize: FONT_SIZE_MIN,
        labelMaxLines: 2,
        labelMaxLinesNoValue: MAX_LINES,
        valueMaxSize: 8,
        valueMinSize: 7,
        valueMaxLines: 2,
        valueShare: 0.45,
      })
      : fitLabelValueBlock(display, null, BOX_TEXT_W, BOX_TEXT_FIT_H, {
        labelUrl: url,
        labelMaxSize: FONT_SIZE_MAX,
        labelMinSize: FONT_SIZE_MIN,
        labelMaxLinesNoValue: MAX_LINES,
      })
    return { labelFullText: label, valueFullText: item.value, block }
  })
}

function boxHeight(fits: TreeNodeFit[]): number {
  return fits.reduce((maxH, fit) => Math.max(maxH, VPAD * 2 + fit.block.totalH), VPAD * 2)
}

function measureTree(spec: MdArtSpec): TreeLayout {
  const depth = maxDepth(spec.items)
  const totalLeaves = spec.items.reduce((s, item) => s + countLeaves(item), 0) || 1
  const W = Math.max(MIN_W, totalLeaves * (BOX_W + LEAF_GAP) + SIDE_PAD)
  const fits = fitLabels(spec.items)
  const boxH = boxHeight(fits)
  const levelH = boxH + CONN_GAP
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const H = Math.max(MIN_H, depth * levelH + titleH + BOTTOM_PAD)
  const startY = titleH + boxH / 2
  const hPad = BOX_W / 2 + HPAD_EXTRA
  return {
    W,
    H,
    titleH,
    boxH,
    fits,
    nodes: flatNodes(layoutNodes(spec.items, hPad, startY, W - hPad * 2, levelH)),
  }
}

function renderConnector(node: RenderedNode, boxH: number, theme: MdArtTheme): string {
  if (node.parentX === undefined || node.parentY === undefined) return ''
  const x1 = node.parentX, y1 = node.parentY + boxH / 2
  const x2 = node.x,       y2 = node.y - boxH / 2
  const mid = (y1 + y2) / 2
  return `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} C${x1.toFixed(1)},${mid.toFixed(1)} ${x2.toFixed(1)},${mid.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${theme.textMuted}cc" stroke-width="1.5"/>`
}

function renderNodeBox(node: RenderedNode, boxH: number, theme: MdArtTheme): string {
  const bx = node.x - BOX_W / 2
  const by = node.y - boxH / 2
  return `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${BOX_W}" height="${boxH}" rx="6" fill="${theme.accent}18" stroke="${theme.accent}aa" stroke-width="1.2">${itemTitleTag(node)}</rect>`
}

function renderNodeText(node: RenderedNode, fit: TreeNodeFit, theme: MdArtTheme): string {
  return renderFitBlock(node.x, node.y, fit.block, {
    labelFullText: fit.labelFullText,
    valueFullText: fit.valueFullText,
    labelFill: theme.text,
    valueFill: theme.textMuted,
    labelWeight: '500',
  })
}

function renderNode(node: RenderedNode, fit: TreeNodeFit, index: number, layout: TreeLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const unit = [
    renderConnector(node, layout.boxH, theme),
    renderNodeBox(node, layout.boxH, theme),
    renderNodeText(node, fit, theme),
  ].join('')
  return wrapItem(unit, index, animate, instrument)
}

function renderTitle(spec: MdArtSpec, W: number, theme: MdArtTheme): string {
  return spec.title
    ? `<text x="${(W / 2).toFixed(1)}" y="18" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(spec.title)}</text>`
    : ''
}

function renderSvg(layout: TreeLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${layout.W} ${layout.H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${renderTitle(spec, layout.W, theme)}
  ${parts.join('\n  ')}
</svg>`
}

// ── Renderer ─────────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layout = measureTree(spec)
  const parts = layout.nodes.map((node, index) =>
    renderNode(node, layout.fits[index], index, layout, theme, animate, instrument),
  )
  if (animate) parts.unshift(seqSpotlightCSS(layout.nodes.length, spec, { scale: false }))
  return renderSvg(layout, spec, theme, parts)
}
