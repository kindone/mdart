import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, tt, renderEmpty } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const W = 460
  const ROW_H = 38
  const PAD = 16
  const titleH = spec.title ? 28 : 0
  const H = PAD + titleH + items.length * ROW_H + PAD

  let svgContent = ''

  if (spec.title) {
    svgContent += `<text x="${PAD}" y="${PAD + 16}" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const y = PAD + titleH + i * ROW_H
    const cy = y + ROW_H / 2
    const t = items.length > 1 ? i / (items.length - 1) : 0
    const fill = lerpColor(theme.secondary, theme.primary, t)

    svgContent += `<circle cx="${PAD + 8}" cy="${cy}" r="5" fill="${fill}" />`
    svgContent += `<text x="${PAD + 22}" y="${cy + 4}" font-size="12" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(item.label)}</text>`

    if (item.value) {
      svgContent += `<text x="${W - PAD}" y="${cy + 4}" text-anchor="end" font-size="11" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(item.value)}</text>`
    }

    if (item.children.length > 0 && i < items.length) {
      const childText = item.children.map(c => c.label).join(', ')
      svgContent += `<text x="${PAD + 22}" y="${cy + 16}" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(childText, 60)}</text>`
    }

    if (i < items.length - 1) {
      svgContent += `<line x1="${PAD}" y1="${y + ROW_H}" x2="${W - PAD}" y2="${y + ROW_H}" stroke="${theme.border}" stroke-width="0.5" />`
    }
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svgContent}
  </svg>`
}
