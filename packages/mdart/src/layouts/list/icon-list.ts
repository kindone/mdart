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
  const W = 500, ROW_H = 44, CIRCLE_R = 18, LEFT = 24
  const titleH = spec.title ? 30 : 8
  const H = titleH + items.length * ROW_H + 8
  const parts: string[] = []
  if (spec.title) parts.push(`<text x="${W/2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`)
  items.forEach((item, i) => {
    const cy = titleH + i * ROW_H + ROW_H / 2
    const t = items.length > 1 ? i / (items.length - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)

    // Extract leading emoji from the label; fall back to attrs for non-emoji syntax
    const emojiMatch = item.label.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u)
    const icon = emojiMatch ? emojiMatch[1] : (item.attrs[0] ?? '')
    const displayLabel = emojiMatch ? item.label.slice(emojiMatch[0].length) : item.label

    parts.push(`<circle cx="${LEFT}" cy="${cy}" r="${CIRCLE_R}" fill="${fill}"/>`)
    if (icon) {
      parts.push(`<text x="${LEFT}" y="${(cy + 5).toFixed(1)}" text-anchor="middle" font-size="14" font-family="system-ui,sans-serif">${escapeXml(icon)}</text>`)
    }
    parts.push(`<text x="${LEFT + CIRCLE_R + 10}" y="${(cy - 4).toFixed(1)}" font-size="12" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(displayLabel, 40)}</text>`)
    const caption = getCaption(item)
    if (caption) parts.push(`<text x="${LEFT + CIRCLE_R + 10}" y="${(cy + 12).toFixed(1)}" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(caption, 44)}</text>`)
    if (i < items.length - 1) parts.push(`<line x1="${LEFT + CIRCLE_R + 10}" y1="${cy + ROW_H/2}" x2="${W - 16}" y2="${cy + ROW_H/2}" stroke="${theme.border}" stroke-width="0.5"/>`)
  })
  return svg(W, H, theme, parts)
}
