import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, lerpColor, renderEmpty } from '../shared'

/**
 * diamond-pyramid — items arranged in a diamond (rhombus) shape.
 * The diagram widens from the top to the middle item, then narrows back
 * to the bottom, creating a symmetric diamond silhouette.
 */
export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const n = items.length
  const W = 600
  const LAYER_H = Math.min(60, Math.max(28, 320 / n))
  const titleH = spec.title ? 34 : 12
  const H = titleH + n * LAYER_H + 20
  const MAX_W = W - 40
  const MIN_W = 36
  const cx = W / 2

  /**
   * Width at vertical position p (0..1 top→bottom) along the diamond.
   * Uses a triangular function: max at p=0.5, min at p=0 and p=1.
   */
  function diamondW(p: number): number {
    return MIN_W + (MAX_W - MIN_W) * (1 - Math.abs(2 * p - 1))
  }

  const shapes: string[] = []
  const labels: string[] = []

  if (spec.title) {
    shapes.push(
      `<text x="${cx}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(spec.title)}</text>`
    )
  }

  for (let i = 0; i < n; i++) {
    const item = items[i]

    const pTop = i / n           // fraction at top edge of this band
    const pBot = (i + 1) / n    // fraction at bottom edge

    const topW = diamondW(pTop)
    const botW = diamondW(pBot)

    const y = titleH + i * LAYER_H

    const tL = cx - topW / 2
    const tR = cx + topW / 2
    const bL = cx - botW / 2
    const bR = cx + botW / 2

    // Midness: how close to middle (0=edge, 1=centre)
    const pMid = (pTop + pBot) / 2
    const midness = 1 - Math.abs(2 * pMid - 1)
    const fill = lerpColor(theme.muted, theme.primary, 0.3 + midness * 0.7)

    shapes.push(
      `<polygon points="${tL.toFixed(1)},${y.toFixed(1)} ${tR.toFixed(1)},${y.toFixed(1)} ${bR.toFixed(1)},${(y + LAYER_H).toFixed(1)} ${bL.toFixed(1)},${(y + LAYER_H).toFixed(1)}" fill="${fill}" stroke="${theme.bg}" stroke-width="2"/>`
    )

    // Label — inline if there's room, side label otherwise
    const midW = (topW + botW) / 2
    const textY = y + LAYER_H / 2 + 4
    const fontSize = midW > 130 ? 12 : midW > 80 ? 11 : 10
    const maxChars = Math.max(4, Math.floor(midW / 7))

    labels.push(
      `<text x="${cx.toFixed(1)}" y="${textY.toFixed(1)}" text-anchor="middle" font-size="${fontSize}" font-weight="600" fill="${theme.bg}" font-family="system-ui,sans-serif">${tt(item.label, maxChars)}</text>`
    )

    if (midW < 70) {
      const sideX = cx + Math.max(topW, botW) / 2 + 8
      labels.push(
        `<text x="${sideX.toFixed(1)}" y="${textY.toFixed(1)}" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(item.label, 22)}</text>`
      )
    }
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${shapes.join('\n  ')}
  ${labels.join('\n  ')}
</svg>`
}
