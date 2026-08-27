import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, tt, wrapLabel, renderEmpty, getCaption, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 500
const ROW_H_MIN = 32
const LBL_FS = 11
const LBL_LH = 14
const GAP = 4
const NOTCH = 14
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 8
const BOTTOM_PAD = 8
const CAPTION_RESERVE_W = 96
const CAPTION_MAX = 16
const LABEL_CHAR_PX = 6.2

interface ChevronRow {
  item: MdArtItem
  index: number
  y: number
  rowH: number
  fill: string
  caption: string | null
  lblLines: string[]
  lblTrunc: boolean
}

function titleHeight(spec: MdArtSpec): number {
  return spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
}

function diagramHeight(rows: ChevronRow[], spec: MdArtSpec): number {
  return titleHeight(spec) + rows.reduce((sum, row) => sum + row.rowH + GAP, 0) + BOTTOM_PAD
}

function placeRows(spec: MdArtSpec, theme: MdArtTheme): ChevronRow[] {
  let y = titleHeight(spec)
  return spec.items.map((item, index) => {
    const caption = getCaption(item)
    const rightReserve = caption ? CAPTION_RESERVE_W : 0
    const labelMax = Math.floor((W - NOTCH - rightReserve - 16) / LABEL_CHAR_PX)
    const { display } = displayLabel(item, { value: !!caption })
    const { lines: lblLines, truncated: lblTrunc } = wrapLabel(display, labelMax, 2)
    const rowH = Math.max(ROW_H_MIN, lblLines.length * LBL_LH + 14)
    const row: ChevronRow = {
      item,
      index,
      y,
      rowH,
      fill: lerpColor(theme.primary, theme.secondary, spec.items.length > 1 ? index / (spec.items.length - 1) : 0),
      caption,
      lblLines,
      lblTrunc,
    }
    y += rowH + GAP
    return row
  })
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  return spec.title
    ? `<text x="${W/2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(spec.title)}</text>`
    : ''
}

function chevronPath(row: ChevronRow): string {
  const x1 = W - NOTCH
  const rowH = row.rowH
  return row.index === 0
    ? `M0,${row.y} L${x1},${row.y} L${W},${row.y + rowH / 2} L${x1},${row.y+rowH} L0,${row.y+rowH} Z`
    : `M0,${row.y} L${x1},${row.y} L${W},${row.y + rowH / 2} L${x1},${row.y+rowH} L0,${row.y+rowH} L${NOTCH},${row.y + rowH / 2} Z`
}

function renderShape(row: ChevronRow): string {
  return `<path d="${chevronPath(row)}" fill="${row.fill}33" stroke="${row.fill}" stroke-width="1">${itemTitleTag(row.item)}</path>`
}

function renderLabel(row: ChevronRow, theme: MdArtTheme): string {
  const x0 = row.index === 0 ? 0 : NOTCH
  const x1 = W - NOTCH
  const cx = (x0 + x1) / 2 + NOTCH / 2
  const { url } = displayLabel(row.item, { value: !!row.caption })
  const blockH = row.lblLines.length * LBL_LH
  const startY = row.y + (row.rowH - blockH) / 2 + LBL_FS * 0.8
  const tip = row.lblTrunc ? `<title>${escapeXml(row.item.label)}</title>` : ''
  const spans = row.lblLines
    .map((line, li) => `<tspan x="${cx}" dy="${li === 0 ? 0 : LBL_LH}">${escapeXml(line)}</tspan>`)
    .join('')
  return aWrap(`<text x="${cx}" y="${startY.toFixed(1)}" text-anchor="middle" font-size="${LBL_FS}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${tip}${spans}</text>`, url)
}

function renderCaption(row: ChevronRow, theme: MdArtTheme): string {
  if (!row.caption) return ''
  const mid = row.y + row.rowH / 2
  return `<text x="${W - NOTCH - 6}" y="${(mid + 4).toFixed(1)}" text-anchor="end" font-size="9" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tt(row.caption, CAPTION_MAX)}</text>`
}

function renderRow(row: ChevronRow, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const unit = [
    renderShape(row),
    renderLabel(row, theme),
    renderCaption(row, theme),
  ].join('')
  return wrapItem(unit, row.index, animate, instrument)
}

function renderSvg(h: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${h}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const rows = placeRows(spec, theme)
  const parts = [
    renderTitle(spec, theme),
    ...rows.map(row => renderRow(row, theme, animate, instrument)),
  ]
  if (animate) parts.unshift(seqSpotlightCSS(rows.length, spec))
  return renderSvg(diagramHeight(rows, spec), theme, parts)
}
