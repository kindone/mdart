import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items.slice(0, 4)
  const W = 500, TITLE_H = spec.title ? 28 : 0
  const CELL_W = W / 2, CELL_H = 168
  const H = TITLE_H + CELL_H * 2

  const fills   = [`${theme.primary}22`, `${theme.secondary}1a`, `${theme.accent}1a`, `${theme.secondary}22`]
  const strokes = [theme.primary, theme.secondary, theme.accent, theme.secondary]

  let svgContent = ''
  if (spec.title) {
    svgContent += `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(spec.title)}</text>`
  }

  const positions = [[0, 0], [1, 0], [0, 1], [1, 1]]
  items.forEach((item, i) => {
    const [col, row] = positions[i]
    const x = col * CELL_W, y = TITLE_H + row * CELL_H
    svgContent += `<rect x="${x}" y="${y}" width="${CELL_W}" height="${CELL_H}" fill="${fills[i]}" stroke="${theme.border}" stroke-width="0.5"/>`
    svgContent += `<text x="${x + CELL_W / 2}" y="${y + 26}" text-anchor="middle" font-size="12" fill="${strokes[i]}" font-family="system-ui,sans-serif" font-weight="700">${tt(item.label, 20)}</text>`
    item.children.slice(0, 5).forEach((ch, j) => {
      svgContent += `<text x="${x + 12}" y="${y + 46 + j * 19}" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif" opacity="0.85">• ${tt(ch.label, 22)}</text>`
    })
  })
  // Center axis lines
  svgContent += `<line x1="${W / 2}" y1="${TITLE_H}" x2="${W / 2}" y2="${H}" stroke="${theme.border}" stroke-width="1.5"/>`
  svgContent += `<line x1="0" y1="${TITLE_H + CELL_H}" x2="${W}" y2="${TITLE_H + CELL_H}" stroke="${theme.border}" stroke-width="1.5"/>`

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svgContent}
  </svg>`
}
