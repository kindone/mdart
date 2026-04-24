import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, tt, renderEmpty, getCaption } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const W      = 460
  const PAD    = 16
  const titleH = spec.title ? 28 : 0

  // Grow row height when any item has a caption so label + caption stack cleanly.
  const captions       = items.map(it => getCaption(it))
  const hasAnyCaption  = captions.some(c => c !== null)
  const ROW_H          = hasAnyCaption ? 48 : 40

  const H = PAD + titleH + items.length * ROW_H + PAD

  // Available text width after badge (22px) + 8px gap
  const textStart = PAD + 30
  const textPx    = (W - PAD) - textStart - 4
  const labelMax  = Math.floor(textPx / 5.8)   // for 12 px
  const valueMax  = Math.floor(textPx / 5.0)   // for 11 px

  let svgContent = ''

  if (spec.title) {
    svgContent += `<text x="${PAD}" y="${PAD + 16}" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const y    = PAD + titleH + i * ROW_H
    const cy   = y + ROW_H / 2
    const t    = items.length > 1 ? i / (items.length - 1) : 0
    const fill = lerpColor(theme.secondary, theme.primary, t)

    const caption = captions[i]

    // Number badge (square) — vertically centred with label baseline
    const badgeCy = caption ? y + 18 : cy
    svgContent += `<rect x="${PAD}" y="${badgeCy - 11}" width="22" height="22" rx="4" fill="${fill}" />`
    svgContent += `<text x="${PAD + 11}" y="${badgeCy + 4}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${i + 1}</text>`

    if (caption) {
      // Two-line row: label on top, caption muted below
      const labelY = y + 22
      const valueY = y + 38
      svgContent += `<text x="${textStart}" y="${labelY}" font-size="12" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, labelMax)}</text>`
      svgContent += `<text x="${textStart}" y="${valueY}" font-size="11" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(caption, valueMax)}</text>`
    } else {
      svgContent += `<text x="${textStart}" y="${cy + 4}" font-size="12" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, labelMax)}</text>`
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
