import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, renderEmpty, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, wrapLabel, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 440
const H = 380
const CX = W / 2
const CY = H / 2
const OUTER_R = 120
const INNER_R = 60
const LABEL_R = OUTER_R + 20
const CONNECTOR_R = OUTER_R + 5
const GAP_ANGLE = 0.03
const LABEL_BOX_W = 92
// Taller than a short label+value pair strictly needs, because this shape
// is specifically recommended (see docs/mdart.md) for longer labels/values
// at higher item counts — its whole selling point over `default`/`donut`
// is that label space doesn't shrink as N grows, so it should actually let
// multi-line values through instead of hard-capping at one line.
const LABEL_BOX_H = 60
const TITLE_BOX_W = INNER_R * 1.7

interface SegmentedLayout {
  n: number
}

interface SegmentedNode {
  item: MdArtItem
  index: number
  startAngle: number
  endAngle: number
  midAngle: number
  labelX: number
  labelY: number
  connectorX: number
  connectorY: number
  anchor: 'start' | 'middle' | 'end'
  fill: string
  display: ReturnType<typeof displayLabel>
}

function resolveLayout(spec: MdArtSpec): SegmentedLayout {
  return { n: spec.items.length }
}

function placeNodes(spec: MdArtSpec, layout: SegmentedLayout, theme: MdArtTheme): SegmentedNode[] {
  return spec.items.map((item, index) => {
    const startAngle = (2 * Math.PI * index) / layout.n - Math.PI / 2 + GAP_ANGLE / 2
    const endAngle = (2 * Math.PI * (index + 1)) / layout.n - Math.PI / 2 - GAP_ANGLE / 2
    const midAngle = (startAngle + endAngle) / 2
    const cosA = Math.cos(midAngle)
    const t = index / (layout.n - 1 || 1)
    return {
      item,
      index,
      startAngle,
      endAngle,
      midAngle,
      labelX: CX + LABEL_R * Math.cos(midAngle),
      labelY: CY + LABEL_R * Math.sin(midAngle),
      connectorX: CX + CONNECTOR_R * Math.cos(midAngle),
      connectorY: CY + CONNECTOR_R * Math.sin(midAngle),
      anchor: cosA > 0.3 ? 'start' : cosA < -0.3 ? 'end' : 'middle',
      fill: lerpColor(theme.secondary, theme.primary, t),
      display: displayLabel(item, { value: true }),
    }
  })
}

function segmentPath(node: SegmentedNode): string {
  const x1 = CX + INNER_R * Math.cos(node.startAngle)
  const y1 = CY + INNER_R * Math.sin(node.startAngle)
  const x2 = CX + OUTER_R * Math.cos(node.startAngle)
  const y2 = CY + OUTER_R * Math.sin(node.startAngle)
  const x3 = CX + OUTER_R * Math.cos(node.endAngle)
  const y3 = CY + OUTER_R * Math.sin(node.endAngle)
  const x4 = CX + INNER_R * Math.cos(node.endAngle)
  const y4 = CY + INNER_R * Math.sin(node.endAngle)
  const largeArc = node.endAngle - node.startAngle > Math.PI ? 1 : 0
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)} A ${OUTER_R} ${OUTER_R} 0 ${largeArc} 1 ${x3.toFixed(1)} ${y3.toFixed(1)} L ${x4.toFixed(1)} ${y4.toFixed(1)} A ${INNER_R} ${INNER_R} 0 ${largeArc} 0 ${x1.toFixed(1)} ${y1.toFixed(1)} Z`
}

function renderText(node: SegmentedNode, theme: MdArtTheme): string {
  const fit = fitLabelValueBlock(node.display.display, node.item.value, LABEL_BOX_W, LABEL_BOX_H, {
    labelUrl: node.display.url,
    labelMaxSize: 10,
    labelMinSize: 6.5,
    labelMaxLines: 2,
    labelMaxLinesNoValue: 3,
    valueMaxSize: 9,
    valueMinSize: 6.5,
    valueMaxLines: 4,
    valueShare: 0.6,
    gap: 2,
  })
  return renderFitBlock(node.labelX, node.labelY, fit, {
    labelFullText: node.display.display,
    valueFullText: node.item.value,
    labelFill: theme.text,
    valueFill: theme.textMuted,
    labelWeight: '600',
    anchor: node.anchor,
  })
}

function renderNode(node: SegmentedNode, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const content = `<path d="${segmentPath(node)}" fill="${node.fill}28" stroke="${node.fill}" stroke-width="1">${itemTitleTag(node.item)}</path>` +
    `<line x1="${node.connectorX.toFixed(1)}" y1="${node.connectorY.toFixed(1)}" x2="${node.labelX.toFixed(1)}" y2="${node.labelY.toFixed(1)}" stroke="${node.fill}" stroke-width="1" opacity="0.7"/>` +
    renderText(node, theme)
  return wrapItem(content, node.index, animate, instrument)
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  if (!spec.title) return ''
  const FS = 12
  const LH = 14
  // Title sits in the empty hub inside INNER_R — wrap so a longer title
  // doesn't silently overflow past the ring (there's no clipping, so an
  // unwrapped long title would just bleed outward under the segments).
  const { lines } = wrapLabel(spec.title, Math.floor(TITLE_BOX_W / 6), 3)
  const startY = CY + 5 - ((lines.length - 1) * LH) / 2
  const tspans = lines.map((line, i) => `<tspan x="${CX}" dy="${i === 0 ? 0 : LH}">${escapeXml(line)}</tspan>`).join('')
  return `<text x="${CX}" y="${startY.toFixed(1)}" text-anchor="middle" font-size="${FS}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${tspans}</text>`
}

function renderSvg(layout: SegmentedLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
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
  const nodes = placeNodes(spec, layout, theme)
  const parts = [
    renderTitle(spec, theme),
    ...nodes.map(node => renderNode(node, theme, animate, instrument)),
  ].filter(Boolean)

  return renderSvg(layout, spec, theme, parts)
}
