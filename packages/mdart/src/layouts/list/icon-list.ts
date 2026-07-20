import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, lerpColor, renderEmpty, getCaption, itemTitleTag, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, renderInlineMarkdown, FONT_SANS_ATTR } from '../shared'

const W = 500
const LEFT = 24
const CIRCLE_R = 18
const TEXT_X = LEFT + CIRCLE_R + 10
const PAD_T = 8
const PAD_B = 8
const LBL_FS = 12
const LBL_LH = 15
const CAP_FS = 10
const CAP_LH = 13
const SEC_G = 4
const MIN_H = 42
const RIGHT_M = 16
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 8
const BOTTOM_PAD = 8
const DIVIDER_RIGHT = 16
const ICON_FS = 14

const LABEL_MAX = Math.max(12, Math.floor((W - TEXT_X - RIGHT_M) / 6.5))
const CAP_MAX = Math.max(12, Math.floor((W - TEXT_X - RIGHT_M) / 5.2))

interface IconParts {
  displayLabel: string
  icon: string
}

interface RowLayout {
  displayLabel: string
  icon: string
  lblLines: string[]
  lblTrunc: boolean
  lblUrl: string | null
  capLines: string[]
  capTrunc: boolean
  caption: string | null
  blockH: number
  rowH: number
}

interface IconRow {
  item: MdArtItem
  index: number
  y: number
  cy: number
  fill: string
  layout: RowLayout
}

function titleHeight(spec: MdArtSpec): number {
  return spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
}

function splitIcon(item: MdArtItem): IconParts {
  const emojiMatch = item.label.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u)
  return {
    icon: emojiMatch ? emojiMatch[1] : (item.attrs[0] ?? ''),
    displayLabel: emojiMatch ? item.label.slice(emojiMatch[0].length) : item.label,
  }
}

function computeRowLayout(item: MdArtItem): RowLayout {
  const { displayLabel, icon } = splitIcon(item)
  const { lines: lblLines, truncated: lblTrunc, url: lblUrl } = wrapLabel(displayLabel, LABEL_MAX, 5)
  const caption = getCaption(item)
  const { lines: capLines, truncated: capTrunc } = caption
    ? wrapLabel(caption, CAP_MAX, 5)
    : { lines: [], truncated: false }
  const blockH = lblLines.length * LBL_LH
    + (capLines.length > 0 ? SEC_G + capLines.length * CAP_LH : 0)
  return {
    displayLabel,
    icon,
    lblLines,
    lblTrunc,
    lblUrl,
    capLines,
    capTrunc,
    caption,
    blockH,
    rowH: Math.max(MIN_H, PAD_T + blockH + PAD_B),
  }
}

function placeRows(spec: MdArtSpec, theme: MdArtTheme): IconRow[] {
  const layouts = spec.items.map(computeRowLayout)
  let y = titleHeight(spec)
  return spec.items.map((item, index) => {
    const layout = layouts[index]
    const row: IconRow = {
      item,
      index,
      y,
      cy: y + layout.rowH / 2,
      fill: lerpColor(theme.primary, theme.secondary, spec.items.length > 1 ? index / (spec.items.length - 1) : 0),
      layout,
    }
    y += layout.rowH
    return row
  })
}

function diagramHeight(rows: IconRow[]): number {
  const last = rows[rows.length - 1]
  return last.y + last.layout.rowH + BOTTOM_PAD
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  return spec.title
    ? `<text x="${W / 2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(spec.title)}</text>`
    : ''
}

function renderIconMarker(row: IconRow): string {
  const icon = row.layout.icon
  return [
    `<circle cx="${LEFT}" cy="${row.cy.toFixed(1)}" r="${CIRCLE_R}" fill="${row.fill}">${itemTitleTag(row.item)}</circle>`,
    icon ? `<text x="${LEFT}" y="${(row.cy + 5).toFixed(1)}" text-anchor="middle" font-size="${ICON_FS}" ${FONT_SANS_ATTR}>${escapeXml(icon)}</text>` : '',
  ].join('')
}

function labelStartY(row: IconRow): number {
  return row.y + (row.layout.rowH - row.layout.blockH) / 2 + LBL_FS * 0.75
}

function renderLabel(row: IconRow, theme: MdArtTheme): string {
  const { displayLabel, lblLines, lblTrunc, lblUrl } = row.layout
  const tip = lblTrunc ? `<title>${escapeXml(displayLabel)}</title>` : ''
  const spans = lblLines
    .map((line, index) => renderInlineMarkdown(line, { x: TEXT_X, dy: index === 0 ? 0 : LBL_LH }))
    .join('')
  return aWrap(`<text x="${TEXT_X}" y="${labelStartY(row).toFixed(1)}" font-size="${LBL_FS}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${tip}${spans}</text>`, lblUrl)
}

function renderCaption(row: IconRow, theme: MdArtTheme): string {
  const { capLines, capTrunc, caption, lblLines } = row.layout
  if (capLines.length === 0) return ''
  const capStartY = labelStartY(row) + lblLines.length * LBL_LH + SEC_G
  const tip = capTrunc ? `<title>${escapeXml(caption!)}</title>` : ''
  const spans = capLines
    .map((line, index) => renderInlineMarkdown(line, { x: TEXT_X, dy: index === 0 ? 0 : CAP_LH }))
    .join('')
  return `<text x="${TEXT_X}" y="${capStartY.toFixed(1)}" font-size="${CAP_FS}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tip}${spans}</text>`
}

function renderDivider(row: IconRow, rowCount: number, theme: MdArtTheme): string {
  if (row.index >= rowCount - 1) return ''
  return `<line x1="${TEXT_X}" y1="${row.y + row.layout.rowH}" x2="${W - DIVIDER_RIGHT}" y2="${row.y + row.layout.rowH}" stroke="${theme.border}" stroke-width="0.5"/>`
}

function renderRow(row: IconRow, rowCount: number, theme: MdArtTheme, animate: boolean, instrument: boolean): string[] {
  const unit = [
    renderIconMarker(row),
    renderLabel(row, theme),
    renderCaption(row, theme),
  ].join('')
  return [
    wrapItem(unit, row.index, animate, instrument),
    renderDivider(row, rowCount, theme),
  ].filter(Boolean)
}

function renderSvg(rows: IconRow[], theme: MdArtTheme, parts: string[]): string {
  const h = diagramHeight(rows)
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
    ...rows.flatMap(row => renderRow(row, rows.length, theme, animate, instrument)),
  ]
  if (animate) parts.unshift(seqSpotlightCSS(rows.length, spec))
  return renderSvg(rows, theme, parts)
}
