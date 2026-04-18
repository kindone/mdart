import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, titleEl, tt, renderEmpty } from '../shared'

function svgWrapProcess(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const n = items.length
  const W = 560
  const R = Math.min(40, (W - 16) / n / 2 - 10)
  const titleH = spec.title ? 28 : 8
  const H = titleH + R * 2 + 20
  const spacing = (W - 16) / n
  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))
  parts.push(`<defs><marker id="cp-arr" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><polygon points="0,0 7,3.5 0,7" fill="${theme.muted}"/></marker></defs>`)

  items.forEach((item, i) => {
    const cx = 16 + i * spacing + spacing / 2
    const cy = titleH + R + 6
    const t = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${R}" fill="${fill}33" stroke="${fill}" stroke-width="1.5"/>`)
    parts.push(`<text x="${cx.toFixed(1)}" y="${(cy - (item.value ? 5 : 0)).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${tt(item.label, Math.floor(R / 4))}</text>`)
    if (item.value) parts.push(`<text x="${cx.toFixed(1)}" y="${(cy + 10).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(item.value, Math.floor(R / 3.5))}</text>`)
    if (i < n - 1) {
      const x1 = cx + R + 2, x2 = cx + spacing - R - 6
      parts.push(`<line x1="${x1.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${cy.toFixed(1)}" stroke="${theme.muted}" stroke-width="1.5" marker-end="url(#cp-arr)"/>`)
    }
  })
  return svgWrapProcess(W, H, theme, parts)
}
