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
  const W = 560
  const CARD_H = 100, CARD_W = Math.min(110, (W - 16 - 24 * (n - 1)) / n)
  const titleH = spec.title ? 28 : 8
  const H = titleH + CARD_H + 16
  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  const opW = 24
  const total = n * CARD_W + (n - 1) * opW
  const startX = (W - total) / 2
  const cardY = titleH + 8

  items.forEach((item, i) => {
    const x = startX + i * (CARD_W + opW)
    const isResult = i === n - 1
    const t = n > 1 ? i / (n - 1) : 0
    const fill = isResult ? theme.accent : lerpColor(theme.primary, theme.secondary, t)
    parts.push(`<rect x="${x.toFixed(1)}" y="${cardY.toFixed(1)}" width="${CARD_W.toFixed(1)}" height="${CARD_H}" rx="7" fill="${fill}22" stroke="${fill}88" stroke-width="1.5"/>`)
    parts.push(`<rect x="${x.toFixed(1)}" y="${cardY.toFixed(1)}" width="${CARD_W.toFixed(1)}" height="22" rx="7" fill="${fill}"/>`)
    parts.push(`<rect x="${x.toFixed(1)}" y="${(cardY + 14).toFixed(1)}" width="${CARD_W.toFixed(1)}" height="8" fill="${fill}"/>`)
    parts.push(`<text x="${(x + CARD_W / 2).toFixed(1)}" y="${(cardY + 14).toFixed(1)}" text-anchor="middle" font-size="10" fill="#fff" font-family="system-ui,sans-serif" font-weight="700">${tt(item.label, 14)}</text>`)
    const subs = item.children.length ? item.children.map(c => c.label) : item.value ? [item.value] : []
    // Centre the sub-list block in the body area (between header band at
    // cardY+22 and card bottom at cardY+CARD_H). Cap at 4 rows — that's the
    // most that fit at 16 px row height without colliding with the bottom.
    const visible = subs.slice(0, 4)
    const bodyCy  = cardY + 22 + (CARD_H - 22) / 2  // centre of body area
    const rowH    = 16
    visible.forEach((s, si) => {
      const ty = bodyCy + (si - (visible.length - 1) / 2) * rowH + 4
      parts.push(`<text x="${(x + CARD_W / 2).toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(s, 14)}</text>`)
    })
    if (i < n - 1) {
      const op = i === n - 2 ? '=' : '+'
      const opX = x + CARD_W + opW / 2
      parts.push(`<text x="${opX.toFixed(1)}" y="${(cardY + CARD_H / 2 + 8).toFixed(1)}" text-anchor="middle" font-size="20" fill="${theme.muted}" font-family="system-ui,sans-serif" font-weight="300">${op}</text>`)
    }
  })
  return svgWrapProcess(W, H, theme, parts)
}
