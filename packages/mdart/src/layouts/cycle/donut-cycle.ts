import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, renderEmpty, itemTitleTag, displayLabel, shouldAnimate, shouldInstrument, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, FONT_SANS_ATTR } from '../shared'

const W = 400
const H = 360
const CX = W / 2
const CY = H / 2
const OUTER_R = 140
const INNER_R = 70
const GAP_ANGLE = 0.03
const WEDGE_WIDTH_SCALE = 0.85
const WEDGE_HEIGHT_SCALE = 0.7

interface DonutLayout {
  n: number
  labelR: number
  boxW: number
  boxH: number
}

interface DonutSegment {
  item: MdArtItem
  index: number
  startAngle: number
  endAngle: number
  midAngle: number
  fill: string
  labelX: number
  labelY: number
  display: ReturnType<typeof displayLabel>
}

function resolveLayout(spec: MdArtSpec): DonutLayout {
  const n = spec.items.length
  const angleSpan = (2 * Math.PI) / n - GAP_ANGLE
  const labelR = (OUTER_R + INNER_R) / 2
  return {
    n,
    labelR,
    boxW: Math.max(20, 2 * labelR * Math.sin(angleSpan / 2) * WEDGE_WIDTH_SCALE),
    boxH: Math.max(16, (OUTER_R - INNER_R) * WEDGE_HEIGHT_SCALE),
  }
}

function placeSegments(spec: MdArtSpec, layout: DonutLayout, theme: MdArtTheme): DonutSegment[] {
  return spec.items.map((item, index) => {
    const startAngle = (2 * Math.PI * index) / layout.n - Math.PI / 2 + GAP_ANGLE / 2
    const endAngle = (2 * Math.PI * (index + 1)) / layout.n - Math.PI / 2 - GAP_ANGLE / 2
    const midAngle = (startAngle + endAngle) / 2
    const t = index / (layout.n - 1 || 1)
    return {
      item,
      index,
      startAngle,
      endAngle,
      midAngle,
      fill: lerpColor(theme.secondary, theme.primary, t),
      labelX: CX + layout.labelR * Math.cos(midAngle),
      labelY: CY + layout.labelR * Math.sin(midAngle),
      display: displayLabel(item, { value: true }),
    }
  })
}

function segmentPath(segment: DonutSegment): string {
  const x1 = CX + INNER_R * Math.cos(segment.startAngle)
  const y1 = CY + INNER_R * Math.sin(segment.startAngle)
  const x2 = CX + OUTER_R * Math.cos(segment.startAngle)
  const y2 = CY + OUTER_R * Math.sin(segment.startAngle)
  const x3 = CX + OUTER_R * Math.cos(segment.endAngle)
  const y3 = CY + OUTER_R * Math.sin(segment.endAngle)
  const x4 = CX + INNER_R * Math.cos(segment.endAngle)
  const y4 = CY + INNER_R * Math.sin(segment.endAngle)
  const largeArc = segment.endAngle - segment.startAngle > Math.PI ? 1 : 0
  return `M ${x1} ${y1} L ${x2} ${y2} A ${OUTER_R} ${OUTER_R} 0 ${largeArc} 1 ${x3} ${y3} L ${x4} ${y4} A ${INNER_R} ${INNER_R} 0 ${largeArc} 0 ${x1} ${y1} Z`
}

function renderSegment(segment: DonutSegment, layout: DonutLayout, animate: boolean, instrument: boolean, theme: MdArtTheme): string {
  const fit = fitLabelValueBlock(segment.display.display, segment.item.value, layout.boxW, layout.boxH, {
    labelUrl: segment.display.url,
    labelMaxSize: 10,
    labelMinSize: 6.5,
    labelMaxLines: 2,
    labelMaxLinesNoValue: 3,
    valueMaxSize: 8,
    valueMinSize: 6,
    valueMaxLines: 1,
    gap: 2,
  })
  return `<g${animate ? ` class="mdart-n${segment.index}"` : ''}${instrument ? ` data-item-index="${segment.index}"` : ''}>` +
    `<path d="${segmentPath(segment)}" fill="${segment.fill}28" stroke="${segment.fill}" stroke-width="1">${itemTitleTag(segment.item)}</path>` +
    renderFitBlock(segment.labelX, segment.labelY, fit, {
      labelFullText: segment.display.display,
      valueFullText: segment.item.value,
      labelFill: theme.text,
      valueFill: theme.text,
      labelWeight: '600',
      valueExtraAttrs: 'opacity="0.85"',
    }) +
    `</g>`
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  if (!spec.title) return ''
  return `<text x="${CX}" y="${CY + 5}" text-anchor="middle" font-size="12" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(spec.title)}</text>`
}

function renderSvg(layout: DonutLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  const animate = shouldAnimate(spec)
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${animate ? seqSpotlightCSS(layout.n, spec) : ''}
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)

  const layout = resolveLayout(spec)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const segments = placeSegments(spec, layout, theme)
  const parts = [
    ...segments.map(segment => renderSegment(segment, layout, animate, instrument, theme)),
    renderTitle(spec, theme),
  ].filter(Boolean)

  return renderSvg(layout, spec, theme, parts)
}
