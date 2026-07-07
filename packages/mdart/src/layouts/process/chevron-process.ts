import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, titleEl, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared } from '../shared'
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
    const valueFitFull = item.value
      ? fitTextToWidthShared([item.value], bodyW, {
          maxSize: 9, minSize: 6, maxLines: 2, boxH: Math.max(10, chevBoxH * 0.4),
        })
      : null
    const valueFS = valueFitFull?.fontSize ?? 9
    const valueLH = valueFitFull?.lineHeight ?? 9 * 1.3
    const valueFit = valueFitFull?.results[0] ?? null
    const valueBlockH = valueFit ? valueFit.lines.length * valueLH : 0
    const reservedBoxH = valueFit ? Math.max(10, chevBoxH - valueBlockH - 3) : chevBoxH
    const { fontSize: labelFS, lineHeight: labelLH, results: [{ lines: labelLines, truncated: labelTruncated }] } =
      fitTextToWidthShared([itmDisplay], bodyW, {
        maxSize: 10.5, minSize: 6.5, maxLines: item.value ? 3 : 4, boxH: reservedBoxH,
      })
    const labelTip = labelTruncated ? `<title>${escapeXml(itmDisplay)}</title>` : ''
    // Centre the whole block (label lines + optional value lines) on cy —
    // generalized so it works for any line-count combination the fit above
    // lands on, instead of assuming exactly 1 label/value line.
    const totalH = labelLines.length * labelLH + (valueFit ? valueBlockH + 3 : 0)

    let nodeStr = `<polygon points="${pts}" fill="${fill}ee" stroke="${theme.bg}" stroke-width="2.5">${itemTitleTag(item)}</polygon>`
    let lblContent = labelTip
    labelLines.forEach((line, li) => {
      const ty = cy - totalH / 2 + li * labelLH + labelLH * 0.8
      lblContent += `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="${labelFS}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(line)}</text>`
    })
    nodeStr += aWrap(lblContent, itmUrl)
    if (valueFit) {
      const valueTip = valueFit.truncated ? `<title>${escapeXml(item.value!)}</title>` : ''
      let valueContent = valueTip
      valueFit.lines.forEach((line, li) => {
        const ty = cy - totalH / 2 + labelLines.length * labelLH + li * valueLH + valueLH * 0.8
        valueContent += `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="${valueFS}" fill="${theme.text}" fill-opacity="0.72" font-family="system-ui,sans-serif">${escapeXml(line)}</text>`
      })
      nodeStr += valueContent
    }
    parts.push(animate ? `<g class="mdart-n${i}">${nodeStr}</g>` : nodeStr)
  })

  if (animate) parts.unshift(seqSpotlightCSS(n, spec))
  return svgWrapProcess(W, H, theme, parts)
}
