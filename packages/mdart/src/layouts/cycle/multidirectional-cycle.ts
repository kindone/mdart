import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, tt, titleEl, renderEmpty } from '../shared'

function svgWrap(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const n = items.length
  const W = 440
  const H = 400
  const cx = W / 2
  const cy = H / 2
  const R = 150
  const nodeR = 20

  const parts: string[] = []

  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  // Calculate node positions
  const positions: Array<{ x: number; y: number }> = []
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    positions.push({ x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) })
  }

  // Draw all connections behind nodes
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = positions[i]
      const b = positions[j]
      parts.push(`<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${theme.muted}" stroke-width="1" opacity="0.6"/>`)
    }
  }

  // Draw nodes on top
  for (let i = 0; i < n; i++) {
    const item = items[i]
    const { x, y } = positions[i]
    const t = i / (n - 1 || 1)
    const fill = lerpColor(theme.primary, theme.secondary, t)

    parts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${nodeR}" fill="${fill}" stroke="${theme.bg}" stroke-width="2"/>`)
    parts.push(`<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, 10)}</text>`)
  }

  return svgWrap(W, H, theme, parts)
}
