import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, lerpColor, renderEmpty, itemTitleTag, ellipsisIfDropped } from '../shared'

/**
 * pyramid-list — numbered horizontal bars, widening toward the bottom.
 * Looks like a list where each item's width reflects its pyramid rank.
 */
export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const n = items.length
  const W = 600
  const ROW_H  = 36
  const GAP    = 6
  const LINE_H = 13
  const MIN_FRAC = 0.28
  const BADGE_R  = 11
  const titleH   = spec.title ? 34 : 12

  // Description metrics (children of each item)
  const DESC_FS  = 9, DESC_LH = 12
  const DESC_PAD = 5   // gap between bar bottom and first desc baseline
  const DESC_MAX = Math.max(16, Math.floor((W - 80) / 5.0))  // ~104 chars

  const BAR_MAX = W - 80
  const cx = W / 2

  // Pre-compute descriptions
  const descWraps = items.map(item => {
    const text = item.children.map(c => c.label).join(' ')
    return text
      ? wrapLabel(text, DESC_MAX, 3)
      : { lines: [] as string[], truncated: false, url: null }
  })

  // Per-row content height (bar + optional description); cumulative Y
  const rowContentH = items.map((_, i) => {
    const nd = descWraps[i].lines.length
    return ROW_H + (nd > 0 ? DESC_PAD + nd * DESC_LH : 0)
  })
  const rowY: number[] = []
  let cumY = titleH
  for (const rh of rowContentH) { rowY.push(cumY); cumY += rh + GAP }
  const H = cumY - GAP + 20

  const parts: string[] = []

  if (spec.title) {
    parts.push(
      `<text x="${cx}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(spec.title)}</text>`
    )
  }

  for (let i = 0; i < n; i++) {
    const item = items[i]
    const t    = n > 1 ? i / (n - 1) : 1
    const barW = BAR_MAX * (MIN_FRAC + (1 - MIN_FRAC) * t)
    const y    = rowY[i]
    const barX = cx - barW / 2
    const fill = lerpColor(theme.primary, theme.muted, t * 0.65)

    // Bar — tooltip carries full item summary (label + value + attrs)
    parts.push(
      `<rect x="${barX.toFixed(1)}" y="${y}" width="${barW.toFixed(1)}" height="${ROW_H}" rx="5" fill="${fill}">${itemTitleTag(item)}</rect>`
    )

    // Number badge — fixed to left edge of bar
    const badgeCx = barX - BADGE_R - 5
    const badgeCy = y + ROW_H / 2
    parts.push(
      `<circle cx="${badgeCx.toFixed(1)}" cy="${badgeCy.toFixed(1)}" r="${BADGE_R}" fill="${fill}"/>`,
      `<text x="${badgeCx.toFixed(1)}" y="${(badgeCy + 4).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="${theme.bg}" font-family="system-ui,sans-serif">${i + 1}</text>`
    )

    // Label centred in bar — leave a value-shaped gutter on the right when
    // a value is present so they don't collide.
    const valueText = item.value ?? ''
    const valueW    = valueText ? valueText.length * 7 + 12 : 0
    const labelW    = Math.max(40, barW - valueW)
    const maxChars  = Math.max(5, Math.floor(labelW / 7.5))
    // value badge is drawn separately to the right; children render as a
    // description below the bar. So shows.value=!!valueText and shows.children
    // is implicit. Ellipsis fires when attrs are non-empty.
    const labelStr = ellipsisIfDropped(item.label, item, { value: !!valueText })
    const { lines, truncated, url: lblUrl } = wrapLabel(labelStr, maxChars)
    const firstY = y + ROW_H / 2 - ((lines.length - 1) * LINE_H) / 2 + 4
    const tip    = truncated ? `<title>${escapeXml(item.label)}</title>` : ''
    const tspans = lines
      .map((l, li) => `<tspan x="${cx.toFixed(1)}" dy="${li === 0 ? 0 : LINE_H}">${escapeXml(l)}</tspan>`)
      .join('')
    parts.push(
      aWrap(`<text x="${cx.toFixed(1)}" y="${firstY.toFixed(1)}" text-anchor="middle" font-size="12" font-weight="600" fill="${theme.bg}" font-family="system-ui,sans-serif">${tip}${tspans}</text>`, lblUrl)
    )

    // Value badge — right-aligned inside the bar, dimmer than the label
    if (valueText) {
      const valX = barX + barW - 10
      const valY = y + ROW_H / 2 + 4
      parts.push(
        `<text x="${valX.toFixed(1)}" y="${valY.toFixed(1)}" text-anchor="end" font-size="11" font-weight="700" fill="${theme.bg}" opacity="0.8" font-family="system-ui,sans-serif">${escapeXml(valueText)}</text>`
      )
    }

    // Description below bar (from children)
    const dw = descWraps[i]
    if (dw.lines.length > 0) {
      const descY  = y + ROW_H + DESC_PAD + DESC_FS
      const dTip   = dw.truncated ? `<title>${escapeXml(item.children.map(c => c.label).join(' '))}</title>` : ''
      const dSpans = dw.lines
        .map((l, li) => `<tspan x="${cx.toFixed(1)}" dy="${li === 0 ? 0 : DESC_LH}">${escapeXml(l)}</tspan>`)
        .join('')
      parts.push(
        `<text x="${cx.toFixed(1)}" y="${descY.toFixed(1)}" text-anchor="middle" font-size="${DESC_FS}" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${dTip}${dSpans}</text>`
      )
    }
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${parts.join('\n  ')}
</svg>`
}
