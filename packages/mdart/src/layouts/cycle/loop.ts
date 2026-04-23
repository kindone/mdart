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
  // Pipeline loop: items in a horizontal row connected by solid forward arrows.
  // A single dashed arc sweeps below from last→first to show the loop-back path.
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const n    = items.length
  const W    = 520
  const padX = 48

  // Scale node size down for many items
  const nodeR    = n <= 4 ? 22 : n <= 6 ? 18 : n <= 8 ? 15 : 12
  const fontSize = nodeR >= 18 ? 10 : 9

  const titleH = spec.title ? 36 : 10
  const rowY   = titleH + nodeR + 16        // vertical centre of nodes
  const dipAmt = nodeR * 2.2 + 20          // how far below nodes the return arc dips
  const H      = rowY + nodeR + dipAmt + 28

  const spacing = n > 1 ? (W - padX * 2) / (n - 1) : 0
  const nx      = (i: number) => n === 1 ? W / 2 : padX + i * spacing

  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  // ── Arrowhead markers ──────────────────────────────────────────────────────
  parts.push(`<defs>
    <marker id="lp-fwd" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0,0 L7,4 L0,8 Z" fill="${theme.primary}"/>
    </marker>
    <marker id="lp-ret" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0,0 L7,4 L0,8 Z" fill="${theme.accent}bb"/>
    </marker>
  </defs>`)

  // ── Forward arrows (solid) ─────────────────────────────────────────────────
  for (let i = 0; i < n - 1; i++) {
    const x1  = nx(i)   + nodeR + 2
    const x2  = nx(i+1) - nodeR - 2
    if (x2 > x1) {
      const t   = i / Math.max(n - 1, 1)
      const col = lerpColor(theme.primary, theme.secondary, t)
      parts.push(`<line x1="${x1.toFixed(1)}" y1="${rowY}" x2="${x2.toFixed(1)}" y2="${rowY}" stroke="${col}" stroke-width="2" marker-end="url(#lp-fwd)"/>`)
    }
  }

  // ── Return arc (dashed) last → first ──────────────────────────────────────
  if (n === 1) {
    // Self-loop above the single node
    const cx = W / 2
    const loopTop = rowY - nodeR - 4
    parts.push(`<path d="M${cx - nodeR + 4},${loopTop} a22,16 0 1 1 ${nodeR * 2 - 8},0" fill="none" stroke="${theme.accent}" stroke-width="1.8" stroke-dasharray="5,4" opacity="0.75" marker-end="url(#lp-ret)"/>`)
  } else {
    const x1  = nx(n - 1)
    const x0  = nx(0)
    const sy  = rowY + nodeR + 2
    const ey  = sy
    const dip = rowY + nodeR + dipAmt
    // Cubic bezier: control points at full dip depth under each end node
    parts.push(`<path d="M${x1.toFixed(1)},${sy} C${x1.toFixed(1)},${dip.toFixed(1)} ${x0.toFixed(1)},${dip.toFixed(1)} ${x0.toFixed(1)},${ey}" fill="none" stroke="${theme.accent}" stroke-width="1.8" stroke-dasharray="5,4" opacity="0.7" marker-end="url(#lp-ret)"/>`)
    // "↺ loop" label at the arc's lowest point
    const labelY = dip + 13
    parts.push(`<text x="${(W / 2).toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-style="italic" opacity="0.85">&#x21BA; loop</text>`)
  }

  // ── Nodes ──────────────────────────────────────────────────────────────────
  items.forEach((item, i) => {
    const x    = nx(i)
    const t    = i / Math.max(n - 1, 1)
    const fill = lerpColor(theme.primary, theme.secondary, t)

    // Node circle
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${rowY}" r="${nodeR}" fill="${fill}" stroke="${theme.bg}" stroke-width="2.5"/>`)

    // Label (one or two lines, bg-coloured text inside node)
    const words = item.label.split(' ')
    if (words.length <= 1) {
      parts.push(`<text x="${x.toFixed(1)}" y="${(rowY + fontSize * 0.38).toFixed(1)}" text-anchor="middle" font-size="${fontSize}" font-weight="700" font-family="system-ui,sans-serif" fill="${theme.bg}">${tt(item.label, 11)}</text>`)
    } else {
      const mid = Math.ceil(words.length / 2)
      const l1  = words.slice(0, mid).join(' ')
      const l2  = words.slice(mid).join(' ')
      const fh  = fontSize - 1
      parts.push(`<text x="${x.toFixed(1)}" y="${(rowY - fh * 0.4).toFixed(1)}" text-anchor="middle" font-size="${fh}" font-weight="700" font-family="system-ui,sans-serif" fill="${theme.bg}">${tt(l1, 11)}</text>`)
      parts.push(`<text x="${x.toFixed(1)}" y="${(rowY + fh * 1.1).toFixed(1)}" text-anchor="middle" font-size="${fh}" font-weight="700" font-family="system-ui,sans-serif" fill="${theme.bg}">${tt(l2, 11)}</text>`)
    }

    // Step-number badge (top-right of node)
    const bx = x + nodeR - 4
    const by = rowY - nodeR + 4
    parts.push(`<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="7" fill="${theme.bg}" stroke="${fill}" stroke-width="1.5"/>`)
    parts.push(`<text x="${bx.toFixed(1)}" y="${(by + 3.5).toFixed(1)}" text-anchor="middle" font-size="8" font-weight="700" font-family="system-ui,sans-serif" fill="${fill}">${i + 1}</text>`)
  })

  return svgWrap(W, H, theme, parts)
}
