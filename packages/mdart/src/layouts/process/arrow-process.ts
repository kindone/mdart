import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, titleEl, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared } from '../shared'
import { render as renderVerticalFallback } from './process'

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
  if (n > 6) return renderVerticalFallback(spec, theme)

  const W = 600
  const titleH = spec.title ? 28 : 8
  const ARROW_W = 38
  const BOX_H = 70
  const BOX_W = Math.min(116, Math.floor((W - 20 - (n - 1) * ARROW_W) / n))
  const H = BOX_H + titleH + 32
  const totalW = n * BOX_W + (n - 1) * ARROW_W
  const startX = (W - totalW) / 2
  const bY = titleH + 14

  const animate = shouldAnimate(spec)
  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  // Per-node fitting: every box shares BOX_W, but each label/value pair is
  // sized independently rather than to the diagram's worst-case label — a
  // short label stays large instead of being dragged down to match a long
  // neighbor.
  //
  // The label fit was also capped at a flat maxLines (2 with a value, 3
  // without) with no boxH — so a smaller font never unlocked an extra line
  // beyond that flat cap, and (worse) that same flat cap applied even at
  // the LARGEST font size, so a 2-3 line label at max size could overflow
  // BOX_H vertically with nothing stopping it. arrowBoxH below gives
  // fitTextToWidthShared the real vertical budget, and raises the ceiling
  // one further (3/4) since BOX_H's 70px comfortably fits more lines once
  // the font is small enough — same mechanism as circle-process/waterfall/
  // chevron-process/funnel.
  const displays = items.map(it => displayLabel(it, { value: !!it.value }))
  const arrowBoxH = BOX_H - 16

  items.forEach((item, i) => {
    const x = startX + i * (BOX_W + ARROW_W)
    const t = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    const cy = bY + BOX_H / 2
    const { url: itmUrl, display: itmDisplay } = displays[i]
    const valueFitFull = item.value
      ? fitTextToWidthShared([item.value], BOX_W - 10, { maxSize: 9, minSize: 6, maxLines: 1 })
      : null
    const valueFS = valueFitFull?.fontSize ?? 9
    const valueLH = valueFitFull?.lineHeight ?? 9 * 1.3
    const valueFit = valueFitFull?.results[0] ?? null
    const reservedBoxH = valueFit ? Math.max(10, arrowBoxH - valueLH - 4) : arrowBoxH
    const { fontSize: labelFS, lineHeight: labelLH, results: [{ lines: labelLines, truncated: labelTruncated }] } =
      fitTextToWidthShared([itmDisplay], BOX_W - 10, {
        maxSize: 10.5, minSize: 6.5, maxLines: item.value ? 3 : 4, boxH: reservedBoxH,
      })
    // Centre the whole block (label lines + optional value line) on cy —
    // generalized so it works for any line-count combination the fit above
    // lands on, instead of assuming exactly 1 or 2 label lines.
    const totalH = labelLines.length * labelLH + (valueFit ? valueLH + 4 : 0)

    let lblContent = labelTruncated ? `<title>${escapeXml(itmDisplay)}</title>` : ''
    labelLines.forEach((line, li) => {
      const ty = cy - totalH / 2 + li * labelLH + labelLH * 0.8
      lblContent += `<text x="${(x + BOX_W / 2).toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="${labelFS}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(line)}</text>`
    })

    let nodeStr = ''
    nodeStr += `<rect x="${x.toFixed(1)}" y="${bY}" width="${BOX_W}" height="${BOX_H}" rx="7" fill="${fill}28" stroke="${fill}" stroke-width="2">${itemTitleTag(item)}</rect>`
    nodeStr += aWrap(lblContent, itmUrl)
    if (valueFit) {
      const ty = cy - totalH / 2 + labelLines.length * labelLH + valueLH * 0.8
      const valueTip = valueFit.truncated ? `<title>${escapeXml(item.value!)}</title>` : ''
      nodeStr += `${valueTip}<text x="${(x + BOX_W / 2).toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="${valueFS}" fill="${theme.text}" fill-opacity="0.72" font-family="system-ui,sans-serif">${escapeXml(valueFit.lines[0])}</text>`
    }
    parts.push(animate ? `<g class="mdart-n${i}">${nodeStr}</g>` : nodeStr)

    // Arrow between nodes fades in with its destination node.
    if (i < n - 1) {
      const ax = x + BOX_W + 4
      const arrowH = 30
      const shaftH = Math.round(arrowH * 0.46)
      const headBase = ax + ARROW_W - 20
      const arrEl = `<polygon points="${ax},${(cy - shaftH).toFixed(1)} ${headBase},${(cy - shaftH).toFixed(1)} ${headBase},${(cy - arrowH).toFixed(1)} ${(ax + ARROW_W - 8).toFixed(1)},${cy.toFixed(1)} ${headBase},${(cy + arrowH).toFixed(1)} ${headBase},${(cy + shaftH).toFixed(1)} ${ax},${(cy + shaftH).toFixed(1)}" fill="${fill}99"/>`
      parts.push(animate ? `<g class="mdart-arr-n${i + 1}">${arrEl}</g>` : arrEl)
    }
  })

  if (animate) parts.unshift(seqSpotlightCSS(n, spec))
  return svgWrapProcess(W, H, theme, parts)
}
