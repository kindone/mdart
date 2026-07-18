import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqMeasureTiming, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

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

  const W = 520, LABEL_W = 150, BAR_X = LABEL_W + 16
  const BAR_W = W - BAR_X - 48, BAR_H = 18
  const PAD_V = 8, MIN_ROW_H = 46
  const TITLE_H = spec.title ? 30 : 10

  // Pre-compute label fits so row heights grow with wrapped text.
  // value: true + attrs: true — bar shows value; attrs used as target marker.
  const displays = items.map(item => displayLabel(item, { value: true, attrs: true }))
  const labelFits = displays.map(({ display }) =>
    fitTextToWidthShared([display], LABEL_W - 12, { maxSize: 11, minSize: 7, maxLines: 3 })
  )
  const rowHeights = labelFits.map(fit =>
    Math.max(MIN_ROW_H, PAD_V * 2 + fit.results[0].lines.length * fit.lineHeight)
  )
  const rowYs: number[] = []
  let cursorY = TITLE_H
  for (const h of rowHeights) { rowYs.push(cursorY); cursorY += h }
  const H = cursorY + 12

  const parts: string[] = []

  items.forEach((item, i) => {
    const unit: string[] = []
    const rowY = rowYs[i]
    const rowH = rowHeights[i]
    const midY = rowY + rowH / 2
    const barY = midY - BAR_H / 2

    const numericAttrs = item.attrs.filter(a => /^\d/.test(a.trim()))
    const raw = (item.value ?? numericAttrs[0] ?? '0').replace('%', '')
    const val = Math.min(parseFloat(raw) || 0, 100) / 100
    const targetRaw = item.value ? numericAttrs[0] : numericAttrs[1]
    const target = targetRaw ? Math.min(parseFloat(targetRaw.replace('%', '')) || 0, 100) / 100 : null

    unit.push(`<rect class="mdart-no-glow" x="${BAR_X}" y="${barY.toFixed(1)}" width="${BAR_W}" height="${BAR_H}" rx="3" fill="${theme.muted}40">${itemTitleTag(item)}</rect>`)
    unit.push(`<rect class="mdart-no-glow" x="${BAR_X}" y="${barY.toFixed(1)}" width="${(BAR_W * 0.7).toFixed(1)}" height="${BAR_H}" rx="3" fill="${theme.muted}5a"/>`)
    unit.push(`<rect class="mdart-no-glow" x="${BAR_X}" y="${barY.toFixed(1)}" width="${(BAR_W * 0.4).toFixed(1)}" height="${BAR_H}" rx="3" fill="${theme.muted}80"/>`)

    const actH = BAR_H * 0.6, actY = barY + (BAR_H - actH) / 2
    const barColor = val >= 0.7 ? theme.accent : val >= 0.4 ? theme.warning : theme.danger
    const actualWidth = (BAR_W * val).toFixed(1)
    const { delayMs, durationMs } = seqMeasureTiming(items.length, spec, i)
    const widthAnim = animate
      ? `<animate attributeName="width" from="0" to="${actualWidth}" begin="${delayMs}ms" dur="${durationMs}ms" fill="freeze"/>`
      : ''
    unit.push(`<rect class="mdart-bar-grow" x="${BAR_X}" y="${actY.toFixed(1)}" width="${animate ? 0 : actualWidth}" height="${actH.toFixed(1)}" rx="2" fill="${barColor}">${widthAnim}</rect>`)

    if (target !== null) {
      const tx = BAR_X + BAR_W * target
      unit.push(`<rect class="mdart-no-glow" x="${(tx - 1.5).toFixed(1)}" y="${barY.toFixed(1)}" width="3" height="${BAR_H}" rx="1" fill="${theme.text}cc"/>`)
    }

    const { display: itmDisplay, url: itmUrl } = displays[i]
    const { fontSize: lblFS, lineHeight: lblLH, results: [{ lines: lblLines, truncated: lblTruncated }] } = labelFits[i]
    const lblTip = lblTruncated ? `<title>${escapeXml(itmDisplay)}</title>` : ''
    // Vertically centre multi-line label alongside the bar
    const lblStartY = midY - ((lblLines.length - 1) * lblLH) / 2 + lblFS * 0.35
    const lblSpans = lblLines
      .map((line, li) => `<tspan x="${LABEL_W}" dy="${li === 0 ? 0 : lblLH.toFixed(1)}">${escapeXml(line)}</tspan>`)
      .join('')
    unit.push(aWrap(`${lblTip}<text class="mdart-glow-text" x="${LABEL_W}" y="${lblStartY.toFixed(1)}" text-anchor="end" font-size="${lblFS}" fill="${theme.text}" ${FONT_SANS_ATTR}>${lblSpans}</text>`, itmUrl))
    unit.push(`<text x="${BAR_X + BAR_W + 8}" y="${(midY + 4).toFixed(1)}" font-size="10" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${Math.round(val * 100)}%</text>`)
    parts.push(wrapItem(unit.join(''), i, animate, instrument))
  })
  if (animate) parts.unshift(seqSpotlightCSS(items.length, spec, { scale: false }))

  return svg(W, H, theme, spec.title, parts)
}
