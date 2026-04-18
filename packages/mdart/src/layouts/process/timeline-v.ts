import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, titleEl, tt, renderEmpty } from '../shared'

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
  const W = 560, ROW_H = 48, SPINE_X = 72, DOT_R = 7
  const titleH = spec.title ? 28 : 8
  const H = titleH + n * ROW_H + 8
  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))
  parts.push(`<line x1="${SPINE_X}" y1="${titleH + DOT_R}" x2="${SPINE_X}" y2="${titleH + (n - 1) * ROW_H + ROW_H / 2}" stroke="${theme.border}" stroke-width="2"/>`)
  parts.push(`<polygon points="${(SPINE_X - 5).toFixed(1)},${(titleH + (n-1)*ROW_H + ROW_H/2 - 2).toFixed(1)} ${(SPINE_X + 5).toFixed(1)},${(titleH + (n-1)*ROW_H + ROW_H/2 - 2).toFixed(1)} ${SPINE_X},${(titleH + (n-1)*ROW_H + ROW_H/2 + 6).toFixed(1)}" fill="${theme.border}"/>`)
  items.forEach((item, i) => {
    const cy = titleH + i * ROW_H + ROW_H / 2
    const t = n > 1 ? i / (n - 1) : 0
    const fill = i === n - 1 ? theme.accent : lerpColor(theme.primary, theme.secondary, t)
    parts.push(`<circle cx="${SPINE_X}" cy="${cy.toFixed(1)}" r="${DOT_R}" fill="${fill}"/>`)
    if (item.value) parts.push(`<text x="${(SPINE_X - DOT_R - 4).toFixed(1)}" y="${(cy + 3).toFixed(1)}" text-anchor="end" font-size="8" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(item.value)}</text>`)
    parts.push(`<text x="${(SPINE_X + DOT_R + 8).toFixed(1)}" y="${(cy - 4).toFixed(1)}" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, 36)}</text>`)
    const detail = item.children.map(c => c.label).join(' · ')
    if (detail) parts.push(`<text x="${(SPINE_X + DOT_R + 8).toFixed(1)}" y="${(cy + 11).toFixed(1)}" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(detail, 48)}</text>`)
  })
  return svgWrapProcess(W, H, theme, parts)
}
