import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, itemTitleTag, ellipsisIfDropped, shouldAnimate, seqSpotlightCSS } from '../shared'

// ── Layout constants ─────────────────────────────────────────────────────────
// hierarchy-list renders a compact tree outline; rows are intentionally tight.
// Multi-line wrapping per row would break the connector-line geometry, so we
// use a generous single-line limit instead (up from the old hard 40-char tt()).

const W      = 560
const INDENT = 18
const PAD    = 14

const ROW_H_D0 = 26   // depth-0 rows slightly taller
const ROW_H    = 22   // depth 1+ rows

const FS_D0 = 12, FS_D1 = 11, FS_D2 = 10

// Per-depth character limits (wider = less truncation)
const MAX_D0 = Math.max(20, Math.floor((W - PAD * 2) / 6.0))           // ~88
const MAX_D1 = Math.max(20, Math.floor((W - PAD * 2 - INDENT) / 5.8))  // ~89
const MAX_D2 = Math.max(20, Math.floor((W - PAD * 2 - INDENT * 2) / 5.5)) // ~90

// ── Renderer ─────────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const animate = shouldAnimate(spec)
  interface Row { label: string; truncated: boolean; url: string | null; depth: number; isLast: boolean; parentHasSibling: boolean[]; src: MdArtItem }
  const rows: Row[] = []

  function flatten(items: MdArtItem[], depth: number, phs: boolean[]) {
    items.forEach((item, i) => {
      const isLast  = i === items.length - 1
      const maxChars = depth === 0 ? MAX_D0 : depth === 1 ? MAX_D1 : MAX_D2
      const labelStr = ellipsisIfDropped(item.label, item)
      const { lines, truncated, url } = wrapLabel(labelStr, maxChars, 1)
      rows.push({ label: lines[0], truncated, url, depth, isLast, parentHasSibling: [...phs], src: item })
      flatten(item.children, depth + 1, [...phs, !isLast])
    })
  }
  flatten(spec.items, 0, [])

  const TITLE_H = spec.title ? 28 : 8
  const H       = TITLE_H + rows.reduce((s, r) => s + (r.depth === 0 ? ROW_H_D0 : ROW_H), 0) + 12

  const parts: string[] = []
  if (spec.title) {
    parts.push(`<text x="${PAD}" y="20" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(spec.title)}</text>`)
  }

  let curY = TITLE_H
  rows.forEach((row, i) => {
    const unit: string[] = []
    const rowH   = row.depth === 0 ? ROW_H_D0 : ROW_H
    const y      = curY + rowH / 2
    const bulletX = PAD + row.depth * INDENT

    if (row.depth > 0) {
      // Vertical connector lines for ancestor columns
      for (let d = 0; d < row.depth - 1; d++) {
        if (row.parentHasSibling[d]) {
          const lx = PAD + d * INDENT + INDENT - 4
          unit.push(`<line x1="${lx}" y1="${(y - rowH / 2).toFixed(1)}" x2="${lx}" y2="${(y + rowH / 2).toFixed(1)}" stroke="${theme.border}35" stroke-width="1"/>`)
        }
      }
      const px = PAD + (row.depth - 1) * INDENT + INDENT - 4
      unit.push(`<line x1="${px}" y1="${(y - rowH / 2).toFixed(1)}" x2="${px}" y2="${y.toFixed(1)}" stroke="${theme.border}35" stroke-width="1"/>`)
      if (!row.isLast) {
        unit.push(`<line x1="${px}" y1="${y.toFixed(1)}" x2="${px}" y2="${(y + rowH / 2).toFixed(1)}" stroke="${theme.border}35" stroke-width="1"/>`)
      }
      unit.push(`<line x1="${px}" y1="${y.toFixed(1)}" x2="${(bulletX - 2).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${theme.border}35" stroke-width="1"/>`)
    }

    const bR   = row.depth === 0 ? 5 : row.depth === 1 ? 3.5 : 2.5
    const bFill = row.depth === 0 ? theme.accent : row.depth === 1 ? theme.primary : theme.secondary
    unit.push(`<circle cx="${(bulletX + bR).toFixed(1)}" cy="${y.toFixed(1)}" r="${bR}" fill="${bFill}">${itemTitleTag(row.src)}</circle>`)

    const textX = bulletX + bR * 2 + 4
    const fs    = row.depth === 0 ? FS_D0 : row.depth === 1 ? FS_D1 : FS_D2
    const fw    = row.depth === 0 ? '700' : '400'
    const tf    = row.depth === 0 ? theme.text : row.depth === 1 ? theme.text : theme.textMuted
    const tip   = row.truncated ? `<title>${escapeXml(row.label)}</title>` : ''
    unit.push(aWrap(`<text x="${textX.toFixed(1)}" y="${(y + 4).toFixed(1)}" font-size="${fs}" fill="${tf}" font-family="system-ui,sans-serif" font-weight="${fw}">${tip}${escapeXml(row.label)}</text>`, row.url))
    parts.push(animate ? `<g class="mdart-n${i}">${unit.join('')}</g>` : unit.join(''))

    curY += rowH
  })
  if (animate) parts.unshift(seqSpotlightCSS(rows.length, spec, { scale: false }))

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${parts.join('\n  ')}
</svg>`
}
