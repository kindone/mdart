import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, renderEmpty } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const n = items.length
  const W = 420
  const STEP_H = 48
  const PAD = 20
  const H = PAD + n * STEP_H + PAD
  const maxW = 380
  const minW = 80

  let svgContent = ''

  for (let i = 0; i < n; i++) {
    const item = items[i]
    const t = i / (n - 1 || 1)
    const w = maxW - (maxW - minW) * t
    const x = (W - w) / 2
    const y = PAD + i * STEP_H
    const fill = lerpColor(theme.primary, theme.secondary, t)

    const nextW = i < n - 1 ? maxW - (maxW - minW) * ((i + 1) / (n - 1 || 1)) : w
    const nextX = (W - nextW) / 2
    const points = `${x},${y} ${x + w},${y} ${nextX + nextW},${y + STEP_H} ${nextX},${y + STEP_H}`

    svgContent += `<polygon points="${points}" fill="${fill}" />`
    svgContent += `<text x="${W / 2}" y="${y + STEP_H / 2 + 5}" text-anchor="middle" font-size="12" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(item.label)}</text>`
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${spec.title ? `<text x="${W / 2}" y="15" text-anchor="middle" font-size="12" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(spec.title)}</text>` : ''}
    ${svgContent}
  </svg>`
}
