import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, renderEmpty, parseLink, aWrap, itemTitleTag, ellipsisIfDropped, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

function svgWrap(W: number, H: number, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

/** Parse a gantt range string into { start, end, isMilestone }.
 *  A trailing '*' in the range attr marks a milestone: e.g. "wk8*" or "8*".
 *  Single numbers without a range (e.g. "wk8") are point-in-time tasks (1-unit wide).
 */
function parseGanttRange(raw: string): { start: number; end: number; isMilestone: boolean } {
  const isMilestone = raw.includes('*')
  const rangeStr = raw.replace(/\*/g, '')
  const rangeMatch = rangeStr.match(/(\d+)[^\d]+(\d+)/)
  let start = 0, end = 1
  if (rangeMatch) {
    start = parseInt(rangeMatch[1]) - 1
    end   = parseInt(rangeMatch[2])
  } else {
    const single = rangeStr.match(/(\d+)/)
    if (single) {
      const n = parseInt(single[1])
      start = n - 1
      end   = n
    }
  }
  return { start, end, isMilestone }
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  interface GanttRow {
    label: string; start: number; end: number
    isMilestone: boolean; url: string | null; src: typeof items[0]
  }

  let maxEnd = 0
  const rows: GanttRow[] = items.map(item => {
    const rawRange = item.attrs.find(a => /[\d*]/.test(a)) ?? item.value ?? ''
    const { start, end, isMilestone } = parseGanttRange(rawRange)
    maxEnd = Math.max(maxEnd, end)
    // gantt already shows the week range visibly via the bar position, and
    // the value/attr is used as the range source. Ellipsis only fires for
    // additional non-range attrs.
    const { display, url } = parseLink(item.label)
    const lbl = ellipsisIfDropped(display, item, { value: true, attrs: true })
    return { label: lbl, start, end, isMilestone, url, src: item }
  })
  if (maxEnd === 0) maxEnd = 8

  const W = 600
  const LABEL_W = 138
  const BAR_AREA = W - LABEL_W - 16
  const ROW_H = 34
  const TITLE_H = spec.title ? 30 : 8
  const HEADER_H = 22
  const H = TITLE_H + HEADER_H + rows.length * ROW_H + 12

  const parts: string[] = []
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()

  for (let t = 0; t <= maxEnd; t++) {
    const x = LABEL_W + (t / maxEnd) * BAR_AREA
    parts.push(
      `<line x1="${x.toFixed(1)}" y1="${TITLE_H + HEADER_H - 2}" x2="${x.toFixed(1)}" y2="${H - 8}" stroke="${theme.border}" stroke-width="0.5"/>`,
      `<text x="${x.toFixed(1)}" y="${TITLE_H + 14}" text-anchor="middle" font-size="10" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${t + 1}</text>`,
    )
  }

  rows.forEach((row, i) => {
    const y = TITLE_H + HEADER_H + i * ROW_H
    const unit: string[] = []

    if (i % 2 === 0) {
      unit.push(`<rect x="0" y="${y.toFixed(1)}" width="${W}" height="${ROW_H}" fill="${theme.surface}" opacity="0.5"/>`)
    }

    unit.push(aWrap(`<text x="${(LABEL_W - 8).toFixed(1)}" y="${(y + 21).toFixed(1)}" text-anchor="end" font-size="11" fill="${theme.text}" ${FONT_SANS_ATTR}>${tt(row.label, 18)}</text>`, row.url))

    if (row.isMilestone) {
      // Diamond snapped to the week-N grid tick.
      // Grid label t+1 appears at x-position t/maxEnd, so week N's left edge
      // is at t=N-1 (= row.start). Placing the diamond here aligns it exactly
      // with the "N" label, keeping tasks that follow (e.g. [wkN+1-...]) visually
      // to the right of the diamond.
      const mx = LABEL_W + (row.start / maxEnd) * BAR_AREA
      const my = y + ROW_H / 2
      const r  = 7
      unit.push(`<line x1="${LABEL_W}" y1="${my.toFixed(1)}" x2="${(mx - r).toFixed(1)}" y2="${my.toFixed(1)}" stroke="${theme.border}" stroke-width="1" stroke-dasharray="3,3"/>`)
      unit.push(`<polygon points="${mx.toFixed(1)},${(my - r).toFixed(1)} ${(mx + r).toFixed(1)},${my.toFixed(1)} ${mx.toFixed(1)},${(my + r).toFixed(1)} ${(mx - r).toFixed(1)},${my.toFixed(1)}" fill="${theme.accent}" stroke="${theme.accent}" stroke-width="1.5" opacity="0.9">${itemTitleTag(row.src)}</polygon>`)
    } else {
      const barX = LABEL_W + (row.start / maxEnd) * BAR_AREA
      const barW = Math.max(6, ((row.end - row.start) / maxEnd) * BAR_AREA)
      unit.push(`<rect x="${barX.toFixed(1)}" y="${(y + 8).toFixed(1)}" width="${barW.toFixed(1)}" height="18" rx="4" fill="${theme.accent}88" stroke="${theme.accent}" stroke-width="1">${itemTitleTag(row.src)}</rect>`)
    }
    parts.push(wrapItem(unit.join(''), i, animate, instrument))
  })

  if (animate) parts.unshift(seqSpotlightCSS(rows.length, spec, { scale: false }))
  return svgWrap(W, H, theme, spec.title, parts)
}
