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

  const n = items.length
  const GW = n <= 1 ? 240 : n <= 2 ? 220 : n <= 3 ? 180 : 150
  const GH = GW * 0.62
  const TITLE_H = spec.title ? 30 : 10

  // Pre-compute label fits for all gauges so H can account for the tallest.
  // value: true — the dial already shows the numeric value, suppress " …".
  const displays = items.map(item => displayLabel(item, { value: true }))
  const labelFits = displays.map(({ display }) =>
    fitTextToWidthShared([display], GW - 16, { maxSize: 10, minSize: 6.5, maxLines: 2 })
  )
  const maxLblH = Math.max(...labelFits.map(f => f.results[0].lines.length * f.lineHeight))
  const LBL_ZONE = Math.max(28, Math.ceil(maxLblH) + 10)

  const W = n * GW, H = TITLE_H + GH + LBL_ZONE
  const parts: string[] = []

  items.forEach((item, i) => {
    const unit: string[] = []
    const cx = GW * i + GW / 2, cy = TITLE_H + GH * 0.88
    const R = GW * 0.37, SW = R * 0.17

    const raw = (item.value ?? item.attrs[0] ?? '0').replace('%', '')
    const val = Math.min(Math.max(parseFloat(raw) || 0, 0), 100) / 100
    const pct = Math.round(val * 100)
    const { delayMs, durationMs } = seqMeasureTiming(n, spec, i)

    const lx = cx - R, rx = cx + R
    unit.push(`<path d="M${lx},${cy} A${R},${R} 0 0,1 ${rx},${cy}" fill="none" stroke="${theme.muted}44" stroke-width="${SW}" stroke-linecap="round"/>`)

    if (val > 0) {
      const angle = Math.PI * (1 - val)
      const ex = cx + R * Math.cos(angle), ey = cy - R * Math.sin(angle)
      const largeArc = 0
      const col = val >= 0.7 ? theme.accent : val >= 0.4 ? theme.warning : theme.danger
      const markerPoints = Array.from({ length: 9 }, (_, p) => {
        const t = p / 8
        const a = Math.PI * (1 - val * t)
        return {
          x: (cx + R * Math.cos(a)).toFixed(1),
          y: (cy - R * Math.sin(a)).toFixed(1),
        }
      })
      const markerXs = markerPoints.map(p => p.x).join(';')
      const markerYs = markerPoints.map(p => p.y).join(';')
      if (animate) {
        unit.push(`<path class="mdart-gauge-arc mdart-glow-stroke" opacity="0" visibility="hidden" pathLength="1" d="M${lx},${cy} A${R},${R} 0 ${largeArc},1 ${ex.toFixed(1)},${ey.toFixed(1)}" fill="none" stroke="${col}" stroke-width="${SW}" stroke-linecap="butt" stroke-dasharray="1" stroke-dashoffset="1"><set attributeName="visibility" to="visible" begin="${delayMs}ms" fill="freeze"/><set attributeName="opacity" to="1" begin="${delayMs}ms" fill="freeze"/><animate attributeName="stroke-dashoffset" from="1" to="0" begin="${delayMs}ms" dur="${durationMs}ms" fill="freeze"/></path>`)
        unit.push(`<circle class="mdart-start-tip" opacity="0" visibility="hidden" cx="${markerPoints[0].x}" cy="${markerPoints[0].y}" r="${(SW / 2).toFixed(1)}" fill="${col}"><set attributeName="visibility" to="visible" begin="${delayMs}ms" fill="freeze"/><set attributeName="opacity" to="1" begin="${delayMs}ms" fill="freeze"/></circle>`)
        unit.push(`<circle class="mdart-moving-tip" opacity="0" visibility="hidden" cx="${markerPoints[0].x}" cy="${markerPoints[0].y}" r="${(SW / 2).toFixed(1)}" fill="${col}"><set attributeName="visibility" to="visible" begin="${delayMs}ms" fill="freeze"/><set attributeName="opacity" to="1" begin="${delayMs}ms" fill="freeze"/><animate attributeName="cx" values="${markerXs}" begin="${delayMs}ms" dur="${durationMs}ms" fill="freeze"/><animate attributeName="cy" values="${markerYs}" begin="${delayMs}ms" dur="${durationMs}ms" fill="freeze"/></circle>`)
      } else {
        unit.push(`<path d="M${lx},${cy} A${R},${R} 0 ${largeArc},1 ${ex.toFixed(1)},${ey.toFixed(1)}" fill="none" stroke="${col}" stroke-width="${SW}" stroke-linecap="round"/>`)
      }
    }

    const fs = Math.max(16, Math.round(GW * 0.15))
    if (animate) {
      const steps = Array.from(new Set([0, 0.25, 0.5, 0.75, 1].map(t => Math.round(pct * t))))
      const stepDur = Math.max(120, Math.round(durationMs / steps.length))
      const fadeDur = Math.min(180, Math.max(80, Math.round(stepDur * 0.45)))
      steps.forEach((step, j) => {
        const begin = delayMs + j * stepDur
        const isLast = j === steps.length - 1
        const anim = isLast
          ? `<animate attributeName="opacity" from="0" to="1" begin="${Math.max(delayMs, begin - fadeDur)}ms" dur="${fadeDur}ms" fill="freeze"/>`
          : `<animate attributeName="opacity" from="0" to="1" begin="${Math.max(delayMs, begin - fadeDur)}ms" dur="${fadeDur}ms" fill="freeze"/><animate attributeName="opacity" from="1" to="0" begin="${begin + stepDur - fadeDur}ms" dur="${fadeDur}ms" fill="freeze"/>`
        unit.push(`<text class="mdart-counter-step" opacity="0" x="${cx}" y="${(cy - 6).toFixed(1)}" text-anchor="middle" font-size="${fs}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${anim}${step}%</text>`)
      })
    } else {
      unit.push(`<text x="${cx}" y="${(cy - 6).toFixed(1)}" text-anchor="middle" font-size="${fs}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${pct}%</text>`)
    }

    // Per-gauge label fitting: long names wrap to 2 lines rather than truncate.
    const { display: itmDisplay, url: itmUrl } = displays[i]
    const { fontSize: lblFS, lineHeight: lblLH, results: [{ lines: lblLines, truncated: lblTruncated }] } = labelFits[i]
    const lblTip = lblTruncated ? `<title>${escapeXml(itmDisplay)}</title>` : ''
    const lblStartY = cy + 16  // first baseline just below the dial
    const lblSpans = lblLines
      .map((line, li) => `<tspan x="${cx.toFixed(1)}" dy="${li === 0 ? 0 : lblLH.toFixed(1)}">${escapeXml(line)}</tspan>`)
      .join('')
    unit.push(aWrap(`${lblTip}<text x="${cx.toFixed(1)}" y="${lblStartY.toFixed(1)}" text-anchor="middle" font-size="${lblFS}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${itemTitleTag(item)}${lblSpans}</text>`, itmUrl))

    parts.push(wrapItem(unit.join(''), i, animate, instrument))
  })
  if (animate) parts.unshift(seqSpotlightCSS(n, spec, { scale: false }))

  return svg(W, H, theme, spec.title, parts)
}
