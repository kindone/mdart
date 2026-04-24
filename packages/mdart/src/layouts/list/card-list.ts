import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, tt, renderEmpty } from '../shared'

function svg(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const W        = 500
  const n        = Math.min(items.length, 4)
  const GAP      = 8
  const HEADER_H = 32
  const ROW_H    = 20
  const VALUE_H  = 18         // space reserved for a subtitle under the header

  const slice   = items.slice(0, n)
  const anyVal  = slice.some(it => it.value)
  const valueH  = anyVal ? VALUE_H : 0

  const maxChildren = Math.max(...slice.map(it => it.children.length), 2)
  const CARD_H = HEADER_H + valueH + maxChildren * ROW_H + 16
  const CARD_W = (W - (n - 1) * GAP) / n
  const titleH = spec.title ? 30 : 8
  const H      = titleH + CARD_H + 8

  const parts: string[] = []
  if (spec.title) parts.push(`<text x="${W/2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`)

  slice.forEach((item, i) => {
    const x    = i * (CARD_W + GAP), y = titleH
    const t    = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)

    // Card body + coloured header band
    parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${CARD_W.toFixed(1)}" height="${CARD_H}" rx="7" fill="${theme.surface}" stroke="${fill}66" stroke-width="1.2"/>`)
    parts.push(`<path d="M${(x+7).toFixed(1)},${y.toFixed(1)} Q${x.toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${(y+7).toFixed(1)} L${x.toFixed(1)},${(y+HEADER_H).toFixed(1)} L${(x+CARD_W).toFixed(1)},${(y+HEADER_H).toFixed(1)} L${(x+CARD_W).toFixed(1)},${(y+7).toFixed(1)} Q${(x+CARD_W).toFixed(1)},${y.toFixed(1)} ${(x+CARD_W-7).toFixed(1)},${y.toFixed(1)} Z" fill="${fill}"/>`)

    const headerMax = Math.floor((CARD_W - 16) / 6.5)
    const valueMax  = Math.floor((CARD_W - 16) / 5.5)   // 10 px font
    const childMax  = Math.floor((CARD_W - 16) / 6.0)

    // Header label
    parts.push(`<text x="${(x+CARD_W/2).toFixed(1)}" y="${(y+HEADER_H/2+4).toFixed(1)}" text-anchor="middle" font-size="11" fill="#fff" font-family="system-ui,sans-serif" font-weight="700">${tt(item.label, headerMax)}</text>`)

    // Optional subtitle (item.value) under the header band
    if (anyVal && item.value) {
      const vy = y + HEADER_H + 13
      parts.push(`<text x="${(x+CARD_W/2).toFixed(1)}" y="${vy.toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" fill-opacity="0.85" font-family="system-ui,sans-serif" font-style="italic">${tt(item.value, valueMax)}</text>`)
    }

    // Children rows below the subtitle slot
    const childStart = y + HEADER_H + valueH
    item.children.slice(0, maxChildren).forEach((child, ci) => {
      const cy = childStart + ci * ROW_H + ROW_H
      parts.push(`<text x="${(x+CARD_W/2).toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(child.label, childMax)}</text>`)
    })
  })

  return svg(W, H, theme, parts)
}
