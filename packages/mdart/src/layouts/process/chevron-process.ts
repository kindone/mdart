import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, titleEl, renderEmpty } from '../shared'
import { render as renderProcess } from './process'

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
  if (n > 8) return renderProcess(spec, theme)

  const W = 600
  const titleH = spec.title ? 28 : 8
  const chevH = 54
  const H = chevH + titleH + 28
  const P = 20
  const GAP = 4
  const chevW = Math.floor((W - 20 - (n - 1) * GAP) / n)
  const startX = Math.floor((W - (n * chevW + (n - 1) * GAP)) / 2)
  const y = titleH + 10
  const cy = y + chevH / 2

  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  items.forEach((item, i) => {
    const x = startX + i * (chevW + GAP)
    const t = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    const isFirst = i === 0
    const isLast = i === n - 1

    let pts: string
    if (n === 1) {
      pts = `${x},${y} ${x + chevW},${y} ${x + chevW},${y + chevH} ${x},${y + chevH}`
    } else if (isFirst) {
      pts = `${x},${y} ${x + chevW - P},${y} ${x + chevW},${cy} ${x + chevW - P},${y + chevH} ${x},${y + chevH}`
    } else if (isLast) {
      pts = `${x},${y} ${x + chevW},${y} ${x + chevW},${y + chevH} ${x},${y + chevH} ${x + P},${cy}`
    } else {
      pts = `${x},${y} ${x + chevW - P},${y} ${x + chevW},${cy} ${x + chevW - P},${y + chevH} ${x},${y + chevH} ${x + P},${cy}`
    }
    parts.push(`<polygon points="${pts}" fill="${fill}ee" stroke="${theme.bg}" stroke-width="2.5"/>`)

    const bodyX = x + (isFirst ? 0 : P / 2)
    const bodyW = chevW - (isFirst ? P : 0) - (isLast ? 0 : P)
    const tx = bodyX + bodyW / 2
    const lines = wrapText(item.label, Math.max(4, Math.floor(bodyW / 7)))
    lines.slice(0, 2).forEach((line, li) => {
      const ty = lines.length === 1 ? cy + 4 : cy + (li === 0 ? -5 : 9)
      parts.push(`<text x="${tx.toFixed(1)}" y="${ty}" text-anchor="middle" font-size="10.5" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(line)}</text>`)
    })
  })

  return svgWrapProcess(W, H, theme, parts)
}
