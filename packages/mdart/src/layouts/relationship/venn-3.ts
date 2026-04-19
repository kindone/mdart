import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt } from '../shared'

function wrapIx(text: string, maxChars: number): string[] {
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
  if (lines.length === 0) return [tt(text, maxChars)]
  return lines.length === 1 ? lines : [lines[0], tt(lines.slice(1).join(' '), maxChars)]
}

function svg(W: number, H: number, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const all = spec.items
  const circles    = all.filter(i => !i.isIntersection)
  const intersects = all.filter(i => i.isIntersection)

  const W = 560
  const TITLE_H = spec.title ? 28 : 8
  const H = 380 + TITLE_H
  const R = 105
  const offset = 62
  const cy = TITLE_H + (H - TITLE_H) / 2

  const c1x = W / 2 - offset,       c1y = cy - offset * 0.65
  const c2x = W / 2 + offset,       c2y = cy - offset * 0.65
  const c3x = W / 2,                c3y = cy + offset * 0.9

  const colors = [theme.primary, theme.secondary, theme.accent]
  const cx = [c1x, c2x, c3x]
  const cy3 = [c1y, c2y, c3y]
  const labelOff: [number, number][] = [[-50, -R * 0.55], [50, -R * 0.55], [0, R * 0.6]]

  const parts: string[] = []

  for (let i = 0; i < 3; i++) {
    parts.push(`<circle cx="${cx[i].toFixed(1)}" cy="${cy3[i].toFixed(1)}" r="${R}" fill="${colors[i]}22" stroke="${colors[i]}77" stroke-width="1.5"/>`)
  }

  circles.slice(0, 3).forEach((c, i) => {
    const lx = cx[i] + labelOff[i][0]
    const ly = cy3[i] + labelOff[i][1]
    parts.push(`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="12" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(c.label, 13)}</text>`)
    c.children.slice(0, 2).forEach((ch, j) => {
      parts.push(`<text x="${lx.toFixed(1)}" y="${(ly + 15 + j * 14).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(ch.label, 10)}</text>`)
    })
  })

  const centerIx = intersects.find(i => i.label.includes('∩') || i.label.toLowerCase().includes('all')) ?? intersects[0]
  if (centerIx) {
    const icx = (c1x + c2x + c3x) / 3
    const icy = (c1y + c2y + c3y) / 3
    const ixLines = wrapIx(centerIx.label, 12)
    const ixLineH = 11
    const ixStartY = icy - (ixLines.length - 1) * ixLineH / 2 + 3
    ixLines.forEach((line, li) => {
      parts.push(`<text x="${icx.toFixed(1)}" y="${(ixStartY + li * ixLineH).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.accent}" font-family="system-ui,sans-serif" font-weight="600">${line}</text>`)
    })
  }

  return svg(W, H, theme, spec.title, parts)
}
