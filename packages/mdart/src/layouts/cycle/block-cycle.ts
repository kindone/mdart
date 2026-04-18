import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, truncate, escapeXml, tt, titleEl, renderEmpty } from '../shared'
import { render as renderCircleCycle } from './cycle'

function svgWrap(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  // For odd n, fall back to circle cycle
  const n = items.length
  if (n % 2 !== 0) return renderCircleCycle(spec, theme)

  const W = 560
  const topN = n / 2
  const COLS = topN
  const BOX_W = Math.floor((W - 16 - (COLS - 1) * 10) / COLS)
  const BOX_H = 68
  const HEADER_H = 20
  const GAP_X = 10
  const GAP_Y = 28
  const titleH = spec.title ? 28 : 8
  const H = titleH + 2 * BOX_H + GAP_Y + 8

  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  // Arrowhead marker
  parts.push(`<defs>
    <marker id="bc-arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L7,3 L0,6 Z" fill="${theme.primary}"/>
    </marker>
  </defs>`)

  const rowY = [titleH, titleH + BOX_H + GAP_Y]

  // Calculate box positions
  const boxPos: Array<{ x: number; y: number; col: number; row: number }> = []

  // Top row: items 0..topN-1 left to right
  for (let col = 0; col < COLS; col++) {
    const x = 8 + col * (BOX_W + GAP_X)
    boxPos.push({ x, y: rowY[0], col, row: 0 })
  }
  // Bottom row: items topN..n-1 right to left
  for (let col = COLS - 1; col >= 0; col--) {
    const x = 8 + col * (BOX_W + GAP_X)
    boxPos.push({ x, y: rowY[1], col, row: 1 })
  }

  // Draw boxes
  for (let i = 0; i < n; i++) {
    const item = items[i]
    const { x, y } = boxPos[i]
    const t = i / (n - 1 || 1)
    const headerFill = lerpColor(theme.primary, theme.secondary, t)

    // Box bg
    parts.push(`<rect x="${x}" y="${y}" width="${BOX_W}" height="${BOX_H}" rx="5" fill="${theme.surface}" stroke="${headerFill}" stroke-opacity="0.55" stroke-width="1"/>`)
    // Colored header (top corners rounded)
    parts.push(`<path d="M ${x + 5} ${y} L ${x + BOX_W - 5} ${y} Q ${x + BOX_W} ${y} ${x + BOX_W} ${y + 5} L ${x + BOX_W} ${y + HEADER_H} L ${x} ${y + HEADER_H} L ${x} ${y + 5} Q ${x} ${y} ${x + 5} ${y} Z" fill="${headerFill}"/>`)
    // Header text
    parts.push(`<text x="${x + BOX_W / 2}" y="${y + HEADER_H - 5}" text-anchor="middle" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, 16)}</text>`)

    // Body content: children or value
    const bodyLines: string[] = item.children.length > 0
      ? item.children.slice(0, 2).map(c => truncate(c.label, 18))
      : (item.value ? [truncate(item.value, 18)] : [])

    bodyLines.forEach((line, li) => {
      parts.push(`<text x="${x + 6}" y="${y + HEADER_H + 14 + li * 13}" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(line)}</text>`)
    })
  }

  // Draw arrows between consecutive items (clockwise)
  for (let i = 0; i < n; i++) {
    const from = boxPos[i]
    const to = boxPos[(i + 1) % n]

    if (from.row === to.row) {
      // Same row: horizontal arrow
      let x1: number, x2: number, arrowY: number
      if (from.x < to.x) {
        // left to right
        x1 = from.x + BOX_W + 2
        x2 = to.x - 6
        arrowY = from.y + BOX_H / 2
      } else {
        // right to left
        x1 = from.x - 2
        x2 = to.x + BOX_W + 6
        arrowY = from.y + BOX_H / 2
      }
      parts.push(`<line x1="${x1.toFixed(1)}" y1="${arrowY.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${arrowY.toFixed(1)}" stroke="${theme.primary}" stroke-width="1.5" marker-end="url(#bc-arr)"/>`)
    } else {
      // Different rows: vertical arrow (transition between rows)
      const colCenter = from.x + BOX_W / 2
      let y1: number, y2: number
      if (from.row === 0) {
        // going down
        y1 = from.y + BOX_H + 2
        y2 = to.y - 6
      } else {
        // going up
        y1 = from.y - 2
        y2 = to.y + BOX_H + 6
      }
      parts.push(`<line x1="${colCenter.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${colCenter.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${theme.primary}" stroke-width="1.5" marker-end="url(#bc-arr)"/>`)
    }
  }

  return svgWrap(W, H, theme, parts)
}
