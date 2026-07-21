import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqMeasureTiming, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 10

interface GaugeLayout {
  n: number
  gaugeW: number
  gaugeH: number
  titleH: number
  width: number
  height: number
  labelZoneH: number
  labelFits: Array<ReturnType<typeof fitTextToWidthShared>>
  labels: Array<ReturnType<typeof displayLabel>>
}

interface GaugeNode {
  item: MdArtItem
  index: number
  cx: number
  cy: number
  radius: number
  strokeW: number
  value: number
  pct: number
  color: string
}

interface ArcPoint {
  x: string
  y: string
}

function svg(layout: GaugeLayout, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${layout.width / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${layout.width} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

function parseValue(item: MdArtItem): number {
  const raw = (item.value ?? item.attrs[0] ?? '0').replace('%', '')
  return Math.min(Math.max(parseFloat(raw) || 0, 0), 100) / 100
}

function colorForValue(value: number, theme: MdArtTheme): string {
  return value >= 0.7 ? theme.accent : value >= 0.4 ? theme.warning : theme.danger
}

function resolveLayout(spec: MdArtSpec): GaugeLayout {
  const n = spec.items.length
  const gaugeW = n <= 1 ? 240 : n <= 2 ? 220 : n <= 3 ? 180 : 150
  const gaugeH = gaugeW * 0.62
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const labels = spec.items.map(item => displayLabel(item, { value: true }))
  const labelFits = labels.map(({ display }) =>
    fitTextToWidthShared([display], gaugeW - 16, { maxSize: 10, minSize: 6.5, maxLines: 2 })
  )
  const maxLabelH = Math.max(...labelFits.map(fit => fit.results[0].lines.length * fit.lineHeight))
  const labelZoneH = Math.max(28, Math.ceil(maxLabelH) + 10)
  return {
    n,
    gaugeW,
    gaugeH,
    titleH,
    width: n * gaugeW,
    height: titleH + gaugeH + labelZoneH,
    labelZoneH,
    labelFits,
    labels,
  }
}

function placeGauge(item: MdArtItem, index: number, layout: GaugeLayout, theme: MdArtTheme): GaugeNode {
  const value = parseValue(item)
  const radius = layout.gaugeW * 0.37
  return {
    item,
    index,
    cx: layout.gaugeW * index + layout.gaugeW / 2,
    cy: layout.titleH + layout.gaugeH * 0.88,
    radius,
    strokeW: radius * 0.17,
    value,
    pct: Math.round(value * 100),
    color: colorForValue(value, theme),
  }
}

function endpoint(node: GaugeNode): { x: number, y: number } {
  const angle = Math.PI * (1 - node.value)
  return {
    x: node.cx + node.radius * Math.cos(angle),
    y: node.cy - node.radius * Math.sin(angle),
  }
}

function markerPoints(node: GaugeNode): ArcPoint[] {
  return Array.from({ length: 9 }, (_, point) => {
    const t = point / 8
    const angle = Math.PI * (1 - node.value * t)
    return {
      x: (node.cx + node.radius * Math.cos(angle)).toFixed(1),
      y: (node.cy - node.radius * Math.sin(angle)).toFixed(1),
    }
  })
}

function renderTrack(node: GaugeNode, theme: MdArtTheme): string {
  return `<path d="M${node.cx - node.radius},${node.cy} A${node.radius},${node.radius} 0 0,1 ${node.cx + node.radius},${node.cy}" fill="none" stroke="${theme.muted}44" stroke-width="${node.strokeW}" stroke-linecap="round"/>`
}

function renderValueArc(node: GaugeNode, timing: { delayMs: number, durationMs: number }, animate: boolean): string {
  if (node.value <= 0) return ''
  const end = endpoint(node)
  const lx = node.cx - node.radius
  const points = markerPoints(node)
  if (!animate) {
    return `<path d="M${lx},${node.cy} A${node.radius},${node.radius} 0 0,1 ${end.x.toFixed(1)},${end.y.toFixed(1)}" fill="none" stroke="${node.color}" stroke-width="${node.strokeW}" stroke-linecap="round"/>`
  }
  const markerXs = points.map(p => p.x).join(';')
  const markerYs = points.map(p => p.y).join(';')
  const tipR = (node.strokeW / 2).toFixed(1)
  return `<path class="mdart-gauge-arc mdart-glow-stroke" opacity="0" visibility="hidden" pathLength="1" d="M${lx},${node.cy} A${node.radius},${node.radius} 0 0,1 ${end.x.toFixed(1)},${end.y.toFixed(1)}" fill="none" stroke="${node.color}" stroke-width="${node.strokeW}" stroke-linecap="butt" stroke-dasharray="1" stroke-dashoffset="1"><set attributeName="visibility" to="visible" begin="${timing.delayMs}ms" fill="freeze"/><set attributeName="opacity" to="1" begin="${timing.delayMs}ms" fill="freeze"/><animate attributeName="stroke-dashoffset" from="1" to="0" begin="${timing.delayMs}ms" dur="${timing.durationMs}ms" fill="freeze"/></path>`
    + `<circle class="mdart-start-tip" opacity="0" visibility="hidden" cx="${points[0].x}" cy="${points[0].y}" r="${tipR}" fill="${node.color}"><set attributeName="visibility" to="visible" begin="${timing.delayMs}ms" fill="freeze"/><set attributeName="opacity" to="1" begin="${timing.delayMs}ms" fill="freeze"/></circle>`
    + `<circle class="mdart-moving-tip" opacity="0" visibility="hidden" cx="${points[0].x}" cy="${points[0].y}" r="${tipR}" fill="${node.color}"><set attributeName="visibility" to="visible" begin="${timing.delayMs}ms" fill="freeze"/><set attributeName="opacity" to="1" begin="${timing.delayMs}ms" fill="freeze"/><animate attributeName="cx" values="${markerXs}" begin="${timing.delayMs}ms" dur="${timing.durationMs}ms" fill="freeze"/><animate attributeName="cy" values="${markerYs}" begin="${timing.delayMs}ms" dur="${timing.durationMs}ms" fill="freeze"/></circle>`
}

function renderCounter(node: GaugeNode, layout: GaugeLayout, timing: { delayMs: number, durationMs: number }, theme: MdArtTheme, animate: boolean): string {
  const fontSize = Math.max(16, Math.round(layout.gaugeW * 0.15))
  if (!animate) {
    return `<text x="${node.cx}" y="${(node.cy - 6).toFixed(1)}" text-anchor="middle" font-size="${fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${node.pct}%</text>`
  }
  const steps = Array.from(new Set([0, 0.25, 0.5, 0.75, 1].map(t => Math.round(node.pct * t))))
  const stepDur = Math.max(120, Math.round(timing.durationMs / steps.length))
  const fadeDur = Math.min(180, Math.max(80, Math.round(stepDur * 0.45)))
  return steps.map((step, index) => {
    const begin = timing.delayMs + index * stepDur
    const isLast = index === steps.length - 1
    const fadeInBegin = Math.max(timing.delayMs, begin - fadeDur)
    const anim = isLast
      ? `<animate attributeName="opacity" from="0" to="1" begin="${fadeInBegin}ms" dur="${fadeDur}ms" fill="freeze"/>`
      : `<animate attributeName="opacity" from="0" to="1" begin="${fadeInBegin}ms" dur="${fadeDur}ms" fill="freeze"/><animate attributeName="opacity" from="1" to="0" begin="${begin + stepDur - fadeDur}ms" dur="${fadeDur}ms" fill="freeze"/>`
    return `<text class="mdart-counter-step" opacity="0" x="${node.cx}" y="${(node.cy - 6).toFixed(1)}" text-anchor="middle" font-size="${fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${anim}${step}%</text>`
  }).join('')
}

function renderLabel(node: GaugeNode, layout: GaugeLayout, theme: MdArtTheme): string {
  const label = layout.labels[node.index]
  const fit = layout.labelFits[node.index]
  const { fontSize, lineHeight, results: [{ lines, truncated }] } = fit
  const tip = truncated ? `<title>${escapeXml(label.display)}</title>` : ''
  const tspans = lines
    .map((line, lineIndex) => `<tspan x="${node.cx.toFixed(1)}" dy="${lineIndex === 0 ? 0 : lineHeight.toFixed(1)}">${escapeXml(line)}</tspan>`)
    .join('')
  return aWrap(`${tip}<text x="${node.cx.toFixed(1)}" y="${(node.cy + 16).toFixed(1)}" text-anchor="middle" font-size="${fontSize}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${itemTitleTag(node.item)}${tspans}</text>`, label.url)
}

function renderGauge(node: GaugeNode, layout: GaugeLayout, spec: MdArtSpec, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const timing = seqMeasureTiming(layout.n, spec, node.index)
  const unit = [
    renderTrack(node, theme),
    renderValueArc(node, timing, animate),
    renderCounter(node, layout, timing, theme, animate),
    renderLabel(node, layout, theme),
  ]
  return wrapItem(unit.join(''), node.index, animate, instrument)
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layout = resolveLayout(spec)
  const parts = [
    ...(animate ? [seqSpotlightCSS(layout.n, spec, { scale: false })] : []),
    ...spec.items.map((item, index) => renderGauge(placeGauge(item, index, layout, theme), layout, spec, theme, animate, instrument)),
  ]
  return svg(layout, theme, spec.title, parts)
}
