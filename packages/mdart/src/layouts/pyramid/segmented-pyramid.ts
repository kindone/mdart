import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, lerpColor, renderEmpty, parseLink, aWrap, itemTitleTag, ellipsisIfDropped, shouldAnimate, seqSpotlightCSS } from '../shared'

/**
 * segmented-pyramid — classic pyramid shape but each layer is a visually
 * separated segment (gap + distinct border), making each band pop as its own
 * block rather than a continuous solid.
 */
export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)

  const n = items.length
  const W = 600
  const GAP = 6                // vertical gap between segments
  const LAYER_H = Math.min(58, Math.max(30, (320 - GAP * (n - 1)) / n))
  const titleH = spec.title ? 34 : 12
  const H = titleH + n * LAYER_H + (n - 1) * GAP + 20
  const MAX_W = W - 40
  const MIN_W = 40
  const cx = W / 2

  const parts: string[] = []

  if (spec.title) {
    parts.push(
      `<text x="${cx}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(spec.title)}</text>`
    )
  }

  for (let i = 0; i < n; i++) {
    const unit: string[] = []
    const item = items[i]
    const t = n > 1 ? i / (n - 1) : 1   // 0 = top/narrow, 1 = bottom/wide

    // Each segment is a self-contained trapezoid — its top and bottom edges
    // both belong to it alone (no sharing with neighbours, hence the gap).
    const topW = MIN_W + t * (MAX_W - MIN_W) * 0.88         // slightly narrower top
    const botW = MIN_W + (i + 1) / n * (MAX_W - MIN_W)      // full next-step width

    const y = titleH + i * (LAYER_H + GAP)

    const tL = cx - topW / 2
    const tR = cx + topW / 2
    const bL = cx - botW / 2
    const bR = cx + botW / 2

    const fill = lerpColor(theme.primary, theme.secondary, t * 0.7)
    const border = lerpColor(theme.primary, theme.accent, t * 0.5)

    // Filled trapezoid with border
    unit.push(
      `<polygon points="${tL.toFixed(1)},${y.toFixed(1)} ${tR.toFixed(1)},${y.toFixed(1)} ${bR.toFixed(1)},${(y + LAYER_H).toFixed(1)} ${bL.toFixed(1)},${(y + LAYER_H).toFixed(1)}" fill="${fill}cc" stroke="${border}" stroke-width="1.8" stroke-linejoin="round">${itemTitleTag(item)}</polygon>`
    )

    // Subtle inner highlight on top edge
    unit.push(
      `<line x1="${(tL + 2).toFixed(1)}" y1="${(y + 1).toFixed(1)}" x2="${(tR - 2).toFixed(1)}" y2="${(y + 1).toFixed(1)}" stroke="${theme.bg}55" stroke-width="1.5"/>`
    )

    // Label — always try inline first, fall back to side label
    const midW = (topW + botW) / 2
    const textY = y + LAYER_H / 2 + 4
    const fontSize = midW > 130 ? 12 : midW > 80 ? 11 : 10
    const maxChars = Math.max(4, Math.floor(midW / 7))
    const { display: lblDisplay, url: lblUrl } = parseLink(item.label)
    // Inline-append value with bullet separator (segmented bands map naturally
    // to proportional values — quartiles, share %, etc.).
    // Ellipsis cue when attrs would otherwise be invisible.
    const baseWithValue = item.value ? `${lblDisplay} · ${item.value}` : lblDisplay
    const labelWithValue = ellipsisIfDropped(baseWithValue, item, { value: true })

    unit.push(
      aWrap(`<text x="${cx.toFixed(1)}" y="${textY.toFixed(1)}" text-anchor="middle" font-size="${fontSize}" font-weight="600" fill="${theme.bg}" font-family="system-ui,sans-serif">${tt(labelWithValue, maxChars)}</text>`, lblUrl)
    )

    if (midW < 70) {
      const sideX = cx + Math.max(topW, botW) / 2 + 8
      unit.push(
        aWrap(`<text x="${sideX.toFixed(1)}" y="${textY.toFixed(1)}" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(labelWithValue, 24)}</text>`, lblUrl)
      )
    }
    parts.push(animate ? `<g class="mdart-n${i}">${unit.join('')}</g>` : unit.join(''))
  }
  if (animate) parts.unshift(seqSpotlightCSS(n, spec, { scale: false }))

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${parts.join('\n  ')}
</svg>`
}
