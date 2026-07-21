import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqMeasureTiming, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 520
const LABEL_W = 155
const BAR_X = LABEL_W + 20
const BAR_W = W - BAR_X - 52
const BAR_H = 16
const PAD_V = 8
const MIN_ROW_H = 40
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 10

interface ProgressLayout {
  titleH: number
  height: number
  rows: ProgressRow[]
}

interface ProgressRow {
  item: MdArtItem
  index: number
  y: number
  height: number
  pct: number
  label: ReturnType<typeof displayLabel>
  fit: ReturnType<typeof fitTextToWidthShared>
}

function svg(layout: ProgressLayout, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

function percentOf(item: MdArtItem): number {
  const raw = (item.value ?? item.attrs[0] ?? '0').replace('%', '')
  const num = parseFloat(raw)
  if (isNaN(num)) return 0
  return num > 1 ? Math.min(num, 100) : num * 100
}

function colorForPercent(pct: number, theme: MdArtTheme): string {
  return pct >= 70 ? theme.accent : pct >= 40 ? theme.warning : theme.danger
}

function measureLayout(spec: MdArtSpec): ProgressLayout {
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  let cursorY = titleH
  const rows = spec.items.map((item, index) => {
    const label = displayLabel(item, { value: true })
    const fit = fitTextToWidthShared([label.display], LABEL_W - 12, { maxSize: 12, minSize: 7, maxLines: 3 })
    const height = Math.max(MIN_ROW_H, PAD_V * 2 + fit.results[0].lines.length * fit.lineHeight)
    const row = { item, index, y: cursorY, height, pct: percentOf(item), label, fit }
    cursorY += height
    return row
  })
  return { titleH, rows, height: cursorY + 12 }
}

function renderLabel(row: ProgressRow, theme: MdArtTheme): string {
  const { fontSize, lineHeight, results: [{ lines, truncated }] } = row.fit
  const tip = truncated ? `<title>${escapeXml(row.label.display)}</title>` : ''
  const y = row.y + row.height / 2 - ((lines.length - 1) * lineHeight) / 2 + fontSize * 0.35
  const tspans = lines
    .map((line, lineIndex) => `<tspan x="${LABEL_W}" dy="${lineIndex === 0 ? 0 : lineHeight.toFixed(1)}">${escapeXml(line)}</tspan>`)
    .join('')
  return aWrap(`${tip}<text x="${LABEL_W}" y="${y.toFixed(1)}" text-anchor="end" font-size="${fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR}>${tspans}</text>`, row.label.url)
}

function renderProgressRow(row: ProgressRow, spec: MdArtSpec, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const barY = row.y + Math.round((row.height - BAR_H) / 2)
  const fillWidth = Math.max(0, BAR_W * row.pct / 100).toFixed(1)
  const { delayMs, durationMs } = seqMeasureTiming(spec.items.length, spec, row.index)
  const widthAnim = animate
    ? `<animate attributeName="width" from="0" to="${fillWidth}" begin="${delayMs}ms" dur="${durationMs}ms" fill="freeze"/>`
    : ''
  const unit = [
    `<rect x="${BAR_X}" y="${barY}" width="${BAR_W}" height="${BAR_H}" rx="8" fill="${theme.muted}33">${itemTitleTag(row.item)}</rect>`,
    `<rect class="mdart-bar-grow" x="${BAR_X}" y="${barY}" width="${animate ? 0 : fillWidth}" height="${BAR_H}" rx="8" fill="${colorForPercent(row.pct, theme)}">${itemTitleTag(row.item)}${widthAnim}</rect>`,
    renderLabel(row, theme),
    `<text x="${BAR_X + BAR_W + 8}" y="${(barY + BAR_H - 3).toFixed(1)}" font-size="11" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${row.pct % 1 === 0 ? row.pct : row.pct.toFixed(1)}%</text>`,
  ]
  return wrapItem(unit.join(''), row.index, animate, instrument)
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layout = measureLayout(spec)
  const parts = [
    ...(animate ? [seqSpotlightCSS(spec.items.length, spec, { scale: false })] : []),
    ...layout.rows.map(row => renderProgressRow(row, spec, theme, animate, instrument)),
  ]
  return svg(layout, theme, spec.title, parts)
}
