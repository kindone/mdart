import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, titleEl, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

function svgWrap(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const n = items.length
  const W = 500
  const H = 420
  const cx = W / 2
  const cy = H / 2 + 10
  const innerR = 20
  const outerR = 170
  const turns = n <= 4 ? 2 : 2.5
  const SAMPLES = 200

  const parts: string[] = []
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()

  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  // Generate spiral path — static guide, not part of the per-milestone entrance.
  const spiralPoints: string[] = []
  for (let s = 0; s <= SAMPLES; s++) {
    const theta = (s / SAMPLES) * turns * 2 * Math.PI
    const r = innerR + (outerR - innerR) * theta / (turns * 2 * Math.PI)
    const x = cx + r * Math.cos(theta)
    const y = cy + r * Math.sin(theta)
    spiralPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  parts.push(`<polyline points="${spiralPoints.join(' ')}" fill="none" stroke="${theme.textMuted}" stroke-width="2" opacity="0.7"/>`)

  // Labels float outside each dot with open room (not tightly bounded by a
  // shape), so spiralBoxW/H below are generous fixed budgets — a big
  // improvement over the old flat 14-char truncation (fixed font-size 10,
  // single line only) even without computing exact per-position clearance
  // to the canvas edge.
  const spiralBoxW = 110
  const spiralBoxH = 28

  // Place milestones evenly along spiral — each one fades in and joins the
  // idle spotlight loop in order from the centre outward.
  for (let k = 0; k < n; k++) {
    const theta = n > 1 ? k * (turns * 2 * Math.PI) / (n - 1) : 0
    const r = innerR + (outerR - innerR) * theta / (turns * 2 * Math.PI)
    const mx = cx + r * Math.cos(theta)
    const my = cy + r * Math.sin(theta)
    const t = k / (n - 1 || 1)
    const isLast = k === n - 1
    const dotR = isLast ? 9 : 7
    const fill = isLast ? theme.accent : lerpColor(theme.primary, theme.secondary, t)

    const item = items[k]
    const { display: lblDisplay, url: lblUrl } = displayLabel(item)
    let unit = `<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="${dotR}" fill="${fill}">${itemTitleTag(item)}</circle>`

    // Label on alternating sides
    const cosTheta = Math.cos(theta)
    const labelX = cosTheta >= 0 ? mx + dotR + 4 : mx - dotR - 4
    const anchor = cosTheta >= 0 ? 'start' : 'end'
    const { fontSize: labelFS, lineHeight: labelLH, results: [{ lines, truncated }] } =
      fitTextToWidthShared([lblDisplay], spiralBoxW, { maxSize: 10, minSize: 6.5, maxLines: 2, boxH: spiralBoxH })
    const tip = truncated ? `<title>${escapeXml(lblDisplay)}</title>` : ''
    const totalH = lines.length * labelLH
    let lblContent = tip
    lines.forEach((line, li) => {
      const ty = my - totalH / 2 + li * labelLH + labelLH * 0.8
      lblContent += `<text x="${labelX.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="${anchor}" font-size="${labelFS}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(line)}</text>`
    })
    unit += aWrap(lblContent, lblUrl)
    parts.push(wrapItem(unit, k, animate, instrument))
  }

  if (animate) parts.unshift(seqSpotlightCSS(n, spec))
  return svgWrap(W, H, theme, parts)
}
