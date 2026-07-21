import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const GRID = 10
const SQUARE = 18
const GAP = 3
const PAD = 16
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 10

interface WaffleLayout {
  width: number
  height: number
  titleH: number
  gridW: number
  gridX: number
  legendY: number
  rows: LegendRow[]
  colors: string[]
  squares: number[]
}

interface LegendRow {
  item: MdArtItem
  index: number
  y: number
  height: number
  label: ReturnType<typeof displayLabel>
  fit: ReturnType<typeof fitTextToWidthShared>
}

function svg(layout: WaffleLayout, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${layout.width / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${layout.width} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

function palette(theme: MdArtTheme): string[] {
  return [theme.primary, theme.secondary, theme.accent, theme.muted, ...theme.palette]
}

function rawValues(items: MdArtItem[]): number[] {
  return items.map(item => Math.max(0, parseFloat((item.value ?? item.attrs[0] ?? '0').replace('%', '')) || 0))
}

function squareCounts(items: MdArtItem[]): number[] {
  const values = rawValues(items)
  const total = values.reduce((a, b) => a + b, 0) || 100
  const squares = values.map(value => Math.round(value / total * 100))
  const diff = 100 - squares.reduce((a, b) => a + b, 0)
  if (diff !== 0) squares[0] = Math.max(0, squares[0] + diff)
  return squares
}

function ownerForSquare(index: number, squares: number[]): number {
  let acc = 0
  for (let i = 0; i < squares.length; i++) {
    acc += squares[i]
    if (index < acc) return i
  }
  return -1
}

function resolveLayout(spec: MdArtSpec, theme: MdArtTheme): WaffleLayout {
  const colors = palette(theme)
  const squares = squareCounts(spec.items)
  const gridW = GRID * (SQUARE + GAP) - GAP
  const width = Math.max(gridW + PAD * 2, 280)
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const labels = spec.items.map(item => displayLabel(item, { value: true }))
  const fits = labels.map(({ display }) =>
    fitTextToWidthShared([display], width - PAD - 16 - 50, { maxSize: 10, minSize: 7, maxLines: 2 })
  )
  const rowHeights = fits.map(fit => Math.max(18, fit.results[0].lines.length * fit.lineHeight + 4))
  const legendY = titleH + PAD + GRID * (SQUARE + GAP) + 6
  let cursorY = legendY
  const rows = spec.items.map((item, index) => {
    const row = { item, index, y: cursorY, height: rowHeights[index], label: labels[index], fit: fits[index] }
    cursorY += row.height
    return row
  })
  return {
    width,
    titleH,
    gridW,
    gridX: (width - gridW) / 2,
    legendY,
    rows,
    colors,
    squares,
    height: cursorY + 10,
  }
}

function renderSquare(index: number, layout: WaffleLayout, theme: MdArtTheme): { owner: number, svg: string } {
  const col = index % GRID
  const row = Math.floor(index / GRID)
  const x = layout.gridX + col * (SQUARE + GAP)
  const y = layout.titleH + PAD + row * (SQUARE + GAP)
  const owner = ownerForSquare(index, layout.squares)
  const fill = owner >= 0 ? layout.colors[owner % layout.colors.length] : `${theme.muted}22`
  return { owner, svg: `<rect x="${x.toFixed(1)}" y="${y}" width="${SQUARE}" height="${SQUARE}" rx="2" fill="${fill}"/>` }
}

function renderLegend(row: LegendRow, layout: WaffleLayout, theme: MdArtTheme): string {
  const { fontSize, lineHeight, results: [{ lines, truncated }] } = row.fit
  const tip = truncated ? `<title>${escapeXml(row.label.display)}</title>` : ''
  const swatchMidY = row.y + Math.min(12, row.height) / 2
  const textY = row.y + fontSize * 0.75
  const tspans = lines
    .map((line, lineIndex) => `<tspan x="${PAD + 16}" dy="${lineIndex === 0 ? 0 : lineHeight.toFixed(1)}">${escapeXml(line)}</tspan>`)
    .join('')
  return `<rect x="${PAD}" y="${(swatchMidY - 6).toFixed(1)}" width="12" height="12" rx="2" fill="${layout.colors[row.index % layout.colors.length]}">${itemTitleTag(row.item)}</rect>`
    + aWrap(`${tip}<text x="${PAD + 16}" y="${textY.toFixed(1)}" font-size="${fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR}>${tspans}</text>`, row.label.url)
    + `<text x="${layout.width - PAD}" y="${textY.toFixed(1)}" text-anchor="end" font-size="10" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${layout.squares[row.index]}%</text>`
}

function renderCategories(layout: WaffleLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string[] {
  const categoryParts: string[][] = layout.rows.map(() => [])
  for (let index = 0; index < 100; index++) {
    const square = renderSquare(index, layout, theme)
    const owner = square.owner >= 0 ? square.owner : 0
    categoryParts[owner]?.push(square.svg)
  }
  layout.rows.forEach(row => categoryParts[row.index].push(renderLegend(row, layout, theme)))
  return categoryParts.map((unit, index) => wrapItem(unit.join(''), index, animate, instrument))
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layout = resolveLayout(spec, theme)
  const parts = [
    ...(animate ? [seqSpotlightCSS(spec.items.length, spec, { scale: false })] : []),
    ...renderCategories(layout, theme, animate, instrument),
  ]
  return svg(layout, theme, spec.title, parts)
}
