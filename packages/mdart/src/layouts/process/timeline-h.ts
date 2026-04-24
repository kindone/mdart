import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, titleEl, tt, renderEmpty } from '../shared'

/** Greedy word-wrap into lines of ~maxChars each. */
function wrapText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if (!cur) { cur = w; continue }
    if (cur.length + 1 + w.length <= maxChars) cur += ' ' + w
    else { lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : [text]
}

function svgWrapProcess(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const n = items.length

  const W    = 600
  const PAD  = 34
  const spacing = (W - PAD * 2) / Math.max(n - 1, 1)

  // Characters that fit on one line for the given per-item column.
  // ~5.2 px per char at font-size 9; leave a small safety margin on each side.
  const maxChars = Math.max(8, Math.floor(spacing / 5.2) - 1)

  // Vertical budget per side of the spine:
  //   tick (18) + label line (11) + up to 2 wrapped value lines (20) + padding
  const titleH  = spec.title ? 30 : 8
  const sideH   = 60
  const SPINE_Y = titleH + sideH
  const H       = titleH + sideH * 2

  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  // Spine with end arrowhead
  parts.push(`<line x1="${PAD}" y1="${SPINE_Y}" x2="${W - PAD}" y2="${SPINE_Y}" stroke="${theme.border}" stroke-width="2"/>`)
  parts.push(`<polygon points="${(W - PAD - 2).toFixed(1)},${(SPINE_Y - 5).toFixed(1)} ${(W - PAD + 6).toFixed(1)},${SPINE_Y} ${(W - PAD - 2).toFixed(1)},${(SPINE_Y + 5).toFixed(1)}" fill="${theme.border}"/>`)

  items.forEach((item, i) => {
    const x    = n === 1 ? W / 2 : PAD + i * spacing
    const t    = n > 1 ? i / (n - 1) : 0
    const fill = i === n - 1 ? theme.accent : lerpColor(theme.primary, theme.secondary, t)
    const above = i % 2 === 0

    // Dot on spine + perpendicular tick
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${SPINE_Y}" r="6" fill="${fill}"/>`)
    const tickStart = above ? SPINE_Y - 6  : SPINE_Y + 6
    const tickEnd   = above ? SPINE_Y - 18 : SPINE_Y + 18
    parts.push(`<line x1="${x.toFixed(1)}" y1="${tickStart}" x2="${x.toFixed(1)}" y2="${tickEnd}" stroke="${fill}" stroke-width="1"/>`)

    // Wrap value into up to 2 lines if present
    const valueLines = item.value ? wrapText(item.value, maxChars).slice(0, 2) : []

    if (above) {
      // Stack (top → bottom reading): value_line1, value_line2, label, tick, spine
      const labelY = tickEnd - 4
      parts.push(`<text x="${x.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" font-size="10" fill="${fill}" font-family="system-ui,sans-serif" font-weight="700">${tt(item.label, maxChars)}</text>`)
      // Draw value lines so line[0] ends up at the top.
      const L = valueLines.length
      valueLines.forEach((line, j) => {
        const vy = labelY - 11 - (L - 1 - j) * 10
        parts.push(`<text x="${x.toFixed(1)}" y="${vy.toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(line, maxChars)}</text>`)
      })
    } else {
      // Stack (top → bottom reading): spine, tick, label, value_line1, value_line2
      const labelY = tickEnd + 12
      parts.push(`<text x="${x.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" font-size="10" fill="${fill}" font-family="system-ui,sans-serif" font-weight="700">${tt(item.label, maxChars)}</text>`)
      valueLines.forEach((line, j) => {
        const vy = labelY + 11 + j * 10
        parts.push(`<text x="${x.toFixed(1)}" y="${vy.toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(line, maxChars)}</text>`)
      })
    }
  })

  return svgWrapProcess(W, H, theme, parts)
}
