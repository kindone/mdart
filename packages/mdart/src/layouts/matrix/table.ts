import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, renderWrappedText, wrapLabel, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, itemSummary, FONT_SANS_ATTR } from '../shared'

const PAD_X = 10
const PAD_Y = 8
const LINE_H = 13
const TITLE_H = 30
const MIN_ROW_H = 34
const MIN_COL_W = 74
const MAX_COL_W = 190
const MAX_W = 760
const BOTTOM_PAD = 10

type TableCell = {
  text: string
  title?: string
}

type TableAlign = 'left' | 'center' | 'right'

type TableModel = {
  headers: string[]
  alignments: TableAlign[]
  rows: TableCell[][]
}

type WrappedCell = {
  lines: string[]
  truncated: boolean
  url?: string | null
}

type TableLayout = {
  model: TableModel
  titleH: number
  colWidths: number[]
  rowHeights: number[]
  headerH: number
  rowY: number[]
  width: number
  height: number
  headerWraps: WrappedCell[]
  cellWraps: WrappedCell[][]
}

function splitPipeRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  const cells: string[] = []
  let cur = ''
  let escaped = false
  for (const ch of trimmed) {
    if (escaped) {
      cur += ch
      escaped = false
      continue
    }
    if (ch === '\\') {
      escaped = true
      continue
    }
    if (ch === '|') {
      cells.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  cells.push(cur.trim())
  return cells
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every(cell => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, '')))
}

function parseAlignment(cell: string): TableAlign {
  const trimmed = cell.replace(/\s+/g, '')
  const left = trimmed.startsWith(':')
  const right = trimmed.endsWith(':')
  if (left && right) return 'center'
  if (right) return 'right'
  return 'left'
}

function parseMarkdownTable(raw: string): TableModel | null {
  const lines = raw.split('\n')
  for (let i = 0; i < lines.length - 1; i++) {
    if (!lines[i].includes('|') || !lines[i + 1].includes('|')) continue
    const headers = splitPipeRow(lines[i])
    const separator = splitPipeRow(lines[i + 1])
    if (headers.length < 2 || !isSeparatorRow(separator)) continue
    const alignments = headers.map((_, index) => parseAlignment(separator[index] ?? '---'))
    const rows: TableCell[][] = []
    for (let j = i + 2; j < lines.length; j++) {
      const line = lines[j].trim()
      if (!line || !line.includes('|')) break
      const cells = splitPipeRow(line)
      rows.push(headers.map((_, index) => ({ text: cells[index] ?? '' })))
    }
    return { headers, alignments, rows }
  }
  return null
}

function cellText(item: MdArtItem): string {
  return item.value ? `${item.label}: ${item.value}` : item.label
}

function parseListTable(spec: MdArtSpec): TableModel | null {
  const rows = spec.items
  if (rows.length === 0) return null

  const hasChildren = rows.some(row => row.children.length > 0)
  if (!hasChildren) {
    const hasValues = rows.some(row => row.value)
    return {
      headers: hasValues ? ['Item', 'Value'] : ['Item'],
      alignments: hasValues ? ['left', 'center'] : ['left'],
      rows: rows.map(row => hasValues
        ? [{ text: row.label, title: itemSummary(row) }, { text: row.value ?? '', title: itemSummary(row) }]
        : [{ text: cellText(row), title: itemSummary(row) }],
      ),
    }
  }

  const keyedHeaders = Array.from(new Set(rows.flatMap(row =>
    row.children.filter(child => child.value !== undefined).map(child => child.label),
  )))
  if (keyedHeaders.length > 0) {
    const headers = spec.columns?.length ? spec.columns : keyedHeaders
    return {
      headers: ['Item', ...headers],
      alignments: ['left', ...headers.map(() => 'center' as const)],
      rows: rows.map(row => [
        { text: cellText(row), title: itemSummary(row) },
        ...headers.map(header => {
          const child = row.children.find(c => c.value !== undefined && c.label === header)
          return { text: child?.value ?? '', title: child ? itemSummary(child) : undefined }
        }),
      ]),
    }
  }

  const numCols = Math.max(...rows.map(row => row.children.length), 1)
  const headers = ['Item', ...(spec.columns?.length ? spec.columns.slice(0, numCols) : Array.from({ length: numCols }, (_, i) => String.fromCharCode(65 + i)))]
  return {
    headers,
    alignments: ['left', ...headers.slice(1).map(() => 'center' as const)],
    rows: rows.map(row => [
      { text: cellText(row), title: itemSummary(row) },
      ...Array.from({ length: numCols }, (_, index) => {
        const child = row.children[index]
        return { text: child ? cellText(child) : '', title: child ? itemSummary(child) : undefined }
      }),
    ]),
  }
}

function resolveModel(spec: MdArtSpec): TableModel | null {
  return parseMarkdownTable(spec.raw) ?? parseListTable(spec)
}

function columnWidths(model: TableModel, targetWidth: number): number[] {
  const widths = model.headers.map((header, colIndex) => {
    const texts = [header, ...model.rows.map(row => row[colIndex]?.text ?? '')]
    const maxChars = Math.max(...texts.map(text => text.length), 4)
    return Math.min(MAX_COL_W, Math.max(MIN_COL_W, maxChars * 6.4 + PAD_X * 2))
  })
  const total = widths.reduce((sum, width) => sum + width, 0)
  if (total <= targetWidth) return widths
  const scale = targetWidth / total
  return widths.map(width => Math.max(MIN_COL_W, Math.floor(width * scale)))
}

function wrappedText(text: string, width: number, maxLines: number): WrappedCell {
  return wrapLabel(text, Math.max(6, Math.floor((width - PAD_X * 2) / 6.5)), maxLines)
}

function rowHeight(wraps: WrappedCell[]): number {
  const lines = Math.max(...wraps.map(wrap => wrap.lines.length), 1)
  return Math.max(MIN_ROW_H, PAD_Y * 2 + lines * LINE_H)
}

function resolveLayout(spec: MdArtSpec, model: TableModel): TableLayout {
  const titleH = spec.title ? TITLE_H : 0
  const targetWidth = spec.width ? Math.max(320, spec.width) : MAX_W
  const colWidths = columnWidths(model, targetWidth)
  const width = colWidths.reduce((sum, colW) => sum + colW, 0)
  const headerWraps = model.headers.map((header, index) => wrappedText(header, colWidths[index], 3))
  const cellWraps = model.rows.map(row => row.map((cell, index) => wrappedText(cell.text, colWidths[index], 5)))
  const headerH = Math.max(MIN_ROW_H, rowHeight(headerWraps))
  const rowHeights = cellWraps.map(wraps => rowHeight(wraps))
  const rowY: number[] = []
  let y = titleH + headerH
  for (const height of rowHeights) {
    rowY.push(y)
    y += height
  }
  return {
    model,
    titleH,
    colWidths,
    rowHeights,
    headerH,
    rowY,
    width,
    height: y + BOTTOM_PAD,
    headerWraps,
    cellWraps,
  }
}

function centerY(y: number, height: number, lines: number): number {
  return y + Math.round(height / 2) - Math.round((lines - 1) * LINE_H / 2) + 5
}

function cellTitle(title: string | undefined): string {
  return title ? `<title>${escapeXml(title)}</title>` : ''
}

function renderText(x: number, y: number, attrs: string, label: string, wrap: WrappedCell): string {
  return renderWrappedText(x, y, attrs, label, wrap, LINE_H)
}

function alignedTextX(cellX: number, cellW: number, align: TableAlign): number {
  if (align === 'right') return cellX + cellW - PAD_X
  if (align === 'center') return cellX + cellW / 2
  return cellX + PAD_X
}

function textAnchorAttr(align: TableAlign): string {
  if (align === 'right') return 'text-anchor="end" '
  if (align === 'center') return 'text-anchor="middle" '
  return ''
}

function renderTitle(spec: MdArtSpec, layout: TableLayout, theme: MdArtTheme): string {
  if (!spec.title) return ''
  return `<text x="${layout.width / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(spec.title)}</text>`
}

function renderHeader(layout: TableLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const parts: string[] = []
  let x = 0
  for (let colIndex = 0; colIndex < layout.model.headers.length; colIndex++) {
    const colW = layout.colWidths[colIndex]
    const wrap = layout.headerWraps[colIndex]
    const align = layout.model.alignments[colIndex] ?? 'left'
    parts.push(`<rect x="${x}" y="${layout.titleH}" width="${colW}" height="${layout.headerH}" fill="${theme.primary}28" stroke="${theme.border}" stroke-width="0.5"/>`)
    parts.push(renderText(
      alignedTextX(x, colW, align),
      centerY(layout.titleH, layout.headerH, wrap.lines.length),
      `${textAnchorAttr(align)}font-size="11" fill="${theme.primary}" ${FONT_SANS_ATTR} font-weight="700"`,
      layout.model.headers[colIndex],
      wrap,
    ))
    x += colW
  }
  return wrapItem(parts.join(''), 0, animate, instrument)
}

function renderRow(rowIndex: number, layout: TableLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const y = layout.rowY[rowIndex]
  const height = layout.rowHeights[rowIndex]
  const bg = rowIndex % 2 === 0 ? theme.surface : theme.bg
  const parts: string[] = []
  let x = 0
  for (let colIndex = 0; colIndex < layout.model.headers.length; colIndex++) {
    const colW = layout.colWidths[colIndex]
    const cell = layout.model.rows[rowIndex][colIndex] ?? { text: '' }
    const wrap = layout.cellWraps[rowIndex][colIndex] ?? { lines: [], truncated: false }
    const align = layout.model.alignments[colIndex] ?? (colIndex === 0 ? 'left' : 'center')
    const firstCol = colIndex === 0
    parts.push(`<rect x="${x}" y="${y}" width="${colW}" height="${height}" fill="${bg}" stroke="${theme.border}" stroke-width="0.5">${cellTitle(cell.title || cell.text)}</rect>`)
    parts.push(renderText(
      alignedTextX(x, colW, align),
      centerY(y, height, wrap.lines.length),
      `${textAnchorAttr(align)}font-size="10.5" fill="${firstCol ? theme.textMuted : theme.text}" ${FONT_SANS_ATTR}${firstCol ? ' font-weight="600"' : ''}`,
      cell.text,
      wrap,
    ))
    x += colW
  }
  return wrapItem(parts.join(''), rowIndex + 1, animate, instrument)
}

function renderSvg(layout: TableLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  const animate = shouldAnimate(spec)
  return `<svg viewBox="0 0 ${layout.width} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
    <rect width="${layout.width}" height="${layout.height}" fill="${theme.bg}" rx="8"/>
    ${animate ? seqSpotlightCSS(layout.model.rows.length + 1, spec, { scale: false, loopStartIndex: 1 }) : ''}
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const model = resolveModel(spec)
  if (!model || model.headers.length === 0) return renderEmpty(theme)

  const layout = resolveLayout(spec, model)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts = [
    renderTitle(spec, layout, theme),
    renderHeader(layout, theme, animate, instrument),
    ...model.rows.map((_, rowIndex) => renderRow(rowIndex, layout, theme, animate, instrument)),
  ].filter(Boolean)

  return renderSvg(layout, spec, theme, parts)
}
