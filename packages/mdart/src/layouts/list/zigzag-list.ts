import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, renderEmpty, getCaption, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 500
const BOX_W = 190
const BOX_H_EMPTY = 34
const BOX_H_VALUE = 46
const BOX_H_LONG_VALUE = 58
const ROW_H_EMPTY = 42
const ROW_H_VALUE = 54
const ROW_H_LONG_VALUE = 66
const TEXT_W = BOX_W - 70
const TEXT_H_PAD = 8
const SPINE_X = W / 2
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 8
const BOTTOM_PAD = 10
const CONNECTOR_GAP = 8
const LONG_VALUE_THRESHOLD = 78

interface ZigzagNodeLayout {
  item: MdArtItem
  index: number
  secondary: string | null
  valueMaxLines: number
  boxH: number
  rowH: number
  cy: number
  left: boolean
  fill: string
}

function rowMetrics(secondary: string | null): Pick<ZigzagNodeLayout, 'valueMaxLines' | 'boxH' | 'rowH'> {
  if (!secondary) return { valueMaxLines: 2, boxH: BOX_H_EMPTY, rowH: ROW_H_EMPTY }
  const valueMaxLines = secondary.length > LONG_VALUE_THRESHOLD ? 3 : 2
  return valueMaxLines === 3
    ? { valueMaxLines, boxH: BOX_H_LONG_VALUE, rowH: ROW_H_LONG_VALUE }
    : { valueMaxLines, boxH: BOX_H_VALUE, rowH: ROW_H_VALUE }
}

function measureNodes(items: MdArtItem[], captions: Array<string | null>, titleH: number, theme: MdArtTheme): ZigzagNodeLayout[] {
  let rowTop = titleH
  const n = items.length
  return items.map((item, index) => {
    const secondary = item.value ?? captions[index]
    const metrics = rowMetrics(secondary)
    const cy = rowTop + metrics.rowH / 2
    rowTop += metrics.rowH
    return {
      item,
      index,
      secondary,
      ...metrics,
      cy,
      left: index % 2 === 0,
      fill: lerpColor(theme.primary, theme.secondary, n > 1 ? index / (n - 1) : 0),
    }
  })
}

function totalHeight(titleH: number, nodes: ZigzagNodeLayout[]): number {
  return titleH + nodes.reduce((sum, node) => sum + node.rowH, 0) + BOTTOM_PAD
}

function renderSvg(H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

function renderSpine(titleH: number, H: number, theme: MdArtTheme): string {
  return `<line x1="${SPINE_X}" y1="${titleH}" x2="${SPINE_X}" y2="${H - 8}" stroke="${theme.border}" stroke-width="2"/>`
}

function renderTitle(title: string | undefined, theme: MdArtTheme): string {
  return title
    ? `<text x="${SPINE_X}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(title)}</text>`
    : ''
}

function renderNode(node: ZigzagNodeLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const { item, index, secondary, valueMaxLines, boxH, cy, left, fill } = node
  const bx = left ? SPINE_X - CONNECTOR_GAP - BOX_W : SPINE_X + CONNECTOR_GAP
  const lineX = left ? SPINE_X - CONNECTOR_GAP : SPINE_X + CONNECTOR_GAP
  const { display: zigDisplay, url: zigUrl } = displayLabel(item, { value: true })
  const fit = fitLabelValueBlock(zigDisplay, secondary, TEXT_W, boxH - TEXT_H_PAD, {
    labelUrl: zigUrl,
    labelMaxSize: 11,
    labelMinSize: 7,
    labelMaxLines: 1,
    labelMaxLinesNoValue: 2,
    valueMaxSize: 9,
    valueMinSize: 7,
    valueMaxLines,
    valueShare: 0.44,
  })

  let nodeStr = ''
  nodeStr += `<rect x="${bx.toFixed(1)}" y="${(cy - boxH / 2).toFixed(1)}" width="${BOX_W}" height="${boxH}" rx="6" fill="${fill}22" stroke="${fill}" stroke-width="1.2">${itemTitleTag(item)}</rect>`
  nodeStr += renderFitBlock(bx + BOX_W / 2, cy, fit, {
    labelFullText: zigDisplay,
    valueFullText: secondary ?? undefined,
    labelFill: theme.text,
    valueFill: theme.textMuted,
    labelWeight: '600',
  })
  nodeStr += `<circle cx="${SPINE_X}" cy="${cy}" r="4" fill="${fill}"/>`
  nodeStr += `<line x1="${SPINE_X}" y1="${cy}" x2="${lineX}" y2="${cy}" stroke="${fill}" stroke-width="1.2"/>`
  return wrapItem(nodeStr, index, animate, instrument)
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const nodes = measureNodes(items, items.map(item => getCaption(item)), titleH, theme)
  const H = totalHeight(titleH, nodes)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts: string[] = []
  parts.push(renderSpine(titleH, H, theme))
  const title = renderTitle(spec.title, theme)
  if (title) parts.push(title)
  parts.push(...nodes.map(node => renderNode(node, theme, animate, instrument)))
  if (animate) parts.unshift(seqSpotlightCSS(nodes.length, spec, { scale: false }))
  return renderSvg(H, theme, parts)
}
