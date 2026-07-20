import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, titleEl, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 500
const H = 420
const CX = W / 2
const CY = H / 2 + 10
const INNER_R = 20
const OUTER_R = 170
const SAMPLES = 200
const LABEL_BOX_W = 110
const LABEL_BOX_H = 28

interface SpiralLayout {
  n: number
  turns: number
}

interface SpiralNode {
  item: MdArtItem
  index: number
  theta: number
  x: number
  y: number
  dotR: number
  fill: string
  labelX: number
  anchor: 'start' | 'end'
  display: ReturnType<typeof displayLabel>
}

function resolveLayout(spec: MdArtSpec): SpiralLayout {
  return { n: spec.items.length, turns: spec.items.length <= 4 ? 2 : 2.5 }
}

function radiusAt(theta: number, turns: number): number {
  return INNER_R + (OUTER_R - INNER_R) * theta / (turns * 2 * Math.PI)
}

function placeNodes(spec: MdArtSpec, layout: SpiralLayout, theme: MdArtTheme): SpiralNode[] {
  return spec.items.map((item, index) => {
    const theta = layout.n > 1 ? index * (layout.turns * 2 * Math.PI) / (layout.n - 1) : 0
    const r = radiusAt(theta, layout.turns)
    const x = CX + r * Math.cos(theta)
    const y = CY + r * Math.sin(theta)
    const t = index / (layout.n - 1 || 1)
    const isLast = index === layout.n - 1
    const dotR = isLast ? 9 : 7
    const cosTheta = Math.cos(theta)
    return {
      item,
      index,
      theta,
      x,
      y,
      dotR,
      fill: isLast ? theme.accent : lerpColor(theme.primary, theme.secondary, t),
      labelX: cosTheta >= 0 ? x + dotR + 4 : x - dotR - 4,
      anchor: cosTheta >= 0 ? 'start' : 'end',
      display: displayLabel(item),
    }
  })
}

function renderGuide(layout: SpiralLayout, theme: MdArtTheme): string {
  const points: string[] = []
  for (let sample = 0; sample <= SAMPLES; sample++) {
    const theta = (sample / SAMPLES) * layout.turns * 2 * Math.PI
    const r = radiusAt(theta, layout.turns)
    points.push(`${(CX + r * Math.cos(theta)).toFixed(1)},${(CY + r * Math.sin(theta)).toFixed(1)}`)
  }
  return `<polyline points="${points.join(' ')}" fill="none" stroke="${theme.textMuted}" stroke-width="2" opacity="0.7"/>`
}

function renderNode(node: SpiralNode, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const labelFit = fitTextToWidthShared([node.display.display], LABEL_BOX_W, {
    maxSize: 10,
    minSize: 6.5,
    maxLines: 2,
    boxH: LABEL_BOX_H,
  })
  const { fontSize, lineHeight, results: [{ lines, truncated }] } = labelFit
  const tip = truncated ? `<title>${escapeXml(node.display.display)}</title>` : ''
  const totalH = lines.length * lineHeight
  let label = tip
  lines.forEach((line, lineIndex) => {
    const ty = node.y - totalH / 2 + lineIndex * lineHeight + lineHeight * 0.8
    label += `<text x="${node.labelX.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="${node.anchor}" font-size="${fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(line)}</text>`
  })
  const content = `<circle cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${node.dotR}" fill="${node.fill}">${itemTitleTag(node.item)}</circle>` +
    aWrap(label, node.display.url)
  return wrapItem(content, node.index, animate, instrument)
}

function renderSvg(layout: SpiralLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
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
    spec.title ? titleEl(W, spec.title, theme) : '',
    renderGuide(layout, theme),
    ...nodes.map(node => renderNode(node, theme, animate, instrument)),
  ].filter(Boolean)

  return renderSvg(layout, spec, theme, parts)
}
