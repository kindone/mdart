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

  const colors = [theme.primary, theme.secondary, theme.accent, theme.muted, ...theme.palette]
  const rawVals = items.map(it => Math.max(0, parseFloat((it.value ?? it.attrs[0] ?? '0').replace('%', '')) || 0))
  const total = rawVals.reduce((a, b) => a + b, 0) || 100
  let squares = rawVals.map(v => Math.round(v / total * 100))
  const diff = 100 - squares.reduce((a, b) => a + b, 0)
  if (diff !== 0) squares[0] = Math.max(0, squares[0] + diff)

  const GRID = 10, SQ = 18, GAP = 3, PAD = 16
  const GRID_W = GRID * (SQ + GAP) - GAP
  const LEGEND_H = items.length * 22 + 10
  const W = Math.max(GRID_W + PAD * 2, 280)
  const gridOffX = (W - GRID_W) / 2
  const TITLE_H = spec.title ? 30 : 10
  const H = TITLE_H + PAD + GRID * (SQ + GAP) - GAP + PAD + LEGEND_H

  const sqColor: string[] = []
  items.forEach((_, gi) => { for (let s = 0; s < squares[gi]; s++) sqColor.push(colors[gi % colors.length]) })

  const parts: string[] = []
  for (let sq = 0; sq < 100; sq++) {
    const col = sq % GRID, row = Math.floor(sq / GRID)
    const x = gridOffX + col * (SQ + GAP), y = TITLE_H + PAD + row * (SQ + GAP)
    const fill = sqColor[sq] ? sqColor[sq] : `${theme.muted}22`
    parts.push(`<rect x="${x.toFixed(1)}" y="${y}" width="${SQ}" height="${SQ}" rx="2" fill="${fill}"/>`)
  }

  const legY = TITLE_H + PAD + GRID * (SQ + GAP) + 6
  items.forEach((item, i) => {
    const ly = legY + i * 22
    parts.push(`<rect x="${PAD}" y="${ly}" width="12" height="12" rx="2" fill="${colors[i % colors.length]}"/>`)
    parts.push(`<text x="${PAD + 16}" y="${ly + 10}" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif">${tt(item.label, 22)} (${squares[i]}%)</text>`)
  })

  return svg(W, H, theme, spec.title, parts)
}
