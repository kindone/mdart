import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqMeasureTiming, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 520
const LABEL_W = 150
const BAR_X = LABEL_W + 16
const BAR_W = W - BAR_X - 48
const BAR_H = 18
const PAD_V = 8
const MIN_ROW_H = 46
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 10

interface BulletValue {
  value: number
  target: number | null
}

interface BulletLayout {
  titleH: number
  height: number
  rows: BulletRow[]
}

interface BulletRow {
  item: MdArtItem
  index: number
  y: number
  height: number
  metric: BulletValue
  label: ReturnType<typeof displayLabel>
  fit: ReturnType<typeof fitTextToWidthShared>
}

function svg(layout: BulletLayout, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

function parseMetric(item: MdArtItem): BulletValue {
  const numericAttrs = item.attrs.filter(attr => /^\d/.test(attr.trim()))
  const raw = (item.value ?? numericAttrs[0] ?? '0').replace('%', '')
  const value = Math.min(parseFloat(raw) || 0, 100) / 100
  const targetRaw = item.value ? numericAttrs[0] : numericAttrs[1]
  const target = targetRaw ? Math.min(parseFloat(targetRaw.replace('%', '')) || 0, 100) / 100 : null
  return { value, target }
}

function colorForValue(value: number, theme: MdArtTheme): string {
  return value >= 0.7 ? theme.accent : value >= 0.4 ? theme.warning : theme.danger
}

function measureLayout(spec: MdArtSpec): BulletLayout {
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  let cursorY = titleH
  const rows = spec.items.map((item, index) => {
    const label = displayLabel(item, { value: true, attrs: true })
    const fit = fitTextToWidthShared([label.display], LABEL_W - 12, { maxSize: 11, minSize: 7, maxLines: 3 })
    const height = Math.max(MIN_ROW_H, PAD_V * 2 + fit.results[0].lines.length * fit.lineHeight)
    const row = { item, index, y: cursorY, height, metric: parseMetric(item), label, fit }
    cursorY += height
    return row
  })
  return { titleH, rows, height: cursorY + 12 }
}

function renderRangeBar(row: BulletRow, theme: MdArtTheme): string {
  const midY = row.y + row.height / 2
  const barY = midY - BAR_H / 2
  return [
    `<rect class="mdart-no-glow" x="${BAR_X}" y="${barY.toFixed(1)}" width="${BAR_W}" height="${BAR_H}" rx="3" fill="${theme.muted}40">${itemTitleTag(row.item)}</rect>`,
    `<rect class="mdart-no-glow" x="${BAR_X}" y="${barY.toFixed(1)}" width="${(BAR_W * 0.7).toFixed(1)}" height="${BAR_H}" rx="3" fill="${theme.muted}5a"/>`,
    `<rect class="mdart-no-glow" x="${BAR_X}" y="${barY.toFixed(1)}" width="${(BAR_W * 0.4).toFixed(1)}" height="${BAR_H}" rx="3" fill="${theme.muted}80"/>`,
  ].join('')
}

function renderActualBar(row: BulletRow, spec: MdArtSpec, theme: MdArtTheme, animate: boolean): string {
  const midY = row.y + row.height / 2
  const barY = midY - BAR_H / 2
  const actualH = BAR_H * 0.6
  const actualY = barY + (BAR_H - actualH) / 2
  const actualWidth = (BAR_W * row.metric.value).toFixed(1)
  const { delayMs, durationMs } = seqMeasureTiming(spec.items.length, spec, row.index)
  const widthAnim = animate
    ? `<animate attributeName="width" from="0" to="${actualWidth}" begin="${delayMs}ms" dur="${durationMs}ms" fill="freeze"/>`
    : ''
  return `<rect class="mdart-bar-grow" x="${BAR_X}" y="${actualY.toFixed(1)}" width="${animate ? 0 : actualWidth}" height="${actualH.toFixed(1)}" rx="2" fill="${colorForValue(row.metric.value, theme)}">${widthAnim}</rect>`
}

function renderTarget(row: BulletRow, theme: MdArtTheme): string {
  if (row.metric.target === null) return ''
  const barY = row.y + row.height / 2 - BAR_H / 2
  const x = BAR_X + BAR_W * row.metric.target
  return `<rect class="mdart-no-glow" x="${(x - 1.5).toFixed(1)}" y="${barY.toFixed(1)}" width="3" height="${BAR_H}" rx="1" fill="${theme.text}cc"/>`
}

function renderLabel(row: BulletRow, theme: MdArtTheme): string {
  const midY = row.y + row.height / 2
  const { fontSize, lineHeight, results: [{ lines, truncated }] } = row.fit
  const tip = truncated ? `<title>${escapeXml(row.label.display)}</title>` : ''
  const startY = midY - ((lines.length - 1) * lineHeight) / 2 + fontSize * 0.35
  const tspans = lines
    .map((line, lineIndex) => `<tspan x="${LABEL_W}" dy="${lineIndex === 0 ? 0 : lineHeight.toFixed(1)}">${escapeXml(line)}</tspan>`)
    .join('')
  return aWrap(`${tip}<text class="mdart-glow-text" x="${LABEL_W}" y="${startY.toFixed(1)}" text-anchor="end" font-size="${fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR}>${tspans}</text>`, row.label.url)
}

function renderBulletRow(row: BulletRow, spec: MdArtSpec, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const midY = row.y + row.height / 2
  const unit = [
    renderRangeBar(row, theme),
    renderActualBar(row, spec, theme, animate),
    renderTarget(row, theme),
    renderLabel(row, theme),
    `<text x="${BAR_X + BAR_W + 8}" y="${(midY + 4).toFixed(1)}" font-size="10" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${Math.round(row.metric.value * 100)}%</text>`,
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
    ...layout.rows.map(row => renderBulletRow(row, spec, theme, animate, instrument)),
  ]
  return svg(layout, theme, spec.title, parts)
}
