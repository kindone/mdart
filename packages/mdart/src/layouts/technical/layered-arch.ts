import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, truncate, lerpColor, renderEmpty } from '../shared'

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
  const layers = spec.items
  if (layers.length === 0) return renderEmpty(theme)

  const W = 600
  const TITLE_H = spec.title ? 30 : 8
  const LAYER_H = 62
  const GAP = 6
  const H = TITLE_H + layers.length * (LAYER_H + GAP) + 16

  const parts: string[] = []

  parts.push(`<defs><marker id="la-arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${theme.muted}"/></marker></defs>`)

  layers.forEach((layer, i) => {
    const y = TITLE_H + 8 + i * (LAYER_H + GAP)
    const t = i / Math.max(layers.length - 1, 1)
    const fill = lerpColor(theme.primary, theme.secondary, t)

    parts.push(`<rect x="8" y="${y.toFixed(1)}" width="${W - 16}" height="${LAYER_H}" rx="8" fill="${fill}22" stroke="${fill}66" stroke-width="1.2"/>`)

    if (layer.children.length === 0) {
      const mid = (y + LAYER_H / 2 + 4).toFixed(1)
      parts.push(`<text x="24" y="${mid}" font-size="12" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(layer.label, 72)}</text>`)
    } else {
      parts.push(`<text x="24" y="${(y + LAYER_H / 2 + 4).toFixed(1)}" font-size="12" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(layer.label, 15)}</text>`)
      parts.push(`<line x1="128" y1="${(y + 10).toFixed(1)}" x2="128" y2="${(y + LAYER_H - 10).toFixed(1)}" stroke="${fill}55" stroke-width="1"/>`)

      let chipX = 140
      const chipY = y + (LAYER_H - 26) / 2
      layer.children.slice(0, 7).forEach(child => {
        const label = truncate(child.label, 13)
        const chipW = label.length * 7 + 18
        if (chipX + chipW > W - 16) return
        parts.push(
          `<rect x="${chipX.toFixed(1)}" y="${chipY.toFixed(1)}" width="${chipW}" height="26" rx="5" fill="${theme.surface}" stroke="${fill}66" stroke-width="1"/>`,
          `<text x="${(chipX + chipW / 2).toFixed(1)}" y="${(chipY + 16).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(label)}</text>`,
        )
        chipX += chipW + 8
      })
    }

    if (i < layers.length - 1) {
      const ax = W / 2
      const ay1 = y + LAYER_H
      const ay2 = ay1 + GAP
      parts.push(`<line x1="${ax}" y1="${ay1.toFixed(1)}" x2="${ax}" y2="${ay2.toFixed(1)}" stroke="${theme.muted}" stroke-width="1.5" marker-end="url(#la-arr)"/>`)
    }
  })

  return svgWrap(W, H, theme, spec.title, parts)
}
