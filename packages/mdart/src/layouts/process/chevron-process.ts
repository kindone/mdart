import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, contrastColor, titleEl, renderEmpty, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, wrapItem, shouldInstrument } from '../shared'
import { render as renderProcess } from './process'

const W = 600
const MAX_ITEMS = 8
const TITLE_H_WITH_TITLE = 28
const TITLE_H_NO_TITLE = 8
const CHEV_H = 54
const H_PAD = 20
const GAP = 4
const POINT_W = 20
const TOP_GAP = 10
const BOTTOM_PAD = 28
const INNER_TEXT_PAD = 6

interface ChevronGeometry {
  item: MdArtItem
  index: number
  x: number
  y: number
  isFirst: boolean
  isLast: boolean
  bodyW: number
  tx: number
  fill: string
  display: ReturnType<typeof displayLabel>
}

interface ChevronLayout {
  n: number
  titleH: number
  height: number
  chevW: number
  startX: number
  y: number
  cy: number
  textH: number
}

function titleHeight(spec: MdArtSpec): number {
  return spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
}

function resolveLayout(spec: MdArtSpec): ChevronLayout {
  const n = spec.items.length
  const titleH = titleHeight(spec)
  const chevW = Math.floor((W - H_PAD - (n - 1) * GAP) / n)
  const startX = Math.floor((W - (n * chevW + (n - 1) * GAP)) / 2)
  const y = titleH + TOP_GAP
  return {
    n,
    titleH,
    height: CHEV_H + titleH + BOTTOM_PAD,
    chevW,
    startX,
    y,
    cy: y + CHEV_H / 2,
    textH: CHEV_H - 12,
  }
}

function placeChevrons(spec: MdArtSpec, layout: ChevronLayout, theme: MdArtTheme): ChevronGeometry[] {
  return spec.items.map((item, index) => {
    const x = layout.startX + index * (layout.chevW + GAP)
    const isFirst = index === 0
    const isLast = index === layout.n - 1
    const bodyX = x + (isFirst ? 0 : POINT_W / 2)
    const rawBodyW = isLast ? layout.chevW - Math.round(POINT_W / 2) : layout.chevW - POINT_W
    const t = layout.n > 1 ? index / (layout.n - 1) : 0
    return {
      item,
      index,
      x,
      y: layout.y,
      isFirst,
      isLast,
      bodyW: Math.max(4, rawBodyW - INNER_TEXT_PAD),
      tx: bodyX + rawBodyW / 2,
      fill: lerpColor(theme.primary, theme.secondary, t),
      display: displayLabel(item, { value: !!item.value }),
    }
  })
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  return spec.title ? titleEl(W, spec.title, theme) : ''
}

function chevronPoints(chev: ChevronGeometry, layout: ChevronLayout): string {
  const x = chev.x
  const y = layout.y
  const w = layout.chevW
  const cy = layout.cy
  if (layout.n === 1) return `${x},${y} ${x + w},${y} ${x + w},${y + CHEV_H} ${x},${y + CHEV_H}`
  if (chev.isFirst) return `${x},${y} ${x + w - POINT_W},${y} ${x + w},${cy} ${x + w - POINT_W},${y + CHEV_H} ${x},${y + CHEV_H}`
  if (chev.isLast) return `${x},${y} ${x + w},${y} ${x + w},${y + CHEV_H} ${x},${y + CHEV_H} ${x + POINT_W},${cy}`
  return `${x},${y} ${x + w - POINT_W},${y} ${x + w},${cy} ${x + w - POINT_W},${y + CHEV_H} ${x},${y + CHEV_H} ${x + POINT_W},${cy}`
}

function renderShape(chev: ChevronGeometry, layout: ChevronLayout, theme: MdArtTheme): string {
  return `<polygon points="${chevronPoints(chev, layout)}" fill="${chev.fill}ee" stroke="${theme.bg}" stroke-width="2.5">${itemTitleTag(chev.item)}</polygon>`
}

function renderText(chev: ChevronGeometry, layout: ChevronLayout): string {
  const textColor = contrastColor(chev.fill)
  const fit = fitLabelValueBlock(chev.display.display, chev.item.value, chev.bodyW, layout.textH, {
    labelUrl: chev.display.url,
    labelMaxSize: 10.5,
    labelMinSize: 6.5,
    labelMaxLines: 3,
    labelMaxLinesNoValue: 4,
    valueMaxSize: 9,
    valueMinSize: 6,
    valueMaxLines: 2,
    valueShare: 0.4,
    gap: 3,
  })
  return renderFitBlock(chev.tx, layout.cy, fit, {
    labelFullText: chev.display.display,
    valueFullText: chev.item.value,
    labelFill: textColor,
    valueFill: textColor,
    labelWeight: '600',
    valueExtraAttrs: 'opacity="0.85"',
    shapeBounds: { x: chev.x, y: layout.y, w: layout.chevW, h: CHEV_H, label: 'chevron-node' },
  })
}

function renderChevron(chev: ChevronGeometry, layout: ChevronLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  return wrapItem(renderShape(chev, layout, theme) + renderText(chev, layout), chev.index, animate, instrument)
}

function renderSvg(layout: ChevronLayout, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${layout.height}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  if (spec.items.length > MAX_ITEMS) return renderProcess(spec, theme)

  const layout = resolveLayout(spec)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const chevrons = placeChevrons(spec, layout, theme)
  const parts = [
    ...(animate ? [seqSpotlightCSS(layout.n, spec)] : []),
    renderTitle(spec, theme),
    ...chevrons.map(chev => renderChevron(chev, layout, theme, animate, instrument)),
  ].filter(Boolean)

  return renderSvg(layout, theme, parts)
}
