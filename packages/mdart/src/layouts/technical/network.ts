import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, parseLink, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, wrapItem, shouldInstrument, FONT_SANS_ATTR, boxEdge, tt } from '../shared'

const W = 580
const H = 420
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 8
const NODE_W = 130
const NODE_H = 44
const NODE_RX = 6
const NODE_TEXT_W = NODE_W - 14
const NODE_TEXT_H = NODE_H - 8
const NODE_HW = NODE_W / 2      // half-width for boxEdge
const NODE_HH = NODE_H / 2      // half-height for boxEdge
const EDGE_EXIT_PAD = 2          // outward pad from source box edge
const EDGE_ENTER_PAD = 3         // outward pad from dest box edge (arrowhead tip lands ~at box with refX=6)
// Quadratic Bézier: the actual visual bow at t=0.5 is curveMag/2.
// BOW_FRACTION sets the control-point displacement as a fraction of chord length,
// so actual bow ≈ chord × BOW_FRACTION/2.
//   BOW_FRACTION = 0.20 → actual bow = 10% of chord (subtle, clean for all edge lengths)
//   BIDI_BOW_FRACTION = 0.30 → actual bow = 15% (enough to visually separate bidi pairs)
const BOW_FRACTION = 0.20
const BIDI_BOW_FRACTION = 0.30
const MIN_CURVE_MAG = 12         // floor so very short edges still curve slightly
const EDGE_LABEL_MAX = 14
const EDGE_LABEL_PAD = 8
const EDGE_LABEL_CHAR_PX = 5.5
const R_BASE = 80
const R_PER_NODE = 18
const R_MIN = 100
const R_PAD_TOP = 12
const R_PAD_X = 8

interface Point {
  x: number
  y: number
}

interface NetworkLayout {
  titleH: number
  cx: number
  cy: number
  labels: string[]
  positions: Point[]
  labelIndex: Map<string, number>
  itemByLabel: Map<string, MdArtItem>
  topLevelLabels: Set<string>
  transitionSet: Set<string>   // "si-ti" for every directed edge, used for bidi detection
}

function collectLabels(items: MdArtItem[]): string[] {
  const labels = items.map(item => item.label)
  items.forEach(item => {
    item.flowChildren.forEach(child => {
      if (!labels.includes(child.label)) labels.push(child.label)
    })
  })
  return labels
}

function circlePositions(labels: string[], titleH: number): Point[] {
  const cx = W / 2
  const cy = (H + titleH) / 2
  const maxRH = cy - titleH - NODE_HH - R_PAD_TOP
  const maxRW = cx - NODE_HW - R_PAD_X
  const r = Math.min(maxRH, maxRW, Math.max(R_MIN, R_BASE + labels.length * R_PER_NODE))
  return labels.map((_, i) => {
    const angle = (2 * Math.PI * i / labels.length) - Math.PI / 2
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  })
}

function collectTransitionSet(spec: MdArtSpec, labelIndex: Map<string, number>): Set<string> {
  const set = new Set<string>()
  spec.items.forEach(item => {
    const si = labelIndex.get(item.label) ?? -1
    if (si < 0) return
    item.flowChildren.forEach(child => {
      const ti = labelIndex.get(child.label) ?? -1
      if (ti >= 0 && si !== ti) set.add(`${si}-${ti}`)
    })
  })
  return set
}

function measureNetwork(spec: MdArtSpec): NetworkLayout {
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const labels = collectLabels(spec.items)
  const labelIndex = new Map(labels.map((label, i) => [label, i]))
  const cx = W / 2
  const cy = (H + titleH) / 2
  return {
    titleH, cx, cy, labels,
    positions: circlePositions(labels, titleH),
    labelIndex,
    itemByLabel: new Map(spec.items.map(item => [item.label, item])),
    topLevelLabels: new Set(spec.items.map(item => item.label)),
    transitionSet: collectTransitionSet(spec, labelIndex),
  }
}

function renderDefs(theme: MdArtTheme): string {
  return `<defs><marker id="net-arr" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${theme.textMuted}"/></marker></defs>`
}

function renderEdge(
  layout: NetworkLayout,
  src: Point,
  dst: Point,
  si: number,
  ti: number,
  value: string | undefined,
  theme: MdArtTheme,
  curved: boolean,
): string {
  const dx = dst.x - src.x
  const dy = dst.y - src.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const nx = dx / len
  const ny = dy / len

  // Precise anchor points on the box edges
  const p1 = boxEdge(src.x, src.y, nx, ny, NODE_HW, NODE_HH, EDGE_EXIT_PAD)
  const p2 = boxEdge(dst.x, dst.y, -nx, -ny, NODE_HW, NODE_HH, EDGE_ENTER_PAD)

  let pathD: string
  let labelX: number
  let labelY: number

  if (!curved) {
    // Straight mode: simple line, label at midpoint
    pathD = `M${p1.x.toFixed(1)},${p1.y.toFixed(1)} L${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
    labelX = (p1.x + p2.x) / 2
    labelY = (p1.y + p2.y) / 2
  } else {
    // Curved mode: quadratic Bézier bowed away from ring centre.
    // A chord-proportional curveMag gives consistent visual bow (~10%) at every edge length —
    // adjacent edges get a clean gentle arc; long cross-ring edges remain nearly straight
    // (which is the cleanest way to handle their inevitable crossings in a ring layout).
    const chordLen = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
    const midX = (p1.x + p2.x) / 2
    const midY = (p1.y + p2.y) / 2
    const toCenterX = layout.cx - midX
    const toCenterY = layout.cy - midY

    // Dot product of chord perpendicular (-ny, nx) with vector toward ring centre.
    // Positive → perpendicular points toward centre → bow opposite direction (outward).
    // When dot ≈ 0 (directly opposite nodes) use si < ti as a stable tiebreaker.
    const dot = (-ny) * toCenterX + nx * toCenterY
    const isBidi = layout.transitionSet.has(`${ti}-${si}`)
    const naturalSign = dot < -1e-6 ? 1 : dot > 1e-6 ? -1 : (si < ti ? 1 : -1)
    const effectiveSign = (isBidi && si > ti) ? -naturalSign : naturalSign

    const bowFraction = isBidi ? BIDI_BOW_FRACTION : BOW_FRACTION
    const curveMag = Math.max(bowFraction * chordLen, MIN_CURVE_MAG)

    const cpX = midX - ny * curveMag * effectiveSign
    const cpY = midY + nx * curveMag * effectiveSign

    // Label at Bézier midpoint t=0.5: actual point on the arc, not at the control point
    pathD = `M${p1.x.toFixed(1)},${p1.y.toFixed(1)} Q${cpX.toFixed(1)},${cpY.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
    labelX = 0.25 * p1.x + 0.5 * cpX + 0.25 * p2.x
    labelY = 0.25 * p1.y + 0.5 * cpY + 0.25 * p2.y
  }

  const labelW = Math.min((value?.length ?? 0) * EDGE_LABEL_CHAR_PX + EDGE_LABEL_PAD, 90)
  return [
    `<path d="${pathD}" fill="none" stroke="${theme.textMuted}99" stroke-width="1.5" marker-end="url(#net-arr)"/>`,
    value ? `<rect x="${(labelX - labelW / 2).toFixed(1)}" y="${(labelY - 9).toFixed(1)}" width="${labelW.toFixed(1)}" height="12" rx="3" fill="${theme.surface}" opacity="0.88"/>` : '',
    value ? `<text x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tt(value, EDGE_LABEL_MAX)}</text>` : '',
  ].join('')
}

function renderEdges(spec: MdArtSpec, layout: NetworkLayout, theme: MdArtTheme, animate: boolean, instrument: boolean, curved: boolean): string[] {
  const edges: string[] = []
  spec.items.forEach(item => {
    const si = layout.labelIndex.get(item.label) ?? -1
    if (si < 0) return
    const src = layout.positions[si]
    item.flowChildren.forEach(child => {
      const ti = layout.labelIndex.get(child.label) ?? -1
      if (ti < 0) return
      edges.push(wrapItem(renderEdge(layout, src, layout.positions[ti], si, ti, child.value, theme, curved), ti, animate, instrument))
    })
  })
  return edges
}

function renderNode(label: string, point: Point, index: number, layout: NetworkLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const isTop = layout.topLevelLabels.has(label)
  const stroke = isTop ? `${theme.accent}bb` : `${theme.muted}aa`
  const fill = isTop ? theme.surface : `${theme.surface}cc`
  const sourceItem = layout.itemByLabel.get(label)
  const { display: labelDisplay, url: labelUrl } = sourceItem
    ? displayLabel(sourceItem, { value: true })
    : parseLink(label)
  const fit = fitLabelValueBlock(labelDisplay, sourceItem?.value, NODE_TEXT_W, NODE_TEXT_H, {
    labelUrl,
    labelMaxSize: 11,
    labelMinSize: 7,
    labelMaxLines: 1,
    labelMaxLinesNoValue: 2,
    valueMaxSize: 9,
    valueMinSize: 7,
    valueMaxLines: 1,
    valueShare: 0.34,
  })
  const unit = [
    `<rect x="${(point.x - NODE_HW).toFixed(1)}" y="${(point.y - NODE_HH).toFixed(1)}" width="${NODE_W}" height="${NODE_H}" rx="${NODE_RX}" fill="${fill}" stroke="${stroke}" stroke-width="1.2">${sourceItem ? itemTitleTag(sourceItem) : ''}</rect>`,
    renderFitBlock(point.x, point.y, fit, {
      labelFullText: labelDisplay,
      valueFullText: sourceItem?.value,
      labelFill: theme.text,
      valueFill: theme.textMuted,
      labelWeight: '600',
    }),
  ].join('')
  return wrapItem(unit, index, animate, instrument)
}

function renderNodes(layout: NetworkLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string[] {
  return layout.labels.map((label, i) => renderNode(label, layout.positions[i], i, layout, theme, animate, instrument))
}

function renderTitle(title: string | undefined, theme: MdArtTheme): string {
  return title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
}

function renderSvg(theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${renderTitle(title, theme)}
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const curved = spec.edgeStyle !== 'straight'  // default: curved bézier; `edges: straight` opts out
  const layout = measureNetwork(spec)
  const parts = [
    renderDefs(theme),
    ...renderEdges(spec, layout, theme, animate, instrument, curved),
    ...renderNodes(layout, theme, animate, instrument),
  ]
  if (animate) parts.unshift(seqSpotlightCSS(layout.labels.length, spec, { scale: false }))
  return renderSvg(theme, spec.title, parts)
}
