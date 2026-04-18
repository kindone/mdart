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
  const cols = n <= 2 ? n : n <= 4 ? 2 : 3
  const rows = Math.ceil(n / cols)
  const W = 560, TITLE_H = spec.title ? 28 : 8, H = TITLE_H + rows * 180 + 20
  const clW = (W - 20) / cols - 10, clH = 168
  const colors = [theme.primary, theme.secondary, theme.accent, theme.primary, theme.secondary]
  const parts: string[] = []
  items.forEach((group, i) => {
    const col = i % cols, row = Math.floor(i / cols)
    const gx = 10 + col * (clW + 10) + clW / 2
    const gy = TITLE_H + 10 + row * (clH + 10) + clH / 2
    const color = colors[i % colors.length]
    parts.push(`<ellipse cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" rx="${(clW / 2).toFixed(1)}" ry="${(clH / 2).toFixed(1)}" fill="${color}14" stroke="${color}55" stroke-width="1.5"/>`)
    parts.push(`<text x="${gx.toFixed(1)}" y="${(gy - clH / 2 + 16).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${tt(group.label, 16)}</text>`)
    const members = group.children, mR = 22
    const mCols = 3, spacing = clW / (mCols + 1)
    const nRows = Math.ceil(Math.min(members.length, 6) / mCols)
    const rowSpacing = 52
    const contentTop = gy - clH / 2 + 28
    const contentBot = gy + clH / 2 - 10
    const blockH = (nRows - 1) * rowSpacing
    const firstRowY = (contentTop + contentBot) / 2 - blockH / 2
    members.slice(0, 6).forEach((m, j) => {
      const mc = j % mCols, mr = Math.floor(j / mCols)
      const mx = gx - clW / 2 + spacing * (mc + 1)
      const my = firstRowY + mr * rowSpacing
      parts.push(`<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="${mR}" fill="${color}2a" stroke="${color}66" stroke-width="1"/>`)
      parts.push(`<text x="${mx.toFixed(1)}" y="${(my + 4).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.text}" font-family="system-ui,sans-serif">${tt(m.label, 8)}</text>`)
    })
  })
  return svg(W, H, theme, spec.title, parts)
}
