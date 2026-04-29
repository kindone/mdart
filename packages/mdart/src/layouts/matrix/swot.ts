import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  // Collect items by prefix char or by group name
  interface SwotQuadrant {
    label: string
    items: string[]
    fill: string
    textColor: string
  }

  const quadrantMap: Record<string, SwotQuadrant> = {
    S: { label: 'Strengths',     items: [], fill: '#065f46', textColor: '#34d399' },  // emerald-800/400
    W: { label: 'Weaknesses',    items: [], fill: '#9f1239', textColor: '#fb7185' },  // rose-800/400
    O: { label: 'Opportunities', items: [], fill: '#3730a3', textColor: '#818cf8' },  // indigo-800/400
    T: { label: 'Threats',       items: [], fill: '#92400e', textColor: '#fbbf24' },  // amber-800/400
  }

  // Prefix-based
  for (const item of spec.items) {
    if (item.prefix === '+') quadrantMap.S.items.push(item.label)
    else if (item.prefix === '-') quadrantMap.W.items.push(item.label)
    else if (item.prefix === '?') quadrantMap.O.items.push(item.label)
    else if (item.prefix === '!') quadrantMap.T.items.push(item.label)
    else {
      // Group heading — detect by name
      const lower = item.label.toLowerCase()
      let key: string | null = null
      if (lower.startsWith('strength')) key = 'S'
      else if (lower.startsWith('weakness')) key = 'W'
      else if (lower.startsWith('opportunit')) key = 'O'
      else if (lower.startsWith('threat')) key = 'T'
      if (key) {
        quadrantMap[key].items.push(...item.children.map(c => c.label))
      }
    }
  }

  const W = 500
  const H = 400
  const PAD = 16
  // Match pros-cons: title block height + gap below title before the diagram (not a 2px hairline).
  const titleH = spec.title ? 28 : 0
  const contentTop = spec.title ? PAD + titleH : 0
  const CELL_W = W / 2
  const CELL_H = (H - contentTop) / 2
  // 10px body + "• " — use right edge of cell (x+10 inset)
  const bulletMax = Math.max(10, Math.floor((CELL_W - 20) / 4.3))

  let svgContent = ''

  if (spec.title) {
    svgContent += `<text x="${W / 2}" y="${PAD + 16}" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`
  }

  const quadrants = [
    { key: 'S', col: 0, row: 0 },
    { key: 'W', col: 1, row: 0 },
    { key: 'O', col: 0, row: 1 },
    { key: 'T', col: 1, row: 1 },
  ]

  for (const { key, col, row } of quadrants) {
    const q = quadrantMap[key]
    const x = col * CELL_W
    const y = contentTop + row * CELL_H

    svgContent += `<rect x="${x}" y="${y}" width="${CELL_W}" height="${CELL_H}" fill="${q.fill}" />`
    svgContent += `<text x="${x + CELL_W / 2}" y="${y + 22}" text-anchor="middle" font-size="12" fill="${q.textColor}" font-family="system-ui,sans-serif" font-weight="700">${q.label}</text>`

    const maxItems = Math.min(q.items.length, 5)
    for (let i = 0; i < maxItems; i++) {
      const itemY = y + 38 + i * 16
      svgContent += `<text x="${x + 10}" y="${itemY}" font-size="10" fill="${q.textColor}" font-family="system-ui,sans-serif" opacity="0.85">• ${tt(q.items[i], bulletMax)}</text>`
    }

    if (q.items.length > 5) {
      svgContent += `<text x="${x + 10}" y="${y + 38 + 5 * 16}" font-size="9" fill="${q.textColor}" font-family="system-ui,sans-serif" opacity="0.6">+${q.items.length - 5} more</text>`
    }
  }

  // Grid lines
  svgContent += `<line x1="${W / 2}" y1="${contentTop}" x2="${W / 2}" y2="${H}" stroke="${theme.bg}" stroke-width="2" />`
  svgContent += `<line x1="0" y1="${contentTop + CELL_H}" x2="${W}" y2="${contentTop + CELL_H}" stroke="${theme.bg}" stroke-width="2" />`

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svgContent}
  </svg>`
}
