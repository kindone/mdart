import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, titleEl, renderEmpty } from '../shared'

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

  const BOX_H = 40
  const STEP_Y = 24
  const titleH = spec.title ? 28 : 8
  const BOX_W = Math.min(110, Math.floor((520 - (n - 1) * 8) / Math.max(n, 1)))
  const STEP_X = BOX_W + 8
  const totalH = STEP_Y * (n - 1) + BOX_H
  const diagW = (n - 1) * STEP_X + BOX_W + 40
  const W = Math.max(560, diagW)
  const H = totalH + titleH + 36
  const startX = (W - (STEP_X * (n - 1) + BOX_W)) / 2
  const startY = titleH + 14

  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  for (let i = 0; i < n - 1; i++) {
    const x1 = startX + i * STEP_X + BOX_W
    const y1 = startY + i * STEP_Y + BOX_H / 2
    const x2 = startX + (i + 1) * STEP_X
    const y2 = startY + (i + 1) * STEP_Y + BOX_H / 2
    const t = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    parts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${(x1 + 4).toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${fill}99" stroke-width="1.5"/>`)
    parts.push(`<line x1="${(x1 + 4).toFixed(1)}" y1="${y1.toFixed(1)}" x2="${(x1 + 4).toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${fill}55" stroke-width="1.5" stroke-dasharray="3,3"/>`)
    parts.push(`<line x1="${(x1 + 4).toFixed(1)}" y1="${y2.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${fill}99" stroke-width="1.5"/>`)
  }

  items.forEach((item, i) => {
    const x = startX + i * STEP_X
    const y = startY + i * STEP_Y
    const t = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${BOX_W}" height="${BOX_H}" rx="5" fill="${fill}33" stroke="${fill}" stroke-width="1.5"/>`)
    const lines = wrapText(item.label, Math.floor(BOX_W / 7))
    const cy = y + BOX_H / 2
    lines.slice(0, 2).forEach((line, li) => {
      const ty = lines.length === 1 ? cy + 4 : cy + (li === 0 ? -5 : 8)
      parts.push(`<text x="${(x + BOX_W / 2).toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="10.5" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(line)}</text>`)
    })
  })

  return svgWrapProcess(W, H, theme, parts)
}
