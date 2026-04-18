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
  // Figure-8 (loop): two overlapping circles. Left items on outer-left half (π/2→3π/2).
  // Right items on outer-right half (−π/2→π/2). Solid outer arcs show primary flow;
  // dashed inner arcs cross through the overlap zone for the figure-8 return path.
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const n = items.length
  const W = 520, H = 340
  const titleH = spec.title ? 30 : 10
  const cy = titleH + (H - titleH) / 2
  const loopR = 108
  // Circles overlap at center (~58 px overlap on each side)
  const leftCx  = W / 2 - loopR * 0.75
  const rightCx = W / 2 + loopR * 0.75
  const nodeR = 16
  const arcR     = loopR - 4
  const angClear = (nodeR + 6) / arcR

  const leftCount  = Math.ceil(n / 2)
  const rightCount = n - leftCount
  const leftItems  = items.slice(0, leftCount)
  const rightItems = items.slice(leftCount)

  // Left items: spread outer (left) half π/2 (bottom) → 3π/2 (top).
  // CW arc π/2→3π/2 passes through π (leftmost) = outer side ✓
  const leftAngles = leftItems.map((_, i) =>
    Math.PI / 2 + (Math.PI * i) / Math.max(leftCount - 1, 1))
  const leftAnglesFinal = leftCount === 1 ? [Math.PI] : leftAngles

  // Right items: spread outer (right) half −π/2 (top) → π/2 (bottom).
  // CW arc −π/2→π/2 passes through 0 (rightmost) = outer side ✓
  const rightAngles = rightItems.map((_, i) =>
    -Math.PI / 2 + (Math.PI * i) / Math.max(rightCount - 1, 1))
  const rightAnglesFinal = rightCount === 1 ? [0] : rightAngles

  // CW arc (sweep=1) with angular clearance; dashed=true for inner return arcs
  const cwArc = (cx: number, a1: number, a2: number, color: string, marker: string, dashed = false): string => {
    const sa = a1 + angClear
    const ea = a2 - angClear
    const span = ((ea - sa) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
    if (span < 0.1) return ''
    const sx = cx + arcR * Math.cos(sa), sy = cy + arcR * Math.sin(sa)
    const ex = cx + arcR * Math.cos(ea), ey = cy + arcR * Math.sin(ea)
    const large = span > Math.PI ? 1 : 0
    const dash  = dashed ? ' stroke-dasharray="5,4" opacity="0.55"' : ''
    return `<path d="M${sx.toFixed(1)},${sy.toFixed(1)} A${arcR},${arcR} 0 ${large} 1 ${ex.toFixed(1)},${ey.toFixed(1)}" fill="none" stroke="${color}" stroke-width="1.8"${dash} marker-end="url(#${marker})"/>`
  }

  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  parts.push(`<defs>
    <marker id="lp-a" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0,0 L7,4 L0,8 Z" fill="${theme.primary}dd"/>
    </marker>
    <marker id="lp-b" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0,0 L7,4 L0,8 Z" fill="${theme.secondary}dd"/>
    </marker>
    <marker id="lp-ad" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0,0 L7,4 L0,8 Z" fill="${theme.primary}99"/>
    </marker>
    <marker id="lp-bd" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0,0 L7,4 L0,8 Z" fill="${theme.secondary}99"/>
    </marker>
  </defs>`)

  // Background circles (overlapping)
  parts.push(`<circle cx="${leftCx.toFixed(1)}"  cy="${cy}" r="${loopR}" fill="${theme.primary}08"   stroke="${theme.primary}35"   stroke-width="1.5"/>`)
  parts.push(`<circle cx="${rightCx.toFixed(1)}" cy="${cy}" r="${loopR}" fill="${theme.secondary}08" stroke="${theme.secondary}35" stroke-width="1.5"/>`)

  // Left loop: solid outer arcs, then dashed inner return through overlap zone
  if (leftAnglesFinal.length >= 2) {
    for (let i = 0; i + 1 < leftAnglesFinal.length; i++) {
      parts.push(cwArc(leftCx, leftAnglesFinal[i], leftAnglesFinal[i + 1], theme.primary, 'lp-a'))
    }
    // Return: CW from top (3π/2) → bottom (π/2 + 2π), passing through 0 (crossing zone)
    const topA = leftAnglesFinal[leftAnglesFinal.length - 1]
    const botA = leftAnglesFinal[0]
    parts.push(cwArc(leftCx, topA, botA + 2 * Math.PI, theme.primary, 'lp-ad', true))
  } else {
    // Single item: near-complete CW loop as hint
    const a = leftAnglesFinal[0]
    parts.push(cwArc(leftCx, a, a + 2 * Math.PI, theme.primary, 'lp-ad', true))
  }

  // Right loop: solid outer arcs, then dashed inner return through overlap zone
  if (rightAnglesFinal.length >= 2) {
    for (let i = 0; i + 1 < rightAnglesFinal.length; i++) {
      parts.push(cwArc(rightCx, rightAnglesFinal[i], rightAnglesFinal[i + 1], theme.secondary, 'lp-b'))
    }
    // Return: CW from bottom (π/2) → top (−π/2 + 2π = 3π/2), passing through π (crossing zone)
    const topA = rightAnglesFinal[0]
    const botA = rightAnglesFinal[rightAnglesFinal.length - 1]
    parts.push(cwArc(rightCx, botA, topA + 2 * Math.PI, theme.secondary, 'lp-bd', true))
  } else {
    // Single item: near-complete CW loop as hint
    const a = rightAnglesFinal[0]
    parts.push(cwArc(rightCx, a, a + 2 * Math.PI, theme.secondary, 'lp-bd', true))
  }

  // Center crossing dot
  parts.push(`<circle cx="${W / 2}" cy="${cy}" r="5" fill="${theme.accent}"/>`)

  // Draw nodes (on top of arcs)
  const drawNodes = (loop_items: typeof items, angles: number[], cx: number, idxOffset: number) => {
    loop_items.forEach((item, i) => {
      const angle = angles[i]
      const nx = cx + loopR * Math.cos(angle)
      const ny = cy + loopR * Math.sin(angle)
      const t = (idxOffset + i) / (n - 1 || 1)
      const fill = lerpColor(theme.primary, theme.secondary, t)
      parts.push(`<circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="${nodeR}" fill="${fill}" stroke="${theme.bg}" stroke-width="2"/>`)
      // Use theme.text (not bg): labels are centered on nodes but overflow onto the
      // canvas; bg-colored text on the same bg was invisible outside the node disk.
      const words = item.label.split(' ')
      if (words.length <= 1) {
        parts.push(`<text x="${nx.toFixed(1)}" y="${(ny + 4).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.text}" stroke="${theme.bg}" stroke-width="0.35" paint-order="stroke fill" font-family="system-ui,sans-serif" font-weight="700">${tt(item.label, 9)}</text>`)
      } else {
        const mid = Math.ceil(words.length / 2)
        const l1 = words.slice(0, mid).join(' '), l2 = words.slice(mid).join(' ')
        parts.push(`<text x="${nx.toFixed(1)}" y="${(ny - 1).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.text}" stroke="${theme.bg}" stroke-width="0.35" paint-order="stroke fill" font-family="system-ui,sans-serif" font-weight="700">${tt(l1, 9)}</text>`)
        parts.push(`<text x="${nx.toFixed(1)}" y="${(ny + 9).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.text}" stroke="${theme.bg}" stroke-width="0.35" paint-order="stroke fill" font-family="system-ui,sans-serif" font-weight="700">${tt(l2, 9)}</text>`)
      }
    })
  }

  drawNodes(leftItems,  leftAnglesFinal,  leftCx,  0)
  drawNodes(rightItems, rightAnglesFinal, rightCx, leftCount)

  return svgWrap(W, H, theme, parts)
}
