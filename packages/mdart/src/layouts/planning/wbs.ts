import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { tt, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const NODE_W = 118
const NODE_H = 30
const H_GAP = 40
const V_GAP = 10
const PAD_TOP = 8
const TITLE_H = 8

interface WbsLayout {
  hasL2: boolean
  cols: number
  colX: number[]
  totalLeaves: number
  width: number
  height: number
  rootLabel: string
  spineX: number
}

interface L1Node {
  item: MdArtItem
  index: number
  animIndex: number
  x: number
  y: number
  midY: number
  leaves: number
  spanTop: number
  spanH: number
}

interface L2Node {
  item: MdArtItem
  animIndex: number
  x: number
  y: number
  midY: number
  parentMidY: number
}

function svg(layout: WbsLayout, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${layout.width} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${parts.join('\n  ')}
</svg>`
}

function resolveLayout(spec: MdArtSpec): WbsLayout {
  const hasL2 = spec.items.some(item => item.children.length > 0)
  const cols = hasL2 ? 3 : 2
  const colX = Array.from({ length: cols }, (_, col) => 16 + col * (NODE_W + H_GAP))
  const totalLeaves = hasL2
    ? spec.items.reduce((sum, item) => sum + Math.max(item.children.length, 1), 0)
    : spec.items.length
  return {
    hasL2,
    cols,
    colX,
    totalLeaves,
    width: colX[cols - 1] + NODE_W + 16,
    height: TITLE_H + PAD_TOP + totalLeaves * (NODE_H + V_GAP) - V_GAP + PAD_TOP + 10,
    rootLabel: spec.title ?? spec.items[0].label,
    spineX: hasL2 ? colX[1] - H_GAP / 2 : 0,
  }
}

function placeNodes(spec: MdArtSpec, layout: WbsLayout): { l1: L1Node[], l2: L2Node[], nextAnimIndex: number } {
  let leafRow = 0
  let animIndex = layout.hasL2 ? 1 : 0
  const l1Nodes: L1Node[] = []
  const l2Nodes: L2Node[] = []

  spec.items.forEach((item, index) => {
    const groupIndex = animIndex++
    const leaves = layout.hasL2 ? Math.max(item.children.length, 1) : 1
    const spanTop = TITLE_H + PAD_TOP + leafRow * (NODE_H + V_GAP)
    const spanH = leaves * (NODE_H + V_GAP) - V_GAP
    const midY = spanTop + spanH / 2
    const x = layout.colX[layout.hasL2 ? 1 : 0]
    const y = midY - NODE_H / 2
    l1Nodes.push({ item, index, animIndex: groupIndex, x, y, midY, leaves, spanTop, spanH })

    if (layout.hasL2) {
      item.children.forEach((child, childIndex) => {
        const childY = TITLE_H + PAD_TOP + (leafRow + childIndex) * (NODE_H + V_GAP)
        l2Nodes.push({
          item: child,
          animIndex: animIndex++,
          x: layout.colX[2],
          y: childY,
          midY: childY + NODE_H / 2,
          parentMidY: midY,
        })
      })
    }
    leafRow += leaves
  })

  return { l1: l1Nodes, l2: l2Nodes, nextAnimIndex: animIndex }
}

function renderRoot(layout: WbsLayout, l1Nodes: L1Node[], theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  if (!layout.hasL2 || l1Nodes.length === 0) return ''
  const firstMid = l1Nodes[0].midY
  const lastMid = l1Nodes[l1Nodes.length - 1].midY
  const rootMid = (firstMid + lastMid) / 2
  const rootX = layout.colX[0]
  const unit = [
    `<line x1="${layout.spineX}" y1="${firstMid.toFixed(1)}" x2="${layout.spineX}" y2="${lastMid.toFixed(1)}" stroke="${theme.border}" stroke-width="1.5"/>`,
    `<rect x="${rootX}" y="${(rootMid - NODE_H / 2).toFixed(1)}" width="${NODE_W}" height="${NODE_H}" rx="6" fill="${theme.accent}33" stroke="${theme.accent}99" stroke-width="2"/>`,
    `<text x="${(rootX + NODE_W / 2).toFixed(1)}" y="${(rootMid + 5).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.accent}" ${FONT_SANS_ATTR} font-weight="700">${tt(layout.rootLabel, 15)}</text>`,
    `<line x1="${rootX + NODE_W}" y1="${rootMid.toFixed(1)}" x2="${layout.spineX}" y2="${rootMid.toFixed(1)}" stroke="${theme.border}" stroke-width="1.5"/>`,
  ]
  return wrapItem(unit.join(''), 0, animate, instrument)
}

function renderL1(node: L1Node, layout: WbsLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const { display, url } = displayLabel(node.item)
  const unit = [
    layout.hasL2 ? `<line x1="${layout.spineX}" y1="${node.midY.toFixed(1)}" x2="${layout.colX[1]}" y2="${node.midY.toFixed(1)}" stroke="${theme.border}" stroke-width="1.2"/>` : '',
    `<rect x="${node.x}" y="${node.y.toFixed(1)}" width="${NODE_W}" height="${NODE_H}" rx="5" fill="${theme.primary}2e" stroke="${theme.primary}88" stroke-width="1.5">${itemTitleTag(node.item)}</rect>`,
    aWrap(`<text x="${(node.x + NODE_W / 2).toFixed(1)}" y="${(node.y + 20).toFixed(1)}" text-anchor="middle" font-size="10.5" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${tt(display, 15, node.item)}</text>`, url),
  ]
  return wrapItem(unit.join(''), node.animIndex, animate, instrument)
}

function renderL2(node: L2Node, layout: WbsLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const done = node.item.attrs.includes('done')
  const active = node.item.attrs.includes('active') || node.item.attrs.includes('wip')
  const midX = layout.colX[1] + NODE_W
  const elbowX = midX + H_GAP / 2
  const { display, url } = displayLabel(node.item, { attrs: true })
  const fill = done ? `${theme.accent}22` : theme.surface
  const stroke = done ? theme.accent : active ? `${theme.accent}88` : theme.border
  const textColor = done ? theme.accent : active ? theme.text : theme.textMuted
  const unit = [
    `<path d="M${midX},${node.parentMidY.toFixed(1)} H${elbowX} V${node.midY.toFixed(1)} H${node.x}" fill="none" stroke="${theme.border}" stroke-width="1.2"/>`,
    `<rect x="${node.x}" y="${node.y.toFixed(1)}" width="${NODE_W}" height="${NODE_H}" rx="4" fill="${fill}" stroke="${stroke}" stroke-width="${active ? 1.5 : 1}">${itemTitleTag(node.item)}</rect>`,
    aWrap(`<text x="${(node.x + NODE_W / 2).toFixed(1)}" y="${(node.y + 20).toFixed(1)}" text-anchor="middle" font-size="10" fill="${textColor}" ${FONT_SANS_ATTR} ${done ? 'text-decoration="line-through"' : ''}>${tt(display, 15, node.item)}</text>`, url),
  ]
  return wrapItem(unit.join(''), node.animIndex, animate, instrument)
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layout = resolveLayout(spec)
  const nodes = placeNodes(spec, layout)
  const parts = [
    ...(animate ? [seqSpotlightCSS(layout.hasL2 ? nodes.nextAnimIndex : spec.items.length, spec, { scale: false })] : []),
    renderRoot(layout, nodes.l1, theme, animate, instrument),
    ...nodes.l1.map(node => renderL1(node, layout, theme, animate, instrument)),
    ...nodes.l2.map(node => renderL2(node, layout, theme, animate, instrument)),
  ].filter(Boolean)
  return svg(layout, theme, parts)
}
