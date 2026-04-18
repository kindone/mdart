import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, tt, renderEmpty } from '../shared'

function svg(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const W = 500, ROW_H = 44, R = 16, LEFT = 28
  const titleH = spec.title ? 30 : 8
  const H = titleH + items.length * ROW_H + 8
  const parts: string[] = []
  if (spec.title) parts.push(`<text x="${W/2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`)
  // Connecting line
  parts.push(`<line x1="${LEFT}" y1="${titleH + ROW_H/2}" x2="${LEFT}" y2="${titleH + (items.length-1)*ROW_H + ROW_H/2}" stroke="${theme.border}" stroke-width="2" stroke-dasharray="4,4"/>`)
  items.forEach((item, i) => {
    const cy = titleH + i * ROW_H + ROW_H / 2
    const t = items.length > 1 ? i / (items.length - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    parts.push(`<circle cx="${LEFT}" cy="${cy}" r="${R}" fill="${fill}"/>`)
    parts.push(`<text x="${LEFT}" y="${(cy + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="#fff" font-family="system-ui,sans-serif" font-weight="700">${i + 1}</text>`)
    parts.push(`<text x="${LEFT + R + 10}" y="${(cy - 4).toFixed(1)}" font-size="12" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, 36)}</text>`)
    if (item.value) parts.push(`<text x="${LEFT + R + 10}" y="${(cy + 12).toFixed(1)}" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(item.value, 44)}</text>`)
  })
  return svg(W, H, theme, parts)
}
