import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, wrapLabel, renderWrappedText, FONT_SANS_ATTR } from '../shared'

function svg(W: number, H: number, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const n = items.length
  const W = 660, TITLE_H = spec.title ? 28 : 8
  const ROW_H = 56
  const H = Math.max(360 + TITLE_H, TITLE_H + 34 + n * ROW_H + 24)
  const cx = 170, cy = TITLE_H + (H - TITLE_H) / 2
  const MAX_R = Math.min(145, (H - TITLE_H) / 2 - 14)
  const textX = 360
  const parts: string[] = []
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  parts.push(`<line x1="${cx - MAX_R - 6}" y1="${cy}" x2="${cx + MAX_R + 6}" y2="${cy}" stroke="${theme.border}28" stroke-width="1"/>`)
  parts.push(`<line x1="${cx}" y1="${cy - MAX_R - 6}" x2="${cx}" y2="${cy + MAX_R + 6}" stroke="${theme.border}28" stroke-width="1"/>`)
  for (let i = n - 1; i >= 0; i--) {
    const item = items[i]
    const r = MAX_R * (i + 1) / n
    const innerR = i === 0 ? 0 : MAX_R * i / n
    const bandR = (r + innerR) / 2
    const t = i / Math.max(n - 1, 1)
    const fillAlpha = Math.round(14 + (1 - t) * 36).toString(16).padStart(2, '0')
    const unit: string[] = []
    unit.push(`<circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="${theme.primary}${fillAlpha}" stroke="${theme.primary}66" stroke-width="1.5">${itemTitleTag(item)}</circle>`)
    const offsetY = i === 0 ? 0 : bandR
    const rowY = cy + offsetY
    const dotX = cx + Math.sqrt(Math.max(0, r * r - offsetY * offsetY))
    const dotY = rowY
    const { display: itmDisplay, url: itmUrl } = displayLabel(item, { value: !!item.value })
    const labelBoxW = Math.max(44, Math.min(116, r * 1.55))
    const labelWrap = { ...wrapLabel(itmDisplay, Math.max(8, Math.floor(labelBoxW / 6)), 1), url: itmUrl }
    unit.push(renderWrappedText(cx, rowY + 4, `text-anchor="middle" font-size="10.5" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="${i === 0 ? '800' : '650'}"`, itmDisplay, labelWrap, 12, item))
    if (item.value) {
      unit.push(`<circle cx="${dotX.toFixed(1)}" cy="${dotY.toFixed(1)}" r="3.5" fill="${theme.primary}" opacity="${i === 0 ? '1' : '0.8'}"/>`)
      unit.push(`<path d="M${(dotX + 6).toFixed(1)},${dotY.toFixed(1)} L${(textX - 18).toFixed(1)},${rowY.toFixed(1)}" fill="none" stroke="${theme.primary}66" stroke-width="1"/>`)
      const valueWrap = wrapLabel(item.value, 50, 3)
      const valueY = rowY - ((valueWrap.lines.length - 1) * 12) / 2 + 4
      unit.push(renderWrappedText(textX, valueY, `font-size="9.5" fill="${theme.textMuted}" ${FONT_SANS_ATTR}`, item.value, valueWrap, 12))
    }
    parts.push(wrapItem(unit.join(''), i, animate, instrument))
  }
  if (animate) parts.unshift(seqSpotlightCSS(n, spec, { scale: false }))
  return svg(W, H, theme, spec.title, parts)
}
