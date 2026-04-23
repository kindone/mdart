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

  const W = 720, PAD = 40
  const TITLE_H = spec.title ? 30 : 10
  const BAND = 62
  const LINE_Y = TITLE_H + BAND
  const H = TITLE_H + BAND * 2 + 20

  const n = items.length
  const spacing = n > 1 ? (W - PAD * 2) / (n - 1) : 0
  // derive char cap from available slot width (~6.5 px/char at font-size 11)
  const slotW = n > 1 ? spacing : W - PAD * 2
  const MAX_CHARS = Math.max(10, Math.floor(slotW / 6.5))
  const parts: string[] = []

  parts.push(`<line x1="${PAD}" y1="${LINE_Y}" x2="${W-PAD}" y2="${LINE_Y}" stroke="${theme.accent}66" stroke-width="2.5"/>`)

  items.forEach((item, i) => {
    const x = n === 1 ? W / 2 : PAD + i * spacing
    const above = i % 2 === 0
    const active = item.attrs.includes('active') || item.attrs.includes('current') || item.attrs.includes('now')
    const done = item.attrs.includes('done') || item.attrs.includes('past')

    const r = active ? 8 : 6
    const dotFill = active ? theme.accent : done ? `${theme.accent}77` : theme.surface
    const dotStroke = active || done ? theme.accent : theme.border
    const stemH = 16
    const stemY1 = above ? LINE_Y - r : LINE_Y + r
    const stemY2 = above ? LINE_Y - r - stemH : LINE_Y + r + stemH

    parts.push(`<line x1="${x.toFixed(1)}" y1="${stemY1.toFixed(1)}" x2="${x.toFixed(1)}" y2="${stemY2.toFixed(1)}" stroke="${theme.border}" stroke-width="1"/>`)
    parts.push(`<circle cx="${x.toFixed(1)}" cy="${LINE_Y}" r="${r}" fill="${dotFill}" stroke="${dotStroke}" stroke-width="${active ? 2 : 1.5}"/>`)
    if (done && !active) {
      parts.push(`<text x="${x.toFixed(1)}" y="${(LINE_Y+4).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.accent}" font-family="system-ui,sans-serif">✓</text>`)
    }

    const mainLabel = item.value ? item.label : item.label
    const subLabel = item.value ?? ''
    const anchor = i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'
    const col = active ? theme.accent : done ? theme.textMuted : theme.text

    if (above) {
      if (subLabel) {
        parts.push(`<text x="${x.toFixed(1)}" y="${(LINE_Y - r - stemH - 18).toFixed(1)}" text-anchor="${anchor}" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(mainLabel, MAX_CHARS)}</text>`)
        parts.push(`<text x="${x.toFixed(1)}" y="${(LINE_Y - r - stemH - 5).toFixed(1)}" text-anchor="${anchor}" font-size="11" fill="${col}" font-family="system-ui,sans-serif" font-weight="${active ? '600' : '400'}">${tt(subLabel, MAX_CHARS)}</text>`)
      } else {
        parts.push(`<text x="${x.toFixed(1)}" y="${(LINE_Y - r - stemH - 5).toFixed(1)}" text-anchor="${anchor}" font-size="11" fill="${col}" font-family="system-ui,sans-serif" font-weight="${active ? '600' : '400'}">${tt(mainLabel, MAX_CHARS)}</text>`)
      }
    } else {
      parts.push(`<text x="${x.toFixed(1)}" y="${(LINE_Y + r + stemH + 14).toFixed(1)}" text-anchor="${anchor}" font-size="11" fill="${col}" font-family="system-ui,sans-serif" font-weight="${active ? '600' : '400'}">${tt(item.value ? subLabel : mainLabel, MAX_CHARS)}</text>`)
      if (item.value) {
        parts.push(`<text x="${x.toFixed(1)}" y="${(LINE_Y + r + stemH + 27).toFixed(1)}" text-anchor="${anchor}" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(mainLabel, MAX_CHARS)}</text>`)
      }
    }
  })

  return svgWrap(W, H, theme, spec.title, parts)
}
