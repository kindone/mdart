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

  const W   = 500
  const GAP = 3
  const captions = items.map(it => getCaption(it))
  const hasAnyCaption = captions.some(c => c !== null)
  const BAND_H = hasAnyCaption ? 40 : 28

  const titleH = spec.title ? 30 : 8
  const H = titleH + items.length * (BAND_H + GAP) + 8

  const parts: string[] = []
  if (spec.title) parts.push(`<text x="${W/2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`)

  const maxInset = W * 0.18

  items.forEach((item, i) => {
    const y = titleH + i * (BAND_H + GAP)
    const t = items.length > 1 ? i / (items.length - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)

    // Top band narrowest, bottom widest
    const topInset       = maxInset * (1 - t)
    const botInset       = items.length > 1 ? maxInset * (1 - (i + 1) / (items.length - 1 || 1)) : 0
    const clampedBotInset = Math.max(0, botInset)
    const d = `M${topInset.toFixed(1)},${y} L${(W-topInset).toFixed(1)},${y} L${(W-clampedBotInset).toFixed(1)},${(y+BAND_H)} L${clampedBotInset.toFixed(1)},${(y+BAND_H)} Z`
    parts.push(`<path d="${d}" fill="${fill}33" stroke="${fill}" stroke-width="1"/>`)

    // Usable inner width at narrowest (top) edge
    const innerW = W - topInset * 2 - 16
    const labelMax = Math.floor(innerW / 6.2)   // 11 px
    const valueMax = Math.floor(innerW / 5.2)   // 10 px

    const caption = captions[i]
    if (hasAnyCaption && caption) {
      // Stacked: label top, caption muted below
      parts.push(`<text x="${W/2}" y="${(y + BAND_H/2 - 3).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, labelMax)}</text>`)
      parts.push(`<text x="${W/2}" y="${(y + BAND_H/2 + 12).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(caption, valueMax)}</text>`)
    } else {
      parts.push(`<text x="${W/2}" y="${(y + BAND_H/2 + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, labelMax)}</text>`)
    }
  })

  return svg(W, H, theme, parts)
}
