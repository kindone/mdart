import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

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
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()

  const colors = [theme.primary, theme.secondary, theme.accent, theme.muted, ...theme.palette]
  const rawVals = items.map(it => Math.max(0, parseFloat((it.value ?? it.attrs[0] ?? '0').replace('%', '')) || 0))
  const total = rawVals.reduce((a, b) => a + b, 0) || 100
  let squares = rawVals.map(v => Math.round(v / total * 100))
  const diff = 100 - squares.reduce((a, b) => a + b, 0)
  if (diff !== 0) squares[0] = Math.max(0, squares[0] + diff)

  const GRID = 10, SQ = 18, GAP = 3, PAD = 16
  const GRID_W = GRID * (SQ + GAP) - GAP
  const W = Math.max(GRID_W + PAD * 2, 280)
  const gridOffX = (W - GRID_W) / 2
  const TITLE_H = spec.title ? 30 : 10

  // Pre-compute legend label fits; percentage "(xx%)" is a separate right-
  // aligned element so it doesn't eat into the label's wrapping budget.
  const legDisplays = items.map(item => displayLabel(item, { value: true }))
  const legFits = legDisplays.map(({ display }) =>
    fitTextToWidthShared([display], W - PAD - 16 - 50, { maxSize: 10, minSize: 7, maxLines: 2 })
  )
  const legRowHeights = legFits.map(f => Math.max(18, f.results[0].lines.length * f.lineHeight + 4))
  const LEGEND_H = legRowHeights.reduce((a, b) => a + b, 0) + 10
  const H = TITLE_H + PAD + GRID * (SQ + GAP) - GAP + PAD + LEGEND_H

  const categoryParts: string[][] = items.map(() => [])
  for (let sq = 0; sq < 100; sq++) {
    const col = sq % GRID, row = Math.floor(sq / GRID)
    const x = gridOffX + col * (SQ + GAP), y = TITLE_H + PAD + row * (SQ + GAP)
    let acc = 0, owner = -1
    for (let i = 0; i < squares.length; i++) {
      acc += squares[i]
      if (sq < acc) { owner = i; break }
    }
    const fill = owner >= 0 ? colors[owner % colors.length] : `${theme.muted}22`
    const rect = `<rect x="${x.toFixed(1)}" y="${y}" width="${SQ}" height="${SQ}" rx="2" fill="${fill}"/>`
    if (owner >= 0) categoryParts[owner].push(rect)
    else categoryParts[0]?.push(rect)
  }

  // Cumulative legend row Y positions
  const legBaseY = TITLE_H + PAD + GRID * (SQ + GAP) + 6
  const legRowYs: number[] = []
  let legCursorY = legBaseY
  for (const h of legRowHeights) { legRowYs.push(legCursorY); legCursorY += h }

  items.forEach((item, i) => {
    const { display: itmDisplay, url: itmUrl } = legDisplays[i]
    const { fontSize: legFS, lineHeight: legLH, results: [{ lines: legLines, truncated: legTruncated }] } = legFits[i]
    const legTip = legTruncated ? `<title>${escapeXml(itmDisplay)}</title>` : ''
    const ly = legRowYs[i]
    const swatchMidY = ly + Math.min(12, legRowHeights[i]) / 2

    // Swatch — vertically centred on the first text line
    categoryParts[i].push(`<rect x="${PAD}" y="${(swatchMidY - 6).toFixed(1)}" width="12" height="12" rx="2" fill="${colors[i % colors.length]}">${itemTitleTag(item)}</rect>`)

    const legStartY = ly + legFS * 0.75
    const legSpans = legLines
      .map((line, li) => `<tspan x="${PAD + 16}" dy="${li === 0 ? 0 : legLH.toFixed(1)}">${escapeXml(line)}</tspan>`)
      .join('')
    categoryParts[i].push(aWrap(`${legTip}<text x="${PAD + 16}" y="${legStartY.toFixed(1)}" font-size="${legFS}" fill="${theme.text}" ${FONT_SANS_ATTR}>${legSpans}</text>`, itmUrl))
    // Percentage right-aligned on the first line
    categoryParts[i].push(`<text x="${W - PAD}" y="${legStartY.toFixed(1)}" text-anchor="end" font-size="10" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${squares[i]}%</text>`)
  })

  const parts = categoryParts.map((unit, i) => wrapItem(unit.join(''), i, animate, instrument))
  if (animate) parts.unshift(seqSpotlightCSS(items.length, spec, { scale: false }))

  return svg(W, H, theme, spec.title, parts)
}
