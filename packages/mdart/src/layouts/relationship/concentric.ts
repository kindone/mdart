import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, wrapLabel, renderWrappedText, FONT_SANS_ATTR } from '../shared'

const W = 660
const TITLE_H_WITH_TITLE = 28
const TITLE_H_NO_TITLE = 8
const ROW_H = 58
const MIN_BODY_H = 360
const CENTER_X = 170
const VALUE_X = 360

interface RingLayout {
  n: number
  titleH: number
  height: number
  centerY: number
  maxR: number
}

interface RingNode {
  item: MdArtItem
  index: number
  animIndex: number
  r: number
  innerR: number
  bandR: number
  labelY: number
  dotX: number
  fillAlpha: string
}

function resolveLayout(spec: MdArtSpec): RingLayout {
  const n = spec.items.length
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const height = Math.max(MIN_BODY_H + titleH, titleH + 34 + n * ROW_H + 24)
  return {
    n,
    titleH,
    height,
    centerY: titleH + (height - titleH) / 2,
    maxR: Math.min(145, (height - titleH) / 2 - 18),
  }
}

function svg(layout: RingLayout, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

function placeRings(spec: MdArtSpec, layout: RingLayout): RingNode[] {
  return spec.items.map((item, index) => {
    const r = layout.maxR * (layout.n - index) / layout.n
    const innerR = index === layout.n - 1 ? 0 : layout.maxR * (layout.n - index - 1) / layout.n
    const bandR = (r + innerR) / 2
    const offsetY = index === layout.n - 1 ? 0 : -bandR
    const labelY = layout.centerY + offsetY
    return {
      item,
      index,
      animIndex: layout.n - 1 - index,
      r,
      innerR,
      bandR,
      labelY,
      dotX: CENTER_X + Math.sqrt(Math.max(0, r * r - offsetY * offsetY)),
      fillAlpha: Math.round(12 + (index / layout.n) * 28).toString(16).padStart(2, '0'),
    }
  })
}

function renderRingShape(node: RingNode, layout: RingLayout, theme: MdArtTheme): string {
  return `<circle cx="${CENTER_X.toFixed(1)}" cy="${layout.centerY.toFixed(1)}" r="${node.r.toFixed(1)}" fill="${theme.primary}${node.fillAlpha}" stroke="${theme.primary}55" stroke-width="1.2">${itemTitleTag(node.item)}</circle>`
}

function renderRingLabel(node: RingNode, theme: MdArtTheme): string {
  const { display, url } = displayLabel(node.item, { value: !!node.item.value })
  const labelBoxW = Math.max(44, Math.min(116, Math.max(42, node.r - node.innerR + 54)))
  const wrap = { ...wrapLabel(display, Math.max(8, Math.floor(labelBoxW / 6)), 1), url }
  return renderWrappedText(CENTER_X, node.labelY + 4, `text-anchor="middle" font-size="10.5" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700"`, display, wrap, 12, node.item)
}

function renderValueCallout(node: RingNode, theme: MdArtTheme): string {
  if (!node.item.value) return ''
  const valueWrap = wrapLabel(node.item.value, 50, 3)
  const valueY = node.labelY - ((valueWrap.lines.length - 1) * 12) / 2 + 4
  return `<circle cx="${node.dotX.toFixed(1)}" cy="${node.labelY.toFixed(1)}" r="3" fill="${theme.primary}" opacity="0.85"/>`
    + `<path d="M${(node.dotX + 5).toFixed(1)},${node.labelY.toFixed(1)} L${(VALUE_X - 18).toFixed(1)},${node.labelY.toFixed(1)}" fill="none" stroke="${theme.primary}66" stroke-width="1"/>`
    + renderWrappedText(VALUE_X, valueY, `font-size="9.5" fill="${theme.textMuted}" ${FONT_SANS_ATTR}`, node.item.value, valueWrap, 12)
}

function renderRing(node: RingNode, layout: RingLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const unit = renderRingShape(node, layout, theme) + renderRingLabel(node, theme) + renderValueCallout(node, theme)
  return wrapItem(unit, node.animIndex, animate, instrument)
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const layout = resolveLayout(spec)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts = [
    ...(animate ? [seqSpotlightCSS(layout.n, spec, { scale: false })] : []),
    ...placeRings(spec, layout).map(node => renderRing(node, layout, theme, animate, instrument)),
  ]
  return svg(layout, theme, spec.title, parts)
}
