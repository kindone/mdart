import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, lerpColor, renderEmpty, itemTitleTag, ellipsisIfDropped, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 600
const ROW_H = 36
const GAP = 6
const LINE_H = 13
const MIN_FRAC = 0.28
const BADGE_R = 11
const TITLE_H_WITH_TITLE = 34
const TITLE_H_NO_TITLE = 12
const DESC_FS = 9
const DESC_LH = 12
const DESC_PAD = 5
const DESC_MAX = Math.max(16, Math.floor((W - 80) / 5.0))

interface PyramidListLayout {
  n: number
  titleH: number
  barMax: number
  height: number
  rowY: number[]
  descWraps: Wrap[]
}

interface PyramidListRow {
  item: MdArtItem
  index: number
  y: number
  barW: number
  barX: number
  fill: string
  descWrap: Wrap
}

type Wrap = { lines: string[], truncated: boolean, url?: string | null }

function resolveLayout(spec: MdArtSpec): PyramidListLayout {
  const n = spec.items.length
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const hasValue = spec.items.some(item => !!item.value)
  const barMax = hasValue ? W - 220 : W - 80
  const descWraps = spec.items.map(item => {
    const text = item.children.map(child => child.label).join(' ')
    return text ? wrapLabel(text, DESC_MAX, 3) : { lines: [] as string[], truncated: false, url: null }
  })
  const rowContentH = spec.items.map((_, index) => {
    const descLines = descWraps[index].lines.length
    return ROW_H + (descLines > 0 ? DESC_PAD + descLines * DESC_LH : 0)
  })
  const rowY: number[] = []
  let y = titleH
  rowContentH.forEach(height => {
    rowY.push(y)
    y += height + GAP
  })
  return { n, titleH, barMax, height: y - GAP + 20, rowY, descWraps }
}

function placeRows(spec: MdArtSpec, layout: PyramidListLayout, theme: MdArtTheme): PyramidListRow[] {
  const cx = W / 2
  return spec.items.map((item, index) => {
    const t = layout.n > 1 ? index / (layout.n - 1) : 1
    const barW = layout.barMax * (MIN_FRAC + (1 - MIN_FRAC) * t)
    return {
      item,
      index,
      y: layout.rowY[index],
      barW,
      barX: cx - barW / 2,
      fill: lerpColor(theme.primary, theme.muted, t * 0.65),
      descWrap: layout.descWraps[index],
    }
  })
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  if (!spec.title) return ''
  return `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(spec.title)}</text>`
}

function renderBar(row: PyramidListRow): string {
  return `<rect x="${row.barX.toFixed(1)}" y="${row.y}" width="${row.barW.toFixed(1)}" height="${ROW_H}" rx="5" fill="${row.fill}">${itemTitleTag(row.item)}</rect>`
}

function renderBadge(row: PyramidListRow, theme: MdArtTheme): string {
  const cx = row.barX - BADGE_R - 5
  const cy = row.y + ROW_H / 2
  return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${BADGE_R}" fill="${row.fill}"/>` +
    `<text x="${cx.toFixed(1)}" y="${(cy + 4).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="${theme.bg}" ${FONT_SANS_ATTR}>${row.index + 1}</text>`
}

function renderLabel(row: PyramidListRow, theme: MdArtTheme): string {
  const maxChars = Math.max(5, Math.floor(row.barW / 7.5))
  const label = ellipsisIfDropped(row.item.label, row.item, { value: !!row.item.value })
  const wrapped = wrapLabel(label, maxChars)
  const firstY = row.y + ROW_H / 2 - ((wrapped.lines.length - 1) * LINE_H) / 2 + 4
  const tip = wrapped.truncated ? `<title>${escapeXml(row.item.label)}</title>` : ''
  const tspans = wrapped.lines
    .map((line, lineIndex) => `<tspan x="${(W / 2).toFixed(1)}" dy="${lineIndex === 0 ? 0 : LINE_H}">${escapeXml(line)}</tspan>`)
    .join('')
  return aWrap(`<text x="${(W / 2).toFixed(1)}" y="${firstY.toFixed(1)}" text-anchor="middle" font-size="12" font-weight="600" fill="${theme.bg}" ${FONT_SANS_ATTR}>${tip}${tspans}</text>`, wrapped.url)
}

function renderValue(row: PyramidListRow, theme: MdArtTheme): string {
  if (!row.item.value) return ''
  const valFS = 9
  const valLH = valFS * 1.3
  const valX = W / 2 + row.barW / 2 + 8
  const valMaxW = W - 8 - valX
  const valChars = Math.max(4, Math.floor(valMaxW / (valFS * 0.52)))
  const wrapped = wrapLabel(row.item.value, valChars, 2, { boxW: valMaxW, fontSize: valFS })
  const startY = row.y + ROW_H / 2 - ((wrapped.lines.length - 1) * valLH) / 2 + valFS * 0.3
  return wrapped.lines.map((line, index) =>
    `<text x="${valX.toFixed(1)}" y="${(startY + index * valLH).toFixed(1)}" text-anchor="start" font-size="${valFS}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${escapeXml(line)}</text>`
  ).join('')
}

function renderDescription(row: PyramidListRow, theme: MdArtTheme): string {
  if (row.descWrap.lines.length === 0) return ''
  const text = row.item.children.map(child => child.label).join(' ')
  const tip = row.descWrap.truncated ? `<title>${escapeXml(text)}</title>` : ''
  const spans = row.descWrap.lines
    .map((line, lineIndex) => `<tspan x="${(W / 2).toFixed(1)}" dy="${lineIndex === 0 ? 0 : DESC_LH}">${escapeXml(line)}</tspan>`)
    .join('')
  return `<text x="${(W / 2).toFixed(1)}" y="${(row.y + ROW_H + DESC_PAD + DESC_FS).toFixed(1)}" text-anchor="middle" font-size="${DESC_FS}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tip}${spans}</text>`
}

function renderRow(row: PyramidListRow, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  return wrapItem(
    renderBar(row) + renderBadge(row, theme) + renderLabel(row, theme) + renderValue(row, theme) + renderDescription(row, theme),
    row.index,
    animate,
    instrument,
  )
}

function renderSvg(layout: PyramidListLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  const animate = shouldAnimate(spec)
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${animate ? seqSpotlightCSS(layout.n, spec, { scale: false }) : ''}
  ${renderTitle(spec, theme)}
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)

  const layout = resolveLayout(spec)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const rows = placeRows(spec, layout, theme)
  const parts = rows.map(row => renderRow(row, theme, animate, instrument))

  return renderSvg(layout, spec, theme, parts)
}
