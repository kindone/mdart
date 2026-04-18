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
  const ROW_H = 32, GAP = 4, NOTCH = 14
  const titleH = spec.title ? 30 : 8
  const H = titleH + items.length * (ROW_H + GAP) + 8
  const parts: string[] = []
  if (spec.title) parts.push(`<text x="${W/2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`)
  items.forEach((item, i) => {
    const y = titleH + i * (ROW_H + GAP)
    const t = items.length > 1 ? i / (items.length - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    const x0 = i === 0 ? 0 : NOTCH, x1 = W - NOTCH, mid = y + ROW_H / 2
    // chevron shape: left indent (except first) → right point
    const d = i === 0
      ? `M0,${y} L${x1},${y} L${W},${mid} L${x1},${y+ROW_H} L0,${y+ROW_H} Z`
      : `M0,${y} L${x1},${y} L${W},${mid} L${x1},${y+ROW_H} L0,${y+ROW_H} L${NOTCH},${mid} Z`
    parts.push(`<path d="${d}" fill="${fill}33" stroke="${fill}" stroke-width="1"/>`)
    parts.push(`<text x="${(x0 + x1) / 2 + NOTCH/2}" y="${(mid + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, 40)}</text>`)
    if (item.value) parts.push(`<text x="${W - NOTCH - 6}" y="${(mid + 4).toFixed(1)}" text-anchor="end" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(item.value)}</text>`)
  })
  return svg(W, H, theme, parts)
}
