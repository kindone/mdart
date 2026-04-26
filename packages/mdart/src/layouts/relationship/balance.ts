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
  const left  = spec.items[0] ?? { label: 'Side A', children: [] as MdArtSpec['items'][0]['children'] }
  const right = spec.items[1] ?? { label: 'Side B', children: [] as MdArtSpec['items'][0]['children'] }
  const W = 520, TITLE_H = spec.title ? 28 : 8, H = 300 + TITLE_H
  const bx = W / 2, beamY = TITLE_H + 76, beamW = 400, plateW = 130, plateH = 18
  const parts: string[] = []
  parts.push(`<polygon points="${bx},${beamY + 4} ${bx - 18},${beamY + 44} ${bx + 18},${beamY + 44}" fill="${theme.surface}" stroke="${theme.textMuted}" stroke-width="1.5"/>`)
  parts.push(`<rect x="${bx - 30}" y="${beamY + 44}" width="60" height="8" rx="2" fill="${theme.surface}" stroke="${theme.textMuted}" stroke-width="1"/>`)
  parts.push(`<rect x="${(bx - beamW / 2).toFixed(1)}" y="${(beamY - 4).toFixed(1)}" width="${beamW}" height="8" rx="3" fill="${theme.surface}" stroke="${theme.textMuted}" stroke-width="1.5"/>`)
  const lx = bx - beamW / 2 + plateW / 2 - 6
  parts.push(`<line x1="${lx}" y1="${beamY}" x2="${lx}" y2="${beamY + 38}" stroke="${theme.textMuted}99" stroke-width="1.5"/>`)
  parts.push(`<rect x="${(lx - plateW / 2).toFixed(1)}" y="${(beamY + 38).toFixed(1)}" width="${plateW}" height="${plateH}" rx="4" fill="${theme.primary}30" stroke="${theme.primary}77" stroke-width="1.2"/>`)
  parts.push(`<text x="${lx.toFixed(1)}" y="${(beamY + 38 + 12).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(left.label, 16)}</text>`)
  left.children.slice(0, 4).forEach((ch, i) => {
    parts.push(`<text x="${lx.toFixed(1)}" y="${(beamY + 66 + i * 14).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(ch.label, 16)}</text>`)
  })
  const rx = bx + beamW / 2 - plateW / 2 + 6
  parts.push(`<line x1="${rx}" y1="${beamY}" x2="${rx}" y2="${beamY + 38}" stroke="${theme.textMuted}99" stroke-width="1.5"/>`)
  parts.push(`<rect x="${(rx - plateW / 2).toFixed(1)}" y="${(beamY + 38).toFixed(1)}" width="${plateW}" height="${plateH}" rx="4" fill="${theme.secondary}30" stroke="${theme.secondary}77" stroke-width="1.2"/>`)
  parts.push(`<text x="${rx.toFixed(1)}" y="${(beamY + 38 + 12).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(right.label, 16)}</text>`)
  right.children.slice(0, 4).forEach((ch, i) => {
    parts.push(`<text x="${rx.toFixed(1)}" y="${(beamY + 66 + i * 14).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(ch.label, 16)}</text>`)
  })
  return svg(W, H, theme, spec.title, parts)
}
