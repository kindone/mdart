import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, centeredTextY, renderWrappedText, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const LABEL_W = 116
const PAD_V = 7
const MIN_CELL_H = 40
const MIN_HEADER_H = 30
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 8

type TextFit = ReturnType<typeof fitTextToWidthShared>

interface HeatmapLayout {
  rows: MdArtItem[]
  numCols: number
  cellW: number
  labelW: number
  titleH: number
  headerH: number
  rowHeights: number[]
  rowY: number[]
  width: number
  height: number
  maxVal: number
  colHeaders: string[]
  colHeaderFits: TextFit[]
  rowDisplays: Array<ReturnType<typeof displayLabel>>
  rowLabelFits: TextFit[]
  cellFits: Array<Array<TextFit | null>>
}

function svg(layout: HeatmapLayout, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${layout.width / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${layout.width} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

function cellValue(cell: MdArtItem): number {
  const raw = (cell.value ?? cell.attrs[0] ?? cell.label.match(/[\d.]+/)?.[0] ?? '0').replace('%', '')
  return parseFloat(raw) || 0
}

function cellText(cell: MdArtItem): string {
  return cell.value ?? cell.label
}

function blockHeight(fit: TextFit): number {
  return fit.results[0].lines.length * fit.lineHeight
}

function resolveLayout(spec: MdArtSpec): HeatmapLayout {
  const rows = spec.items
  const numCols = Math.max(...rows.map(row => row.children.length), 1)
  const cellW = Math.min(96, Math.max(54, 560 / numCols))
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const width = LABEL_W + numCols * cellW
  const values = rows.flatMap(row => row.children.map(cellValue))
  const maxVal = Math.max(...values, 1)
  const derivedCols = rows[0]?.children.map(ch => ch.label) ?? []
  const colHeaders = Array.from({ length: numCols }, (_, col) =>
    spec.columns?.[col] ?? derivedCols[col] ?? String.fromCharCode(65 + col)
  )
  const colHeaderFits = colHeaders.map(header =>
    fitTextToWidthShared([header], cellW - 8, { maxSize: 10, minSize: 6.5, maxLines: 3, boxH: 48 }),
  )
  const rowDisplays = rows.map(row => displayLabel(row))
  const rowLabelFits = rowDisplays.map(({ display }) =>
    fitTextToWidthShared([display], LABEL_W - 14, { maxSize: 10, minSize: 6.5, maxLines: 3, boxH: 54 }),
  )
  const cellFits = rows.map(row =>
    Array.from({ length: numCols }, (_, col) => {
      const cell = row.children[col]
      return cell ? fitTextToWidthShared([cellText(cell)], cellW - 8, { maxSize: 10, minSize: 6, maxLines: 3, boxH: 54 }) : null
    }),
  )
  const headerH = Math.max(MIN_HEADER_H, PAD_V * 2, ...colHeaderFits.map(fit => PAD_V * 2 + blockHeight(fit)))
  const rowHeights = rows.map((_, row) => {
    const rowLabelH = blockHeight(rowLabelFits[row])
    const cellHs = cellFits[row].map(fit => fit ? blockHeight(fit) : 0)
    return Math.max(MIN_CELL_H, PAD_V * 2 + rowLabelH, PAD_V * 2 + Math.max(...cellHs, 0))
  })
  const rowY: number[] = []
  let cursorY = titleH + headerH
  for (const height of rowHeights) {
    rowY.push(cursorY)
    cursorY += height
  }
  return {
    rows,
    numCols,
    cellW,
    labelW: LABEL_W,
    titleH,
    headerH,
    rowHeights,
    rowY,
    width,
    height: cursorY + 8,
    maxVal,
    colHeaders,
    colHeaderFits,
    rowDisplays,
    rowLabelFits,
    cellFits,
  }
}

function textBlock(x: number, baseY: number, boxH: number, fit: TextFit, attrs: string, fullText: string): string {
  const wrap = fit.results[0]
  return renderWrappedText(x, centeredTextY(baseY, boxH, wrap.lines.length, fit.lineHeight), attrs, fullText, wrap, fit.lineHeight)
}

function renderHeader(layout: HeatmapLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const unit: string[] = [
    `<rect x="0" y="${layout.titleH}" width="${layout.labelW}" height="${layout.headerH}" fill="${theme.surface}" stroke="${theme.border}" stroke-width="0.5"/>`,
  ]
  for (let col = 0; col < layout.numCols; col++) {
    const x = layout.labelW + col * layout.cellW
    const fit = layout.colHeaderFits[col]
    unit.push(`<rect x="${x}" y="${layout.titleH}" width="${layout.cellW}" height="${layout.headerH}" fill="${theme.surface}" stroke="${theme.border}" stroke-width="0.5"/>`)
    unit.push(textBlock(x + layout.cellW / 2, layout.titleH, layout.headerH, fit,
      `text-anchor="middle" font-size="${fit.fontSize}" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600"`,
      layout.colHeaders[col]))
  }
  return wrapItem(unit.join(''), 0, animate, instrument)
}

function renderCell(cell: MdArtItem, rowIndex: number, col: number, layout: HeatmapLayout, theme: MdArtTheme): string {
  const x = layout.labelW + col * layout.cellW
  const y = layout.rowY[rowIndex]
  const rowH = layout.rowHeights[rowIndex]
  const value = Math.min(cellValue(cell) / layout.maxVal, 1)
  const alpha = Math.round(18 + value * 210).toString(16).padStart(2, '0')
  const fit = layout.cellFits[rowIndex][col]
  const textFill = value > 0.55 ? theme.bg : theme.text
  return `<rect x="${x}" y="${y}" width="${layout.cellW}" height="${rowH}" fill="${theme.primary}${alpha}" stroke="${theme.border}55" stroke-width="0.5">${itemTitleTag(cell)}</rect>`
    + (fit ? textBlock(x + layout.cellW / 2, y, rowH, fit,
      `text-anchor="middle" font-size="${fit.fontSize}" fill="${textFill}" ${FONT_SANS_ATTR}`,
      cellText(cell)) : '')
}

function renderRow(row: MdArtItem, rowIndex: number, layout: HeatmapLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const y = layout.rowY[rowIndex]
  const rowH = layout.rowHeights[rowIndex]
  const { display, url } = layout.rowDisplays[rowIndex]
  const rowFit = layout.rowLabelFits[rowIndex]
  const unit = [
    `<rect x="0" y="${y}" width="${layout.labelW}" height="${rowH}" fill="${theme.surface}" stroke="${theme.border}" stroke-width="0.5">${itemTitleTag(row)}</rect>`,
    aWrap(textBlock(8, y, rowH, rowFit,
      `font-size="${rowFit.fontSize}" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600"`,
      display), url),
    ...row.children.slice(0, layout.numCols).map((cell, col) => renderCell(cell, rowIndex, col, layout, theme)),
  ]
  return wrapItem(unit.join(''), rowIndex + 1, animate, instrument)
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layout = resolveLayout(spec)
  const parts = [
    ...(animate ? [seqSpotlightCSS(layout.rows.length + 1, spec, { scale: false, loopStartIndex: 1 })] : []),
    renderHeader(layout, theme, animate, instrument),
    ...layout.rows.map((row, index) => renderRow(row, index, layout, theme, animate, instrument)),
  ]
  return svg(layout, theme, spec.title, parts)
}
