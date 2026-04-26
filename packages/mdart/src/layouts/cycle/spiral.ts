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
  const W = 500
  const H = 420
  const cx = W / 2
  const cy = H / 2 + 10
  const innerR = 20
  const outerR = 170
  const turns = n <= 4 ? 2 : 2.5
  const SAMPLES = 200

  const parts: string[] = []

  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  // Generate spiral path
  const spiralPoints: string[] = []
  for (let s = 0; s <= SAMPLES; s++) {
    const theta = (s / SAMPLES) * turns * 2 * Math.PI
    const r = innerR + (outerR - innerR) * theta / (turns * 2 * Math.PI)
    const x = cx + r * Math.cos(theta)
    const y = cy + r * Math.sin(theta)
    spiralPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  parts.push(`<polyline points="${spiralPoints.join(' ')}" fill="none" stroke="${theme.textMuted}" stroke-width="2" opacity="0.7"/>`)

  // Place milestones evenly along spiral
  for (let k = 0; k < n; k++) {
    const theta = n > 1 ? k * (turns * 2 * Math.PI) / (n - 1) : 0
    const r = innerR + (outerR - innerR) * theta / (turns * 2 * Math.PI)
    const mx = cx + r * Math.cos(theta)
    const my = cy + r * Math.sin(theta)
    const t = k / (n - 1 || 1)
    const isLast = k === n - 1
    const dotR = isLast ? 9 : 7
    const fill = isLast ? theme.accent : lerpColor(theme.primary, theme.secondary, t)

    parts.push(`<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="${dotR}" fill="${fill}"/>`)

    // Label on alternating sides
    const cosTheta = Math.cos(theta)
    const labelX = cosTheta >= 0 ? mx + dotR + 4 : mx - dotR - 4
    const anchor = cosTheta >= 0 ? 'start' : 'end'
    parts.push(`<text x="${labelX.toFixed(1)}" y="${(my + 4).toFixed(1)}" text-anchor="${anchor}" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(items[k].label, 14)}</text>`)
  }

  return svgWrap(W, H, theme, parts)
}
