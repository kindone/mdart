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

  // Wide canvas so layers use horizontal space; inner chip budget scales with (W - gutter - title column).
  const W = 600
  const TITLE_H = spec.title ? 30 : 8
  const LAYER_H = 62
  const GAP = 6
  const H = TITLE_H + layers.length * (LAYER_H + GAP) + 16
  const LAYER_LEFT_PAD = 8
  const LAYER_RIGHT_PAD = 16
  const TITLE_COL = 120 // x < 24 label; divider 128; chips from 140
  const FIRST_CHIP_X = 140
  const CHIP_GAP = 8
  const CHIP_H = 26
  const CHAR_PX = 6.5 // 11px system-ui — avg width for Latin truncation
  const CHIP_PAD = 18 // horizontal padding inside chip for label

  const parts: string[] = []

  parts.push(`<defs><marker id="la-arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${theme.muted}"/></marker></defs>`)

  layers.forEach((layer, i) => {
    const y = TITLE_H + 8 + i * (LAYER_H + GAP)
    const t = i / Math.max(layers.length - 1, 1)
    const fill = lerpColor(theme.primary, theme.secondary, t)

    parts.push(`<rect x="${LAYER_LEFT_PAD}" y="${y.toFixed(1)}" width="${W - LAYER_LEFT_PAD - LAYER_RIGHT_PAD}" height="${LAYER_H}" rx="8" fill="${fill}22" stroke="${fill}66" stroke-width="1.2"/>`)

    if (layer.children.length === 0) {
      const mid = (y + LAYER_H / 2 + 4).toFixed(1)
      const maxNoChild = Math.max(24, Math.floor((W - LAYER_LEFT_PAD - LAYER_RIGHT_PAD - 32) / 6.5))
      parts.push(`<text x="24" y="${mid}" font-size="12" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(layer.label, maxNoChild)}</text>`)
    } else {
      const titleMax = Math.max(6, Math.floor((TITLE_COL - 28) / 6.5))
      parts.push(`<text x="24" y="${(y + LAYER_H / 2 + 4).toFixed(1)}" font-size="12" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(layer.label, titleMax)}</text>`)
      parts.push(`<line x1="128" y1="${(y + 10).toFixed(1)}" x2="128" y2="${(y + LAYER_H - 10).toFixed(1)}" stroke="${fill}55" stroke-width="1"/>`)

      const children = layer.children.slice(0, 7)
      const n = children.length
      const rowInner = W - LAYER_RIGHT_PAD - FIRST_CHIP_X
      // Equal budget per column so a single component can use the full right-hand span when n=1.
      const perChipMax = n > 0 ? (rowInner - (n - 1) * CHIP_GAP) / n : 0
      let chipX = FIRST_CHIP_X
      const chipY = y + (LAYER_H - CHIP_H) / 2
      for (const child of children) {
        const maxChars = Math.max(4, Math.floor((perChipMax - CHIP_PAD) / CHAR_PX))
        const vis = truncate(child.label, maxChars)
        const naturalW = vis.length * 7 + 18
        const chipW = Math.max(24, Math.min(perChipMax, naturalW))
        parts.push(
          `<rect x="${chipX.toFixed(1)}" y="${chipY.toFixed(1)}" width="${chipW.toFixed(1)}" height="${CHIP_H}" rx="5" fill="${theme.surface}" stroke="${fill}66" stroke-width="1"/>`,
          `<text x="${(chipX + chipW / 2).toFixed(1)}" y="${(chipY + 16).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(child.label, maxChars)}</text>`,
        )
        chipX += chipW + CHIP_GAP
      }
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
