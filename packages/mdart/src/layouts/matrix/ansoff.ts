import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt } from '../shared'

const ANSOFF_QUADS = [
  { key: 'penetration',     keywords: ['penetrat'],                                label: 'Market Penetration',  sub: 'Existing product · Existing market', fill: '#065f46', text: '#6ee7b7' },  // emerald-800/300
  { key: 'product-dev',     keywords: ['product dev', 'product d', 'new product'], label: 'Product Development', sub: 'New product · Existing market',      fill: '#3730a3', text: '#a5b4fc' },  // indigo-800/300
  { key: 'market-dev',      keywords: ['market dev',  'market d',  'new market'],  label: 'Market Development',  sub: 'Existing product · New market',      fill: '#92400e', text: '#fcd34d' },  // amber-800/300
  { key: 'diversification', keywords: ['divers'],                                  label: 'Diversification',     sub: 'New product · New market',           fill: '#9f1239', text: '#fda4af' },  // rose-800/300
]

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const buckets: Record<string, string[]> = Object.fromEntries(ANSOFF_QUADS.map(q => [q.key, []]))
  let slotIdx = 0
  for (const item of spec.items) {
    const lower = item.label.toLowerCase()
    const matched = ANSOFF_QUADS.find(q => q.keywords.some(kw => lower.includes(kw)))
    if (matched) {
      buckets[matched.key].push(...(item.children.length ? item.children.map(c => c.label) : []))
    } else {
      const slot = ANSOFF_QUADS[slotIdx % 4]
      buckets[slot.key].push(item.label)
      slotIdx++
    }
  }

  const W = 520, TITLE_H = spec.title ? 28 : 0, CELL_W = W / 2, CELL_H = 168
  const AX = 20, H = TITLE_H + CELL_H * 2 + AX
  let svgContent = ''
  if (spec.title) {
    svgContent += `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(spec.title)}</text>`
  }

  const positions = [[0, 0], [1, 0], [0, 1], [1, 1]]
  ANSOFF_QUADS.forEach((q, i) => {
    const [col, row] = positions[i]
    const x = col * CELL_W, y = TITLE_H + row * CELL_H
    svgContent += `<rect x="${x}" y="${y}" width="${CELL_W}" height="${CELL_H}" fill="${q.fill}"/>`
    svgContent += `<text x="${x + CELL_W / 2}" y="${y + 24}" text-anchor="middle" font-size="11.5" fill="${q.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(q.label)}</text>`
    svgContent += `<text x="${x + CELL_W / 2}" y="${y + 38}" text-anchor="middle" font-size="7.5" fill="${q.text}" font-family="system-ui,sans-serif" opacity="0.65">${q.sub}</text>`
    buckets[q.key].slice(0, 4).forEach((label, j) => {
      svgContent += `<text x="${x + 10}" y="${y + 56 + j * 18}" font-size="10" fill="${q.text}" font-family="system-ui,sans-serif" opacity="0.9">• ${tt(label, 22)}</text>`
    })
  })
  // Grid lines
  svgContent += `<line x1="${W / 2}" y1="${TITLE_H}" x2="${W / 2}" y2="${TITLE_H + CELL_H * 2}" stroke="${theme.bg}" stroke-width="2"/>`
  svgContent += `<line x1="0" y1="${TITLE_H + CELL_H}" x2="${W}" y2="${TITLE_H + CELL_H}" stroke="${theme.bg}" stroke-width="2"/>`
  // Axis labels
  const axY = TITLE_H + CELL_H * 2 + 14
  svgContent += `<text x="${CELL_W / 2}" y="${axY}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">Existing Products</text>`
  svgContent += `<text x="${CELL_W + CELL_W / 2}" y="${axY}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">New Products →</text>`

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svgContent}
  </svg>`
}
