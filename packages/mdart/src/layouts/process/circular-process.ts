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

  const W = 500, H = 440
  const titleH = spec.title ? 28 : 8
  const cx = W / 2, cy = titleH + (H - titleH) / 2
  const R = Math.min(155, (H - titleH - 48) / 2)
  const BOX_W = Math.min(100, Math.floor(2 * Math.PI * R / n * 0.72))
  const BOX_H = 34

  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))
  parts.push(`<defs><marker id="cp-arr" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0.5 L8,4.5 L0,8.5 Z" fill="${theme.accent}bb"/></marker></defs>`)

  for (let i = 0; i < n; i++) {
    const a1 = (2 * Math.PI * i / n) - Math.PI / 2
    const a2 = (2 * Math.PI * ((i + 1) % n) / n) - Math.PI / 2
    const angOff = (angle: number) =>
      (BOX_W / 2 * Math.abs(Math.sin(angle)) + BOX_H / 2 * Math.abs(Math.cos(angle))) / R + 0.025
    const sa = a1 + angOff(a1), ea = a2 - angOff(a2)
    const arcLen = ((ea - sa + 2 * Math.PI) % (2 * Math.PI))
    if (arcLen < 0.1) continue
    const x1 = cx + R * Math.cos(sa), y1 = cy + R * Math.sin(sa)
    const x2 = cx + R * Math.cos(ea), y2 = cy + R * Math.sin(ea)
    const largeArc = arcLen > Math.PI ? 1 : 0
    parts.push(`<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${largeArc},1 ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${theme.accent}66" stroke-width="2.2" marker-end="url(#cp-arr)"/>`)
  }

  items.forEach((item, i) => {
    const angle = (2 * Math.PI * i / n) - Math.PI / 2
    const bx = cx + R * Math.cos(angle)
    const by = cy + R * Math.sin(angle)
    const t = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    parts.push(`<rect x="${(bx - BOX_W / 2).toFixed(1)}" y="${(by - BOX_H / 2).toFixed(1)}" width="${BOX_W}" height="${BOX_H}" rx="6" fill="${fill}33" stroke="${fill}" stroke-width="1.8"/>`)
    parts.push(`<text x="${(bx - BOX_W / 2 + 9).toFixed(1)}" y="${(by - BOX_H / 2 + 11).toFixed(1)}" font-size="8.5" fill="${fill}" font-family="system-ui,sans-serif" font-weight="700">${i + 1}</text>`)
    const lines = wrapText(item.label, Math.floor(BOX_W / 7))
    lines.slice(0, 2).forEach((line, li) => {
      const ty = lines.length === 1 ? by + 4 : by + (li === 0 ? -5 : 8)
      parts.push(`<text x="${bx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(line)}</text>`)
    })
  })

  return svgWrapProcess(W, H, theme, parts)
}
