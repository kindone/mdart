import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, parseLink, aWrap, itemTitleTag, type ItemLike } from '../shared'

const BCG_QUADS = [
  { key: 'stars',     keywords: ['star'],             label: '★ Stars',          sub: 'High growth · High share', fill: '#6d28d9', text: '#ffffff' },  // violet-700
  { key: 'questions', keywords: ['question', 'mark'], label: '? Question Marks', sub: 'High growth · Low share',  fill: '#b45309', text: '#ffffff' },  // amber-700
  { key: 'cash',      keywords: ['cash', 'cow'],      label: '$ Cash Cows',      sub: 'Low growth · High share',  fill: '#047857', text: '#ffffff' },  // emerald-700
  { key: 'dogs',      keywords: ['dog'],              label: '✕ Dogs',           sub: 'Low growth · Low share',   fill: '#be123c', text: '#ffffff' },  // rose-700
]

type BcgEntry = { display: string; url: string | null; src: ItemLike }

// Neutral grey ramps for mono-light / mono-dark themes
const MONO_FILLS: Record<string, { fills: string[]; text: string }> = {
  '#374151': { fills: ['#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8'], text: '#111827' }, // mono-light
  '#9ca3af': { fills: ['#1e293b', '#334155', '#475569', '#64748b'], text: '#f9fafb' }, // mono-dark
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const buckets: Record<string, BcgEntry[]> = Object.fromEntries(BCG_QUADS.map(q => [q.key, []]))
  let slotIdx = 0
  for (const item of spec.items) {
    const lower = item.label.toLowerCase()
    const matched = BCG_QUADS.find(q => q.keywords.some(kw => lower.includes(kw)))
    if (matched) {
      buckets[matched.key].push(...(item.children.length ? item.children.map(c => ({ ...parseLink(c.label), src: c })) : []))
    } else {
      // Distribute ungrouped items across quadrants in order
      const slot = BCG_QUADS[slotIdx % 4]
      buckets[slot.key].push({ ...parseLink(item.label), src: item })
      slotIdx++
    }
  }

  const mono = MONO_FILLS[theme.primary]
  const W = 520, TITLE_H = spec.title ? 28 : 0, CELL_W = W / 2, CELL_H = 168
  const AX = 20, H = TITLE_H + CELL_H * 2 + AX
  let svgContent = ''
  if (spec.title) {
    svgContent += `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(spec.title)}</text>`
  }

  const positions = [[0, 0], [1, 0], [0, 1], [1, 1]]
  BCG_QUADS.forEach((q, i) => {
    const [col, row] = positions[i]
    const x = col * CELL_W, y = TITLE_H + row * CELL_H
    const fill = mono ? mono.fills[i] : q.fill
    const text = mono ? mono.text : q.text
    svgContent += `<rect x="${x}" y="${y}" width="${CELL_W}" height="${CELL_H}" fill="${fill}"/>`
    svgContent += `<text x="${x + CELL_W / 2}" y="${y + 24}" text-anchor="middle" font-size="12" fill="${text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(q.label)}</text>`
    svgContent += `<text x="${x + CELL_W / 2}" y="${y + 38}" text-anchor="middle" font-size="8" fill="${text}" font-family="system-ui,sans-serif" opacity="0.65">${q.sub}</text>`
    buckets[q.key].slice(0, 4).forEach(({ display: lbl, url: lblUrl, src }, j) => {
      svgContent += aWrap(`<text x="${x + 10}" y="${y + 56 + j * 18}" font-size="10" fill="${text}" font-family="system-ui,sans-serif" opacity="0.9">${itemTitleTag(src)}• ${tt(lbl, 22)}</text>`, lblUrl)
    })
  })
  // Grid lines
  svgContent += `<line x1="${W / 2}" y1="${TITLE_H}" x2="${W / 2}" y2="${TITLE_H + CELL_H * 2}" stroke="${theme.bg}" stroke-width="2"/>`
  svgContent += `<line x1="0" y1="${TITLE_H + CELL_H}" x2="${W}" y2="${TITLE_H + CELL_H}" stroke="${theme.bg}" stroke-width="2"/>`
  // Axis labels
  const axY = TITLE_H + CELL_H * 2 + 14
  svgContent += `<text x="${CELL_W / 2}" y="${axY}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">← High Market Share</text>`
  svgContent += `<text x="${CELL_W + CELL_W / 2}" y="${axY}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">Low Market Share →</text>`

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svgContent}
  </svg>`
}
