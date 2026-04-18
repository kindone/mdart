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
  const n = Math.min(items.length, 4)
  const W = 560, GAP = 6, HEADER_H = 24, ROW_H = 20
  const maxChildren = Math.max(...items.slice(0, n).map(it => it.children.length), 2)
  const COL_H = HEADER_H + maxChildren * ROW_H + 12
  const COL_W = (W - (n - 1) * GAP) / n
  const titleH = spec.title ? 28 : 8
  const H = titleH + COL_H + 8
  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  items.slice(0, n).forEach((item, i) => {
    const x = i * (COL_W + GAP), y = titleH
    const t = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${COL_W.toFixed(1)}" height="${COL_H}" rx="6" fill="${theme.surface}" stroke="${fill}55" stroke-width="1"/>`)
    parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${COL_W.toFixed(1)}" height="${HEADER_H}" rx="6" fill="${fill}"/>`)
    parts.push(`<rect x="${x.toFixed(1)}" y="${(y + HEADER_H - 6).toFixed(1)}" width="${COL_W.toFixed(1)}" height="6" fill="${fill}"/>`)
    parts.push(`<text x="${(x + COL_W / 2).toFixed(1)}" y="${(y + HEADER_H / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="#fff" font-family="system-ui,sans-serif" font-weight="700">${tt(item.label, Math.floor(COL_W / 6))}</text>`)
    item.children.slice(0, maxChildren).forEach((child, ci) => {
      const ry = y + HEADER_H + ci * ROW_H + 6
      parts.push(`<rect x="${(x + 4).toFixed(1)}" y="${ry.toFixed(1)}" width="${(COL_W - 8).toFixed(1)}" height="${ROW_H - 2}" rx="3" fill="${fill}22"/>`)
      parts.push(`<text x="${(x + COL_W / 2).toFixed(1)}" y="${(ry + ROW_H / 2 + 3).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(child.label, Math.floor(COL_W / 5.5))}</text>`)
    })
  })
  return svgWrapProcess(W, H, theme, parts)
}
