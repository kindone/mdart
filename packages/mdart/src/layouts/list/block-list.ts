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
  const CELL_H = 80   // tall enough for label + value + 2 child lines
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
    parts.push(`<text x="${(x+16).toFixed(1)}" y="${(y+22).toFixed(1)}" font-size="12" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${tt(item.label, 28)}</text>`)
    // Value: italic muted subtitle — distinct from the bulleted children below.
    if (item.value) parts.push(`<text x="${(x+16).toFixed(1)}" y="${(y+38).toFixed(1)}" font-size="10" fill="${theme.textMuted}" font-style="italic" font-family="system-ui,sans-serif">${tt(item.value, 34)}</text>`)
    // Children: up to 2 bulleted list items. Same size + colour as the value
    // so they sit comfortably; bullet prefix + non-italic distinguishes them.
    item.children.slice(0, 2).forEach((child, ci) => {
      const cy = y + (item.value ? 54 : 42) + ci * 14
      const op = ci === 0 ? '1' : '0.7'
      parts.push(`<text x="${(x+16).toFixed(1)}" y="${cy.toFixed(1)}" font-size="10" fill="${theme.textMuted}" fill-opacity="${op}" font-family="system-ui,sans-serif">· ${tt(child.label, 32)}</text>`)
    })
  })
  return svg(W, H, theme, parts)
}
