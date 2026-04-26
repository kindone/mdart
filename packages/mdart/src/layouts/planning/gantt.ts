import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, renderEmpty } from '../shared'

function svgWrap(W: number, H: number, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  interface GanttRow { label: string; start: number; end: number }

  let maxEnd = 0
  const rows: GanttRow[] = items.map(item => {
    const rangeStr = item.attrs.find(a => /\d/.test(a)) ?? item.value ?? ''
    const match = rangeStr.match(/(\d+)[^\d]+(\d+)/)
    let start = 0, end = 1
    if (match) {
      start = parseInt(match[1]) - 1
      end = parseInt(match[2])
    } else if (/^\d+$/.test(rangeStr)) {
      start = parseInt(rangeStr) - 1
      end = parseInt(rangeStr)
    }
    maxEnd = Math.max(maxEnd, end)
    return { label: item.label, start, end }
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

  for (let t = 0; t <= maxEnd; t++) {
    const x = LABEL_W + (t / maxEnd) * BAR_AREA
    parts.push(
      `<line x1="${x.toFixed(1)}" y1="${TITLE_H + HEADER_H - 2}" x2="${x.toFixed(1)}" y2="${H - 8}" stroke="${theme.border}" stroke-width="0.5"/>`,
      `<text x="${x.toFixed(1)}" y="${TITLE_H + 14}" text-anchor="middle" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${t + 1}</text>`,
    )
  }

  rows.forEach((row, i) => {
    const y = TITLE_H + HEADER_H + i * ROW_H

    if (i % 2 === 0) {
      parts.push(`<rect x="0" y="${y.toFixed(1)}" width="${W}" height="${ROW_H}" fill="${theme.surface}" opacity="0.5"/>`)
    }

    parts.push(`<text x="${(LABEL_W - 8).toFixed(1)}" y="${(y + 21).toFixed(1)}" text-anchor="end" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif">${tt(row.label, 18)}</text>`)

    const barX = LABEL_W + (row.start / maxEnd) * BAR_AREA
    const barW = Math.max(6, ((row.end - row.start) / maxEnd) * BAR_AREA)
    parts.push(`<rect x="${barX.toFixed(1)}" y="${(y + 8).toFixed(1)}" width="${barW.toFixed(1)}" height="18" rx="4" fill="${theme.accent}88" stroke="${theme.accent}" stroke-width="1"/>`)
  })

  return svgWrap(W, H, theme, spec.title, parts)
}
