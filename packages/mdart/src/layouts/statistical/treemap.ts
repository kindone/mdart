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

  const W = 600
  const TITLE_H = spec.title ? 30 : 8
  const H = 320
  const CONTENT_H = H - TITLE_H - 8

  const colors = [theme.primary, theme.secondary, theme.accent, theme.muted, ...theme.palette]

  const cells: string[] = []

  const cols = Math.ceil(Math.sqrt(items.length))
  const rows = Math.ceil(items.length / cols)
  const cellW = W / cols
  const cellH = CONTENT_H / rows

  items.forEach((item, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = col * cellW
    const y = TITLE_H + 4 + row * cellH
    const fill = colors[i % colors.length]

    cells.push(
      `<rect x="${(x + 2).toFixed(1)}" y="${(y + 2).toFixed(1)}" width="${(cellW - 4).toFixed(1)}" height="${(cellH - 4).toFixed(1)}" rx="6" fill="${fill}55" stroke="${fill}99" stroke-width="1"/>`,
      `<text x="${(x + cellW / 2).toFixed(1)}" y="${(y + cellH / 2).toFixed(1)}" text-anchor="middle" font-size="12" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, Math.floor(cellW / 8))}</text>`,
    )
    if (item.value) {
      cells.push(`<text x="${(x + cellW / 2).toFixed(1)}" y="${(y + cellH / 2 + 16).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(item.value)}</text>`)
    }
  })

  return svg(W, H, theme, spec.title, cells)
}
