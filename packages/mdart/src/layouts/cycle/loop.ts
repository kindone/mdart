import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, titleEl, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 520
const PAD_X = 48
const TITLE_H_WITH_TITLE = 36
const TITLE_H_NO_TITLE = 10
const NODE_ROW_GAP = 16
const RETURN_BOTTOM_PAD = 28
const FORWARD_ARROW_ID = 'lp-fwd'
const RETURN_ARROW_ID = 'lp-ret'
const HALO = `stroke="#000000" stroke-opacity="0.4" stroke-width="2.5" paint-order="stroke fill"`

interface LoopLayout {
  n: number
  nodeR: number
  fontSize: number
  titleH: number
  rowY: number
  dipAmt: number
  height: number
  spacing: number
  nodeBoxW: number
  nodeBoxH: number
  valueBoxW: number
}

interface LoopNode {
  item: MdArtItem
  index: number
  x: number
  fill: string
  display: ReturnType<typeof displayLabel>
}

function nodeRadius(n: number): number {
  return n <= 4 ? 22 : n <= 6 ? 18 : n <= 8 ? 15 : 12
}

function resolveLayout(spec: MdArtSpec): LoopLayout {
  const n = spec.items.length
  const nodeR = nodeRadius(n)
  const fontSize = nodeR >= 18 ? 10 : 9
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const rowY = titleH + nodeR + NODE_ROW_GAP
  const dipAmt = nodeR * 2.2 + 20
  const spacing = n > 1 ? (W - PAD_X * 2) / (n - 1) : 0
  const nodeBoxW = Math.max(20, nodeR * 1.6 - 4)
  const nodeBoxH = Math.max(nodeR * 1.4, 6.5 * 1.3 * 2)
  const valueBoxW = n > 1 ? Math.max(nodeBoxW, spacing - 12) : Math.min(200, W - 2 * PAD_X)
  return {
    n,
    nodeR,
    fontSize,
    titleH,
    rowY,
    dipAmt,
    height: rowY + nodeR + dipAmt + RETURN_BOTTOM_PAD,
    spacing,
    nodeBoxW,
    nodeBoxH,
    valueBoxW,
  }
}

function xFor(index: number, layout: LoopLayout): number {
  return layout.n === 1 ? W / 2 : PAD_X + index * layout.spacing
}

function placeNodes(spec: MdArtSpec, layout: LoopLayout, theme: MdArtTheme): LoopNode[] {
  return spec.items.map((item, index) => {
    const t = index / Math.max(layout.n - 1, 1)
    return {
      item,
      index,
      x: xFor(index, layout),
      fill: lerpColor(theme.primary, theme.secondary, t),
      display: displayLabel(item, { value: true }),
    }
  })
}

function renderDefs(theme: MdArtTheme): string {
  return `<defs>
    <marker id="${FORWARD_ARROW_ID}" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0,0 L7,4 L0,8 Z" fill="${theme.primary}"/>
    </marker>
    <marker id="${RETURN_ARROW_ID}" markerWidth="8" markerHeight="8" refX="0" refY="4" orient="auto">
      <path d="M0,0 L7,4 L0,8 Z" fill="${theme.accent}bb"/>
    </marker>
  </defs>`
}

function renderForwardArrow(from: LoopNode, to: LoopNode, layout: LoopLayout, theme: MdArtTheme, animate: boolean): string {
  const x1 = from.x + layout.nodeR + 2
  const x2 = to.x - layout.nodeR - 2
  if (x2 <= x1) return ''
  const t = from.index / Math.max(layout.n - 1, 1)
  const col = lerpColor(theme.primary, theme.secondary, t)
  const arrow = `<line x1="${x1.toFixed(1)}" y1="${layout.rowY}" x2="${x2.toFixed(1)}" y2="${layout.rowY}" stroke="${col}" stroke-width="2" marker-end="url(#${FORWARD_ARROW_ID})"/>`
  return animate ? `<g class="mdart-arr-n${from.index + 1}">${arrow}</g>` : arrow
}

function renderSelfLoop(layout: LoopLayout, theme: MdArtTheme, animate: boolean): string {
  const cx = W / 2
  const loopTop = layout.rowY - layout.nodeR - 4
  const arrow = `<path d="M${cx - layout.nodeR + 4},${loopTop} a22,16 0 1 1 ${layout.nodeR * 2 - 8},0" fill="none" stroke="${theme.accent}" stroke-width="1.8" stroke-dasharray="5,4" opacity="0.75" marker-end="url(#${RETURN_ARROW_ID})"/>`
  return animate ? `<g class="mdart-arr-n${layout.n}">${arrow}</g>` : arrow
}

function renderReturnArc(nodes: LoopNode[], layout: LoopLayout, theme: MdArtTheme, animate: boolean): string {
  if (layout.n === 1) return renderSelfLoop(layout, theme, animate)
  const x1 = nodes[layout.n - 1].x
  const x0 = nodes[0].x
  const sy = layout.rowY + layout.nodeR + 2
  const dip = layout.rowY + layout.nodeR + layout.dipAmt
  const incomingAngle = Math.PI * 0.51
  const returnStroke = 1.8
  const markerTipLen = 7 * returnStroke
  const tipClearance = 3
  const dirX = Math.cos(incomingAngle)
  const dirY = Math.sin(incomingAngle)
  const ex = x0 + dirX * (layout.nodeR + markerTipLen + tipClearance)
  const ey = layout.rowY + dirY * (layout.nodeR + markerTipLen + tipClearance)
  const c2Dist = Math.max(30, layout.nodeR * 1.6)
  const c2x = ex + dirX * c2Dist
  const c2y = ey + dirY * c2Dist
  const arrow = `<path d="M${x1.toFixed(1)},${sy} C${x1.toFixed(1)},${dip.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}" fill="none" stroke="${theme.accent}" stroke-width="${returnStroke}" stroke-dasharray="5,4" opacity="0.7" marker-end="url(#${RETURN_ARROW_ID})"/>`
  const label = `<text x="${(W / 2).toFixed(1)}" y="${(dip + 13).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-style="italic" opacity="0.85">&#x21BA; loop</text>`
  return animate ? `<g class="mdart-arr-n${layout.n}">${arrow}${label}</g>` : arrow + label
}

function renderLabel(node: LoopNode, layout: LoopLayout): string {
  const labelFit = fitTextToWidthShared([node.display.display], layout.nodeBoxW, {
    maxSize: layout.fontSize,
    minSize: 6.5,
    maxLines: 2,
    boxH: layout.nodeBoxH,
  })
  const { fontSize, lineHeight, results: [{ lines, truncated }] } = labelFit
  const tip = truncated ? `<title>${escapeXml(node.display.display)}</title>` : ''
  const totalH = lines.length * lineHeight
  let content = tip
  lines.forEach((line, lineIndex) => {
    const ty = layout.rowY - totalH / 2 + lineIndex * lineHeight + lineHeight * 0.8
    content += `<text x="${node.x.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="${fontSize}" font-weight="700" ${FONT_SANS_ATTR} fill="#ffffff" ${HALO}>${escapeXml(line)}</text>`
  })
  return aWrap(content, node.display.url)
}

function renderBadge(node: LoopNode, layout: LoopLayout, theme: MdArtTheme): string {
  const x = node.x + layout.nodeR - 4
  const y = layout.rowY - layout.nodeR + 4
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="${theme.bg}" stroke="${node.fill}" stroke-width="1.5"/>` +
    `<text x="${x.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="middle" font-size="8" font-weight="700" ${FONT_SANS_ATTR} fill="${node.fill}">${node.index + 1}</text>`
}

function renderValue(node: LoopNode, layout: LoopLayout, theme: MdArtTheme): string {
  if (!node.item.value) return ''
  const valueFit = fitTextToWidthShared([node.item.value], layout.valueBoxW, { maxSize: 8, minSize: 6, maxLines: 2 })
  const { fontSize, lineHeight, results: [{ lines, truncated }] } = valueFit
  const tip = truncated ? `<title>${escapeXml(node.item.value)}</title>` : ''
  const startY = layout.rowY + layout.nodeR + 7 + fontSize * 0.75
  const spans = lines
    .map((line, lineIndex) => `<tspan x="${node.x.toFixed(1)}" dy="${lineIndex === 0 ? 0 : lineHeight.toFixed(1)}">${escapeXml(line)}</tspan>`)
    .join('')
  return `${tip}<text x="${node.x.toFixed(1)}" y="${startY.toFixed(1)}" text-anchor="middle" font-size="${fontSize}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${spans}</text>`
}

function renderNode(node: LoopNode, layout: LoopLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const content = `<circle cx="${node.x.toFixed(1)}" cy="${layout.rowY}" r="${layout.nodeR}" fill="${node.fill}" stroke="${theme.bg}" stroke-width="2.5">${itemTitleTag(node.item)}</circle>` +
    renderLabel(node, layout) +
    renderBadge(node, layout, theme) +
    renderValue(node, layout, theme)
  return wrapItem(content, node.index, animate, instrument)
}

function renderSvg(layout: LoopLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  const animate = shouldAnimate(spec)
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${layout.height}" fill="${theme.bg}" rx="8"/>
    ${animate ? seqSpotlightCSS(layout.n, spec, { trailingArrowSlot: true }) : ''}
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
    renderDefs(theme),
    ...nodes.slice(0, -1).map((node, index) => renderForwardArrow(node, nodes[index + 1], layout, theme, animate)),
    renderReturnArc(nodes, layout, theme, animate),
    ...nodes.map(node => renderNode(node, layout, theme, animate, instrument)),
  ].filter(Boolean)

  return renderSvg(layout, spec, theme, parts)
}
