import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, renderEmpty } from '../shared'

function svgWrap(W: number, H: number, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const W = 460, ROW_H = 44
  const TITLE_H = spec.title ? 30 : 8
  const LINE_X = 36
  const H = TITLE_H + 12 + items.length * ROW_H + 8

  const parts: string[] = []

  const spineY1 = TITLE_H + 12 + ROW_H / 2
  const spineY2 = TITLE_H + 12 + (items.length - 0.5) * ROW_H
  parts.push(`<line x1="${LINE_X}" y1="${spineY1.toFixed(1)}" x2="${LINE_X}" y2="${spineY2.toFixed(1)}" stroke="${theme.border}" stroke-width="2"/>`)

  items.forEach((item, i) => {
    const cy = TITLE_H + 12 + i * ROW_H + ROW_H / 2
    const done = item.attrs.includes('done') || item.attrs.includes('complete')
    const active = item.attrs.includes('active') || item.attrs.includes('current') || item.attrs.includes('now')
    const upcoming = !done && !active

    const s = active ? 10 : 8
    const fill = done ? theme.accent : active ? theme.accent : theme.surface
    const stroke = done || active ? theme.accent : theme.border
    const sw = active ? 2.5 : 1.5

    parts.push(`<rect x="${(LINE_X - s).toFixed(1)}" y="${(cy - s).toFixed(1)}" width="${(s*2).toFixed(1)}" height="${(s*2).toFixed(1)}" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" transform="rotate(45 ${LINE_X} ${cy})"/>`)
    if (done) parts.push(`<text x="${LINE_X}" y="${(cy+4).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.bg}" font-family="system-ui,sans-serif" font-weight="700">✓</text>`)

    const labelColor = upcoming ? theme.textMuted : theme.text
    const fw = active ? '600' : '400'
    parts.push(`<text x="${(LINE_X + 22).toFixed(1)}" y="${(cy+5).toFixed(1)}" font-size="12" fill="${labelColor}" font-family="system-ui,sans-serif" font-weight="${fw}">${tt(item.label, 28)}</text>`)

    const tag = done ? 'Done' : active ? 'In Progress' : (item.value ?? 'Upcoming')
    const tagCol = done ? theme.accent : active ? '#fbbf24' : theme.textMuted
    parts.push(`<text x="${W - 10}" y="${(cy+5).toFixed(1)}" text-anchor="end" font-size="9" fill="${tagCol}" font-family="system-ui,sans-serif">${tt(tag, 12)}</text>`)
  })

  return svgWrap(W, H, theme, spec.title, parts)
}
