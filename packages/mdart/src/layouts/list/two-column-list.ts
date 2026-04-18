import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, renderEmpty } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const half = Math.ceil(items.length / 2)
  const left = items.slice(0, half)
  const right = items.slice(half)
  const maxRows = Math.max(left.length, right.length)

  const W = 500
  const ROW_H = 36
  const PAD = 16
  const titleH = spec.title ? 28 : 0
  const H = PAD + titleH + maxRows * ROW_H + PAD

  let svgContent = ''

  if (spec.title) {
    svgContent += `<text x="${W / 2}" y="${PAD + 16}" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`
  }

  svgContent += `<line x1="${W / 2}" y1="${PAD + titleH}" x2="${W / 2}" y2="${H - PAD}" stroke="${theme.border}" stroke-width="1" />`

  const renderCol = (colItems: typeof items, startX: number) => {
    for (let i = 0; i < colItems.length; i++) {
      const item = colItems[i]
      const cy = PAD + titleH + i * ROW_H + ROW_H / 2
      const t = items.length > 1 ? items.indexOf(item) / (items.length - 1) : 0
      const fill = lerpColor(theme.secondary, theme.primary, t)

      svgContent += `<circle cx="${startX + 8}" cy="${cy}" r="4" fill="${fill}" />`
      svgContent += `<text x="${startX + 18}" y="${cy + 4}" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif">${escapeXml(item.label)}</text>`
    }
  }

  renderCol(left, PAD)
  renderCol(right, W / 2 + PAD)

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svgContent}
  </svg>`
}
