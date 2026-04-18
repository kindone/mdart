import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { tt } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const W = 640, H = 520
  const cx = W / 2, cy = H / 2

  let centerLabel: string
  let branches: MdArtSpec['items']

  if (spec.title) {
    centerLabel = spec.title
    branches = spec.items
  } else if (spec.items.length === 1) {
    centerLabel = spec.items[0].label
    branches = spec.items[0].children
  } else {
    centerLabel = 'Topic'
    branches = spec.items
  }

  const n = branches.length
  const R1 = 155
  const R2 = 78

  const lines: string[] = []
  const shapes: string[] = []
  const texts: string[] = []

  shapes.push(`<ellipse cx="${cx}" cy="${cy}" rx="64" ry="24" fill="${theme.surface}" stroke="${theme.accent}" stroke-width="1.5"/>`)
  texts.push(`<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="12" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(centerLabel, 16)}</text>`)

  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i / n) - Math.PI / 2
    const bx = cx + R1 * Math.cos(angle)
    const by = cy + R1 * Math.sin(angle)
    const branch = branches[i]

    lines.push(`<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="${theme.accent}55" stroke-width="2"/>`)

    shapes.push(`<ellipse cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" rx="50" ry="20" fill="${theme.surface}" stroke="${theme.accent}88" stroke-width="1"/>`)
    texts.push(`<text x="${bx.toFixed(1)}" y="${(by + 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif">${tt(branch.label, 13)}</text>`)

    const subs = branch.children
    const ns = subs.length
    for (let j = 0; j < ns; j++) {
      const spread = Math.min(Math.PI * 0.7, Math.max(0.45, (ns - 1) * 0.5))
      const subAngle = ns <= 1
        ? angle
        : angle + (j - (ns - 1) / 2) * (spread / Math.max(ns - 1, 1))
      const sx = bx + R2 * Math.cos(subAngle)
      const sy = by + R2 * Math.sin(subAngle)

      lines.push(`<line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}" stroke="${theme.muted}" stroke-width="1" opacity="0.8"/>`)
      shapes.push(`<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="20" fill="${theme.surface}" stroke="${theme.muted}55" stroke-width="1"/>`)
      texts.push(`<text x="${sx.toFixed(1)}" y="${(sy + 3).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(subs[j].label, 11)}</text>`)
    }
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${[...lines, ...shapes, ...texts].join('\n  ')}
</svg>`
}
