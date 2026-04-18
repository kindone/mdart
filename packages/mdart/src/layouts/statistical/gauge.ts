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
  const GW = n <= 1 ? 240 : n <= 2 ? 220 : n <= 3 ? 180 : 150
  const W = n * GW, TITLE_H = spec.title ? 30 : 10
  const GH = GW * 0.62, H = TITLE_H + GH + 36
  const parts: string[] = []

  items.forEach((item, i) => {
    const cx = GW * i + GW / 2, cy = TITLE_H + GH * 0.88
    const R = GW * 0.37, SW = R * 0.17

    const raw = (item.value ?? item.attrs[0] ?? '0').replace('%', '')
    const val = Math.min(Math.max(parseFloat(raw) || 0, 0), 100) / 100

    const lx = cx - R, rx = cx + R
    parts.push(`<path d="M${lx},${cy} A${R},${R} 0 0,1 ${rx},${cy}" fill="none" stroke="${theme.muted}44" stroke-width="${SW}" stroke-linecap="round"/>`)

    if (val > 0) {
      const angle = Math.PI * (1 - val)
      const ex = cx + R * Math.cos(angle), ey = cy - R * Math.sin(angle)
      const largeArc = 0
      const col = val >= 0.7 ? theme.accent : val >= 0.4 ? theme.warning : theme.danger
      parts.push(`<path d="M${lx},${cy} A${R},${R} 0 ${largeArc},1 ${ex.toFixed(1)},${ey.toFixed(1)}" fill="none" stroke="${col}" stroke-width="${SW}" stroke-linecap="round"/>`)
      parts.push(`<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="${(SW / 2).toFixed(1)}" fill="${col}"/>`)
    }

    const fs = Math.max(16, Math.round(GW * 0.15))
    parts.push(`<text x="${cx}" y="${(cy - 6).toFixed(1)}" text-anchor="middle" font-size="${fs}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${Math.round(val * 100)}%</text>`)
    parts.push(`<text x="${cx}" y="${(cy + 16).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(item.label, 16)}</text>`)
  })

  return svg(W, H, theme, spec.title, parts)
}
