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
  const W = 560, BAR_H = 32, LABEL_H = 22
  const titleH = spec.title ? 28 : 8
  const H = titleH + BAR_H + LABEL_H + 20
  const BAR_Y = titleH + 12, PAD = 8
  const BAR_W = W - PAD * 2
  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  const weights = items.map(it => parseFloat(it.value ?? '') || 1)
  const total = weights.reduce((s, w) => s + w, 0)

  // Build a path with per-side corner rounding so only the bar's outer edges are rounded.
  // SVG <rect rx> rounds all four corners, which breaks the flat joins between segments.
  const segPath = (x: number, y: number, w: number, h: number, rl: number, rr: number) => [
    `M${(x + rl).toFixed(1)},${y}`,
    `H${(x + w - rr).toFixed(1)}`,
    rr ? `A${rr},${rr} 0 0,1 ${(x+w).toFixed(1)},${(y+rr).toFixed(1)}` : '',
    `V${(y + h - rr).toFixed(1)}`,
    rr ? `A${rr},${rr} 0 0,1 ${(x+w-rr).toFixed(1)},${(y+h).toFixed(1)}` : '',
    `H${(x + rl).toFixed(1)}`,
    rl ? `A${rl},${rl} 0 0,1 ${x},${(y+h-rl).toFixed(1)}` : '',
    `V${(y + rl).toFixed(1)}`,
    rl ? `A${rl},${rl} 0 0,1 ${(x+rl).toFixed(1)},${y}` : '',
    'Z'
  ].filter(Boolean).join(' ')

  let curX = PAD
  items.forEach((item, i) => {
    const segW = (weights[i] / total) * BAR_W
    const t = items.length > 1 ? i / (items.length - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    const isFirst = i === 0, isLast = i === items.length - 1
    const rl = isFirst ? 5 : 0, rr = isLast ? 5 : 0
    parts.push(`<path d="${segPath(curX, BAR_Y, segW, BAR_H, rl, rr)}" fill="${fill}"/>`)
    const lx = curX + segW / 2
    parts.push(`<text x="${lx.toFixed(1)}" y="${(BAR_Y + BAR_H / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="#fff" font-family="system-ui,sans-serif" font-weight="700">${tt(item.label, Math.floor(segW / 7))}</text>`)
    parts.push(`<text x="${lx.toFixed(1)}" y="${(BAR_Y + BAR_H + 14).toFixed(1)}" text-anchor="middle" font-size="9" fill="${fill}" font-family="system-ui,sans-serif">${item.value ?? Math.round(weights[i] / total * 100) + '%'}</text>`)
    curX += segW
  })
  return svgWrapProcess(W, H, theme, parts)
}
