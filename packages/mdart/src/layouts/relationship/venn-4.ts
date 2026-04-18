import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt } from '../shared'

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
  const items = spec.items.filter(i => !i.isIntersection)
  const ixItem = spec.items.find(i => i.isIntersection)
  const W = 560, TITLE_H = spec.title ? 28 : 8, H = 380 + TITLE_H
  const cx = W / 2, cy = TITLE_H + (H - TITLE_H) / 2
  const R = 105, dx = 60, dy = 44
  const centers = [
    [cx - dx, cy - dy], [cx + dx, cy - dy],
    [cx - dx, cy + dy], [cx + dx, cy + dy],
  ]
  const colors = [theme.primary, theme.secondary, theme.accent, theme.primary]
  const labelOff: [number, number][] = [[-R * 0.58, -R * 0.52], [R * 0.58, -R * 0.52], [-R * 0.58, R * 0.52], [R * 0.58, R * 0.52]]
  const parts: string[] = []
  centers.forEach(([x, y], i) => {
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${R}" fill="${colors[i]}20" stroke="${colors[i]}66" stroke-width="1.5"/>`)
  })
  items.slice(0, 4).forEach((item, i) => {
    const [x, y] = centers[i]
    const lx = x + labelOff[i][0], ly = y + labelOff[i][1]
    parts.push(`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, 12)}</text>`)
    item.children.slice(0, 2).forEach((ch, j) => {
      parts.push(`<text x="${lx.toFixed(1)}" y="${(ly + 14 + j * 13).toFixed(1)}" text-anchor="middle" font-size="8.5" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(ch.label, 10)}</text>`)
    })
  })
  if (ixItem) parts.push(`<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="9" fill="${theme.accent}" font-family="system-ui,sans-serif" font-weight="600">${tt(ixItem.label, 10)}</text>`)
  return svg(W, H, theme, spec.title, parts)
}
