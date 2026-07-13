import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, contrastColor, titleEl, renderEmpty, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, wrapItem, shouldInstrument } from '../shared'
import { render as renderProcess } from './process'

function svgWrapProcess(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const n = items.length
  if (n > 8) return renderProcess(spec, theme)

  const W = 600
  const titleH = spec.title ? 28 : 8
  const chevH = 54
  const H = chevH + titleH + 28
  const P = 20
  const GAP = 4
  const chevW = Math.floor((W - 20 - (n - 1) * GAP) / n)
  const startX = Math.floor((W - (n * chevW + (n - 1) * GAP)) / 2)
  const y = titleH + 10
  const cy = y + chevH / 2

  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  // Per-node fitting: first/last chevrons have a different body width than
  // the middle ones (one angled edge instead of two) — a genuinely varying,
  // per-item width just like funnel's tapering bands. Sizing every label to
  // the single narrowest body across the row would crush the wider bodies'
  // text down to whatever the tightest chevron needs; instead each
  // chevron's label is sized to its OWN body width.
  //
  // The label fit was also capped at a flat maxLines (1 with a value, 2
  // without), with no boxH — so a smaller font never unlocked an extra
  // line, it just kept shrinking a single line down to the floor before
  // truncating. chevBoxH below gives fitTextToWidthShared the vertical
  // budget to grow the line count as the font shrinks, same mechanism as
  // circle-process/waterfall.
  const chevBoxH = chevH - 12
  const geoms = items.map((_, i) => {
    const x = startX + i * (chevW + GAP)
    const isFirst = i === 0
    const isLast = i === n - 1
    const bodyX = x + (isFirst ? 0 : P / 2)
    const bodyW = chevW - (isFirst ? P : 0) - (isLast ? 0 : P)
    return { x, isFirst, isLast, bodyX, bodyW: Math.max(4, bodyW - 6) }
  })

  const displays = items.map(it => displayLabel(it, { value: !!it.value }))

  items.forEach((item, i) => {
    const { x, isFirst, isLast, bodyX, bodyW } = geoms[i]
    const t = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)

    let pts: string
    if (n === 1) {
      pts = `${x},${y} ${x + chevW},${y} ${x + chevW},${y + chevH} ${x},${y + chevH}`
    } else if (isFirst) {
      pts = `${x},${y} ${x + chevW - P},${y} ${x + chevW},${cy} ${x + chevW - P},${y + chevH} ${x},${y + chevH}`
    } else if (isLast) {
      pts = `${x},${y} ${x + chevW},${y} ${x + chevW},${y + chevH} ${x},${y + chevH} ${x + P},${cy}`
    } else {
      pts = `${x},${y} ${x + chevW - P},${y} ${x + chevW},${cy} ${x + chevW - P},${y + chevH} ${x},${y + chevH} ${x + P},${cy}`
    }

    const tx = bodyX + bodyW / 2
    const { url: itmUrl, display: itmDisplay } = displays[i]
    // Value used to be capped at a flat maxLines: 1 with no boxH — so a
    // long value just kept shrinking down to the font floor and then
    // truncated with an ellipsis, never wrapping, even though chevBoxH has
    // room for it. Give the value its own boxH share (a minority share,
    // since the label is the primary text and should keep first claim on
    // vertical room) so it can wrap to a 2nd line too when it's long enough
    // to need it — short values still land on 1 line at max size exactly
    // as before, since the search only wraps when width actually demands it.
    const fit = fitLabelValueBlock(itmDisplay, item.value, bodyW, chevBoxH, {
      labelUrl: itmUrl,
      labelMaxSize: 10.5,
      labelMinSize: 6.5,
      labelMaxLines: 3,
      labelMaxLinesNoValue: 4,
      valueMaxSize: 9,
      valueMinSize: 6,
      valueMaxLines: 2,
      valueShare: 0.4,
      gap: 3,
    })

    let nodeStr = `<polygon points="${pts}" fill="${fill}ee" stroke="${theme.bg}" stroke-width="2.5">${itemTitleTag(item)}</polygon>`
    const textColor = contrastColor(fill)
    nodeStr += renderFitBlock(tx, cy, fit, {
      labelFullText: itmDisplay,
      valueFullText: item.value,
      labelFill: textColor,
      valueFill: textColor,
      labelWeight: '600',
      valueExtraAttrs: 'opacity="0.85"',
    })
    parts.push(wrapItem(nodeStr, i, animate, instrument))
  })

  if (animate) parts.unshift(seqSpotlightCSS(n, spec))
  return svgWrapProcess(W, H, theme, parts)
}
