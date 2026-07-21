import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 600
const H = 320
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 8
const CONTENT_PAD_TOP = 4
const CELL_PAD = 2

interface TreemapLayout {
  n: number
  cols: number
  rows: number
  titleH: number
  contentH: number
  cellW: number
  cellH: number
  colors: string[]
}

interface TreemapCell {
  item: MdArtItem
  index: number
  x: number
  y: number
  cx: number
  cy: number
  fill: string
}

function svg(theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

function palette(theme: MdArtTheme): string[] {
  return [theme.primary, theme.secondary, theme.accent, theme.muted, ...theme.palette]
}

function resolveLayout(spec: MdArtSpec, theme: MdArtTheme): TreemapLayout {
  const n = spec.items.length
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const cols = Math.ceil(Math.sqrt(n))
  const rows = Math.ceil(n / cols)
  const contentH = H - titleH - 8
  return {
    n,
    cols,
    rows,
    titleH,
    contentH,
    cellW: W / cols,
    cellH: contentH / rows,
    colors: palette(theme),
  }
}

function placeCells(spec: MdArtSpec, layout: TreemapLayout): TreemapCell[] {
  return spec.items.map((item, index) => {
    const col = index % layout.cols
    const row = Math.floor(index / layout.cols)
    const x = col * layout.cellW
    const y = layout.titleH + CONTENT_PAD_TOP + row * layout.cellH
    return {
      item,
      index,
      x,
      y,
      cx: x + layout.cellW / 2,
      cy: y + layout.cellH / 2,
      fill: layout.colors[index % layout.colors.length],
    }
  })
}

function renderCellText(cell: TreemapCell, layout: TreemapLayout, theme: MdArtTheme): string {
  const hasValue = !!cell.item.value
  const { display, url } = displayLabel(cell.item, { value: hasValue })
  const labelBoxH = hasValue ? layout.cellH * 0.5 : layout.cellH - 16
  const { fontSize, lineHeight, results: [{ lines, truncated }] } =
    fitTextToWidthShared([display], layout.cellW - 12, {
      maxSize: 12,
      minSize: 7,
      maxLines: hasValue ? 2 : 3,
      boxH: labelBoxH,
    })
  const tip = truncated ? `<title>${escapeXml(display)}</title>` : ''
  const tspans = lines
    .map((line, lineIndex) => `<tspan x="${cell.cx.toFixed(1)}" dy="${lineIndex === 0 ? 0 : lineHeight.toFixed(1)}">${escapeXml(line)}</tspan>`)
    .join('')

  if (!hasValue) {
    const y = cell.cy - ((lines.length - 1) * lineHeight) / 2 + fontSize * 0.35
    return aWrap(`${tip}<text x="${cell.cx.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="${fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${tspans}</text>`, url)
  }

  const labelVisualH = (lines.length - 1) * lineHeight + fontSize
  const valueSize = 10
  const totalBlockH = labelVisualH + 4 + valueSize
  const labelY = cell.cy - totalBlockH / 2 + fontSize * 0.75
  const valueY = cell.cy - totalBlockH / 2 + labelVisualH + 4 + valueSize * 0.75
  return aWrap(`${tip}<text x="${cell.cx.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" font-size="${fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${tspans}</text>`, url)
    + `<text x="${cell.cx.toFixed(1)}" y="${valueY.toFixed(1)}" text-anchor="middle" font-size="${valueSize}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${escapeXml(cell.item.value!)}</text>`
}

function renderCell(cell: TreemapCell, layout: TreemapLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const unit = `<rect x="${(cell.x + CELL_PAD).toFixed(1)}" y="${(cell.y + CELL_PAD).toFixed(1)}" width="${(layout.cellW - CELL_PAD * 2).toFixed(1)}" height="${(layout.cellH - CELL_PAD * 2).toFixed(1)}" rx="6" fill="${cell.fill}55" stroke="${cell.fill}99" stroke-width="1">${itemTitleTag(cell.item)}</rect>`
    + renderCellText(cell, layout, theme)
  return wrapItem(unit, cell.index, animate, instrument)
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layout = resolveLayout(spec, theme)
  const parts = [
    ...(animate ? [seqSpotlightCSS(spec.items.length, spec, { scale: false })] : []),
    ...placeCells(spec, layout).map(cell => renderCell(cell, layout, theme, animate, instrument)),
  ]
  return svg(theme, spec.title, parts)
}
