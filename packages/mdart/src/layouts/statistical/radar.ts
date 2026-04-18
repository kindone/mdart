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
  if (items.length < 3) return renderEmpty(theme)

  const n = items.length
  const W = 480, TITLE_H = spec.title ? 30 : 10, H = 380 + TITLE_H
  const cx = W / 2, cy = TITLE_H + (H - TITLE_H) / 2
  const R = Math.min(cx - 80, (H - TITLE_H) / 2 - 44)
  const parts: string[] = []

  const vals = items.map(it => {
    const raw = (it.value ?? it.attrs[0] ?? '0').replace('%', '')
    return Math.min(Math.max(parseFloat(raw) || 0, 0), 100) / 100
  })

  for (let ring = 1; ring <= 4; ring++) {
    const r = R * ring / 4
    const pts = items.map((_, i) => {
      const a = 2 * Math.PI * i / n - Math.PI / 2
      return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
    })
    parts.push(`<polygon points="${pts.join(' ')}" fill="none" stroke="${theme.border}99" stroke-width="0.8"/>`)
    parts.push(`<text x="${cx}" y="${(cy - r + 3).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.textMuted}" font-family="system-ui,sans-serif" opacity="0.7">${ring * 25}%</text>`)
  }

  items.forEach((_, i) => {
    const a = 2 * Math.PI * i / n - Math.PI / 2
    parts.push(`<line x1="${cx}" y1="${cy}" x2="${(cx + R * Math.cos(a)).toFixed(1)}" y2="${(cy + R * Math.sin(a)).toFixed(1)}" stroke="${theme.border}66" stroke-width="1"/>`)
  })

  const vpts = items.map((_, i) => {
    const a = 2 * Math.PI * i / n - Math.PI / 2
    const r = R * vals[i]
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
  })
  parts.push(`<polygon points="${vpts.join(' ')}" fill="${theme.primary}2e" stroke="${theme.primary}" stroke-width="1.8"/>`)

  items.forEach((item, i) => {
    const a = 2 * Math.PI * i / n - Math.PI / 2
    const vr = R * vals[i]
    parts.push(`<circle cx="${(cx + vr * Math.cos(a)).toFixed(1)}" cy="${(cy + vr * Math.sin(a)).toFixed(1)}" r="4" fill="${theme.accent}"/>`)
    const la = R + 26
    const lx = cx + la * Math.cos(a), ly = cy + la * Math.sin(a)
    const anchor = Math.cos(a) > 0.15 ? 'start' : Math.cos(a) < -0.15 ? 'end' : 'middle'
    parts.push(`<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="${anchor}" font-size="10.5" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, 12)}</text>`)
  })

  return svg(W, H, theme, spec.title, parts)
}
