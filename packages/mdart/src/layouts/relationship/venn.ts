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
  const all = spec.items
  const circles      = all.filter(i => !i.isIntersection)
  const intersects   = all.filter(i => i.isIntersection)

  const W = 560
  const TITLE_H = spec.title ? 28 : 8
  const H = 320 + TITLE_H
  const R = 115
  const overlap = 72
  const cy = TITLE_H + (H - TITLE_H) / 2

  const cx1 = W / 2 - R + overlap / 2
  const cx2 = W / 2 + R - overlap / 2

  const c1 = circles[0]
  const c2 = circles[1]

  const parts: string[] = []

  parts.push(
    `<circle cx="${cx1.toFixed(1)}" cy="${cy.toFixed(1)}" r="${R}" fill="${theme.primary}28" stroke="${theme.primary}88" stroke-width="1.5"/>`,
    `<circle cx="${cx2.toFixed(1)}" cy="${cy.toFixed(1)}" r="${R}" fill="${theme.secondary}28" stroke="${theme.secondary}88" stroke-width="1.5"/>`,
  )

  if (c1) {
    parts.push(
      `<text x="${(cx1 - R / 3.5).toFixed(1)}" y="${(cy - 10).toFixed(1)}" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(c1.label, 14)}</text>`,
    )
    c1.children.slice(0, 4).forEach((ch, idx) => {
      parts.push(`<text x="${(cx1 - R / 3.5).toFixed(1)}" y="${(cy + 12 + idx * 16).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(ch.label, 13)}</text>`)
    })
  }

  if (c2) {
    parts.push(
      `<text x="${(cx2 + R / 3.5).toFixed(1)}" y="${(cy - 10).toFixed(1)}" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(c2.label, 14)}</text>`,
    )
    c2.children.slice(0, 4).forEach((ch, idx) => {
      parts.push(`<text x="${(cx2 + R / 3.5).toFixed(1)}" y="${(cy + 12 + idx * 16).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(ch.label, 13)}</text>`)
    })
  }

  const ixLabel = intersects[0]?.label ?? ''
  if (ixLabel) {
    parts.push(
      `<text x="${(W / 2).toFixed(1)}" y="${(cy - 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.accent}" font-family="system-ui,sans-serif" font-weight="500">${tt(ixLabel, 12)}</text>`,
    )
    intersects[0].children.slice(0, 3).forEach((ch, idx) => {
      parts.push(`<text x="${(W / 2).toFixed(1)}" y="${(cy + 14 + idx * 15).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.accent}" font-family="system-ui,sans-serif" opacity="0.8">${tt(ch.label, 10)}</text>`)
    })
  }

  return svg(W, H, theme, spec.title, parts)
}
