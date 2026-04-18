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
  const COLS = 2
  const CELL_W = (W - 12) / COLS
  const CELL_H = 68
  const GAP = 8
  const rows = Math.ceil(items.length / COLS)
  const titleH = spec.title ? 30 : 8
  const H = titleH + rows * (CELL_H + GAP) + 8
  const parts: string[] = []
  if (spec.title) parts.push(`<text x="${W/2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`)
  items.forEach((item, i) => {
    const col = i % COLS, row = Math.floor(i / COLS)
    const x = col * (CELL_W + GAP), y = titleH + row * (CELL_H + GAP)
    const t = items.length > 1 ? i / (items.length - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${CELL_W.toFixed(1)}" height="${CELL_H}" rx="8" fill="${fill}33" stroke="${fill}88" stroke-width="1.5"/>`)
    parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="6" height="${CELL_H}" rx="3" fill="${fill}"/>`)
    parts.push(`<text x="${(x+16).toFixed(1)}" y="${(y+26).toFixed(1)}" font-size="12" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${tt(item.label, 28)}</text>`)
    if (item.value) parts.push(`<text x="${(x+16).toFixed(1)}" y="${(y+44).toFixed(1)}" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(item.value, 34)}</text>`)
    const sub = item.children.map(c => c.label).join(' · ')
    if (sub) parts.push(`<text x="${(x+16).toFixed(1)}" y="${(y+58).toFixed(1)}" font-size="9" fill="${theme.muted}" font-family="system-ui,sans-serif">${tt(sub, 38)}</text>`)
  })
  return svg(W, H, theme, parts)
}
