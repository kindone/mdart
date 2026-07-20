import type { MdArtSpec, MdArtItem } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, lerpColor, renderEmpty, itemTitleTag, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const COLS = 2
const W = 500
const GAP = 8
const CELL_W = (W - (COLS - 1) * GAP) / COLS
const MIN_CELL_H = 56
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 8
const BOTTOM_PAD = 8

const PAD_L = 16
const PAD_T = 14
const PAD_B = 10
const SEC_G = 5
const ACCENT_W = 6
const ACCENT_RX = 3

const LBL_FS = 12
const LBL_LH = 15
const VAL_FS = 10
const VAL_LH = 13
const CHD_FS = 10
const CHD_LH = 13

const LABEL_MAX = Math.max(8, Math.floor((CELL_W - PAD_L - 8) / 6.5))
const VALUE_MAX = Math.max(10, Math.floor((CELL_W - PAD_L - 8) / 5.5))
const CHILD_MAX = Math.max(8, Math.floor((CELL_W - PAD_L - 8) / 5.5) - 2)

interface ItemLayout {
  lblLines: string[]
  lblTrunc: boolean
  lblUrl: string | null
  valLines: string[]
  valTrunc: boolean
  valUrl: string | null
  chdLayouts: Array<{ lines: string[]; truncated: boolean; text: string }>
  h: number
}

interface GridLayout {
  rows: number
  titleH: number
  rowHeights: number[]
  rowY: number[]
  height: number
  items: ItemLayout[]
}

interface CellPlacement {
  item: MdArtItem
  layout: ItemLayout
  index: number
  x: number
  y: number
  h: number
  fill: string
}

function titleHeight(spec: MdArtSpec): number {
  return spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
}

function computeItemLayout(item: MdArtItem): ItemLayout {
  const { lines: lblLines, truncated: lblTrunc, url: lblUrl } = wrapLabel(item.label, LABEL_MAX, 5)
  const { lines: valLines, truncated: valTrunc, url: valUrl } = item.value
    ? wrapLabel(item.value, VALUE_MAX, 5)
    : { lines: [], truncated: false, url: null }

  const chdLayouts = item.children.map(ch => {
    const text = ch.value ? `${ch.label}: ${ch.value}` : ch.label
    return { ...wrapLabel(text, CHILD_MAX, 5), text }
  })
  const totalChdLines = chdLayouts.reduce((s, cl) => s + cl.lines.length, 0)

  let h = PAD_T + lblLines.length * LBL_LH
  if (valLines.length > 0) h += SEC_G + valLines.length * VAL_LH
  if (totalChdLines > 0) h += SEC_G + totalChdLines * CHD_LH
  h += PAD_B

  return { lblLines, lblTrunc, lblUrl, valLines, valTrunc, valUrl, chdLayouts, h: Math.max(MIN_CELL_H, h) }
}

function resolveLayout(spec: MdArtSpec): GridLayout {
  const itemLayouts = spec.items.map(computeItemLayout)
  const rows = Math.ceil(spec.items.length / COLS)
  const rowHeights = Array.from({ length: rows }, (_, row) => {
    const a = itemLayouts[row * COLS]?.h ?? MIN_CELL_H
    const b = itemLayouts[row * COLS + 1]?.h ?? 0
    return Math.max(a, b)
  })

  const rowY: number[] = []
  let y = titleHeight(spec)
  for (const rowH of rowHeights) {
    rowY.push(y)
    y += rowH + GAP
  }

  return {
    rows,
    titleH: titleHeight(spec),
    rowHeights,
    rowY,
    height: y - GAP + BOTTOM_PAD,
    items: itemLayouts,
  }
}

function placeCells(spec: MdArtSpec, layout: GridLayout, theme: MdArtTheme): CellPlacement[] {
  return spec.items.map((item, index) => {
    const col = index % COLS
    const row = Math.floor(index / COLS)
    const t = spec.items.length > 1 ? index / (spec.items.length - 1) : 0
    return {
      item,
      layout: layout.items[index],
      index,
      x: col * (CELL_W + GAP),
      y: layout.rowY[row],
      h: layout.rowHeights[row],
      fill: lerpColor(theme.primary, theme.secondary, t),
    }
  })
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  if (!spec.title) return ''
  return `<text x="${W / 2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(spec.title)}</text>`
}

function tspans(lines: string[], x: string, lineH: number, prefixFirst = ''): string {
  return lines.map((line, lineIndex) => lineIndex === 0
    ? `<tspan x="${x}" dy="0">${prefixFirst}${escapeXml(line)}</tspan>`
    : `<tspan x="${x}" dy="${lineH}">${escapeXml(line)}</tspan>`)
    .join('')
}

function renderCellShape(cell: CellPlacement): string {
  const x = cell.x.toFixed(1)
  const y = cell.y.toFixed(1)
  return `<rect x="${x}" y="${y}" width="${CELL_W.toFixed(1)}" height="${cell.h}" rx="8" fill="${cell.fill}33" stroke="${cell.fill}88" stroke-width="1.5">${itemTitleTag(cell.item)}</rect>` +
    `<rect x="${x}" y="${y}" width="${ACCENT_W}" height="${cell.h}" rx="${ACCENT_RX}" fill="${cell.fill}"/>`
}

function renderLabel(cell: CellPlacement, theme: MdArtTheme, tx: string): string {
  const tip = cell.layout.lblTrunc ? `<title>${escapeXml(cell.item.label)}</title>` : ''
  return aWrap(`<text x="${tx}" y="${(cell.y + PAD_T).toFixed(1)}" font-size="${LBL_FS}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${tip}${tspans(cell.layout.lblLines, tx, LBL_LH)}</text>`, cell.layout.lblUrl)
}

function renderValue(cell: CellPlacement, theme: MdArtTheme, tx: string, textY: number): { svg: string; nextY: number } {
  if (cell.layout.valLines.length === 0) return { svg: '', nextY: textY }
  const y = textY + SEC_G
  const tip = cell.layout.valTrunc ? `<title>${escapeXml(cell.item.value ?? '')}</title>` : ''
  const svg = aWrap(`<text x="${tx}" y="${y.toFixed(1)}" font-size="${VAL_FS}" fill="${theme.textMuted}" font-style="italic" ${FONT_SANS_ATTR}>${tip}${tspans(cell.layout.valLines, tx, VAL_LH)}</text>`, cell.layout.valUrl)
  return { svg, nextY: y + cell.layout.valLines.length * VAL_LH }
}

function renderChildren(cell: CellPlacement, theme: MdArtTheme, tx: string, ctx: string, textY: number): string {
  if (cell.layout.chdLayouts.length === 0) return ''
  let y = textY + SEC_G
  return cell.layout.chdLayouts.map(({ lines, truncated, text }, childIndex) => {
    const tip = truncated ? `<title>${escapeXml(text)}</title>` : ''
    const opacity = childIndex < 2 ? '1' : '0.7'
    const spans = lines.map((line, lineIndex) => lineIndex === 0
      ? `<tspan x="${tx}" dy="0">· ${escapeXml(line)}</tspan>`
      : `<tspan x="${ctx}" dy="${CHD_LH}">${escapeXml(line)}</tspan>`)
      .join('')
    const svg = `<text x="${tx}" y="${y.toFixed(1)}" font-size="${CHD_FS}" fill="${theme.textMuted}" fill-opacity="${opacity}" ${FONT_SANS_ATTR}>${tip}${spans}</text>`
    y += lines.length * CHD_LH
    return svg
  }).join('')
}

function renderCell(cell: CellPlacement, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const tx = (cell.x + PAD_L).toFixed(1)
  const ctx = (cell.x + PAD_L + 8).toFixed(1)
  let textY = cell.y + PAD_T + cell.layout.lblLines.length * LBL_LH
  const value = renderValue(cell, theme, tx, textY)
  textY = value.nextY
  const node = renderCellShape(cell) +
    renderLabel(cell, theme, tx) +
    value.svg +
    renderChildren(cell, theme, tx, ctx, textY)
  return wrapItem(node, cell.index, animate, instrument)
}

function renderSvg(layout: GridLayout, theme: MdArtTheme, parts: string[]): string {
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
  const cells = placeCells(spec, layout, theme)
  const parts = [
    ...(animate ? [seqSpotlightCSS(spec.items.length, spec)] : []),
    renderTitle(spec, theme),
    ...cells.map(cell => renderCell(cell, theme, animate, instrument)),
  ].filter(Boolean)

  return renderSvg(layout, theme, parts)
}
