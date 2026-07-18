import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, tt, renderEmpty, getCaption, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

function svg(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const W = 500
  const RIB_H = 26, GAP = 6, FOLD = 10, TAIL = 14
  // Uppercase 11px + letter-spacing — ~6.0px/char across ribbon body
  const ribLabelMax = Math.max(8, Math.floor((W - FOLD - TAIL - 20) / 5.5))
  const captionMax = Math.max(40, Math.floor((W - 32) / 3.6))
  const titleH = spec.title ? 30 : 8
  const rowH = RIB_H + 12  // ribbon + sub-text below
  const H = titleH + items.length * (rowH + GAP) + 8
  const n = items.length
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts: string[] = []
  if (spec.title) parts.push(`<text x="${W/2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(spec.title)}</text>`)
  items.forEach((item, i) => {
    const y = titleH + i * (rowH + GAP)
    const mid = y + RIB_H / 2
    const t = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    const dark = lerpColor(theme.primary, theme.secondary, Math.min(1, t + 0.15))
    const caption = getCaption(item)
    const { display: ribDisplay, url: ribUrl } = displayLabel(item, { value: !!caption })
    let nodeStr = ''
    nodeStr += `<polygon points="0,${y} ${FOLD},${mid} 0,${y+RIB_H}" fill="${dark}"/>`
    nodeStr += `<rect x="${FOLD}" y="${y}" width="${W - FOLD - TAIL}" height="${RIB_H}" fill="${fill}">${itemTitleTag(item)}</rect>`
    nodeStr += `<polygon points="${W-TAIL},${y} ${W},${y} ${W-TAIL/2},${mid} ${W},${y+RIB_H} ${W-TAIL},${y+RIB_H}" fill="${fill}"/>`
    nodeStr += `<polygon points="${W-TAIL/2},${mid} ${W},${y} ${W},${y+RIB_H}" fill="${dark}"/>`
    nodeStr += aWrap(`<text x="${FOLD + 10}" y="${(mid + 4).toFixed(1)}" font-size="11" fill="#fff" ${FONT_SANS_ATTR} font-weight="700" letter-spacing="0.06em">${tt(ribDisplay.toUpperCase(), ribLabelMax)}</text>`, ribUrl)
    if (caption) nodeStr += `<text x="${W/2}" y="${(y + RIB_H + 12).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tt(caption, captionMax)}</text>`
    parts.push(wrapItem(nodeStr, i, animate, instrument))
  })
  if (animate) parts.unshift(seqSpotlightCSS(n, spec, { scale: false }))
  return svg(W, H, theme, parts)
}
