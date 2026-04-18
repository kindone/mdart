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
  const W = 520, TITLE_H = spec.title ? 28 : 8, H = 420 + TITLE_H
  const cx = W / 2, cy = TITLE_H + (H - TITLE_H) / 2
  const R = 148
  const pos: [number, number][] = items.map((_, i) => [
    cx + R * Math.cos(2 * Math.PI * i / n - Math.PI / 2),
    cy + R * Math.sin(2 * Math.PI * i / n - Math.PI / 2),
  ])
  const parts: string[] = []
  const drawn = new Set<string>()
  const edge = (i: number, j: number) => {
    const k = `${Math.min(i, j)}-${Math.max(i, j)}`
    if (drawn.has(k)) return; drawn.add(k)
    parts.push(`<line x1="${pos[i][0].toFixed(1)}" y1="${pos[i][1].toFixed(1)}" x2="${pos[j][0].toFixed(1)}" y2="${pos[j][1].toFixed(1)}" stroke="${theme.primary}55" stroke-width="1.8"/>`)
  }
  for (let i = 0; i < n; i++) {
    edge(i, (i + 1) % n)
    if (n <= 7) edge(i, (i + 2) % n)
    if (n <= 4) for (let j = i + 1; j < n; j++) edge(i, j)
  }
  const nodeR = Math.max(22, Math.min(34, 72 / n))
  items.forEach((item, i) => {
    const [nx, ny] = pos[i]
    parts.push(`<circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="${nodeR}" fill="${theme.surface}" stroke="${theme.primary}99" stroke-width="1.8"/>`)
    parts.push(`<text x="${nx.toFixed(1)}" y="${(ny + 4).toFixed(1)}" text-anchor="middle" font-size="${Math.max(8, Math.min(10, nodeR * 0.5)).toFixed(0)}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, 9)}</text>`)
  })
  return svg(W, H, theme, spec.title, parts)
}
