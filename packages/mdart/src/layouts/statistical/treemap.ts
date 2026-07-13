import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument } from '../shared'

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
  if (items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()

  const W = 600
  const TITLE_H = spec.title ? 30 : 8
  const H = 320
  const CONTENT_H = H - TITLE_H - 8

  const colors = [theme.primary, theme.secondary, theme.accent, theme.muted, ...theme.palette]

  const cols = Math.ceil(Math.sqrt(items.length))
  const rows = Math.ceil(items.length / cols)
  const cellW = W / cols
  const cellH = CONTENT_H / rows

  const cells: string[] = []

  items.forEach((item, i) => {
    const unit: string[] = []
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = col * cellW
    const y = TITLE_H + 4 + row * cellH
    const fill = colors[i % colors.length]
    const ccx = x + cellW / 2
    const ccy = y + cellH / 2

    const hasValue = !!item.value
    const { display: itmDisplay, url: itmUrl } = displayLabel(item, { value: hasValue })

    // Per-cell fitting: when a value is shown below, label shares the upper
    // portion of the cell; otherwise it gets the full height.
    const lblBoxH = hasValue ? cellH * 0.5 : cellH - 16
    const { fontSize: lblFS, lineHeight: lblLH, results: [{ lines: lblLines, truncated: lblTruncated }] } =
      fitTextToWidthShared([itmDisplay], cellW - 12, {
        maxSize: 12, minSize: 7,
        maxLines: hasValue ? 2 : 3,
        boxH: lblBoxH,
      })
    const lblTip = lblTruncated ? `<title>${escapeXml(itmDisplay)}</title>` : ''

    unit.push(`<rect x="${(x + 2).toFixed(1)}" y="${(y + 2).toFixed(1)}" width="${(cellW - 4).toFixed(1)}" height="${(cellH - 4).toFixed(1)}" rx="6" fill="${fill}55" stroke="${fill}99" stroke-width="1">${itemTitleTag(item)}</rect>`)

    if (hasValue) {
      // Centre label+value block vertically in the cell
      const lblVisH = (lblLines.length - 1) * lblLH + lblFS
      const valFS = 10
      const totalBlockH = lblVisH + 4 + valFS
      const lblStartY = ccy - totalBlockH / 2 + lblFS * 0.75
      const valStartY = ccy - totalBlockH / 2 + lblVisH + 4 + valFS * 0.75
      const lblSpans = lblLines
        .map((line, li) => `<tspan x="${ccx.toFixed(1)}" dy="${li === 0 ? 0 : lblLH.toFixed(1)}">${escapeXml(line)}</tspan>`)
        .join('')
      unit.push(aWrap(`${lblTip}<text x="${ccx.toFixed(1)}" y="${lblStartY.toFixed(1)}" text-anchor="middle" font-size="${lblFS}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${lblSpans}</text>`, itmUrl))
      unit.push(`<text x="${ccx.toFixed(1)}" y="${valStartY.toFixed(1)}" text-anchor="middle" font-size="${valFS}" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(item.value!)}</text>`)
    } else {
      // Label centred in full cell
      const lblStartY = ccy - ((lblLines.length - 1) * lblLH) / 2 + lblFS * 0.35
      const lblSpans = lblLines
        .map((line, li) => `<tspan x="${ccx.toFixed(1)}" dy="${li === 0 ? 0 : lblLH.toFixed(1)}">${escapeXml(line)}</tspan>`)
        .join('')
      unit.push(aWrap(`${lblTip}<text x="${ccx.toFixed(1)}" y="${lblStartY.toFixed(1)}" text-anchor="middle" font-size="${lblFS}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${lblSpans}</text>`, itmUrl))
    }

    cells.push(wrapItem(unit.join(''), i, animate, instrument))
  })
  if (animate) cells.unshift(seqSpotlightCSS(items.length, spec, { scale: false }))

  return svg(W, H, theme, spec.title, cells)
}
