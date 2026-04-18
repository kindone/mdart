import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, titleEl, tt, renderEmpty } from '../shared'

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
  const COLS = Math.ceil(Math.sqrt(n * 1.5))
  const TURN_EXT = 32
  const BASE_W = 560
  const W = BASE_W + TURN_EXT * 2
  const BOX_W = (BASE_W - 16) / COLS - 6, BOX_H = 36, ROW_GAP = 24
  const rows = Math.ceil(n / COLS)
  const titleH = spec.title ? 28 : 8
  const H = titleH + rows * (BOX_H + ROW_GAP) + 8
  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))
  parts.push(`<defs>
    <marker id="bp-r" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><polygon points="0,0 8,4 0,8" fill="${theme.accent}"/></marker>
  </defs>`)

  const positions = items.map((_, i) => {
    const row = Math.floor(i / COLS)
    const col = row % 2 === 0 ? i % COLS : COLS - 1 - (i % COLS)
    const x = TURN_EXT + 8 + col * (BOX_W + 6)
    const y = titleH + 4 + row * (BOX_H + ROW_GAP)
    return { x, y }
  })

  items.forEach((item, i) => {
    const { x, y } = positions[i]
    const t = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    const isLast = i === n - 1
    parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${BOX_W.toFixed(1)}" height="${BOX_H}" rx="5" fill="${isLast ? theme.accent + '33' : fill + '33'}" stroke="${isLast ? theme.accent : fill}" stroke-width="1.2"/>`)
    parts.push(`<text x="${(x + BOX_W / 2).toFixed(1)}" y="${(y + BOX_H / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, Math.floor(BOX_W / 6))}</text>`)

    if (i < n - 1) {
      const next = positions[i + 1]
      const sameRow = Math.floor(i / COLS) === Math.floor((i + 1) / COLS)
      if (sameRow) {
        const row = Math.floor(i / COLS)
        const goRight = row % 2 === 0
        const x1 = goRight ? x + BOX_W + 2 : x - 2
        const x2 = goRight ? next.x - 4 : next.x + BOX_W + 4
        parts.push(`<line x1="${x1.toFixed(1)}" y1="${(y + BOX_H / 2).toFixed(1)}" x2="${x2.toFixed(1)}" y2="${(y + BOX_H / 2).toFixed(1)}" stroke="${theme.accent}99" stroke-width="1.5" marker-end="url(#bp-r)"/>`)
      } else {
        const row = Math.floor(i / COLS)
        const goRight = row % 2 === 0
        const xStart = x + (goRight ? BOX_W : 0)
        const yStart = y + BOX_H / 2
        const xEnd = next.x + (goRight ? BOX_W : 0)
        const yEnd = next.y + BOX_H / 2
        const arcR = Math.round((yEnd - yStart) / 2)
        const sweep = goRight ? 1 : 0
        parts.push(`<path d="M${xStart.toFixed(1)},${yStart.toFixed(1)} A${arcR},${arcR} 0 0,${sweep} ${xEnd.toFixed(1)},${yEnd.toFixed(1)}" fill="none" stroke="${theme.accent}88" stroke-width="2" marker-end="url(#bp-r)"/>`)
      }
    }
  })
  return svgWrapProcess(W, H, theme, parts)
}
