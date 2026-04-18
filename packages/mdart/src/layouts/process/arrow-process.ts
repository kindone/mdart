import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, titleEl, renderEmpty } from '../shared'
import { render as renderVerticalFallback } from './process'

function wrapText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if (!cur) { cur = w; continue }
    if (cur.length + 1 + w.length <= maxChars) { cur += ' ' + w }
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
  if (n > 6) return renderVerticalFallback(spec, theme)

  const W = 600
  const titleH = spec.title ? 28 : 8
  const ARROW_W = 38
  const BOX_H = 70
  const BOX_W = Math.min(116, Math.floor((W - 20 - (n - 1) * ARROW_W) / n))
  const H = BOX_H + titleH + 32
  const totalW = n * BOX_W + (n - 1) * ARROW_W
  const startX = (W - totalW) / 2
  const bY = titleH + 14

  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  items.forEach((item, i) => {
    const x = startX + i * (BOX_W + ARROW_W)
    const t = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    parts.push(`<rect x="${x.toFixed(1)}" y="${bY}" width="${BOX_W}" height="${BOX_H}" rx="7" fill="${fill}28" stroke="${fill}" stroke-width="2"/>`)
    const cy = bY + BOX_H / 2
    const lines = wrapText(item.label, Math.floor(BOX_W / 7))
    lines.slice(0, 3).forEach((line, li) => {
      const ty = cy + (li - (lines.length - 1) / 2) * 14 + 4
      parts.push(`<text x="${(x + BOX_W / 2).toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="10.5" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(line)}</text>`)
    })
    if (i < n - 1) {
      const ax = x + BOX_W + 4
      const arrowH = 30
      const shaftH = Math.round(arrowH * 0.46)
      const headBase = ax + ARROW_W - 14
      parts.push(`<polygon points="${ax},${(cy - shaftH).toFixed(1)} ${headBase},${(cy - shaftH).toFixed(1)} ${headBase},${(cy - arrowH).toFixed(1)} ${(ax + ARROW_W - 2).toFixed(1)},${cy.toFixed(1)} ${headBase},${(cy + arrowH).toFixed(1)} ${headBase},${(cy + shaftH).toFixed(1)} ${ax},${(cy + shaftH).toFixed(1)}" fill="${fill}99"/>`)
    }
  })

  return svgWrapProcess(W, H, theme, parts)
}
