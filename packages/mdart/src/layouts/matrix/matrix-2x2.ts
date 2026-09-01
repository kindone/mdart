import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, itemTitleTag, displayLabelValue, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, renderWrappedText, centeredTextY, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 500
const CELL_W = W / 2
const CELL_H = 168
const TITLE_H = 28
const POSITIONS: Array<[number, number]> = [[0, 0], [1, 0], [0, 1], [1, 1]]

interface MatrixLayout {
  titleH: number
  height: number
}

interface MatrixCell {
  item: MdArtItem
  index: number
  x: number
  y: number
  fill: string
  stroke: string
  display: ReturnType<typeof displayLabelValue>
}

function resolveLayout(spec: MdArtSpec): MatrixLayout {
  const titleH = spec.title ? TITLE_H : 0
  return { titleH, height: titleH + CELL_H * 2 }
}

function placeCells(spec: MdArtSpec, layout: MatrixLayout, theme: MdArtTheme): MatrixCell[] {
  const fills = [`${theme.primary}22`, `${theme.secondary}1a`, `${theme.accent}1a`, `${theme.secondary}22`]
  const strokes = [theme.primary, theme.secondary, theme.accent, theme.secondary]
  return spec.items.slice(0, 4).map((item, index) => {
    const [col, row] = POSITIONS[index]
    return {
      item,
      index,
      x: col * CELL_W,
      y: layout.titleH + row * CELL_H,
      fill: fills[index],
      stroke: strokes[index],
      display: displayLabelValue(item),
    }
  })
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  if (!spec.title) return ''
  return `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(spec.title)}</text>`
}

function renderHeader(cell: MatrixCell): string {
  // With no child bullets the header owns the whole cell, so let a longer
  // statement wrap to fill it instead of clipping to a 2-line strip and
  // wasting ~130px of empty space below. When children ARE present the
  // header stays a compact top strip and the bullets take the rest.
  const hasChildren = cell.item.children.length > 0
  const boxH = hasChildren ? 34 : CELL_H - 24
  const maxLines = hasChildren ? 2 : 8
  const headerFit = fitTextToWidthShared([cell.display.display], CELL_W - 24, {
    maxSize: 12,
    minSize: 7,
    maxLines,
    boxH,
  })
  const anchorY = hasChildren
    ? centeredTextY(cell.y + 8, 28, headerFit.results[0].lines.length, headerFit.lineHeight)
    : centeredTextY(cell.y, CELL_H, headerFit.results[0].lines.length, headerFit.lineHeight)
  return renderWrappedText(
    cell.x + CELL_W / 2,
    anchorY,
    `text-anchor="middle" font-size="${headerFit.fontSize}" fill="${cell.stroke}" ${FONT_SANS_ATTR} font-weight="700"`,
    cell.display.display,
    { ...headerFit.results[0], url: cell.display.url },
    headerFit.lineHeight,
    cell.item,
  )
}

function renderChildren(cell: MatrixCell, theme: MdArtTheme): string {
  return cell.item.children.slice(0, 5).map((child, index) => {
    const childDisplay = displayLabelValue(child)
    const bulletText = `• ${childDisplay.display}`
    const bulletFit = fitTextToWidthShared([bulletText], CELL_W - 24, {
      maxSize: 10,
      minSize: 6.5,
      maxLines: 2,
      boxH: 22,
    })
    return renderWrappedText(
      cell.x + 12,
      cell.y + 50 + index * 22,
      `font-size="${bulletFit.fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR} opacity="0.85"`,
      bulletText,
      { ...bulletFit.results[0], url: childDisplay.url },
      bulletFit.lineHeight,
      child,
    )
  }).join('')
}

function renderCell(cell: MatrixCell, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const content = `<rect x="${cell.x}" y="${cell.y}" width="${CELL_W}" height="${CELL_H}" fill="${cell.fill}" stroke="${theme.border}" stroke-width="0.5">${itemTitleTag(cell.item)}</rect>` +
    renderHeader(cell) +
    renderChildren(cell, theme)
  return wrapItem(content, cell.index, animate, instrument)
}

function renderAxes(layout: MatrixLayout, theme: MdArtTheme): string {
  return `<line x1="${W / 2}" y1="${layout.titleH}" x2="${W / 2}" y2="${layout.height}" stroke="${theme.border}" stroke-width="1.5"/>` +
    `<line x1="0" y1="${layout.titleH + CELL_H}" x2="${W}" y2="${layout.titleH + CELL_H}" stroke="${theme.border}" stroke-width="1.5"/>`
}

function renderSvg(layout: MatrixLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  const animate = shouldAnimate(spec)
  const n = Math.min(spec.items.length, 4)
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${layout.height}" fill="${theme.bg}" rx="8"/>
    ${animate ? seqSpotlightCSS(n, spec, { scale: false }) : ''}
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const layout = resolveLayout(spec)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const cells = placeCells(spec, layout, theme)
  const parts = [
    renderTitle(spec, theme),
    ...cells.map(cell => renderCell(cell, theme, animate, instrument)),
    renderAxes(layout, theme),
  ].filter(Boolean)

  return renderSvg(layout, spec, theme, parts)
}
