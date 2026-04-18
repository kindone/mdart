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
  const W = 480, TITLE_H = spec.title ? 28 : 8, H = 380 + TITLE_H
  const cx = W / 2, cy = TITLE_H + (H - TITLE_H) / 2
  const MAX_R = Math.min(cx - 10, (H - TITLE_H) / 2 - 12)
  const parts: string[] = []
  parts.push(`<line x1="${cx - MAX_R - 6}" y1="${cy}" x2="${cx + MAX_R + 6}" y2="${cy}" stroke="${theme.border}28" stroke-width="1"/>`)
  parts.push(`<line x1="${cx}" y1="${cy - MAX_R - 6}" x2="${cx}" y2="${cy + MAX_R + 6}" stroke="${theme.border}28" stroke-width="1"/>`)
  for (let i = n - 1; i >= 0; i--) {
    const r = MAX_R * (i + 1) / n
    const t = i / Math.max(n - 1, 1)
    const fillAlpha = Math.round(14 + (1 - t) * 36).toString(16).padStart(2, '0')
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="${theme.primary}${fillAlpha}" stroke="${theme.primary}66" stroke-width="1.5"/>`)
    const bandR = r - MAX_R / n / 2
    parts.push(`<text x="${cx}" y="${(cy - bandR + 5).toFixed(1)}" text-anchor="middle" font-size="10.5" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="${i === n - 1 ? '700' : '400'}">${tt(items[i].label, 18)}</text>`)
  }
  return svg(W, H, theme, spec.title, parts)
}
