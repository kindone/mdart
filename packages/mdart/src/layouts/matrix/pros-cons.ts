import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  // Expect top-level items with children: "Pros" and "Cons"
  let pros: MdArtItem[] = []
  let cons: MdArtItem[] = []

  // The parser flattens pros-cons like swot (stack reset on each depth-0 item),
  // so children of "Pros"/"Cons" headers appear as separate flat top-level items.
  // We track currentSection to route those flat siblings to the right bucket.
  let currentSection: 'pros' | 'cons' | null = null

  for (const item of spec.items) {
    const lower = item.label.toLowerCase()
    const isProsHeader = lower.includes('pro') || lower.includes('advantage') || lower.includes('benefit')
    const isConsHeader = lower.includes('con') || lower.includes('disadvantage') || lower.includes('risk')

    if (isProsHeader) {
      currentSection = 'pros'
      // If children were nested (non-swot format), consume them directly
      if (item.children.length) { pros.push(...item.children); currentSection = null }
      continue
    }
    if (isConsHeader) {
      currentSection = 'cons'
      if (item.children.length) { cons.push(...item.children); currentSection = null }
      continue
    }

    // Explicit + prefix always means pro
    if (item.prefix === '+') { pros.push(item); continue }

    // Route flat siblings by whichever section header came last
    if (currentSection === 'pros') { pros.push(item); continue }
    if (currentSection === 'cons') { cons.push(item); continue }

    // Fallback: bare - prefix with no section context → cons
    if (item.prefix === '-') cons.push(item)
  }

  const maxRows = Math.max(pros.length, cons.length, 1)
  const W = 500
  const ROW_H = 36
  const HEADER_H = 40
  const PAD = 16
  const titleH = spec.title ? 28 : 0
  const H = PAD + titleH + HEADER_H + maxRows * ROW_H + PAD
  const HALF = W / 2

  let svgContent = ''

  if (spec.title) {
    svgContent += `<text x="${W / 2}" y="${PAD + 16}" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`
  }

  const baseY = PAD + titleH

  // Headers
  svgContent += `<rect x="0" y="${baseY}" width="${HALF}" height="${HEADER_H}" fill="#064e3b" />`
  svgContent += `<text x="${HALF / 2}" y="${baseY + 25}" text-anchor="middle" font-size="13" fill="#6ee7b7" font-family="system-ui,sans-serif" font-weight="700">Pros</text>`

  svgContent += `<rect x="${HALF}" y="${baseY}" width="${HALF}" height="${HEADER_H}" fill="#4c0519" />`
  svgContent += `<text x="${HALF + HALF / 2}" y="${baseY + 25}" text-anchor="middle" font-size="13" fill="#fda4af" font-family="system-ui,sans-serif" font-weight="700">Cons</text>`

  const itemsY = baseY + HEADER_H

  for (let i = 0; i < maxRows; i++) {
    const rowY = itemsY + i * ROW_H
    const rowBg = i % 2 === 0 ? theme.surface : theme.bg
    svgContent += `<rect x="0" y="${rowY}" width="${HALF}" height="${ROW_H}" fill="${rowBg}" />`
    svgContent += `<rect x="${HALF}" y="${rowY}" width="${HALF}" height="${ROW_H}" fill="${rowBg}" />`

    // font-size 11 ≈ 5.8 px/char; "✓ " prefix ≈ 14px; right margin 6px
    const colMaxChars = Math.floor((HALF - PAD - 14 - 6) / 5.8)
    if (i < pros.length) {
      svgContent += `<text x="${PAD}" y="${rowY + 23}" font-size="11" fill="#6ee7b7" font-family="system-ui,sans-serif">✓ ${tt(pros[i].label, colMaxChars)}</text>`
    }
    if (i < cons.length) {
      svgContent += `<text x="${HALF + PAD}" y="${rowY + 23}" font-size="11" fill="#fda4af" font-family="system-ui,sans-serif">✗ ${tt(cons[i].label, colMaxChars)}</text>`
    }

    if (i < maxRows - 1) {
      svgContent += `<line x1="0" y1="${rowY + ROW_H}" x2="${W}" y2="${rowY + ROW_H}" stroke="${theme.border}" stroke-width="0.5" />`
    }
  }

  // Divider
  svgContent += `<line x1="${HALF}" y1="${baseY}" x2="${HALF}" y2="${H}" stroke="${theme.bg}" stroke-width="2" />`

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svgContent}
  </svg>`
}
