import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, tt, renderEmpty, getCaption, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS } from '../shared'

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
  const captions = items.map(item => getCaption(item))
  const hasSecondary = items.some((item, i) => !!item.value || !!captions[i])
  const ROW_H = hasSecondary ? 46 : 38
  const BOX_W = 190
  const BOX_H = hasSecondary ? 38 : 30
  const SPINE_X = W / 2
  const titleH = spec.title ? 30 : 8
  const H = titleH + items.length * ROW_H + 10
  const n = items.length
  const animate = shouldAnimate(spec)
  const parts: string[] = []
  // Spine line stays always visible — structural backbone
  parts.push(`<line x1="${SPINE_X}" y1="${titleH}" x2="${SPINE_X}" y2="${H-8}" stroke="${theme.border}" stroke-width="2"/>`)
  if (spec.title) parts.push(`<text x="${SPINE_X}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`)
  items.forEach((item, i) => {
    const cy = titleH + i * ROW_H + ROW_H / 2
    const left = i % 2 === 0
    const t = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    const bx = left ? SPINE_X - 8 - BOX_W : SPINE_X + 8
    const lineX = left ? SPINE_X - 8 : SPINE_X + 8
    const caption = captions[i]
    const secondary = item.value ?? caption
    const { display: zigDisplay, url: zigUrl } = displayLabel(item, { value: true })
    let nodeStr = ''
    nodeStr += `<rect x="${bx.toFixed(1)}" y="${(cy - BOX_H/2).toFixed(1)}" width="${BOX_W}" height="${BOX_H}" rx="6" fill="${fill}22" stroke="${fill}" stroke-width="1.2">${itemTitleTag(item)}</rect>`
    const labelY = secondary ? cy - 3 : cy + 4
    nodeStr += aWrap(`<text x="${(bx + BOX_W/2).toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(zigDisplay, 22, item)}</text>`, zigUrl)
    if (secondary) nodeStr += `<text x="${(bx + BOX_W/2).toFixed(1)}" y="${(cy + 11).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(secondary, 26)}</text>`
    nodeStr += `<circle cx="${SPINE_X}" cy="${cy}" r="4" fill="${fill}"/>`
    nodeStr += `<line x1="${SPINE_X}" y1="${cy}" x2="${lineX}" y2="${cy}" stroke="${fill}" stroke-width="1.2"/>`
    parts.push(animate ? `<g class="mdart-n${i}">${nodeStr}</g>` : nodeStr)
  })
  if (animate) parts.unshift(seqSpotlightCSS(n, spec, { scale: false }))
  return svg(W, H, theme, parts)
}
