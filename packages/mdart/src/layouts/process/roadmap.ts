import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, renderEmpty } from '../shared'

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

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const n = items.length
  const W = Math.max(500, n * 100 + 80)
  const H = 140
  const LINE_Y = 80
  const DOT_R = 8
  const PAD = 50
  const spacing = (W - PAD * 2) / (n - 1 || 1)

  let svgContent = ''

  svgContent += `<line x1="${PAD}" y1="${LINE_Y}" x2="${W - PAD}" y2="${LINE_Y}" stroke="${theme.border}" stroke-width="3" />`

  for (let i = 0; i < n; i++) {
    const item = items[i]
    const x = PAD + i * spacing
    const t = n > 1 ? i / (n - 1) : 0.5
    const fill = lerpColor(theme.secondary, theme.primary, t)
    const above = i % 2 === 0
    const labelY = above ? LINE_Y - 22 : LINE_Y + 36

    svgContent += `<circle cx="${x}" cy="${LINE_Y}" r="${DOT_R}" fill="${fill}" />`
    svgContent += `<circle cx="${x}" cy="${LINE_Y}" r="${DOT_R - 3}" fill="${theme.bg}" />`

    const lineEndY = above ? LINE_Y - 14 : LINE_Y + 14
    svgContent += `<line x1="${x}" y1="${LINE_Y}" x2="${x}" y2="${lineEndY}" stroke="${fill}" stroke-width="1.5" stroke-dasharray="3,2" />`

    const lines = wrapText(item.label, 12)
    lines.forEach((line, li) => {
      const ly = labelY + li * 13
      svgContent += `<text x="${x}" y="${ly}" text-anchor="middle" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(line)}</text>`
    })

    if (item.value) {
      svgContent += `<text x="${x}" y="${labelY + lines.length * 13}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(item.value)}</text>`
    }
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${spec.title ? `<text x="${W / 2}" y="16" text-anchor="middle" font-size="12" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(spec.title)}</text>` : ''}
    ${svgContent}
  </svg>`
}
