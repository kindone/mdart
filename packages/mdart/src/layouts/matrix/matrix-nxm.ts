import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, renderEmpty, ellipsisIfDropped, itemTitleTag, shouldAnimate, seqSpotlightCSS, renderWrappedText, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const LABEL_W = 110
const LINE_H = 12
const PAD_V = 8
const MIN_CELL_H = 32
const TITLE_H = 28
const BOTTOM_PAD = 8

interface MatrixLayout {
  rows: MdArtItem[]
  numCols: number
  colW: number
  width: number
  titleH: number
  headerH: number
  height: number
  colHeaders: string[]
  colHeaderWraps: Wrap[]
  rowLabelWraps: Wrap[]
  cellWraps: Wrap[][]
  rowHeights: number[]
  rowY: number[]
}

type Wrap = { lines: string[], truncated: boolean, url?: string | null }

function centeredY(baseY: number, cellH: number, lineCount: number): number {
  return baseY + Math.round(cellH / 2) - Math.round((lineCount - 1) * LINE_H / 2) + 5
}

function cellHeight(lineCount: number): number {
  return Math.max(MIN_CELL_H, PAD_V + lineCount * LINE_H + PAD_V)
}

function renderText(cx: number | string, y: number, attrs: string, label: string, wrap: Wrap): string {
  return renderWrappedText(cx, y, attrs, label, wrap, LINE_H)
}

function resolveLayout(spec: MdArtSpec): MatrixLayout | null {
  const rows = spec.items
  if (rows.length === 0) return null

  const numCols = Math.max(...rows.map(row => row.children.length), 1)
  const colW = Math.min(160, Math.max(90, 520 / numCols))
  const width = LABEL_W + numCols * colW
  const titleH = spec.title ? TITLE_H : 0
  const colHeaders = Array.from({ length: numCols }, (_, index) => spec.columns?.[index] ?? String.fromCharCode(65 + index))
  const colLabelMax = Math.floor(colW / 7)
  const rowLabelMax = Math.floor(LABEL_W / 7)
  const cellMax = Math.floor(colW / 6.5)
  const colHeaderWraps = colHeaders.map(header => wrapLabel(header, colLabelMax, 5))
  const rowLabelWraps = rows.map(row => wrapLabel(ellipsisIfDropped(row.label, row), rowLabelMax, 5))
  const cellWraps = rows.map(row =>
    Array.from({ length: numCols }, (_, colIndex) => {
      const cell = row.children[colIndex]
      return cell ? wrapLabel(ellipsisIfDropped(cell.label, cell), cellMax, 5) : { lines: [] as string[], truncated: false }
    }),
  )
  const maxHeaderLines = Math.max(...colHeaderWraps.map(wrap => wrap.lines.length), 1)
  const headerH = Math.max(MIN_CELL_H, PAD_V + maxHeaderLines * LINE_H + PAD_V)
  const rowHeights = rows.map((_, rowIndex) => {
    const rowLabelLines = rowLabelWraps[rowIndex].lines.length
    const cellLines = cellWraps[rowIndex].map(wrap => wrap.lines.length)
    return cellHeight(Math.max(rowLabelLines, ...cellLines, 1))
  })
  const rowY: number[] = []
  let y = titleH + headerH
  rowHeights.forEach(height => {
    rowY.push(y)
    y += height
  })

  return { rows, numCols, colW, width, titleH, headerH, height: y + BOTTOM_PAD, colHeaders, colHeaderWraps, rowLabelWraps, cellWraps, rowHeights, rowY }
}

function renderTitle(spec: MdArtSpec, layout: MatrixLayout, theme: MdArtTheme): string {
  if (!spec.title) return ''
  return `<text x="${layout.width / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(spec.title)}</text>`
}

function renderHeader(layout: MatrixLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const unit = [
    `<rect x="0" y="${layout.titleH}" width="${LABEL_W}" height="${layout.headerH}" fill="${theme.surface}" stroke="${theme.border}" stroke-width="0.5"/>`,
  ]
  for (let colIndex = 0; colIndex < layout.numCols; colIndex++) {
    const colX = LABEL_W + colIndex * layout.colW
    const wrap = layout.colHeaderWraps[colIndex]
    unit.push(`<rect x="${colX}" y="${layout.titleH}" width="${layout.colW}" height="${layout.headerH}" fill="${theme.primary}28" stroke="${theme.border}" stroke-width="0.5"/>`)
    unit.push(renderText(
      colX + layout.colW / 2,
      centeredY(layout.titleH, layout.headerH, wrap.lines.length),
      `text-anchor="middle" font-size="11" fill="${theme.primary}" ${FONT_SANS_ATTR} font-weight="700"`,
      layout.colHeaders[colIndex],
      wrap,
    ))
  }
  return wrapItem(unit.join(''), 0, animate, instrument)
}

function renderRow(row: MdArtItem, rowIndex: number, layout: MatrixLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const y = layout.rowY[rowIndex]
  const height = layout.rowHeights[rowIndex]
  const rowBg = rowIndex % 2 === 0 ? theme.surface : theme.bg
  const unit = [
    `<rect x="0" y="${y}" width="${LABEL_W}" height="${height}" fill="${rowBg}" stroke="${theme.border}" stroke-width="0.5">${itemTitleTag(row)}</rect>`,
  ]
  const rowWrap = layout.rowLabelWraps[rowIndex]
  unit.push(renderText(
    8,
    centeredY(y, height, rowWrap.lines.length),
    `font-size="10.5" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600"`,
    row.label,
    rowWrap,
  ))
  for (let colIndex = 0; colIndex < layout.numCols; colIndex++) {
    const colX = LABEL_W + colIndex * layout.colW
    const cell = row.children[colIndex]
    const cellTip = cell ? itemTitleTag(cell) : ''
    unit.push(`<rect x="${colX}" y="${y}" width="${layout.colW}" height="${height}" fill="${rowBg}" stroke="${theme.border}" stroke-width="0.5">${cellTip}</rect>`)
    if (cell) {
      const wrap = layout.cellWraps[rowIndex][colIndex]
      unit.push(renderText(
        colX + layout.colW / 2,
        centeredY(y, height, wrap.lines.length),
        `text-anchor="middle" font-size="10.5" fill="${theme.text}" ${FONT_SANS_ATTR}`,
        cell.label,
        wrap,
      ))
    }
  }
  return wrapItem(unit.join(''), rowIndex + 1, animate, instrument)
}

function renderSvg(layout: MatrixLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  const animate = shouldAnimate(spec)
  return `<svg viewBox="0 0 ${layout.width} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${layout.width}" height="${layout.height}" fill="${theme.bg}" rx="8"/>
    ${animate ? seqSpotlightCSS(layout.rows.length + 1, spec, { scale: false, loopStartIndex: 1 }) : ''}
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const layout = resolveLayout(spec)
  if (!layout) return renderEmpty(theme)

  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts = [
    renderTitle(spec, layout, theme),
    renderHeader(layout, theme, animate, instrument),
    ...layout.rows.map((row, rowIndex) => renderRow(row, rowIndex, layout, theme, animate, instrument)),
  ].filter(Boolean)

  return renderSvg(layout, spec, theme, parts)
}
