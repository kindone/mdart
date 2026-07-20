import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import {
  escapeXml,
  lerpColor,
  renderEmpty,
  getCaption,
  itemTitleTag,
  displayLabel,
  shouldAnimate,
  seqSpotlightCSS,
  fitLabelValueBlock,
  renderFitBlock,
  wrapItem,
  shouldInstrument,
  regularPolygonPoints,
  FONT_SANS_ATTR,
} from '../shared'

const W = 500
const R = 50
const HEX_W = R * Math.sqrt(3)
const HEX_H = R * 2
const COL_GAP = 6
const ROW_GAP = 4
const MAX_COLS = 4
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 8
const BOTTOM_PAD = 8
const HEX_BOTTOM_PAD = R * 0.25
const HEX_TEXT_INSET = 10
const HEX_TEXT_H_RATIO = 0.7

interface HexagonLayout {
  cols: number
  rows: number
  colW: number
  rowH: number
  startX: number
  titleH: number
  height: number
  textW: number
  textH: number
}

interface HexagonNode {
  item: MdArtItem
  index: number
  cx: number
  cy: number
  fill: string
}

function titleHeight(spec: MdArtSpec): number {
  return spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
}

function resolveLayout(spec: MdArtSpec): HexagonLayout {
  const cols = Math.min(spec.items.length, MAX_COLS)
  const rows = Math.ceil(spec.items.length / cols)
  const colW = HEX_W + COL_GAP
  const rowH = HEX_H * 0.75 + ROW_GAP
  const totalW = cols * colW - COL_GAP
  const titleH = titleHeight(spec)

  return {
    cols,
    rows,
    colW,
    rowH,
    startX: (W - totalW) / 2 + HEX_W / 2,
    titleH,
    height: titleH + rows * rowH + HEX_BOTTOM_PAD + BOTTOM_PAD,
    textW: Math.max(20, HEX_W - HEX_TEXT_INSET),
    textH: HEX_H * HEX_TEXT_H_RATIO,
  }
}

function placeNodes(spec: MdArtSpec, layout: HexagonLayout, theme: MdArtTheme): HexagonNode[] {
  return spec.items.map((item, index) => {
    const col = index % layout.cols
    const row = Math.floor(index / layout.cols)
    const t = spec.items.length > 1 ? index / (spec.items.length - 1) : 0

    return {
      item,
      index,
      cx: layout.startX + col * layout.colW + (row % 2 === 1 ? layout.colW / 2 : 0),
      cy: layout.titleH + R + row * layout.rowH,
      fill: lerpColor(theme.primary, theme.secondary, t),
    }
  })
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  if (!spec.title) return ''
  return `<text x="${W / 2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(spec.title)}</text>`
}

function renderHexagonShape(node: HexagonNode): string {
  return `<polygon points="${regularPolygonPoints(node.cx, node.cy, R, 6, Math.PI / 6)}" fill="${node.fill}33" stroke="${node.fill}" stroke-width="1.5">${itemTitleTag(node.item)}</polygon>`
}

function renderHexagonText(node: HexagonNode, layout: HexagonLayout, theme: MdArtTheme): string {
  const caption = getCaption(node.item)
  const { display: rawLabel, url: lblUrl } = displayLabel(node.item, { value: !!caption })
  const fit = fitLabelValueBlock(rawLabel, caption, layout.textW, layout.textH, {
    labelUrl: lblUrl,
    labelMaxSize: 11,
    labelMinSize: 6.5,
    labelMaxLines: 2,
    labelMaxLinesNoValue: 3,
    valueMaxSize: 9,
    valueMinSize: 6.5,
    valueMaxLines: 2,
    valueShare: 0.4,
    gap: 3,
  })

  return renderFitBlock(node.cx, node.cy, fit, {
    labelFullText: rawLabel,
    valueFullText: caption ?? undefined,
    labelFill: theme.text,
    valueFill: theme.textMuted,
    labelWeight: '700',
    shapeBounds: { x: node.cx - R, y: node.cy - R, w: R * 2, h: R * 2, label: 'hexagon-node' },
  })
}

function renderNode(node: HexagonNode, layout: HexagonLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  return wrapItem(
    renderHexagonShape(node) + renderHexagonText(node, layout, theme),
    node.index,
    animate,
    instrument,
  )
}

function renderSvg(layout: HexagonLayout, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${layout.height}" fill="${theme.bg}" rx="8"/>
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
    ...(animate ? [seqSpotlightCSS(nodes.length, spec)] : []),
    renderTitle(spec, theme),
    ...nodes.map(node => renderNode(node, layout, theme, animate, instrument)),
  ].filter(Boolean)

  return renderSvg(layout, theme, parts)
}
