import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { tt } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const centerLabel = spec.title ?? spec.items[0]?.label ?? 'Hub'
  const spokes = spec.title ? spec.items : spec.items.slice(1)
  const n = spokes.length || 1
  const W = 560, H = 440
  const cx = W / 2, cy = H / 2
  const R = 158
  const parts: string[] = []
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i / n) - Math.PI / 2
    const sx = cx + R * Math.cos(angle), sy = cy + R * Math.sin(angle)
    const item = spokes[i]
    parts.push(`<line x1="${cx}" y1="${cy}" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}" stroke="${theme.border}cc" stroke-width="1.5"/>`)
    if (item) {
      parts.push(`<rect x="${(sx - 52).toFixed(1)}" y="${(sy - 18).toFixed(1)}" width="104" height="36" rx="5" fill="${theme.surface}" stroke="${theme.primary}66" stroke-width="1.2"/>`)
      parts.push(`<text x="${sx.toFixed(1)}" y="${(sy + 5).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, 12)}</text>`)
      item.children.slice(0, 2).forEach((ch, j) => {
        const offY = sy + 26 + j * 13
        parts.push(`<text x="${sx.toFixed(1)}" y="${offY.toFixed(1)}" text-anchor="middle" font-size="8.5" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(ch.label, 12)}</text>`)
      })
    }
  }
  parts.push(`<circle cx="${cx}" cy="${cy}" r="38" fill="${theme.accent}33" stroke="${theme.accent}" stroke-width="1.5"/>`)
  const cw = centerLabel.split(' ')
  if (cw.length === 1) {
    parts.push(`<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${tt(centerLabel, 12)}</text>`)
  } else {
    const m = Math.ceil(cw.length / 2)
    parts.push(`<text x="${cx}" y="${cy - 3}" text-anchor="middle" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${tt(cw.slice(0, m).join(' '), 12)}</text>`)
    parts.push(`<text x="${cx}" y="${cy + 11}" text-anchor="middle" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${tt(cw.slice(m).join(' '), 12)}</text>`)
  }
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${parts.join('\n  ')}
</svg>`
}
