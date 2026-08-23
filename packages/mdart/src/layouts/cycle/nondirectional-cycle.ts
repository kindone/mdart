import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, renderEmpty, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, roundTextBox, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 440
const H = 400
const CX = W / 2
const CY = H / 2
const TRACK_R = 145
const NODE_R = 22
const TRACK_STROKE = 14

interface CycleNode {
  item: MdArtItem
  index: number
  x: number
  y: number
  fill: string
  display: ReturnType<typeof displayLabel>
}

function angleFor(index: number, n: number): number {
  return (2 * Math.PI * index) / n - Math.PI / 2
}

function placeNodes(spec: MdArtSpec, theme: MdArtTheme): CycleNode[] {
  return spec.items.map((item, index) => {
    const angle = angleFor(index, spec.items.length)
    const t = index / (spec.items.length - 1 || 1)
    return {
      item,
      index,
      x: CX + TRACK_R * Math.cos(angle),
      y: CY + TRACK_R * Math.sin(angle),
      fill: lerpColor(theme.primary, theme.secondary, t),
      display: displayLabel(item, { value: true }),
    }
  })
}

function renderTrack(theme: MdArtTheme): string {
  return `<circle cx="${CX}" cy="${CY}" r="${TRACK_R}" fill="none" stroke="${theme.textMuted}" stroke-width="${TRACK_STROKE}" opacity="0.45"/>`
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  if (!spec.title) return ''
  return `<text x="${CX}" y="${CY + 5}" text-anchor="middle" font-size="12" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${escapeXml(spec.title)}</text>`
}

function renderNode(node: CycleNode, animate: boolean, instrument: boolean, theme: MdArtTheme): string {
  const { w: nodeBoxW, h: nodeBoxH } = roundTextBox(NODE_R)
  const fit = fitLabelValueBlock(node.display.display, node.item.value, nodeBoxW, nodeBoxH, {
    labelUrl: node.display.url,
    labelMaxSize: 9,
    labelMinSize: 6.5,
    labelMaxLines: 2,
    valueMaxSize: 8,
    valueMinSize: 6,
  })
  const content = `<circle cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${NODE_R}" fill="${theme.bg}"/>` +
    `<circle cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${NODE_R}" fill="${node.fill}28" stroke="${node.fill}" stroke-width="1.5">${itemTitleTag(node.item)}</circle>` +
    renderFitBlock(node.x, node.y, fit, {
      labelFullText: node.display.display,
      valueFullText: node.item.value ?? undefined,
      labelFill: theme.text,
      valueFill: theme.text,
      labelWeight: '600',
      valueWeight: '400',
      shapeBounds: { x: node.x - NODE_R, y: node.y - NODE_R, w: NODE_R * 2, h: NODE_R * 2, label: 'cycle-node' },
    })
  return wrapItem(content, node.index, animate, instrument)
}

function renderSvg(spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  const animate = shouldAnimate(spec)
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${animate ? seqSpotlightCSS(spec.items.length, spec) : ''}
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)

  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const nodes = placeNodes(spec, theme)
  const parts = [
    renderTrack(theme),
    renderTitle(spec, theme),
    ...nodes.map(node => renderNode(node, animate, instrument, theme)),
  ].filter(Boolean)

  return renderSvg(spec, theme, parts)
}
