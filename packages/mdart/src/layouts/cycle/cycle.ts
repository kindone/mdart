import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, tt, renderEmpty } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const n = items.length
  const W = 500
  const H = 400
  const cx = W / 2
  const cy = H / 2
  const R = 140     // orbit radius
  const NODE_W = 100
  const NODE_H = 44

  // Arrowhead marker (recolor per-arrow via CSS filter is complex; use a neutral muted colour)
  let svgContent = `<defs>
    <marker id="cycle-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L7,3 L0,6 Z" fill="${theme.muted}"/>
    </marker>
  </defs>`

  // Draw curved arrows first (below nodes)
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    const nextAngle = (2 * Math.PI * ((i + 1) % n)) / n - Math.PI / 2

    const x1 = cx + R * Math.cos(angle)
    const y1 = cy + R * Math.sin(angle)
    const x2 = cx + R * Math.cos(nextAngle)
    const y2 = cy + R * Math.sin(nextAngle)

    // Mid-angle control point (curved outward).
    // Unwrap nextAngle when the arc wraps past 2π (last → first node), so the
    // average always falls on the outer arc, not through the centre.
    const unwrappedNext = nextAngle < angle ? nextAngle + 2 * Math.PI : nextAngle
    const midAngle = (angle + unwrappedNext) / 2
    const controlR = R * 1.3
    const qx = cx + controlR * Math.cos(midAngle)
    const qy = cy + controlR * Math.sin(midAngle)

    // Shorten path endpoints so they start/end at node edges, not centres.
    // For a rectangle of half-size (hw, hh), the edge distance in direction (dx,dy)
    // is min(hw/|dx|, hh/|dy|) — i.e. whichever face is hit first.
    const rectEdge = (dx: number, dy: number) => {
      const adx = Math.abs(dx), ady = Math.abs(dy)
      const hw = NODE_W / 2, hh = NODE_H / 2
      if (adx < 1e-9) return hh
      if (ady < 1e-9) return hw
      return Math.min(hw / adx, hh / ady)
    }
    const s2c = Math.hypot(qx - x1, qy - y1) || 1
    const sdx = (qx - x1) / s2c, sdy = (qy - y1) / s2c
    const sEdge = rectEdge(sdx, sdy) + 3
    const sx = x1 + sdx * sEdge
    const sy = y1 + sdy * sEdge
    const c2e = Math.hypot(x2 - qx, y2 - qy) || 1
    const edx = (x2 - qx) / c2e, edy = (y2 - qy) / c2e
    const eEdge = rectEdge(edx, edy) + 6  // +6 so marker clears the node border
    const ex = x2 - edx * eEdge
    const ey = y2 - edy * eEdge

    const t = i / (n - 1 || 1)
    const arrowColor = lerpColor(theme.secondary, theme.primary, t)

    // Curved path with arrowhead at destination edge
    svgContent += `<path d="M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${qx.toFixed(1)} ${qy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="${arrowColor}" stroke-width="1.5" stroke-dasharray="4,2" marker-end="url(#cycle-arr)"/>`
  }

  // Draw nodes
  for (let i = 0; i < n; i++) {
    const item = items[i]
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    const nx = cx + R * Math.cos(angle)
    const ny = cy + R * Math.sin(angle)
    const t = i / (n - 1 || 1)
    const fill = lerpColor(theme.secondary, theme.primary, t)

    svgContent += `<rect x="${nx - NODE_W / 2}" y="${ny - NODE_H / 2}" width="${NODE_W}" height="${NODE_H}" rx="6" fill="${fill}" />`

    svgContent += `<text x="${nx}" y="${ny + 5}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, 14)}</text>`
  }

  // Title in center
  if (spec.title) {
    svgContent += `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="12" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(spec.title)}</text>`
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svgContent}
  </svg>`
}
