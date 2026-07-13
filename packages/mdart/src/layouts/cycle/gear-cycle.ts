import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, svgWrap, renderEmpty, parseLink, itemTitleTag, ellipsisIfDropped, shouldAnimate, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, roundTextBox } from '../shared'

function gearPath(cx: number, cy: number, outerR: number, innerR: number, teeth: number, phase: number): string {
  const points: string[] = []
  for (let i = 0; i < teeth * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const angle = phase + (Math.PI / teeth) * i
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return 'M ' + points.join(' L ') + ' Z'
}

/**
 * Emit fitted label line(s) + optional value line, vertically centred at
 * (gx, gy), sized independently to the gear's own inner-circle budget
 * (boxW/boxH — a chord/height approximation of the flat centre disc, same
 * heuristic as circle-process.ts's circleBoxW/H) rather than the old flat
 * maxChars-per-line truncation (single fixed font-size per tier, no
 * <title> tooltip on the value line).
 */
function renderGearLabel(
  parts: string[],
  gx: number, gy: number,
  rawLabel: string, value: string | undefined, attrs: string[] | undefined,
  maxSize: number, boxW: number, boxH: number,
  labelFill: string, theme: MdArtTheme
): void {
  const { display: rawDisplay, url: lblUrl } = parseLink(rawLabel)
  // Apply ellipsis cue when attrs would otherwise be invisible (gear-cycle
  // already renders value as a subtitle line, so shows.value=true).
  const label = ellipsisIfDropped(rawDisplay, { label: rawLabel, value, attrs }, { value: true })

  const fit = fitLabelValueBlock(label, value, boxW, boxH, {
    labelUrl: lblUrl,
    labelMaxSize: maxSize,
    labelMinSize: 6.5,
    labelMaxLines: 2,
    labelMaxLinesNoValue: 3,
    valueMaxSize: Math.max(maxSize - 2, 8),
    valueMinSize: 6.5,
    valueMaxLines: 1,
    gap: 2,
  })
  parts.push(renderFitBlock(gx, gy, fit, {
    labelFullText: label,
    valueFullText: value,
    labelFill,
    valueFill: theme.textMuted,
    labelWeight: '600',
  }))
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const n = items.length
  const W = 500
  const titleH = spec.title ? 34 : 0
  const H = 380 + titleH
  const cx = W / 2
  const cy = titleH + 190   // content centre stays 190 px into the content area
  const parts: string[] = []
  const animate = shouldAnimate(spec)

  // Arrow marker for directional indicators
  parts.push(`<defs><marker id="gear-arr" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto"><path d="M0,0.5 L6,3.5 L0,6.5 Z" fill="${theme.primary}"/></marker></defs>`)

  if (n === 1) {
    const item = items[0]
    const fill = theme.primary
    if (animate) parts.push(`<g class="mdart-n0">`)
    parts.push(`<path d="${gearPath(cx, cy, 90, 68, 12, 0)}" fill="${fill}" opacity="0.8">${itemTitleTag(item)}</path>`)
    parts.push(`<circle cx="${cx}" cy="${cy}" r="52" fill="${theme.bg}"/>`)
    { const { w, h } = roundTextBox(52, { hMin: 6.5 * 1.3 * 3 }); renderGearLabel(parts, cx, cy, item.label, item.value, item.attrs, 12, w, h, theme.text, theme) }
    if (animate) parts.push(`</g>`)

  } else if (n === 2) {
    const outerR = 90, innerR = 68, teeth = 12
    const gapX = outerR * 1.85
    const positions = [cx - gapX / 2, cx + gapX / 2]
    positions.forEach((gx, i) => {
      const item = items[i]
      const t = i / (n - 1 || 1)
      const fill = lerpColor(theme.primary, theme.secondary, t)
      const phase = i * (Math.PI / teeth) // alternate phase so teeth interlock visually
      if (animate) parts.push(`<g class="mdart-n${i}">`)
      parts.push(`<path d="${gearPath(gx, cy, outerR, innerR, teeth, phase)}" fill="${fill}" opacity="0.8">${itemTitleTag(item)}</path>`)
      parts.push(`<circle cx="${gx}" cy="${cy}" r="52" fill="${theme.bg}"/>`)
      { const { w, h } = roundTextBox(52, { hMin: 6.5 * 1.3 * 3 }); renderGearLabel(parts, gx, cy, item.label, item.value, item.attrs, 11, w, h, theme.text, theme) }
      if (animate) parts.push(`</g>`)
    })

  } else if (n === 3) {
    // Large center gear + 2 smaller side gears at ±60°
    const centerFill = theme.primary
    if (animate) parts.push(`<g class="mdart-n0">`)
    parts.push(`<path d="${gearPath(cx, cy, 80, 60, 12, 0)}" fill="${centerFill}" opacity="0.8">${itemTitleTag(items[0])}</path>`)
    parts.push(`<circle cx="${cx}" cy="${cy}" r="46" fill="${theme.bg}"/>`)
    { const { w, h } = roundTextBox(46, { hMin: 6.5 * 1.3 * 3 }); renderGearLabel(parts, cx, cy, items[0].label, items[0].value, items[0].attrs, 11, w, h, theme.text, theme) }
    if (animate) parts.push(`</g>`)

    const sideAngles = [-Math.PI / 3, Math.PI / 3]
    const dist = 80 + 55 - 5
    ;[1, 2].forEach((idx, si) => {
      const item = items[idx]
      const t = idx / (n - 1)
      const fill = lerpColor(theme.primary, theme.secondary, t)
      const angle = sideAngles[si]
      const gx = cx + dist * Math.cos(angle)
      const gy = cy + dist * Math.sin(angle)
      const phase = Math.PI / 8
      if (animate) parts.push(`<g class="mdart-n${idx}">`)
      parts.push(`<path d="${gearPath(gx, gy, 55, 40, 8, phase)}" fill="${fill}" opacity="0.8">${itemTitleTag(item)}</path>`)
      parts.push(`<circle cx="${gx}" cy="${gy}" r="32" fill="${theme.bg}"/>`)
      { const { w, h } = roundTextBox(32, { hMin: 6.5 * 1.3 * 3 }); renderGearLabel(parts, gx, gy, item.label, item.value, item.attrs, 10, w, h, theme.text, theme) }
      if (animate) parts.push(`</g>`)
    })

  } else {
    // n>=4: arrange in circular orbit
    const R = 130
    const outerR = 44, innerR = 32, teeth = 8

    // Draw directional arc arrows between consecutive gears (before gears, so behind them).
    // Each arc fades in with the gear it points to; the closing arc (back to
    // gear 0) uses a trailing arrow-only slot so it appears after the last gear.
    for (let i = 0; i < n; i++) {
      const a1 = (2 * Math.PI * i) / n - Math.PI / 2
      const a2 = (2 * Math.PI * ((i + 1) % n)) / n - Math.PI / 2
      const arcR = R + outerR * 0.55
      const angOffset = outerR / R * 0.9
      const startA = a1 + angOffset
      const endA   = a2 - angOffset
      const x1 = cx + arcR * Math.cos(startA), y1 = cy + arcR * Math.sin(startA)
      const x2 = cx + arcR * Math.cos(endA),   y2 = cy + arcR * Math.sin(endA)
      const sweep = ((endA - startA + 2 * Math.PI) % (2 * Math.PI)) > Math.PI ? 1 : 0
      const arc = `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${arcR.toFixed(1)},${arcR.toFixed(1)} 0 ${sweep},1 ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${theme.primary}88" stroke-width="1.8" marker-end="url(#gear-arr)"/>`
      const arrIndex = i === n - 1 ? n : i + 1
      parts.push(animate ? `<g class="mdart-arr-n${arrIndex}">${arc}</g>` : arc)
    }

    for (let i = 0; i < n; i++) {
      const item = items[i]
      const angle = (2 * Math.PI * i) / n - Math.PI / 2
      const gx = cx + R * Math.cos(angle)
      const gy = cy + R * Math.sin(angle)
      const t = i / (n - 1 || 1)
      const fill = lerpColor(theme.primary, theme.secondary, t)
      const phase = i * (Math.PI / (teeth * n))
      if (animate) parts.push(`<g class="mdart-n${i}">`)
      parts.push(`<path d="${gearPath(gx, gy, outerR, innerR, teeth, phase)}" fill="${fill}" opacity="0.8">${itemTitleTag(item)}</path>`)
      parts.push(`<circle cx="${gx}" cy="${gy}" r="24" fill="${theme.bg}"/>`)
      { const { w, h } = roundTextBox(24, { hMin: 6.5 * 1.3 * 3 }); renderGearLabel(parts, gx, gy, item.label, item.value, item.attrs, 9, w, h, theme.text, theme) }
      if (animate) parts.push(`</g>`)
    }
  }

  if (animate) parts.unshift(seqSpotlightCSS(n, spec, { scale: false, trailingArrowSlot: n >= 4 }))
  return svgWrap(W, H, theme, spec.title, parts)
}
