import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, parseLink, aWrap } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  // Collect items by prefix char or by group name
  interface SwotEntry { display: string; url: string | null }
  interface SwotQuadrant {
    label: string
    items: SwotEntry[]
    fill: string
    textColor: string
  }

  const quadrantMap: Record<string, SwotQuadrant> = {
    S: { label: 'Strengths',     items: [], fill: '#065f46', textColor: '#34d399' },  // emerald-800/400
    W: { label: 'Weaknesses',    items: [], fill: '#9f1239', textColor: '#fb7185' },  // rose-800/400
    O: { label: 'Opportunities', items: [], fill: '#3730a3', textColor: '#818cf8' },  // indigo-800/400
    T: { label: 'Threats',       items: [], fill: '#92400e', textColor: '#fbbf24' },  // amber-800/400
  }

  // Group-heading recognition: exact match (case-insensitive, trailing ':' stripped)
  // against the canonical SWOT words. Opt-in attrs `[strengths]` / `[weaknesses]` /
  // `[opportunities]` / `[threats]` (or short `[s] [w] [o] [t]`) override label-based
  // detection so users can pick any heading text they like.
  const HEADER_MAP: Record<string, string> = {
    strength: 'S', strengths: 'S',
    weakness: 'W', weaknesses: 'W',
    opportunity: 'O', opportunities: 'O',
    threat: 'T', threats: 'T',
  }
  const ATTR_MAP: Record<string, string> = {
    strengths: 'S', strength: 'S', s: 'S',
    weaknesses: 'W', weakness: 'W', w: 'W',
    opportunities: 'O', opportunity: 'O', o: 'O',
    threats: 'T', threat: 'T', t: 'T',
  }

  // The parser flattens swot top-level items (stack reset on prefix items), so
  // children of `- Strengths` headers end up as separate flat siblings rather
  // than nested. Track currentSection so subsequent flat items route to the
  // right quadrant — same pattern as pros-cons.
  let currentSection: string | null = null

  for (const item of spec.items) {
    // 1. Header detection runs first: by attr, then by exact label.
    let headerKey: string | null = null
    for (const a of item.attrs) {
      const k = ATTR_MAP[a.toLowerCase()]
      if (k) { headerKey = k; break }
    }
    if (!headerKey) {
      const normalized = item.label.toLowerCase().trim().replace(/:$/, '').trim()
      headerKey = HEADER_MAP[normalized] ?? null
    }
    if (headerKey) {
      currentSection = headerKey
      // If children were attached (e.g. non-swot-style nesting), consume immediately.
      if (item.children.length) {
        quadrantMap[headerKey].items.push(...item.children.map(c => parseLink(c.label)))
        currentSection = null
      }
      continue
    }

    // 2. Otherwise, route by SWOT prefix char.
    if (item.prefix === '+') { quadrantMap.S.items.push(parseLink(item.label)); continue }
    if (item.prefix === '?') { quadrantMap.O.items.push(parseLink(item.label)); continue }
    if (item.prefix === '!') { quadrantMap.T.items.push(parseLink(item.label)); continue }
    if (item.prefix === '-') {
      // - is the SWOT weakness marker by default, but if a heading was just
      // declared (e.g. `- Threats`), route subsequent items to that section.
      quadrantMap[currentSection ?? 'W'].items.push(parseLink(item.label))
      continue
    }

    // 3. Unprefixed flat sibling — only routes if we're inside a declared section.
    if (currentSection) quadrantMap[currentSection].items.push(parseLink(item.label))
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
      const { display: itDisplay, url: itUrl } = q.items[i]
      svgContent += aWrap(`<text x="${x + 10}" y="${itemY}" font-size="10" fill="${q.textColor}" font-family="system-ui,sans-serif" opacity="0.85">• ${tt(itDisplay, bulletMax)}</text>`, itUrl)
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
