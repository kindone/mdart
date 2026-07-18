import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, lerpColor, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

function svgWrap(W: number, H: number, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
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

  const W = 600
  const TITLE_H = spec.title ? 30 : 8
  const H = 100 + TITLE_H
  const n = items.length
  const ARROW_W = 18
  const STAGE_W = (W - 24 - (n - 1) * ARROW_W) / n
  const STAGE_H = 50
  const stageY = TITLE_H + (H - TITLE_H - STAGE_H) / 2

  const parts: string[] = []
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()

  items.forEach((item, i) => {
    const x = 12 + i * (STAGE_W + ARROW_W)
    const t = i / Math.max(n - 1, 1)
    const fill = lerpColor(theme.primary, theme.secondary, t)

    const { display: itmDisplay, url: itmUrl } = displayLabel(item)
    const unit: string[] = []
    if (i > 0) {
      const ax = x - ARROW_W + 4
      const ay = stageY + STAGE_H / 2
      unit.push(`<path d="M${ax.toFixed(1)},${(ay - 6).toFixed(1)} L${(ax + ARROW_W - 4).toFixed(1)},${ay.toFixed(1)} L${ax.toFixed(1)},${(ay + 6).toFixed(1)}" fill="${theme.textMuted}bb" stroke="none"/>`)
    }
    unit.push(
      `<rect x="${x.toFixed(1)}" y="${stageY.toFixed(1)}" width="${STAGE_W.toFixed(1)}" height="${STAGE_H}" rx="6" fill="${fill}33" stroke="${fill}99" stroke-width="1.5">${itemTitleTag(item)}</rect>`,
    )
    unit.push(aWrap(`<text x="${(x + STAGE_W / 2).toFixed(1)}" y="${(stageY + STAGE_H / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="12" fill="${theme.text}" ${FONT_SANS_ATTR}>${tt(itmDisplay, Math.floor(STAGE_W / 7), item)}</text>`, itmUrl))
    parts.push(wrapItem(unit.join(''), i, animate, instrument))
  })

  if (animate) parts.unshift(seqSpotlightCSS(n, spec, { scale: false }))
  return svgWrap(W, H, theme, spec.title, parts)
}
