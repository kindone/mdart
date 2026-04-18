import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, renderEmpty } from '../shared'

function svg(W: number, H: number, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const n = items.length
  const W = 500
  const TITLE_H = spec.title ? 28 : 8
  const H = 400 + TITLE_H
  const cxPos = W / 2
  const cyPos = TITLE_H + (H - TITLE_H) / 2
  const MAX_R = Math.min(cxPos, (H - TITLE_H) / 2) - 10

  const parts: string[] = []

  for (let i = n - 1; i >= 0; i--) {
    const item = items[i]
    const r = MAX_R * (i + 1) / n
    const opacityHex = Math.round(12 + (1 - i / n) * 28).toString(16).padStart(2, '0')

    parts.push(
      `<circle cx="${cxPos.toFixed(1)}" cy="${cyPos.toFixed(1)}" r="${r.toFixed(1)}" fill="${theme.primary}${opacityHex}" stroke="${theme.primary}55" stroke-width="1.2"/>`,
    )

    const labelY = cyPos - (r - MAX_R / n / 2) + 14
    parts.push(
      `<text x="${cxPos.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif">${tt(item.label, 18)}</text>`,
    )
  }

  return svg(W, H, theme, spec.title, parts)
}
