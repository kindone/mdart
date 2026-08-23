import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, titleEl, renderEmpty, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, roundTextBox, wrapItem, shouldInstrument } from '../shared'

const W = 440
const H = 400
const CX = W / 2
const CY = H / 2
const R = 150
const NODE_R = 20

interface MultiNode {
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

function placeNodes(spec: MdArtSpec, theme: MdArtTheme): MultiNode[] {
  return spec.items.map((item, index) => {
    const angle = angleFor(index, spec.items.length)
    const t = index / (spec.items.length - 1 || 1)
    return {
      item,
      index,
      x: CX + R * Math.cos(angle),
      y: CY + R * Math.sin(angle),
      fill: lerpColor(theme.primary, theme.secondary, t),
      display: displayLabel(item),
    }
  })
}

function renderConnections(nodes: MultiNode[], theme: MdArtTheme): string[] {
  const parts: string[] = []
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i]
      const b = nodes[j]
      parts.push(`<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${theme.textMuted}" stroke-width="1" opacity="0.55"/>`)
    }
  }
  return parts
}

function renderNode(node: MultiNode, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const { w: nodeBoxW, h: nodeBoxH } = roundTextBox(NODE_R)
  const fit = fitLabelValueBlock(node.display.display, null, nodeBoxW, nodeBoxH, {
    labelUrl: node.display.url,
    labelMaxSize: 10,
    labelMinSize: 6.5,
    labelMaxLines: 2,
    labelMaxLinesNoValue: 2,
  })
  const content = `<circle cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${NODE_R}" fill="${theme.bg}"/>` +
    `<circle cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${NODE_R}" fill="${node.fill}28" stroke="${node.fill}" stroke-width="1.5">${itemTitleTag(node.item)}</circle>` +
    renderFitBlock(node.x, node.y, fit, {
      labelFullText: node.display.display,
      labelFill: theme.text,
      valueFill: theme.text,
      labelWeight: '600',
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
    spec.title ? titleEl(W, spec.title, theme) : '',
    ...renderConnections(nodes, theme),
    ...nodes.map(node => renderNode(node, theme, animate, instrument)),
  ].filter(Boolean)

  return renderSvg(spec, theme, parts)
}
