import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, renderEmpty, parseLink, aWrap, itemTitleTag, ellipsisIfDropped, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 600
const LABEL_W = 138
const BAR_AREA = W - LABEL_W - 16
const ROW_H = 34
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 8
const HEADER_H = 22

interface GanttRange {
  start: number
  end: number
  isMilestone: boolean
}

interface GanttRow {
  label: string
  start: number
  end: number
  isMilestone: boolean
  url: string | null
  src: MdArtItem
}

interface GanttLayout {
  titleH: number
  height: number
  maxEnd: number
  rows: GanttRow[]
}

function svg(layout: GanttLayout, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

function parseGanttRange(raw: string): GanttRange {
  const isMilestone = raw.includes('*')
  const rangeStr = raw.replace(/\*/g, '')
  const rangeMatch = rangeStr.match(/(\d+)[^\d]+(\d+)/)
  if (rangeMatch) {
    return { start: parseInt(rangeMatch[1]) - 1, end: parseInt(rangeMatch[2]), isMilestone }
  }
  const single = rangeStr.match(/(\d+)/)
  if (single) {
    const n = parseInt(single[1])
    return { start: n - 1, end: n, isMilestone }
  }
  return { start: 0, end: 1, isMilestone }
}

function rangeSource(item: MdArtItem): string {
  return item.attrs.find(attr => /[\d*]/.test(attr)) ?? item.value ?? ''
}

function buildRows(items: MdArtItem[]): { rows: GanttRow[], maxEnd: number } {
  let maxEnd = 0
  const rows = items.map(item => {
    const { start, end, isMilestone } = parseGanttRange(rangeSource(item))
    maxEnd = Math.max(maxEnd, end)
    const { display, url } = parseLink(item.label)
    const label = ellipsisIfDropped(display, item, { value: true, attrs: true })
    return { label, start, end, isMilestone, url, src: item }
  })
  return { rows, maxEnd: maxEnd || 8 }
}

function resolveLayout(spec: MdArtSpec): GanttLayout {
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const { rows, maxEnd } = buildRows(spec.items)
  return {
    titleH,
    rows,
    maxEnd,
    height: titleH + HEADER_H + rows.length * ROW_H + 12,
  }
}

function timeX(tick: number, maxEnd: number): number {
  return LABEL_W + (tick / maxEnd) * BAR_AREA
}

function renderGrid(layout: GanttLayout, theme: MdArtTheme): string[] {
  const parts: string[] = []
  for (let tick = 0; tick <= layout.maxEnd; tick++) {
    const x = timeX(tick, layout.maxEnd)
    parts.push(
      `<line x1="${x.toFixed(1)}" y1="${layout.titleH + HEADER_H - 2}" x2="${x.toFixed(1)}" y2="${layout.height - 8}" stroke="${theme.border}" stroke-width="0.5"/>`,
      `<text x="${x.toFixed(1)}" y="${layout.titleH + 14}" text-anchor="middle" font-size="10" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tick + 1}</text>`,
    )
  }
  return parts
}

function renderMilestone(row: GanttRow, y: number, layout: GanttLayout, theme: MdArtTheme): string {
  const mx = timeX(row.start, layout.maxEnd)
  const my = y + ROW_H / 2
  const r = 7
  return `<line x1="${LABEL_W}" y1="${my.toFixed(1)}" x2="${(mx - r).toFixed(1)}" y2="${my.toFixed(1)}" stroke="${theme.border}" stroke-width="1" stroke-dasharray="3,3"/>`
    + `<polygon points="${mx.toFixed(1)},${(my - r).toFixed(1)} ${(mx + r).toFixed(1)},${my.toFixed(1)} ${mx.toFixed(1)},${(my + r).toFixed(1)} ${(mx - r).toFixed(1)},${my.toFixed(1)}" fill="${theme.accent}" stroke="${theme.accent}" stroke-width="1.5" opacity="0.9">${itemTitleTag(row.src)}</polygon>`
}

function renderTaskBar(row: GanttRow, y: number, layout: GanttLayout, theme: MdArtTheme): string {
  const x = timeX(row.start, layout.maxEnd)
  const width = Math.max(6, ((row.end - row.start) / layout.maxEnd) * BAR_AREA)
  return `<rect x="${x.toFixed(1)}" y="${(y + 8).toFixed(1)}" width="${width.toFixed(1)}" height="18" rx="4" fill="${theme.accent}88" stroke="${theme.accent}" stroke-width="1">${itemTitleTag(row.src)}</rect>`
}

function renderRow(row: GanttRow, index: number, layout: GanttLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const y = layout.titleH + HEADER_H + index * ROW_H
  const unit = [
    ...(index % 2 === 0 ? [`<rect x="0" y="${y.toFixed(1)}" width="${W}" height="${ROW_H}" fill="${theme.surface}" opacity="0.5"/>`] : []),
    aWrap(`<text x="${(LABEL_W - 8).toFixed(1)}" y="${(y + 21).toFixed(1)}" text-anchor="end" font-size="11" fill="${theme.text}" ${FONT_SANS_ATTR}>${tt(row.label, 18)}</text>`, row.url),
    row.isMilestone ? renderMilestone(row, y, layout, theme) : renderTaskBar(row, y, layout, theme),
  ]
  return wrapItem(unit.join(''), index, animate, instrument)
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layout = resolveLayout(spec)
  const parts = [
    ...(animate ? [seqSpotlightCSS(layout.rows.length, spec, { scale: false })] : []),
    ...renderGrid(layout, theme),
    ...layout.rows.map((row, index) => renderRow(row, index, layout, theme, animate, instrument)),
  ]
  return svg(layout, theme, spec.title, parts)
}
