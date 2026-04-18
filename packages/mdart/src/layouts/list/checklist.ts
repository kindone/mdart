import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const W = 460
  const ROW_H = 38
  const PAD = 16
  const titleH = spec.title ? 28 : 0
  const H = PAD + titleH + items.length * ROW_H + PAD

  let svgContent = ''

  if (spec.title) {
    svgContent += `<text x="${PAD}" y="${PAD + 16}" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const y = PAD + titleH + i * ROW_H
    const cy = y + ROW_H / 2
    const done = item.attrs.includes('done') || item.attrs.includes('✓') || item.attrs.includes('complete')

    svgContent += `<rect x="${PAD}" y="${cy - 9}" width="18" height="18" rx="3" fill="none" stroke="${theme.primary}" stroke-width="1.5" />`
    if (done) {
      svgContent += `<polyline points="${PAD + 4},${cy} ${PAD + 8},${cy + 4} ${PAD + 14},${cy - 4}" fill="none" stroke="${theme.accent}" stroke-width="2" stroke-linecap="round" />`
    }

    if (done) {
      svgContent += `<text x="${PAD + 26}" y="${cy + 4}" font-size="12" fill="${theme.text}" fill-opacity="0.62" font-family="system-ui,sans-serif" font-style="italic">${escapeXml(item.label)}</text>`
    } else {
      svgContent += `<text x="${PAD + 26}" y="${cy + 4}" font-size="12" fill="${theme.text}" font-family="system-ui,sans-serif">${escapeXml(item.label)}</text>`
    }

    const extraAttrs = item.attrs.filter(a => !['done', '✓', 'complete'].includes(a))
    if (extraAttrs.length > 0) {
      svgContent += `<text x="${W - PAD}" y="${cy + 4}" text-anchor="end" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">[${extraAttrs.join(', ')}]</text>`
    }

    if (i < items.length - 1) {
      svgContent += `<line x1="${PAD}" y1="${y + ROW_H}" x2="${W - PAD}" y2="${y + ROW_H}" stroke="${theme.border}" stroke-width="0.5" />`
    }
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svgContent}
  </svg>`
}
