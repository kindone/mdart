import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  interface Row { label: string; depth: number; isLast: boolean; parentHasSibling: boolean[] }
  const rows: Row[] = []
  function flatten(items: MdArtItem[], depth: number, phs: boolean[]) {
    items.forEach((item, i) => {
      const isLast = i === items.length - 1
      rows.push({ label: item.label, depth, isLast, parentHasSibling: [...phs] })
      flatten(item.children, depth + 1, [...phs, !isLast])
    })
  }
  flatten(spec.items, 0, [])

  const W = 560, ROW_H = 23, INDENT = 18, PAD = 14
  const TITLE_H = spec.title ? 28 : 8
  const H = TITLE_H + rows.length * ROW_H + 12

  const parts: string[] = []
  if (spec.title) parts.push(`<text x="${PAD}" y="20" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(spec.title)}</text>`)

  rows.forEach((row) => {
    const y = TITLE_H + rows.indexOf(row) * ROW_H + ROW_H / 2
    const bulletX = PAD + row.depth * INDENT

    if (row.depth > 0) {
      for (let d = 0; d < row.depth - 1; d++) {
        if (row.parentHasSibling[d]) {
          const lx = PAD + d * INDENT + INDENT - 4
          parts.push(`<line x1="${lx}" y1="${(y - ROW_H / 2).toFixed(1)}" x2="${lx}" y2="${(y + ROW_H / 2).toFixed(1)}" stroke="${theme.border}35" stroke-width="1"/>`)
        }
      }
      const px = PAD + (row.depth - 1) * INDENT + INDENT - 4
      parts.push(`<line x1="${px}" y1="${(y - ROW_H / 2).toFixed(1)}" x2="${px}" y2="${y.toFixed(1)}" stroke="${theme.border}35" stroke-width="1"/>`)
      if (!row.isLast) parts.push(`<line x1="${px}" y1="${y.toFixed(1)}" x2="${px}" y2="${(y + ROW_H / 2).toFixed(1)}" stroke="${theme.border}35" stroke-width="1"/>`)
      parts.push(`<line x1="${px}" y1="${y.toFixed(1)}" x2="${(bulletX - 2).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${theme.border}35" stroke-width="1"/>`)
    }

    const bR = row.depth === 0 ? 5 : row.depth === 1 ? 3.5 : 2.5
    const bFill = row.depth === 0 ? theme.accent : row.depth === 1 ? theme.primary : theme.secondary
    parts.push(`<circle cx="${(bulletX + bR).toFixed(1)}" cy="${y.toFixed(1)}" r="${bR}" fill="${bFill}"/>`)

    const textX = bulletX + bR * 2 + 4
    const fs = row.depth === 0 ? 12 : row.depth === 1 ? 11 : 10
    const fw = row.depth === 0 ? '700' : '400'
    const tf = row.depth === 0 ? theme.text : row.depth === 1 ? theme.text : theme.textMuted
    parts.push(`<text x="${textX.toFixed(1)}" y="${(y + 4).toFixed(1)}" font-size="${fs}" fill="${tf}" font-family="system-ui,sans-serif" font-weight="${fw}">${tt(row.label, 40)}</text>`)
  })

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${parts.join('\n  ')}
</svg>`
}
