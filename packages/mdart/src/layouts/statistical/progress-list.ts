import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqMeasureTiming, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument } from '../shared'

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

  const W = 520
  const LABEL_W = 155
  const BAR_X = LABEL_W + 20
  const BAR_W = W - BAR_X - 52
  const BAR_H = 16
  const PAD_V = 8
  const MIN_ROW_H = 40
  const TITLE_H = spec.title ? 30 : 10

  // Pre-compute label fits so row heights are known before rendering.
  // value: true — the bar IS showing the value visually, so no " …" ellipsis.
  const displays = items.map(item => displayLabel(item, { value: true }))
  const labelFits = displays.map(({ display }) =>
    fitTextToWidthShared([display], LABEL_W - 12, { maxSize: 12, minSize: 7, maxLines: 3 })
  )
  // Each row grows to accommodate wrapped label lines; bar stays vertically
  // centred within the row regardless of how many lines the label uses.
  const rowHeights = labelFits.map(fit =>
    Math.max(MIN_ROW_H, PAD_V * 2 + fit.results[0].lines.length * fit.lineHeight)
  )
  const rowYs: number[] = []
  let cursorY = TITLE_H
  for (const h of rowHeights) { rowYs.push(cursorY); cursorY += h }
  const H = cursorY + 12

  const rows: string[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const rowY = rowYs[i]
    const rowH = rowHeights[i]
    // Centre the bar vertically in the row
    const barY = rowY + Math.round((rowH - BAR_H) / 2)

    const raw = (item.value ?? item.attrs[0] ?? '0').replace('%', '')
    const num = parseFloat(raw)
    const pct = isNaN(num) ? 0 : num > 1 ? Math.min(num, 100) : num * 100
    const fillW = Math.max(0, BAR_W * pct / 100)
    const fillWidth = fillW.toFixed(1)
    const { delayMs, durationMs } = seqMeasureTiming(items.length, spec, i)
    const widthAnim = animate
      ? `<animate attributeName="width" from="0" to="${fillWidth}" begin="${delayMs}ms" dur="${durationMs}ms" fill="freeze"/>`
      : ''

    const barColor = pct >= 70 ? theme.accent : pct >= 40 ? theme.warning : theme.danger

    const { display: itmDisplay, url: itmUrl } = displays[i]
    const { fontSize: lblFS, lineHeight: lblLH, results: [{ lines: lblLines, truncated: lblTruncated }] } = labelFits[i]
    const lblTip = lblTruncated ? `<title>${escapeXml(itmDisplay)}</title>` : ''
    // Vertically centre the multi-line label block alongside the bar.
    const lblStartY = rowY + rowH / 2 - ((lblLines.length - 1) * lblLH) / 2 + lblFS * 0.35
    const lblSpans = lblLines
      .map((line, li) => `<tspan x="${LABEL_W}" dy="${li === 0 ? 0 : lblLH.toFixed(1)}">${escapeXml(line)}</tspan>`)
      .join('')

    const unit = [
      `<rect x="${BAR_X}" y="${barY}" width="${BAR_W}" height="${BAR_H}" rx="8" fill="${theme.muted}33">${itemTitleTag(item)}</rect>`,
      `<rect class="mdart-bar-grow" x="${BAR_X}" y="${barY}" width="${animate ? 0 : fillWidth}" height="${BAR_H}" rx="8" fill="${barColor}">${itemTitleTag(item)}${widthAnim}</rect>`,
      aWrap(`${lblTip}<text x="${LABEL_W}" y="${lblStartY.toFixed(1)}" text-anchor="end" font-size="${lblFS}" fill="${theme.text}" font-family="system-ui,sans-serif">${lblSpans}</text>`, itmUrl),
      `<text x="${BAR_X + BAR_W + 8}" y="${(barY + BAR_H - 3).toFixed(1)}" font-size="11" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${pct % 1 === 0 ? pct : pct.toFixed(1)}%</text>`,
    ].join('')
    rows.push(wrapItem(unit, i, animate, instrument))
  }
  if (animate) rows.unshift(seqSpotlightCSS(items.length, spec, { scale: false }))

  return svg(W, H, theme, spec.title, rows)
}
