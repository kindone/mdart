import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 520
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 10
const BOX_W = 112
const GAP = 8
const CONTENT_H = 280
const NODE_TEXT_W = BOX_W - 16

interface FlowDef {
  sourceIndex: number
  dest: string
  weight: number
}

interface NodeBox {
  y: number
  h: number
}

interface SankeyModel {
  sourceWeights: number[]
  totalSource: number
  destWeights: Map<string, number>
  destDisplays: Map<string, string>
  destUrls: Map<string, string | null>
  destNames: string[]
  totalDest: number
  flows: FlowDef[]
}

interface SankeyLayout {
  titleH: number
  height: number
  sourceNodes: NodeBox[]
  destNodes: Map<string, NodeBox>
  x0: number
  x1: number
  midX: number
  colors: string[]
}

function svg(layout: SankeyLayout, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

function palette(theme: MdArtTheme): string[] {
  return [theme.primary, theme.secondary, theme.accent, theme.muted, ...theme.palette]
}

function parseWeight(item: MdArtItem, fallback = 1): number {
  return Math.max(1, parseFloat((item.value ?? item.attrs[0] ?? String(fallback)).replace('%', '')) || fallback)
}

function buildModel(items: MdArtItem[]): SankeyModel {
  const sourceWeights = items.map(item => parseWeight(item))
  const totalSource = sourceWeights.reduce((a, b) => a + b, 0)
  const destWeights = new Map<string, number>()
  const destDisplays = new Map<string, string>()
  const destUrls = new Map<string, string | null>()
  const flows: FlowDef[] = []

  items.forEach((item, sourceIndex) => {
    const perChild = sourceWeights[sourceIndex] / Math.max(item.children.length, 1)
    item.children.forEach(child => {
      const weight = parseWeight(child, perChild)
      flows.push({ sourceIndex, dest: child.label, weight })
      destWeights.set(child.label, (destWeights.get(child.label) ?? 0) + weight)
      if (!destDisplays.has(child.label)) {
        const { display, url } = displayLabel(child, { value: !!child.value })
        destDisplays.set(child.label, display)
        destUrls.set(child.label, url)
      }
    })
  })

  const destNames = [...destWeights.keys()]
  const totalDest = [...destWeights.values()].reduce((a, b) => a + b, 0) || totalSource
  return { sourceWeights, totalSource, destWeights, destDisplays, destUrls, destNames, totalDest, flows }
}

function stackNodes(weights: number[], total: number, titleH: number): NodeBox[] {
  const scale = (CONTENT_H - (weights.length - 1) * GAP) / total
  let y = titleH + GAP
  return weights.map(weight => {
    const h = Math.max(18, weight * scale)
    const node = { y, h }
    y += h + GAP
    return node
  })
}

function resolveLayout(spec: MdArtSpec, model: SankeyModel, theme: MdArtTheme): SankeyLayout {
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const destWeights = model.destNames.map(name => model.destWeights.get(name) ?? 1)
  return {
    titleH,
    height: titleH + CONTENT_H + GAP * 2,
    sourceNodes: stackNodes(model.sourceWeights, model.totalSource, titleH),
    destNodes: new Map(model.destNames.map((name, index) => [name, stackNodes(destWeights, model.totalDest, titleH)[index]])),
    x0: BOX_W,
    x1: W - BOX_W,
    midX: W / 2,
    colors: palette(theme),
  }
}

function renderNodeLabel(x: number, node: NodeBox, text: string, url: string | null, theme: MdArtTheme): string {
  if (node.h < 10) return ''
  const { fontSize, lineHeight, results: [{ lines, truncated }] } =
    fitTextToWidthShared([text], NODE_TEXT_W, { maxSize: 10, minSize: 6, maxLines: 4, boxH: node.h - 4 })
  const tip = truncated ? `<title>${escapeXml(text)}</title>` : ''
  const startY = node.y + node.h / 2 - ((lines.length - 1) * lineHeight) / 2 + fontSize * 0.35
  const tspans = lines
    .map((line, lineIndex) => `<tspan x="${x.toFixed(1)}" dy="${lineIndex === 0 ? 0 : lineHeight.toFixed(1)}">${escapeXml(line)}</tspan>`)
    .join('')
  return aWrap(`${tip}<text x="${x.toFixed(1)}" y="${startY.toFixed(1)}" text-anchor="middle" font-size="${fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR}>${tspans}</text>`, url)
}

function renderFlowPaths(model: SankeyModel, layout: SankeyLayout): Map<string, string[]> {
  const sourceCursor = layout.sourceNodes.map(node => node.y)
  const destCursor = new Map<string, number>(model.destNames.map(name => [name, layout.destNodes.get(name)!.y]))
  const flowParts = new Map<string, string[]>()

  model.flows.forEach(flow => {
    const source = layout.sourceNodes[flow.sourceIndex]
    const dest = layout.destNodes.get(flow.dest)
    if (!source || !dest) return
    const sourceH = (flow.weight / model.sourceWeights[flow.sourceIndex]) * source.h
    const destH = (flow.weight / (model.destWeights.get(flow.dest) ?? 1)) * dest.h
    const sy0 = sourceCursor[flow.sourceIndex]
    const sy1 = sy0 + sourceH
    sourceCursor[flow.sourceIndex] += sourceH
    const dy0 = destCursor.get(flow.dest)!
    const dy1 = dy0 + destH
    destCursor.set(flow.dest, dy1)
    const color = layout.colors[flow.sourceIndex % layout.colors.length]
    const path = `<path d="M${layout.x0},${sy0.toFixed(1)} C${layout.midX},${sy0.toFixed(1)} ${layout.midX},${dy0.toFixed(1)} ${layout.x1},${dy0.toFixed(1)} L${layout.x1},${dy1.toFixed(1)} C${layout.midX},${dy1.toFixed(1)} ${layout.midX},${sy1.toFixed(1)} ${layout.x0},${sy1.toFixed(1)} Z" fill="${color}3a" stroke="${color}77" stroke-width="0.5"/>`
    const list = flowParts.get(flow.dest) ?? []
    list.push(path)
    flowParts.set(flow.dest, list)
  })

  return flowParts
}

function renderSourceNode(item: MdArtItem, index: number, node: NodeBox, layout: SankeyLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const color = layout.colors[index % layout.colors.length]
  const { display, url } = displayLabel(item, { value: !!item.value, attrs: !!item.attrs?.length })
  const unit = `<rect x="0" y="${node.y.toFixed(1)}" width="${BOX_W - 8}" height="${node.h.toFixed(1)}" rx="4" fill="${color}44" stroke="${color}99" stroke-width="1">${itemTitleTag(item)}</rect>`
    + renderNodeLabel((BOX_W - 8) / 2, node, display, url, theme)
  return wrapItem(unit, index, animate, instrument)
}

function renderDestNode(name: string, index: number, model: SankeyModel, layout: SankeyLayout, flows: Map<string, string[]>, theme: MdArtTheme, animate: boolean, instrument: boolean, sourceCount: number): string {
  const node = layout.destNodes.get(name)!
  const unit = [
    ...(flows.get(name) ?? []),
    `<rect x="${W - BOX_W + 8}" y="${node.y.toFixed(1)}" width="${BOX_W - 8}" height="${node.h.toFixed(1)}" rx="4" fill="${theme.surface}" stroke="${theme.border}" stroke-width="1"/>`,
    renderNodeLabel(W - (BOX_W - 8) / 2, node, model.destDisplays.get(name) ?? name, model.destUrls.get(name) ?? null, theme),
  ]
  return wrapItem(unit.join(''), sourceCount + index, animate, instrument)
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const model = buildModel(spec.items)
  const layout = resolveLayout(spec, model, theme)
  const flows = renderFlowPaths(model, layout)
  const parts = [
    ...(animate ? [seqSpotlightCSS(spec.items.length + model.destNames.length, spec, { scale: false })] : []),
    ...model.destNames.map((name, index) => renderDestNode(name, index, model, layout, flows, theme, animate, instrument, spec.items.length)),
    ...spec.items.map((item, index) => renderSourceNode(item, index, layout.sourceNodes[index], layout, theme, animate, instrument)),
  ]
  return svg(layout, theme, spec.title, parts)
}
