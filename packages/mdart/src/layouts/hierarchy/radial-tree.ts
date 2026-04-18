import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { tt } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const W = 600, H = 500
  const cx = W / 2, cy = H / 2
  let centerLabel: string, branches: MdArtSpec['items']
  if (spec.title) {
    centerLabel = spec.title; branches = spec.items
  } else if (spec.items.length === 1) {
    centerLabel = spec.items[0].label; branches = spec.items[0].children
  } else {
    centerLabel = 'Root'; branches = spec.items
  }

  const n = branches.length || 1
  const R1 = 150, R2 = 72
  const parts: string[] = []

  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i / n) - Math.PI / 2
    const bx = cx + R1 * Math.cos(angle), by = cy + R1 * Math.sin(angle)
    const branch = branches[i]
    parts.push(`<line x1="${cx}" y1="${cy}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="${theme.accent}50" stroke-width="2.5"/>`)

    const subs = branch.children, ns = subs.length
    for (let j = 0; j < ns; j++) {
      const spread = Math.min(Math.PI * 0.5, Math.max(0.4, (ns - 1) * 0.38))
      const sa = ns <= 1 ? angle : angle + (j - (ns - 1) / 2) * (spread / Math.max(ns - 1, 1))
      const sx = bx + R2 * Math.cos(sa), sy = by + R2 * Math.sin(sa)
      parts.push(`<line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}" stroke="${theme.border}88" stroke-width="1.5"/>`)
      parts.push(`<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="14" fill="${theme.surface}" stroke="${theme.border}" stroke-width="1"/>`)
      parts.push(`<text x="${sx.toFixed(1)}" y="${(sy + 3.5).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.text}" font-family="system-ui,sans-serif">${tt(subs[j].label, 9)}</text>`)
    }
    parts.push(`<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="22" fill="${theme.primary}" stroke="${theme.bg}" stroke-width="2"/>`)
    const ws = branch.label.split(' ')
    if (ws.length === 1) {
      parts.push(`<text x="${bx.toFixed(1)}" y="${(by + 4).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.bg}" font-weight="700" font-family="system-ui,sans-serif">${tt(branch.label, 9)}</text>`)
    } else {
      const m = Math.ceil(ws.length / 2)
      parts.push(`<text x="${bx.toFixed(1)}" y="${(by - 1).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.bg}" font-weight="700" font-family="system-ui,sans-serif">${tt(ws.slice(0,m).join(' '), 9)}</text>`)
      parts.push(`<text x="${bx.toFixed(1)}" y="${(by + 9).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.bg}" font-weight="700" font-family="system-ui,sans-serif">${tt(ws.slice(m).join(' '), 9)}</text>`)
    }
  }
  parts.push(`<circle cx="${cx}" cy="${cy}" r="32" fill="${theme.accent}" stroke="${theme.bg}" stroke-width="2"/>`)
  const cw = centerLabel.split(' ')
  if (cw.length === 1) {
    parts.push(`<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="11" fill="${theme.bg}" font-weight="700" font-family="system-ui,sans-serif">${tt(centerLabel, 12)}</text>`)
  } else {
    const m = Math.ceil(cw.length / 2)
    parts.push(`<text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="10" fill="${theme.bg}" font-weight="700" font-family="system-ui,sans-serif">${tt(cw.slice(0,m).join(' '), 12)}</text>`)
    parts.push(`<text x="${cx}" y="${cy + 11}" text-anchor="middle" font-size="10" fill="${theme.bg}" font-weight="700" font-family="system-ui,sans-serif">${tt(cw.slice(m).join(' '), 12)}</text>`)
  }
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${parts.join('\n  ')}
</svg>`
}
