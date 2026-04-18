import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt } from '../shared'

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
  const left  = spec.items[0] ?? { label: 'Force A', children: [] as MdArtSpec['items'][0]['children'] }
  const right = spec.items[1] ?? { label: 'Force B', children: [] as MdArtSpec['items'][0]['children'] }
  const W = 520, TITLE_H = spec.title ? 28 : 8, H = 148 + TITLE_H
  const cy = TITLE_H + (H - TITLE_H) / 2
  const AH = 68, gap = 18
  const lx1 = 8, lx2 = W / 2 - gap / 2
  const rx1 = W / 2 + gap / 2, rx2 = W - 8
  const parts: string[] = []
  parts.push(`<polygon points="${lx1},${cy - AH/2} ${lx2 - 32},${cy - AH/2} ${lx2},${cy} ${lx2 - 32},${cy + AH/2} ${lx1},${cy + AH/2}" fill="${theme.primary}2a" stroke="${theme.primary}77" stroke-width="1.5"/>`)
  parts.push(`<text x="${((lx1 + lx2) / 2 - 14).toFixed(1)}" y="${(cy - 10).toFixed(1)}" text-anchor="middle" font-size="12" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${tt(left.label, 15)}</text>`)
  left.children.slice(0, 3).forEach((ch, i) => {
    parts.push(`<text x="${((lx1 + lx2) / 2 - 14).toFixed(1)}" y="${(cy + 8 + i * 13).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(ch.label, 13)}</text>`)
  })
  parts.push(`<polygon points="${rx2},${cy - AH/2} ${rx1 + 32},${cy - AH/2} ${rx1},${cy} ${rx1 + 32},${cy + AH/2} ${rx2},${cy + AH/2}" fill="${theme.secondary}2a" stroke="${theme.secondary}77" stroke-width="1.5"/>`)
  parts.push(`<text x="${((rx1 + rx2) / 2 + 14).toFixed(1)}" y="${(cy - 10).toFixed(1)}" text-anchor="middle" font-size="12" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${tt(right.label, 15)}</text>`)
  right.children.slice(0, 3).forEach((ch, i) => {
    parts.push(`<text x="${((rx1 + rx2) / 2 + 14).toFixed(1)}" y="${(cy + 8 + i * 13).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(ch.label, 13)}</text>`)
  })
  return svg(W, H, theme, spec.title, parts)
}
