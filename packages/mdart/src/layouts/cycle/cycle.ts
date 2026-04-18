import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, tt, renderEmpty } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const n = items.length
  const NODE_W = 100
  const NODE_H = 44
  const hw = NODE_W / 2, hh = NODE_H / 2
  const GAP = 6   // moved up — needed for R calc below

  // Each arc spans 2π/n radians.  The clearance cut from each end is
  // roughly (hw + GAP) / R.  Require the visible arc to be ≥ 40 % of
  // the step so curves never collapse to a stub.
  //   visibleSpan = 2π/n − 2·(hw+GAP)/R  ≥  0.4 · 2π/n
  //   → R ≥ 2·(hw+GAP) / (0.6 · 2π/n)
  const angularStep = (2 * Math.PI) / n
  const R = Math.max(140, Math.ceil((2 * (hw + GAP)) / (angularStep * 0.6)))

  const W = Math.max(500, R * 2 + NODE_W + 40)
  const H = Math.max(400, R * 2 + NODE_H + 40)
  const cx = W / 2
  const cy = H / 2

  // Arrowhead marker
  let svgContent = `<defs>
    <marker id="cycle-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L7,3 L0,6 Z" fill="${theme.muted}"/>
    </marker>
  </defs>`

  // Distance from rect centre to its edge in unit direction (dx, dy)
  const rectEdge = (dx: number, dy: number) => {
    const adx = Math.abs(dx), ady = Math.abs(dy)
    if (adx < 1e-9) return hh
    if (ady < 1e-9) return hw
    return Math.min(hw / adx, hh / ady)
  }

  // ── Arrows — SVG arcs along the orbit circle ─────────────────────────────
  // Arc endpoints are inset by an angular clearance so they sit just outside
  // each node box. Nodes are drawn on top, masking any slight overlap.
  // orient="auto" reads the arc tangent at the endpoint → always correct.

  for (let i = 0; i < n; i++) {
    const angle     = (2 * Math.PI * i)            / n - Math.PI / 2
    const nextAngle = (2 * Math.PI * ((i + 1) % n)) / n - Math.PI / 2

    // Clockwise tangent unit vectors at each node
    const t1x = -Math.sin(angle),     t1y = Math.cos(angle)
    const t2x = -Math.sin(nextAngle), t2y = Math.cos(nextAngle)

    // Angular clearance = tangential half-width of node box / R
    const clearFrom = (rectEdge(t1x, t1y) + GAP) / R
    const clearTo   = (rectEdge(t2x, t2y) + GAP) / R

    const sa = angle     + clearFrom   // arc start angle
    const ea = nextAngle - clearTo     // arc end angle

    // Arc span going clockwise (always positive)
    const span = ((ea - sa) + 4 * Math.PI) % (2 * Math.PI)
    if (span < 0.02) continue          // nodes too crowded, skip

    const ax1 = cx + R * Math.cos(sa), ay1 = cy + R * Math.sin(sa)
    const ax2 = cx + R * Math.cos(ea), ay2 = cy + R * Math.sin(ea)
    const largeArc = span > Math.PI ? 1 : 0

    const t = i / (n - 1 || 1)
    const stroke = lerpColor(theme.secondary, theme.primary, t)

    // sweep-flag=1 → clockwise; orient="auto" aligns marker with arc tangent
    svgContent += `<path d="M${ax1.toFixed(1)},${ay1.toFixed(1)} A${R},${R} 0 ${largeArc},1 ${ax2.toFixed(1)},${ay2.toFixed(1)}" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-dasharray="4,2" marker-end="url(#cycle-arr)"/>`
  }

  // ── Nodes (drawn on top so they mask arc endpoints cleanly) ───────────────
  for (let i = 0; i < n; i++) {
    const item = items[i]
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    const nx = cx + R * Math.cos(angle)
    const ny = cy + R * Math.sin(angle)
    const t = i / (n - 1 || 1)
    const fill = lerpColor(theme.secondary, theme.primary, t)

    svgContent += `<rect x="${(nx - hw).toFixed(1)}" y="${(ny - hh).toFixed(1)}" width="${NODE_W}" height="${NODE_H}" rx="6" fill="${fill}"/>`
    svgContent += `<text x="${nx.toFixed(1)}" y="${(ny + 5).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, 14)}</text>`
  }

  // Title in centre
  if (spec.title) {
    svgContent += `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="12" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(spec.title)}</text>`
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svgContent}
  </svg>`
}
