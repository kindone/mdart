import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, renderEmpty, getCaption } from '../shared'

function svg(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const W = 500
  const R = 50  // circumradius (bumped to give text a little more room)
  const HEX_W = R * Math.sqrt(3), HEX_H = R * 2
  const COL_W = HEX_W + 6, ROW_H = HEX_H * 0.75 + 4
  const COLS = Math.min(items.length, 4)
  const rows = Math.ceil(items.length / COLS)
  const totalW = COLS * COL_W - 6
  const startX = (W - totalW) / 2 + HEX_W / 2
  const titleH = spec.title ? 30 : 8
  const H = titleH + rows * ROW_H + R * 0.25 + 8

  const hexPoints = (cx: number, cy: number) =>
    Array.from({ length: 6 }, (_, k) => {
      const a = Math.PI / 6 + k * Math.PI / 3
      return `${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)}`
    }).join(' ')

  // Plain truncation — no SVG <title> wrapper, escapeXml applied at render site.
  // Label wraps/truncates at MAX_CHARS per line; value gets a bit more room since
  // it occupies the wider mid-section of the hexagon on its own line.
  const MAX_CHARS       = 12
  const VALUE_MAX_CHARS = 14
  const trunc = (s: string, max: number) => s.length > max ? s.slice(0, max - 1) + '…' : s

  // Split a label into up to two lines at a word boundary
  function wrapLabel(label: string): [string, string | null] {
    if (label.length <= MAX_CHARS) return [label, null]
    const words = label.split(' ')
    let line1 = ''
    for (let i = 0; i < words.length; i++) {
      const attempt = line1 ? line1 + ' ' + words[i] : words[i]
      if (attempt.length <= MAX_CHARS) { line1 = attempt; continue }
      // if line1 is empty the oversized word is words[i] itself — skip it for line2
      const rest = (line1 ? words.slice(i) : words.slice(i + 1)).join(' ')
      return [line1 || trunc(words[i], MAX_CHARS), rest ? trunc(rest, MAX_CHARS) : null]
    }
    return [line1, null]
  }

  const parts: string[] = []
  if (spec.title) parts.push(`<text x="${W/2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`)

  items.forEach((item, i) => {
    const col = i % COLS, row = Math.floor(i / COLS)
    const cx = startX + col * COL_W + (row % 2 === 1 ? COL_W / 2 : 0)
    const cy = titleH + R + row * ROW_H
    const t = items.length > 1 ? i / (items.length - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    parts.push(`<polygon points="${hexPoints(cx, cy)}" fill="${fill}33" stroke="${fill}" stroke-width="1.5"/>`)
    const [line1, line2] = wrapLabel(item.label)
    const caption = getCaption(item)
    if (line2 && caption) {
      // 3 rows: shift everything up a little
      parts.push(`<text x="${cx.toFixed(1)}" y="${(cy - 13).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(line1)}</text>`)
      parts.push(`<text x="${cx.toFixed(1)}" y="${(cy + 1).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(line2)}</text>`)
      parts.push(`<text x="${cx.toFixed(1)}" y="${(cy + 15).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(trunc(caption, VALUE_MAX_CHARS))}</text>`)
    } else if (line2) {
      // two label lines, no caption — vertically centre the pair
      parts.push(`<text x="${cx.toFixed(1)}" y="${(cy - 7).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(line1)}</text>`)
      parts.push(`<text x="${cx.toFixed(1)}" y="${(cy + 7).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(line2)}</text>`)
    } else {
      // single line (original layout)
      parts.push(`<text x="${cx.toFixed(1)}" y="${(cy - 6).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(line1)}</text>`)
      if (caption) parts.push(`<text x="${cx.toFixed(1)}" y="${(cy + 8).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(trunc(caption, VALUE_MAX_CHARS))}</text>`)
    }
  })
  return svg(W, H, theme, parts)
}
