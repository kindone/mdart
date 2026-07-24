import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 480
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 10
const BODY_H = 380
const RING_COUNT = 4

interface RadarLayout {
  n: number
  titleH: number
  height: number
  cx: number
  cy: number
  radius: number
  values: number[]
}

interface AxisNode {
  item: MdArtItem
  index: number
  angle: number
  value: number
}

function svg(layout: RadarLayout, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

function parseValue(item: MdArtItem): number {
  const raw = (item.value ?? item.attrs[0] ?? '0').replace('%', '')
  return Math.min(Math.max(parseFloat(raw) || 0, 0), 100) / 100
}

function resolveLayout(spec: MdArtSpec): RadarLayout {
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const height = BODY_H + titleH
  const cx = W / 2
  const cy = titleH + (height - titleH) / 2
  return {
    n: spec.items.length,
    titleH,
    height,
    cx,
    cy,
    radius: Math.min(cx - 80, (height - titleH) / 2 - 44),
    values: spec.items.map(parseValue),
  }
}

function axisNodes(spec: MdArtSpec, layout: RadarLayout): AxisNode[] {
  return spec.items.map((item, index) => ({
    item,
    index,
    value: layout.values[index],
    angle: 2 * Math.PI * index / layout.n - Math.PI / 2,
  }))
}

function point(layout: RadarLayout, angle: number, radius: number): string {
  return `${(layout.cx + radius * Math.cos(angle)).toFixed(1)},${(layout.cy + radius * Math.sin(angle)).toFixed(1)}`
}

function renderGrid(layout: RadarLayout, theme: MdArtTheme, nodes: AxisNode[], animate: boolean, instrument: boolean): string {
  const unit: string[] = []
  for (let ring = 1; ring <= RING_COUNT; ring++) {
    const radius = layout.radius * ring / RING_COUNT
    unit.push(`<polygon points="${nodes.map(node => point(layout, node.angle, radius)).join(' ')}" fill="none" stroke="${theme.border}cc" stroke-width="1"/>`)
    unit.push(`<text x="${layout.cx}" y="${(layout.cy - radius + 3).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.textMuted}" ${FONT_SANS_ATTR} opacity="0.7">${ring * 25}%</text>`)
  }
  const valuePoints = nodes.map(node => point(layout, node.angle, layout.radius * node.value))
  unit.push(`<polygon points="${valuePoints.join(' ')}" fill="${theme.primary}2e" stroke="${theme.primary}" stroke-width="1.8"/>`)
  return wrapItem(unit.join(''), 0, animate, instrument)
}

function labelAnchor(angle: number): 'start' | 'end' | 'middle' {
  return Math.cos(angle) > 0.15 ? 'start' : Math.cos(angle) < -0.15 ? 'end' : 'middle'
}

function labelMaxWidth(x: number, anchor: 'start' | 'end' | 'middle'): number {
  return anchor === 'start' ? Math.max(40, W - x - 4)
    : anchor === 'end' ? Math.max(40, x - 4)
    : Math.max(40, Math.min(x, W - x) * 2 - 8)
}

function renderAxisNode(node: AxisNode, layout: RadarLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const unit: string[] = []
  const [ex, ey] = point(layout, node.angle, layout.radius).split(',')
  unit.push(`<line x1="${layout.cx}" y1="${layout.cy}" x2="${ex}" y2="${ey}" stroke="${theme.border}99" stroke-width="1"/>`)
  const valueRadius = layout.radius * node.value
  const [vx, vy] = point(layout, node.angle, valueRadius).split(',')
  unit.push(`<circle cx="${vx}" cy="${vy}" r="4" fill="${theme.accent}">${itemTitleTag(node.item)}</circle>`)

  const labelRadius = layout.radius + 26
  const lx = layout.cx + labelRadius * Math.cos(node.angle)
  const ly = layout.cy + labelRadius * Math.sin(node.angle)
  const anchor = labelAnchor(node.angle)
  const { display, url } = displayLabel(node.item, { value: true })
  const { fontSize, lineHeight, results: [{ lines, truncated }] } =
    fitTextToWidthShared([display], labelMaxWidth(lx, anchor), { maxSize: 10.5, minSize: 7, maxLines: 2 })
  const tip = truncated ? `<title>${escapeXml(display)}</title>` : ''
  const y = ly - ((lines.length - 1) * lineHeight) / 2 + fontSize * 0.35
  const tspans = lines
    .map((line, lineIndex) => `<tspan x="${lx.toFixed(1)}" dy="${lineIndex === 0 ? 0 : lineHeight.toFixed(1)}">${escapeXml(line)}</tspan>`)
    .join('')
  unit.push(aWrap(`${tip}<text x="${lx.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" font-size="${fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${tspans}</text>`, url))
  return wrapItem(unit.join(''), node.index + 1, animate, instrument)
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length < 3) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layout = resolveLayout(spec)
  const nodes = axisNodes(spec, layout)
  const parts = [
    ...(animate ? [seqSpotlightCSS(layout.n + 1, spec, { scale: false })] : []),
    renderGrid(layout, theme, nodes, animate, instrument),
    ...nodes.map(node => renderAxisNode(node, layout, theme, animate, instrument)),
  ]
  return svg(layout, theme, spec.title, parts)
}
