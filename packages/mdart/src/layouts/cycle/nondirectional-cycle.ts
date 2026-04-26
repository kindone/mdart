import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, tt, renderEmpty } from '../shared'

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
  const R = 145
  const nodeR = 22

  const parts: string[] = []

  // Track ring
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${theme.textMuted}" stroke-width="14" opacity="0.45"/>`)

  // Center title
  if (spec.title) {
    parts.push(`<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="12" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(spec.title)}</text>`)
  }

  // Nodes on track
  for (let i = 0; i < n; i++) {
    const item = items[i]
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    const nx = cx + R * Math.cos(angle)
    const ny = cy + R * Math.sin(angle)
    const t = i / (n - 1 || 1)
    const fill = lerpColor(theme.primary, theme.secondary, t)

    parts.push(`<circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="${nodeR}" fill="${fill}"/>`)
    parts.push(`<text x="${nx.toFixed(1)}" y="${(ny + (item.value ? -3 : 4)).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, 10)}</text>`)
    if (item.value) {
      parts.push(`<text x="${nx.toFixed(1)}" y="${(ny + 9).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.bg}" font-family="system-ui,sans-serif">${tt(item.value, 10)}</text>`)
    }
  }

  return svgWrap(W, H, theme, parts)
}
