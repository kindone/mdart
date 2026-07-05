import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, titleEl, tt, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS } from '../shared'

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
  // Grow box height when any item carries a value so label + subtitle fit cleanly.
  const anyValue = items.some(it => !!it.value)
  const BOX_W = (BASE_W - 16) / COLS - 6, BOX_H = anyValue ? 44 : 36, ROW_GAP = 24
  const rows = Math.ceil(n / COLS)
  const titleH = spec.title ? 28 : 8
  const H = titleH + rows * (BOX_H + ROW_GAP) + 8
  const animate = shouldAnimate(spec)
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
    const { display: itmDisplay, url: itmUrl } = displayLabel(item, { value: !!item.value })

    let nodeStr = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${BOX_W.toFixed(1)}" height="${BOX_H}" rx="5" fill="${isLast ? theme.accent + '33' : fill + '33'}" stroke="${isLast ? theme.accent : fill}" stroke-width="1.2">${itemTitleTag(item)}</rect>`
    if (item.value) {
      nodeStr += aWrap(`<text x="${(x + BOX_W / 2).toFixed(1)}" y="${(y + 17).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(itmDisplay, Math.floor(BOX_W / 6), item)}</text>`, itmUrl)
      nodeStr += `<text x="${(x + BOX_W / 2).toFixed(1)}" y="${(y + 32).toFixed(1)}" text-anchor="middle" font-size="8.5" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(item.value, Math.floor(BOX_W / 5))}</text>`
    } else {
      nodeStr += aWrap(`<text x="${(x + BOX_W / 2).toFixed(1)}" y="${(y + BOX_H / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(itmDisplay, Math.floor(BOX_W / 6), item)}</text>`, itmUrl)
    }
    parts.push(animate ? `<g class="mdart-n${i}">${nodeStr}</g>` : nodeStr)

    // Connectors fade in with the destination node they point to.
    if (i < n - 1) {
      const next = positions[i + 1]
      const sameRow = Math.floor(i / COLS) === Math.floor((i + 1) / COLS)
      let connEl: string
      if (sameRow) {
        const row = Math.floor(i / COLS)
        const goRight = row % 2 === 0
        const x1 = goRight ? x + BOX_W + 1 : x - 1
        const x2 = goRight ? next.x - 1 : next.x + BOX_W + 1
        connEl = `<line x1="${x1.toFixed(1)}" y1="${(y + BOX_H / 2).toFixed(1)}" x2="${x2.toFixed(1)}" y2="${(y + BOX_H / 2).toFixed(1)}" stroke="${theme.accent}99" stroke-width="1.5" marker-end="url(#bp-r)"/>`
      } else {
        const row = Math.floor(i / COLS)
        const goRight = row % 2 === 0
        const xPivot = x + (goRight ? BOX_W : 0)
        const yMid1 = y + BOX_H / 2
        const yMid2 = next.y + BOX_H / 2
        const ext = Math.round(TURN_EXT * 0.5)
        const r   = Math.round(ROW_GAP / 3)
        const d   = goRight ? 1 : -1
        const sw  = goRight ? 1 : 0
        const xA  = xPivot + d * ext
        const xB  = xPivot + d * (ext + r)
        const path = [
          `M${xPivot},${yMid1.toFixed(1)}`,
          `H${xA}`,
          `A${r},${r} 0 0,${sw} ${xB},${(yMid1 + r).toFixed(1)}`,
          `V${(yMid2 - r).toFixed(1)}`,
          `A${r},${r} 0 0,${sw} ${xA},${yMid2.toFixed(1)}`,
          `H${xPivot}`
        ].join(' ')
        connEl = `<path d="${path}" fill="none" stroke="${theme.accent}88" stroke-width="2" marker-end="url(#bp-r)"/>`
      }
      parts.push(animate ? `<g class="mdart-arr-n${i + 1}">${connEl}</g>` : connEl)
    }
  })
  if (animate) parts.unshift(seqSpotlightCSS(n, spec))
  return svgWrapProcess(W, H, theme, parts)
}
