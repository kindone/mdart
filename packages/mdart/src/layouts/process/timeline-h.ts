import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, titleEl, tt, renderEmpty } from '../shared'

function svgWrapProcess(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const n = items.length
  const W = 560, SPINE_Y = 80
  const titleH = spec.title ? 28 : 0
  const H = titleH + 110
  const PAD = 30
  const spacing = (W - PAD * 2) / Math.max(n - 1, 1)
  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))
  const sy = SPINE_Y + titleH
  parts.push(`<line x1="${PAD}" y1="${sy}" x2="${W - PAD}" y2="${sy}" stroke="${theme.border}" stroke-width="2"/>`)
  parts.push(`<polygon points="${(W-PAD-2).toFixed(1)},${(sy-5).toFixed(1)} ${(W-PAD+6).toFixed(1)},${sy} ${(W-PAD-2).toFixed(1)},${(sy+5).toFixed(1)}" fill="${theme.border}"/>`)
  items.forEach((item, i) => {
    const x = n === 1 ? W / 2 : PAD + i * spacing
    const t = n > 1 ? i / (n - 1) : 0
    const fill = i === n - 1 ? theme.accent : lerpColor(theme.primary, theme.secondary, t)
    const above = i % 2 === 0
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${sy}" r="6" fill="${fill}"/>`)
    if (above) {
      parts.push(`<line x1="${x.toFixed(1)}" y1="${(sy - 6).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(sy - 18).toFixed(1)}" stroke="${fill}" stroke-width="1"/>`)
      parts.push(`<text x="${x.toFixed(1)}" y="${(sy - 22).toFixed(1)}" text-anchor="middle" font-size="9" fill="${fill}" font-family="system-ui,sans-serif" font-weight="700">${tt(item.label, 10)}</text>`)
      if (item.value) parts.push(`<text x="${x.toFixed(1)}" y="${(sy - 34).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(item.value, 12)}</text>`)
    } else {
      parts.push(`<line x1="${x.toFixed(1)}" y1="${(sy + 6).toFixed(1)}" x2="${x.toFixed(1)}" y2="${(sy + 18).toFixed(1)}" stroke="${fill}" stroke-width="1"/>`)
      parts.push(`<text x="${x.toFixed(1)}" y="${(sy + 30).toFixed(1)}" text-anchor="middle" font-size="9" fill="${fill}" font-family="system-ui,sans-serif" font-weight="700">${tt(item.label, 10)}</text>`)
      if (item.value) parts.push(`<text x="${x.toFixed(1)}" y="${(sy + 42).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(item.value, 12)}</text>`)
    }
  })
  return svgWrapProcess(W, H, theme, parts)
}
