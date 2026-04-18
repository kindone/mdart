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
  const W = 500
  const ROW_H = 38, BOX_W = 190, BOX_H = 30
  const SPINE_X = W / 2
  const titleH = spec.title ? 30 : 8
  const H = titleH + items.length * ROW_H + 10
  const parts: string[] = []
  parts.push(`<line x1="${SPINE_X}" y1="${titleH}" x2="${SPINE_X}" y2="${H-8}" stroke="${theme.border}" stroke-width="2"/>`)
  if (spec.title) parts.push(`<text x="${SPINE_X}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`)
  items.forEach((item, i) => {
    const cy = titleH + i * ROW_H + ROW_H / 2
    const left = i % 2 === 0
    const t = items.length > 1 ? i / (items.length - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    const bx = left ? SPINE_X - 8 - BOX_W : SPINE_X + 8
    parts.push(`<rect x="${bx.toFixed(1)}" y="${(cy - BOX_H/2).toFixed(1)}" width="${BOX_W}" height="${BOX_H}" rx="6" fill="${fill}22" stroke="${fill}" stroke-width="1.2"/>`)
    parts.push(`<text x="${(bx + BOX_W/2).toFixed(1)}" y="${(cy + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, 22)}</text>`)
    if (item.value) parts.push(`<text x="${(bx + BOX_W/2).toFixed(1)}" y="${(cy + 16).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(item.value, 26)}</text>`)
    // connector dot
    parts.push(`<circle cx="${SPINE_X}" cy="${cy}" r="4" fill="${fill}"/>`)
    const lineX = left ? SPINE_X - 8 : SPINE_X + 8
    parts.push(`<line x1="${SPINE_X}" y1="${cy}" x2="${lineX}" y2="${cy}" stroke="${fill}" stroke-width="1.2"/>`)
  })
  return svg(W, H, theme, parts)
}
