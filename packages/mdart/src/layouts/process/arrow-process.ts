import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, titleEl, renderEmpty, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, wrapItem, shouldInstrument } from '../shared'

const W = 600
const BOX_W_MIN = 28
const TITLE_H_WITH_TITLE = 28
const TITLE_H_NO_TITLE = 8
const BOX_H = 70
const BOX_W_MAX = 116
const ARROW_W = 38
const TOP_GAP = 14
const BOTTOM_PAD = 32
const SIDE_PAD = 20
const BOX_RX = 7
const ARROW_H = 30
const ARROW_HEAD_BACK = 20
const ARROW_RIGHT_PAD = 8
const ARROW_LEFT_GAP = 4

interface ArrowLayout {
  n: number
  titleH: number
  height: number
  boxW: number
  startX: number
  boxY: number
  textH: number
}

interface ArrowNode {
  item: MdArtItem
  index: number
  x: number
  fill: string
  display: ReturnType<typeof displayLabel>
}

function titleHeight(spec: MdArtSpec): number {
  return spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
}

function resolveLayout(spec: MdArtSpec): ArrowLayout {
  const n = spec.items.length
  const titleH = titleHeight(spec)
  const boxW = Math.max(BOX_W_MIN, Math.min(BOX_W_MAX, Math.floor((W - SIDE_PAD - (n - 1) * ARROW_W) / n)))
  const totalW = n * boxW + (n - 1) * ARROW_W
  return {
    n,
    titleH,
    height: BOX_H + titleH + BOTTOM_PAD,
    boxW,
    startX: (W - totalW) / 2,
    boxY: titleH + TOP_GAP,
    textH: BOX_H - 16,
  }
}

function placeNodes(spec: MdArtSpec, layout: ArrowLayout, theme: MdArtTheme): ArrowNode[] {
  return spec.items.map((item, index) => {
    const t = layout.n > 1 ? index / (layout.n - 1) : 0
    return {
      item,
      index,
      x: layout.startX + index * (layout.boxW + ARROW_W),
      fill: lerpColor(theme.primary, theme.secondary, t),
      display: displayLabel(item, { value: !!item.value }),
    }
  })
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  return spec.title ? titleEl(W, spec.title, theme) : ''
}

function renderBox(node: ArrowNode, layout: ArrowLayout): string {
  return `<rect x="${node.x.toFixed(1)}" y="${layout.boxY}" width="${layout.boxW}" height="${BOX_H}" rx="${BOX_RX}" fill="${node.fill}28" stroke="${node.fill}" stroke-width="2">${itemTitleTag(node.item)}</rect>`
}

function renderText(node: ArrowNode, layout: ArrowLayout, theme: MdArtTheme): string {
  const fit = fitLabelValueBlock(node.display.display, node.item.value, layout.boxW - 10, layout.textH, {
    labelUrl: node.display.url,
    labelMaxSize: 10.5,
    labelMinSize: 6.5,
    labelMaxLines: 3,
    labelMaxLinesNoValue: 4,
    valueMaxSize: 10.5,
    valueMinSize: 6,
    valueMaxLines: 3,
    valueShare: 0.65,
    gap: 4,
  })
  return renderFitBlock(node.x + layout.boxW / 2, layout.boxY + BOX_H / 2, fit, {
    labelFullText: node.display.display,
    valueFullText: node.item.value,
    labelFill: theme.text,
    valueFill: theme.text,
    labelWeight: '600',
    valueExtraAttrs: 'fill-opacity="0.72"',
    shapeBounds: { x: node.x, y: layout.boxY, w: layout.boxW, h: BOX_H, label: 'arrow-node' },
  })
}

function renderArrow(node: ArrowNode, layout: ArrowLayout, animate: boolean): string {
  if (node.index >= layout.n - 1) return ''
  const cy = layout.boxY + BOX_H / 2
  const ax = node.x + layout.boxW + ARROW_LEFT_GAP
  const shaftH = Math.round(ARROW_H * 0.46)
  const headBase = ax + ARROW_W - ARROW_HEAD_BACK
  const arrow = `<polygon points="${ax},${(cy - shaftH).toFixed(1)} ${headBase},${(cy - shaftH).toFixed(1)} ${headBase},${(cy - ARROW_H).toFixed(1)} ${(ax + ARROW_W - ARROW_RIGHT_PAD).toFixed(1)},${cy.toFixed(1)} ${headBase},${(cy + ARROW_H).toFixed(1)} ${headBase},${(cy + shaftH).toFixed(1)} ${ax},${(cy + shaftH).toFixed(1)}" fill="${node.fill}99"/>`
  return animate ? `<g class="mdart-arr-n${node.index + 1}">${arrow}</g>` : arrow
}

function renderNode(node: ArrowNode, layout: ArrowLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string[] {
  return [
    wrapItem(renderBox(node, layout) + renderText(node, layout, theme), node.index, animate, instrument),
    renderArrow(node, layout, animate),
  ].filter(Boolean)
}

function renderSvg(layout: ArrowLayout, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${layout.height}" fill="${theme.bg}" rx="8"/>
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
    ...(animate ? [seqSpotlightCSS(layout.n, spec)] : []),
    renderTitle(spec, theme),
    ...nodes.flatMap(node => renderNode(node, layout, theme, animate, instrument)),
  ].filter(Boolean)

  return renderSvg(layout, theme, parts)
}
