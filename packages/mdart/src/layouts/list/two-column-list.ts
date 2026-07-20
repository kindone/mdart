import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, lerpColor, renderEmpty, getCaption, itemTitleTag, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 500
const PAD = 16
const ROW_GAP = 6
const SEC_G = 4
const TITLE_H = 28

const LBL_FS = 11
const LBL_LH = 14
const CAP_FS = 10
const CAP_LH = 13

const HALF = W / 2
const COL_TEXT_X = 18
const COL_W = HALF - PAD - COL_TEXT_X - 4
const MIN_ROW_H = 32
const PAD_V = 8
const DOT_R = 4
const DOT_X = 8

const LABEL_MAX = Math.max(10, Math.floor(COL_W / 5.6))
const CAP_MAX = Math.max(10, Math.floor(COL_W / 5.0))

interface ItemLayout {
  lblLines: string[]
  lblTrunc: boolean
  lblUrl: string | null
  capLines: string[]
  capTrunc: boolean
  caption: string | null
  blockH: number
  itemH: number
}

interface ColumnLayout {
  half: number
  maxRows: number
  titleH: number
  rowHeights: number[]
  rowY: number[]
  height: number
  items: ItemLayout[]
}

interface ColumnItemPlacement {
  item: MdArtItem
  layout: ItemLayout
  index: number
  colStartX: number
  rowY: number
  rowH: number
  fill: string
}

function titleHeight(spec: MdArtSpec): number {
  return spec.title ? TITLE_H : 0
}

function computeLayout(item: MdArtItem): ItemLayout {
  const { lines: lblLines, truncated: lblTrunc, url: lblUrl } = wrapLabel(item.label, LABEL_MAX, 5)
  const caption = getCaption(item)
  const { lines: capLines, truncated: capTrunc } = caption
    ? wrapLabel(caption, CAP_MAX, 5)
    : { lines: [], truncated: false }
  const blockH = lblLines.length * LBL_LH + (capLines.length > 0 ? SEC_G + capLines.length * CAP_LH : 0)
  return { lblLines, lblTrunc, lblUrl, capLines, capTrunc, caption, blockH, itemH: Math.max(MIN_ROW_H, PAD_V + blockH + PAD_V) }
}

function resolveLayout(spec: MdArtSpec): ColumnLayout {
  const half = Math.ceil(spec.items.length / 2)
  const maxRows = Math.max(half, spec.items.length - half)
  const titleH = titleHeight(spec)
  const itemLayouts = spec.items.map(computeLayout)
  const leftLayouts = itemLayouts.slice(0, half)
  const rightLayouts = itemLayouts.slice(half)
  const rowHeights = Array.from({ length: maxRows }, (_, row) => {
    const lh = leftLayouts[row]?.itemH ?? MIN_ROW_H
    const rh = rightLayouts[row]?.itemH ?? 0
    return Math.max(lh, rh)
  })

  const rowY: number[] = []
  let y = PAD + titleH
  for (const rowH of rowHeights) {
    rowY.push(y)
    y += rowH + ROW_GAP
  }

  return {
    half,
    maxRows,
    titleH,
    rowHeights,
    rowY,
    height: y - ROW_GAP + PAD,
    items: itemLayouts,
  }
}

function itemPlacement(spec: MdArtSpec, layout: ColumnLayout, row: number, right: boolean, theme: MdArtTheme): ColumnItemPlacement | null {
  const index = right ? layout.half + row : row
  const item = spec.items[index]
  if (!item) return null
  const t = spec.items.length > 1 ? index / (spec.items.length - 1) : 0
  return {
    item,
    layout: layout.items[index],
    index,
    colStartX: right ? HALF + PAD : PAD,
    rowY: layout.rowY[row],
    rowH: layout.rowHeights[row],
    fill: lerpColor(theme.secondary, theme.primary, t),
  }
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  if (!spec.title) return ''
  return `<text x="${W / 2}" y="${PAD + 16}" text-anchor="middle" font-size="13" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(spec.title)}</text>`
}

function renderColumnDivider(layout: ColumnLayout, theme: MdArtTheme): string {
  return `<line x1="${HALF}" y1="${PAD + layout.titleH}" x2="${HALF}" y2="${layout.height - PAD}" stroke="${theme.border}" stroke-width="1" />`
}

function renderRowDivider(row: number, layout: ColumnLayout, theme: MdArtTheme): string {
  if (row >= layout.maxRows - 1) return ''
  const y = layout.rowY[row] + layout.rowHeights[row]
  return `<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="${theme.border}" stroke-width="0.5" />`
}

function textSpans(lines: string[], x: number, lineH: number): string {
  return lines.map((line, lineIndex) => `<tspan x="${x}" dy="${lineIndex === 0 ? 0 : lineH}">${escapeXml(line)}</tspan>`).join('')
}

function renderColumnItem(placement: ColumnItemPlacement, theme: MdArtTheme): string {
  const textX = placement.colStartX + COL_TEXT_X
  const topY = placement.rowY + (placement.rowH - placement.layout.blockH) / 2
  const dotCy = topY + LBL_FS * 0.4
  const labelY = topY + LBL_FS * 0.75
  const labelTip = placement.layout.lblTrunc ? `<title>${escapeXml(placement.item.label)}</title>` : ''
  let svg = `<circle cx="${placement.colStartX + DOT_X}" cy="${dotCy.toFixed(1)}" r="${DOT_R}" fill="${placement.fill}" >${itemTitleTag(placement.item)}</circle>`
  svg += aWrap(`<text x="${textX}" y="${labelY.toFixed(1)}" font-size="${LBL_FS}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${labelTip}${textSpans(placement.layout.lblLines, textX, LBL_LH)}</text>`, placement.layout.lblUrl)

  if (placement.layout.capLines.length > 0) {
    const capY = labelY + placement.layout.lblLines.length * LBL_LH + SEC_G
    const capTip = placement.layout.capTrunc ? `<title>${escapeXml(placement.layout.caption!)}</title>` : ''
    svg += `<text x="${textX}" y="${capY.toFixed(1)}" font-size="${CAP_FS}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${capTip}${textSpans(placement.layout.capLines, textX, CAP_LH)}</text>`
  }

  return svg
}

function renderRow(row: number, spec: MdArtSpec, layout: ColumnLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const left = itemPlacement(spec, layout, row, false, theme)
  const right = itemPlacement(spec, layout, row, true, theme)
  const rowStr = [left, right].filter((p): p is ColumnItemPlacement => !!p).map(p => renderColumnItem(p, theme)).join('')
  return wrapItem(rowStr, row, animate, instrument) + renderRowDivider(row, layout, theme)
}

function renderSvg(layout: ColumnLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  const animate = shouldAnimate(spec)
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${layout.height}" fill="${theme.bg}" rx="8"/>
    ${animate ? seqSpotlightCSS(layout.maxRows, spec, { scale: false }) : ''}
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)

  const layout = resolveLayout(spec)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts = [
    renderTitle(spec, theme),
    renderColumnDivider(layout, theme),
    ...Array.from({ length: layout.maxRows }, (_, row) => renderRow(row, spec, layout, theme, animate, instrument)),
  ].filter(Boolean)

  return renderSvg(layout, spec, theme, parts)
}
