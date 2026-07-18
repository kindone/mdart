import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, renderWrappedText, centeredTextY, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items.slice(0, 4)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const W = 500
  const TITLE_H = spec.title ? 28 : 0
  const CELL_W = W / 2
  const CELL_H = 168
  const H = TITLE_H + CELL_H * 2

  const fills   = [`${theme.primary}22`, `${theme.secondary}1a`, `${theme.accent}1a`, `${theme.secondary}22`]
  const strokes = [theme.primary, theme.secondary, theme.accent, theme.secondary]

  let svgContent = ''
  if (spec.title) {
    svgContent += `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(spec.title)}</text>`
  }

  const positions = [[0, 0], [1, 0], [0, 1], [1, 1]]
  items.forEach((item, i) => {
    const unit: string[] = []
    const [col, row] = positions[i]
    const x = col * CELL_W, y = TITLE_H + row * CELL_H
    // Quadrant header carries label only — value/attrs go into the tooltip
    // and " …" cue if present. Children render as bullet rows, so shows.value
    // here means "value is not rendered visibly on the header" (it isn't).
    const { display: itmDisplay, url: itmUrl } = displayLabel(item)
    unit.push(`<rect x="${x}" y="${y}" width="${CELL_W}" height="${CELL_H}" fill="${fills[i]}" stroke="${theme.border}" stroke-width="0.5">${itemTitleTag(item)}</rect>`)
    const headerFit = fitTextToWidthShared([itmDisplay], CELL_W - 24, { maxSize: 12, minSize: 7, maxLines: 2, boxH: 34 })
    unit.push(renderWrappedText(
      x + CELL_W / 2,
      centeredTextY(y + 8, 28, headerFit.results[0].lines.length, headerFit.lineHeight),
      `text-anchor="middle" font-size="${headerFit.fontSize}" fill="${strokes[i]}" ${FONT_SANS_ATTR} font-weight="700"`,
      itmDisplay,
      { ...headerFit.results[0], url: itmUrl },
      headerFit.lineHeight,
      item,
    ))
    item.children.slice(0, 5).forEach((ch, j) => {
      const { display: chDisplay, url: chUrl } = displayLabel(ch)
      const bulletText = `• ${chDisplay}`
      const bulletFit = fitTextToWidthShared([bulletText], CELL_W - 24, { maxSize: 10, minSize: 6.5, maxLines: 2, boxH: 22 })
      unit.push(renderWrappedText(
        x + 12,
        y + 50 + j * 22,
        `font-size="${bulletFit.fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR} opacity="0.85"`,
        bulletText,
        { ...bulletFit.results[0], url: chUrl },
        bulletFit.lineHeight,
        ch,
      ))
    })
    svgContent += wrapItem(unit.join(''), i, animate, instrument)
  })
  // Center axis lines
  svgContent += `<line x1="${W / 2}" y1="${TITLE_H}" x2="${W / 2}" y2="${H}" stroke="${theme.border}" stroke-width="1.5"/>`
  svgContent += `<line x1="0" y1="${TITLE_H + CELL_H}" x2="${W}" y2="${TITLE_H + CELL_H}" stroke="${theme.border}" stroke-width="1.5"/>`
  if (animate) svgContent = seqSpotlightCSS(items.length, spec, { scale: false }) + svgContent

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svgContent}
  </svg>`
}
