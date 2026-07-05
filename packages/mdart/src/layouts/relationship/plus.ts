import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS } from '../shared'

function svg(W: number, H: number, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  const W = 500, TITLE_H = spec.title ? 28 : 8, H = 400 + TITLE_H
  const cx = W / 2, cy = TITLE_H + (H - TITLE_H) / 2
  const ARM = 130, BW = 106, BH = 50, CR = 30
  const pos: [number, number][] = [[cx, cy - ARM], [cx + ARM, cy], [cx, cy + ARM], [cx - ARM, cy]]
  const colors = [theme.primary, theme.secondary, theme.accent, theme.primary]
  const parts: string[] = []
  const animate = shouldAnimate(spec)
  const armColor = `${theme.primary}55`
  const armLines = [
    `<line x1="${cx}" y1="${cy - ARM + BH / 2}" x2="${cx}" y2="${cy - CR}" stroke="${armColor}" stroke-width="12"/>`,
    `<line x1="${cx + CR}" y1="${cy}" x2="${cx + ARM - BW / 2}" y2="${cy}" stroke="${armColor}" stroke-width="12"/>`,
    `<line x1="${cx}" y1="${cy + CR}" x2="${cx}" y2="${cy + ARM - BH / 2}" stroke="${armColor}" stroke-width="12"/>`,
    `<line x1="${cx - ARM + BW / 2}" y1="${cy}" x2="${cx - CR}" y2="${cy}" stroke="${armColor}" stroke-width="12"/>`,
  ]
  const centerItem = items[4]
  const centerUnit: string[] = []
  centerUnit.push(`<circle cx="${cx}" cy="${cy}" r="${CR}" fill="${theme.accent}33" stroke="${theme.accent}" stroke-width="1.5"/>`)
  if (centerItem) {
    const { display: ctrDisplay, url: ctrUrl } = displayLabel(centerItem)
    centerUnit.push(aWrap(`<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="9" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${itemTitleTag(centerItem)}${tt(ctrDisplay, 9, centerItem)}</text>`, ctrUrl))
  }
  parts.push(animate ? `<g class="mdart-n0">${centerUnit.join('')}</g>` : centerUnit.join(''))
  items.slice(0, 4).forEach((item, i) => {
    const [px, py] = pos[i]
    const { display: itmDisplay, url: itmUrl } = displayLabel(item)
    const unit: string[] = []
    unit.push(armLines[i])
    unit.push(`<rect x="${(px - BW / 2).toFixed(1)}" y="${(py - BH / 2).toFixed(1)}" width="${BW}" height="${BH}" rx="6" fill="${theme.surface}" stroke="${colors[i]}88" stroke-width="1.5">${itemTitleTag(item)}</rect>`)
    unit.push(aWrap(`<text x="${px.toFixed(1)}" y="${(py - 7).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${tt(itmDisplay, 13, item)}</text>`, itmUrl))
    item.children.slice(0, 2).forEach((ch, j) => {
      unit.push(`<text x="${px.toFixed(1)}" y="${(py + 9 + j * 12).toFixed(1)}" text-anchor="middle" font-size="8.5" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(ch.label, 14)}</text>`)
    })
    parts.push(animate ? `<g class="mdart-n${i + 1}">${unit.join('')}</g>` : unit.join(''))
  })
  if (animate) parts.unshift(seqSpotlightCSS(Math.min(Math.max(items.length, 1), 5), spec, { scale: false }))
  return svg(W, H, theme, spec.title, parts)
}
