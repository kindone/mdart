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
  const W = 660
  const TITLE_H = spec.title ? 28 : 8
  const ROW_H = 58
  const H = Math.max(360 + TITLE_H, TITLE_H + 34 + n * ROW_H + 24)
  const cxPos = 170
  const cyPos = TITLE_H + (H - TITLE_H) / 2
  const MAX_R = Math.min(145, (H - TITLE_H) / 2 - 18)
  const textX = 360

  const parts: string[] = []
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()

  for (let i = 0; i < n; i++) {
    const item = items[i]
    const r = MAX_R * (n - i) / n
    const innerR = i === n - 1 ? 0 : MAX_R * (n - i - 1) / n
    const bandR = (r + innerR) / 2
    const opacityHex = Math.round(12 + (i / n) * 28).toString(16).padStart(2, '0')

    const unit: string[] = []
    unit.push(
      `<circle cx="${cxPos.toFixed(1)}" cy="${cyPos.toFixed(1)}" r="${r.toFixed(1)}" fill="${theme.primary}${opacityHex}" stroke="${theme.primary}55" stroke-width="1.2">${itemTitleTag(item)}</circle>`,
    )

    const { display: lblDisplay, url: lblUrl } = displayLabel(item, { value: !!item.value })
    const offsetY = i === n - 1 ? 0 : -bandR
    const labelX = cxPos
    const labelY = cyPos + offsetY
    const dotX = cxPos + Math.sqrt(Math.max(0, r * r - offsetY * offsetY))
    const dotY = labelY
    const rowY = dotY
    const labelBoxW = Math.max(44, Math.min(116, Math.max(42, r - innerR + 54)))
    const labelWrap = { ...wrapLabel(lblDisplay, Math.max(8, Math.floor(labelBoxW / 6)), 1), url: lblUrl }
    unit.push(renderWrappedText(labelX, labelY + 4, `text-anchor="middle" font-size="10.5" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700"`, lblDisplay, labelWrap, 12, item))
    if (item.value) {
      unit.push(`<circle cx="${dotX.toFixed(1)}" cy="${dotY.toFixed(1)}" r="3" fill="${theme.primary}" opacity="0.85"/>`)
      unit.push(`<path d="M${(dotX + 5).toFixed(1)},${dotY.toFixed(1)} L${(textX - 18).toFixed(1)},${rowY.toFixed(1)}" fill="none" stroke="${theme.primary}66" stroke-width="1"/>`)
      const valueWrap = wrapLabel(item.value, 50, 3)
      const valueY = rowY - ((valueWrap.lines.length - 1) * 12) / 2 + 4
      unit.push(renderWrappedText(textX, valueY, `font-size="9.5" fill="${theme.textMuted}" ${FONT_SANS_ATTR}`, item.value, valueWrap, 12))
    }
    parts.push(wrapItem(unit.join(''), n - 1 - i, animate, instrument))
  }

  if (animate) parts.unshift(seqSpotlightCSS(n, spec, { scale: false }))
  return svg(W, H, theme, spec.title, parts)
}
