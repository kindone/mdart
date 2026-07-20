import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 520
const TITLE_H_WITH_TITLE = 28
const TITLE_H_NO_TITLE = 8
const BODY_H = 420
const ORBIT_R = 148

interface WebLayout {
  n: number
  titleH: number
  height: number
  cx: number
  cy: number
  nodeR: number
  nodeBoxW: number
  nodeBoxH: number
  nodeMaxSize: number
}

interface WebNode {
  item: MdArtItem
  index: number
  x: number
  y: number
}

interface WebEdge {
  from: WebNode
  to: WebNode
}

function resolveLayout(spec: MdArtSpec): WebLayout {
  const n = spec.items.length
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const height = BODY_H + titleH
  const nodeR = Math.max(22, Math.min(34, 72 / n))
  return {
    n,
    titleH,
    height,
    cx: W / 2,
    cy: titleH + (height - titleH) / 2,
    nodeR,
    nodeBoxW: nodeR * 1.5,
    nodeBoxH: nodeR * 1.4,
    nodeMaxSize: Math.max(8, Math.min(10, nodeR * 0.5)),
  }
}

function svg(layout: WebLayout, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

function placeNodes(spec: MdArtSpec, layout: WebLayout): WebNode[] {
  return spec.items.map((item, index) => {
    const angle = 2 * Math.PI * index / layout.n - Math.PI / 2
    return {
      item,
      index,
      x: layout.cx + ORBIT_R * Math.cos(angle),
      y: layout.cy + ORBIT_R * Math.sin(angle),
    }
  })
}

function buildEdges(nodes: WebNode[]): WebEdge[] {
  const drawn = new Set<string>()
  const edges: WebEdge[] = []
  const addEdge = (i: number, j: number) => {
    const k = `${Math.min(i, j)}-${Math.max(i, j)}`
    if (drawn.has(k)) return; drawn.add(k)
    edges.push({ from: nodes[i], to: nodes[j] })
  }
  for (let i = 0; i < nodes.length; i++) {
    addEdge(i, (i + 1) % nodes.length)
    if (nodes.length <= 7) addEdge(i, (i + 2) % nodes.length)
    if (nodes.length <= 4) for (let j = i + 1; j < nodes.length; j++) addEdge(i, j)
  }
  return edges
}

function renderEdges(edges: WebEdge[], theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const lines = edges
    .map(edge => `<line x1="${edge.from.x.toFixed(1)}" y1="${edge.from.y.toFixed(1)}" x2="${edge.to.x.toFixed(1)}" y2="${edge.to.y.toFixed(1)}" stroke="${theme.primary}55" stroke-width="1.8"/>`)
    .join('')
  return wrapItem(lines, 0, animate, instrument)
}

function renderNode(node: WebNode, layout: WebLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const { display, url } = displayLabel(node.item)
  const { fontSize, lineHeight, results: [{ lines, truncated }] } =
    fitTextToWidthShared([display], layout.nodeBoxW, {
        maxSize: layout.nodeMaxSize,
        minSize: 6,
        maxLines: 3,
        boxH: layout.nodeBoxH,
      })
  const tip = truncated ? `<title>${escapeXml(display)}</title>` : ''
  const startY = node.y - ((lines.length - 1) * lineHeight) / 2 + fontSize * 0.35
  const spans = lines
    .map((line, lineIndex) => `<tspan x="${node.x.toFixed(1)}" dy="${lineIndex === 0 ? 0 : lineHeight.toFixed(1)}">${escapeXml(line)}</tspan>`)
    .join('')
  const unit = `<circle cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${layout.nodeR}" fill="${theme.surface}" stroke="${theme.primary}99" stroke-width="1.8">${itemTitleTag(node.item)}</circle>`
    + aWrap(`${tip}<text x="${node.x.toFixed(1)}" y="${startY.toFixed(1)}" text-anchor="middle" font-size="${fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${spans}</text>`, url)
  return wrapItem(unit, node.index + 1, animate, instrument)
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const layout = resolveLayout(spec)
  const nodes = placeNodes(spec, layout)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts = [
    ...(animate ? [seqSpotlightCSS(layout.n + 1, spec, { scale: false })] : []),
    renderEdges(buildEdges(nodes), theme, animate, instrument),
    ...nodes.map(node => renderNode(node, layout, theme, animate, instrument)),
  ]
  return svg(layout, theme, spec.title, parts)
}
