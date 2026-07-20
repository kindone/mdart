import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, svgWrap, renderEmpty, parseLink, itemTitleTag, ellipsisIfDropped, shouldAnimate, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, roundTextBox } from '../shared'

const W = 500
const CONTENT_H = 380
const TITLE_H = 34
const ARROW_ID = 'gear-arr'

interface GearLayout {
  n: number
  titleH: number
  height: number
  cx: number
  cy: number
}

interface GearNode {
  item: MdArtItem
  index: number
  x: number
  y: number
  outerR: number
  innerR: number
  centerR: number
  teeth: number
  phase: number
  labelMaxSize: number
  fill: string
}

function gearPath(cx: number, cy: number, outerR: number, innerR: number, teeth: number, phase: number): string {
  const points: string[] = []
  for (let i = 0; i < teeth * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const angle = phase + (Math.PI / teeth) * i
    points.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`)
  }
  return 'M ' + points.join(' L ') + ' Z'
}

function resolveLayout(spec: MdArtSpec): GearLayout {
  const titleH = spec.title ? TITLE_H : 0
  return {
    n: spec.items.length,
    titleH,
    height: CONTENT_H + titleH,
    cx: W / 2,
    cy: titleH + 190,
  }
}

function renderDefs(theme: MdArtTheme): string {
  return `<defs><marker id="${ARROW_ID}" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto"><path d="M0,0.5 L6,3.5 L0,6.5 Z" fill="${theme.primary}"/></marker></defs>`
}

function renderGearLabel(node: GearNode, theme: MdArtTheme): string {
  const { display: rawDisplay, url: labelUrl } = parseLink(node.item.label)
  const label = ellipsisIfDropped(rawDisplay, node.item, { value: true })
  const { w, h } = roundTextBox(node.centerR, { hMin: 6.5 * 1.3 * 3 })
  const fit = fitLabelValueBlock(label, node.item.value, w, h, {
    labelUrl,
    labelMaxSize: node.labelMaxSize,
    labelMinSize: 6.5,
    labelMaxLines: 2,
    labelMaxLinesNoValue: 3,
    valueMaxSize: Math.max(node.labelMaxSize - 2, 8),
    valueMinSize: 6.5,
    valueMaxLines: 1,
    gap: 2,
  })
  return renderFitBlock(node.x, node.y, fit, {
    labelFullText: label,
    valueFullText: node.item.value,
    labelFill: theme.text,
    valueFill: theme.textMuted,
    labelWeight: '600',
  })
}

function renderGearNode(node: GearNode, theme: MdArtTheme, animate: boolean): string {
  const content = `<path d="${gearPath(node.x, node.y, node.outerR, node.innerR, node.teeth, node.phase)}" fill="${node.fill}" opacity="0.8">${itemTitleTag(node.item)}</path>` +
    `<circle cx="${node.x}" cy="${node.y}" r="${node.centerR}" fill="${theme.bg}"/>` +
    renderGearLabel(node, theme)
  return animate ? `<g class="mdart-n${node.index}">${content}</g>` : content
}

function singleGear(item: MdArtItem, layout: GearLayout, theme: MdArtTheme): GearNode[] {
  return [{ item, index: 0, x: layout.cx, y: layout.cy, outerR: 90, innerR: 68, centerR: 52, teeth: 12, phase: 0, labelMaxSize: 12, fill: theme.primary }]
}

function twoGears(items: MdArtItem[], layout: GearLayout, theme: MdArtTheme): GearNode[] {
  const outerR = 90
  const innerR = 68
  const teeth = 12
  const gapX = outerR * 1.85
  const xs = [layout.cx - gapX / 2, layout.cx + gapX / 2]
  return items.map((item, index) => ({
    item,
    index,
    x: xs[index],
    y: layout.cy,
    outerR,
    innerR,
    centerR: 52,
    teeth,
    phase: index * (Math.PI / teeth),
    labelMaxSize: 11,
    fill: lerpColor(theme.primary, theme.secondary, index / (items.length - 1 || 1)),
  }))
}

function threeGears(items: MdArtItem[], layout: GearLayout, theme: MdArtTheme): GearNode[] {
  const nodes: GearNode[] = [{
    item: items[0],
    index: 0,
    x: layout.cx,
    y: layout.cy,
    outerR: 80,
    innerR: 60,
    centerR: 46,
    teeth: 12,
    phase: 0,
    labelMaxSize: 11,
    fill: theme.primary,
  }]
  const sideAngles = [-Math.PI / 3, Math.PI / 3]
  const dist = 80 + 55 - 5
  ;[1, 2].forEach((index, sideIndex) => {
    const angle = sideAngles[sideIndex]
    nodes.push({
      item: items[index],
      index,
      x: layout.cx + dist * Math.cos(angle),
      y: layout.cy + dist * Math.sin(angle),
      outerR: 55,
      innerR: 40,
      centerR: 32,
      teeth: 8,
      phase: Math.PI / 8,
      labelMaxSize: 10,
      fill: lerpColor(theme.primary, theme.secondary, index / (items.length - 1)),
    })
  })
  return nodes
}

function orbitGears(items: MdArtItem[], layout: GearLayout, theme: MdArtTheme): GearNode[] {
  const radius = 130
  const outerR = 44
  const innerR = 32
  const teeth = 8
  return items.map((item, index) => {
    const angle = (2 * Math.PI * index) / layout.n - Math.PI / 2
    return {
      item,
      index,
      x: layout.cx + radius * Math.cos(angle),
      y: layout.cy + radius * Math.sin(angle),
      outerR,
      innerR,
      centerR: 24,
      teeth,
      phase: index * (Math.PI / (teeth * layout.n)),
      labelMaxSize: 9,
      fill: lerpColor(theme.primary, theme.secondary, index / (layout.n - 1 || 1)),
    }
  })
}

function renderOrbitArrows(layout: GearLayout, theme: MdArtTheme, animate: boolean): string[] {
  const radius = 130
  const outerR = 44
  const arcR = radius + outerR * 0.55
  const angleOffset = outerR / radius * 0.9
  const arrows: string[] = []
  for (let index = 0; index < layout.n; index++) {
    const a1 = (2 * Math.PI * index) / layout.n - Math.PI / 2
    const a2 = (2 * Math.PI * ((index + 1) % layout.n)) / layout.n - Math.PI / 2
    const startA = a1 + angleOffset
    const endA = a2 - angleOffset
    const x1 = layout.cx + arcR * Math.cos(startA)
    const y1 = layout.cy + arcR * Math.sin(startA)
    const x2 = layout.cx + arcR * Math.cos(endA)
    const y2 = layout.cy + arcR * Math.sin(endA)
    const sweep = ((endA - startA + 2 * Math.PI) % (2 * Math.PI)) > Math.PI ? 1 : 0
    const arc = `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${arcR.toFixed(1)},${arcR.toFixed(1)} 0 ${sweep},1 ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${theme.primary}88" stroke-width="1.8" marker-end="url(#${ARROW_ID})"/>`
    const arrIndex = index === layout.n - 1 ? layout.n : index + 1
    arrows.push(animate ? `<g class="mdart-arr-n${arrIndex}">${arc}</g>` : arc)
  }
  return arrows
}

function placeGears(spec: MdArtSpec, layout: GearLayout, theme: MdArtTheme): GearNode[] {
  if (layout.n === 1) return singleGear(spec.items[0], layout, theme)
  if (layout.n === 2) return twoGears(spec.items, layout, theme)
  if (layout.n === 3) return threeGears(spec.items, layout, theme)
  return orbitGears(spec.items, layout, theme)
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)

  const layout = resolveLayout(spec)
  const animate = shouldAnimate(spec)
  const nodes = placeGears(spec, layout, theme)
  const parts = [
    ...(animate ? [seqSpotlightCSS(layout.n, spec, { scale: false, trailingArrowSlot: layout.n >= 4 })] : []),
    renderDefs(theme),
    ...(layout.n >= 4 ? renderOrbitArrows(layout, theme, animate) : []),
    ...nodes.map(node => renderGearNode(node, theme, animate)),
  ]

  return svgWrap(W, layout.height, theme, spec.title, parts)
}
