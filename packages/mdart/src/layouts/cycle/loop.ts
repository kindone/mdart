import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, titleEl, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared } from '../shared'

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
  const animate = shouldAnimate(spec)
  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  // ── Arrowhead markers ──────────────────────────────────────────────────────
  parts.push(`<defs>
    <marker id="lp-fwd" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0,0 L7,4 L0,8 Z" fill="${theme.primary}"/>
    </marker>
    <marker id="lp-ret" markerWidth="8" markerHeight="8" refX="0" refY="4" orient="auto">
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
      const arrEl = `<line x1="${x1.toFixed(1)}" y1="${rowY}" x2="${x2.toFixed(1)}" y2="${rowY}" stroke="${col}" stroke-width="2" marker-end="url(#lp-fwd)"/>`
      parts.push(animate ? `<g class="mdart-arr-n${i + 1}">${arrEl}</g>` : arrEl)
    }
  }

  // ── Return arc (dashed) last → first ──────────────────────────────────────
  if (n === 1) {
    // Self-loop above the single node
    const cx = W / 2
    const loopTop = rowY - nodeR - 4
    const arrEl = `<path d="M${cx - nodeR + 4},${loopTop} a22,16 0 1 1 ${nodeR * 2 - 8},0" fill="none" stroke="${theme.accent}" stroke-width="1.8" stroke-dasharray="5,4" opacity="0.75" marker-end="url(#lp-ret)"/>`
    parts.push(animate ? `<g class="mdart-arr-n${n}">${arrEl}</g>` : arrEl)
  } else {
    const x1  = nx(n - 1)
    const x0  = nx(0)
    const sy  = rowY + nodeR + 2
    const dip = rowY + nodeR + dipAmt
    const incomingAngle = Math.PI * 0.51
    const returnStroke = 1.8
    const markerTipLen = 7 * returnStroke
    const tipClearance = 3
    const dirX = Math.cos(incomingAngle)
    const dirY = Math.sin(incomingAngle)
    const ex  = x0 + dirX * (nodeR + markerTipLen + tipClearance)
    const ey  = rowY + dirY * (nodeR + markerTipLen + tipClearance)
    // Approach along a ray aimed at the node center, but stop the marker just
    // outside the circle. The final control point remains on that same ray so
    // the curve's imaginary extension passes cleanly through the arrowhead axis.
    const c2Dist = Math.max(30, nodeR * 1.6)
    const c2x = ex + dirX * c2Dist
    const c2y = ey + dirY * c2Dist
    const arrEl = `<path d="M${x1.toFixed(1)},${sy} C${x1.toFixed(1)},${dip.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}" fill="none" stroke="${theme.accent}" stroke-width="${returnStroke}" stroke-dasharray="5,4" opacity="0.7" marker-end="url(#lp-ret)"/>`
    // "↺ loop" label at the arc's lowest point
    const labelY = dip + 13
    const labelEl = `<text x="${(W / 2).toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-style="italic" opacity="0.85">&#x21BA; loop</text>`
    const returnEl = arrEl + labelEl
    parts.push(animate ? `<g class="mdart-arr-n${n}">${returnEl}</g>` : returnEl)
  }

  // Per-node fitting: every node shares nodeR (which itself already varies
  // by total item count, tiered above), so within one diagram each label is
  // sized independently — a short label stays large instead of being
  // dragged down to match a long neighbor. Replaces the old flat 11-char
  // truncation plus a crude "split words in half" 2-line rule (word-count
  // based, not actual width) with dynamic width-aware wrapping.
  const nodeBoxW = Math.max(20, nodeR * 1.6 - 4)
  // 2 lines at the label's own font floor (6.5) need ~2×(6.5×1.3)=16.9px —
  // the smallest nodeR tier (12, for n>8) gives nodeR×1.4=16.8px, just
  // under that threshold, which would silently make the 2-line ceiling
  // unreachable there (same bug caught in circular-process.ts/decision-
  // tree.ts/h-org-chart.ts). Guarantee at least that floor-line-pair's
  // worth of room.
  const nodeBoxH = Math.max(nodeR * 1.4, 6.5 * 1.3 * 2)
  const halo = `stroke="#000000" stroke-opacity="0.4" stroke-width="2.5" paint-order="stroke fill"`

  // ── Nodes ──────────────────────────────────────────────────────────────────
  items.forEach((item, i) => {
    const x    = nx(i)
    const t    = i / Math.max(n - 1, 1)
    const fill = lerpColor(theme.primary, theme.secondary, t)

    const { display: lblDisplay, url: lblUrl } = displayLabel(item)
    const { fontSize: labelFS, lineHeight: labelLH, results: [{ lines, truncated }] } =
      fitTextToWidthShared([lblDisplay], nodeBoxW, { maxSize: fontSize, minSize: 6.5, maxLines: 2, boxH: nodeBoxH })
    const tip = truncated ? `<title>${escapeXml(lblDisplay)}</title>` : ''
    const totalH = lines.length * labelLH
    let lblContent = tip
    lines.forEach((line, li) => {
      const ty = rowY - totalH / 2 + li * labelLH + labelLH * 0.8
      lblContent += `<text x="${x.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="${labelFS}" font-weight="700" font-family="system-ui,sans-serif" fill="#ffffff" ${halo}>${escapeXml(line)}</text>`
    })

    // Step-number badge (top-right of node) — visually part of the node
    const bx = x + nodeR - 4
    const by = rowY - nodeR + 4

    let nodeStr = ''
    nodeStr += `<circle cx="${x.toFixed(1)}" cy="${rowY}" r="${nodeR}" fill="${fill}" stroke="${theme.bg}" stroke-width="2.5">${itemTitleTag(item)}</circle>`
    nodeStr += aWrap(lblContent, lblUrl)
    nodeStr += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="7" fill="${theme.bg}" stroke="${fill}" stroke-width="1.5"/>`
    nodeStr += `<text x="${bx.toFixed(1)}" y="${(by + 3.5).toFixed(1)}" text-anchor="middle" font-size="8" font-weight="700" font-family="system-ui,sans-serif" fill="${fill}">${i + 1}</text>`
    parts.push(animate ? `<g class="mdart-n${i}">${nodeStr}</g>` : nodeStr)
  })

  if (animate) parts.unshift(seqSpotlightCSS(n, spec, { trailingArrowSlot: true }))
  return svgWrap(W, H, theme, parts)
}
