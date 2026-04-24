import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, tt, renderEmpty, getCaption } from '../shared'

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
  const RIB_H = 26, GAP = 6, FOLD = 10, TAIL = 14
  const titleH = spec.title ? 30 : 8
  const rowH = RIB_H + 12  // ribbon + sub-text below
  const H = titleH + items.length * (rowH + GAP) + 8
  const parts: string[] = []
  if (spec.title) parts.push(`<text x="${W/2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`)
  items.forEach((item, i) => {
    const y = titleH + i * (rowH + GAP)
    const mid = y + RIB_H / 2
    const t = items.length > 1 ? i / (items.length - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    const dark = lerpColor(theme.primary, theme.secondary, Math.min(1, t + 0.15))
    // Left fold triangle
    parts.push(`<polygon points="0,${y} ${FOLD},${mid} 0,${y+RIB_H}" fill="${dark}"/>`)
    // Main ribbon band
    parts.push(`<rect x="${FOLD}" y="${y}" width="${W - FOLD - TAIL}" height="${RIB_H}" fill="${fill}"/>`)
    // Right tail cutout
    parts.push(`<polygon points="${W-TAIL},${y} ${W},${y} ${W-TAIL/2},${mid} ${W},${y+RIB_H} ${W-TAIL},${y+RIB_H}" fill="${fill}"/>`)
    parts.push(`<polygon points="${W-TAIL/2},${mid} ${W},${y} ${W},${y+RIB_H}" fill="${dark}"/>`)
    // Label + value
    parts.push(`<text x="${FOLD + 10}" y="${(mid + 4).toFixed(1)}" font-size="11" fill="#fff" font-family="system-ui,sans-serif" font-weight="700" letter-spacing="0.06em">${tt(item.label.toUpperCase(), 30)}</text>`)
    const caption = getCaption(item)
    if (caption) parts.push(`<text x="${W/2}" y="${(y + RIB_H + 12).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(caption, 60)}</text>`)
  })
  return svg(W, H, theme, parts)
}
