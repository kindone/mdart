import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, renderEmpty } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const W = 500
  const CARD_H = 54
  const PAD = 20
  const LINE_X = W / 2
  const CARD_W = 180
  const ROW_H = CARD_H + 20
  const titleH = spec.title ? 28 : 0
  const H = PAD + titleH + items.length * ROW_H + PAD

  let svgContent = ''

  if (spec.title) {
    svgContent += `<text x="${W / 2}" y="${PAD + 16}" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`
  }

  // Vertical timeline line
  svgContent += `<line x1="${LINE_X}" y1="${PAD + titleH}" x2="${LINE_X}" y2="${H - PAD}" stroke="${theme.border}" stroke-width="2" />`

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const cy = PAD + titleH + i * ROW_H + CARD_H / 2
    const t = items.length > 1 ? i / (items.length - 1) : 0
    const fill = lerpColor(theme.secondary, theme.primary, t)
    const left = i % 2 === 0

    const cardX = left ? LINE_X - 14 - CARD_W : LINE_X + 14
    const cardY = cy - CARD_H / 2

    // Card
    svgContent += `<rect x="${cardX}" y="${cardY}" width="${CARD_W}" height="${CARD_H}" rx="6" fill="${theme.surface}" stroke="${fill}" stroke-width="1.5" />`

    // Timeline dot
    svgContent += `<circle cx="${LINE_X}" cy="${cy}" r="7" fill="${fill}" />`

    // Label
    svgContent += `<text x="${cardX + CARD_W / 2}" y="${cy - 6}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(item.label)}</text>`

    if (item.value) {
      svgContent += `<text x="${cardX + CARD_W / 2}" y="${cy + 10}" text-anchor="middle" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(item.value)}</text>`
    }

    if (item.attrs.length > 0) {
      svgContent += `<text x="${cardX + CARD_W / 2}" y="${cy + 22}" text-anchor="middle" font-size="9" fill="${theme.accent}" font-family="system-ui,sans-serif">${escapeXml(item.attrs.join(', '))}</text>`
    }
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svgContent}
  </svg>`
}
