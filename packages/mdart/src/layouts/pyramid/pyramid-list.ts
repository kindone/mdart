import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, lerpColor, renderEmpty } from '../shared'

/**
 * pyramid-list — numbered horizontal bars, widening toward the bottom.
 * Looks like a list where each item's width reflects its pyramid rank.
 */
export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const n = items.length
  const W = 600
  const ROW_H = 36
  const GAP = 6
  const MIN_FRAC = 0.28   // narrowest bar = 28% of max width
  const BADGE_R = 11
  const titleH = spec.title ? 34 : 12
  const H = titleH + n * (ROW_H + GAP) - GAP + 20

  // widest bar width (leave room for badge + padding)
  const BAR_MAX = W - 80
  const cx = W / 2

  const parts: string[] = []

  if (spec.title) {
    parts.push(
      `<text x="${cx}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(spec.title)}</text>`
    )
  }

  for (let i = 0; i < n; i++) {
    const item = items[i]
    // index 0 = top/narrowest, index n-1 = bottom/widest
    const t = n > 1 ? i / (n - 1) : 1
    const barW = BAR_MAX * (MIN_FRAC + (1 - MIN_FRAC) * t)
    const y = titleH + i * (ROW_H + GAP)
    const barX = cx - barW / 2

    const fill = lerpColor(theme.primary, theme.muted, t * 0.65)

    // Bar
    parts.push(
      `<rect x="${barX.toFixed(1)}" y="${y}" width="${barW.toFixed(1)}" height="${ROW_H}" rx="5" fill="${fill}"/>`
    )

    // Number badge — fixed to left edge of bar
    const badgeCx = barX - BADGE_R - 5
    const badgeCy = y + ROW_H / 2
    parts.push(
      `<circle cx="${badgeCx.toFixed(1)}" cy="${badgeCy.toFixed(1)}" r="${BADGE_R}" fill="${fill}"/>`
    )
    parts.push(
      `<text x="${badgeCx.toFixed(1)}" y="${(badgeCy + 4).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="${theme.bg}" font-family="system-ui,sans-serif">${i + 1}</text>`
    )

    // Label centered in bar
    const maxChars = Math.max(5, Math.floor(barW / 7.5))
    parts.push(
      `<text x="${cx.toFixed(1)}" y="${(y + ROW_H / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="12" font-weight="600" fill="${theme.bg}" font-family="system-ui,sans-serif">${tt(item.label, maxChars)}</text>`
    )
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${parts.join('\n  ')}
</svg>`
}
