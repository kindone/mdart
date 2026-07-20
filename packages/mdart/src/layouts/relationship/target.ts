import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, wrapLabel, renderWrappedText, FONT_SANS_ATTR } from '../shared'

const W = 660
const TITLE_H_WITH_TITLE = 28
const TITLE_H_NO_TITLE = 8
const ROW_H = 56
const MIN_BODY_H = 360
const CENTER_X = 170
const VALUE_X = 360

interface TargetLayout {
  n: number
  titleH: number
  height: number
  centerY: number
  maxR: number
}

interface TargetRing {
  item: MdArtItem
  index: number
  r: number
  innerR: number
  bandR: number
  rowY: number
  dotX: number
  fillAlpha: string
  labelWeight: string
}

function resolveLayout(spec: MdArtSpec): TargetLayout {
  const n = spec.items.length
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const height = Math.max(MIN_BODY_H + titleH, titleH + 34 + n * ROW_H + 24)
  return {
    n,
    titleH,
    height,
    centerY: titleH + (height - titleH) / 2,
    maxR: Math.min(145, (height - titleH) / 2 - 14),
  }
}

function svg(layout: TargetLayout, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

function renderCrosshair(layout: TargetLayout, theme: MdArtTheme): string {
  return `<line x1="${CENTER_X - layout.maxR - 6}" y1="${layout.centerY}" x2="${CENTER_X + layout.maxR + 6}" y2="${layout.centerY}" stroke="${theme.border}28" stroke-width="1"/>`
    + `<line x1="${CENTER_X}" y1="${layout.centerY - layout.maxR - 6}" x2="${CENTER_X}" y2="${layout.centerY + layout.maxR + 6}" stroke="${theme.border}28" stroke-width="1"/>`
}

function placeRings(spec: MdArtSpec, layout: TargetLayout): TargetRing[] {
  return spec.items.map((item, index) => {
    const r = layout.maxR * (index + 1) / layout.n
    const innerR = index === 0 ? 0 : layout.maxR * index / layout.n
    const bandR = (r + innerR) / 2
    const offsetY = index === 0 ? 0 : bandR
    const t = index / Math.max(layout.n - 1, 1)
    return {
      item,
      index,
      r,
      innerR,
      bandR,
      rowY: layout.centerY + offsetY,
      dotX: CENTER_X + Math.sqrt(Math.max(0, r * r - offsetY * offsetY)),
      fillAlpha: Math.round(14 + (1 - t) * 36).toString(16).padStart(2, '0'),
      labelWeight: index === 0 ? '800' : '650',
    }
  })
}

function renderRingShape(node: TargetRing, layout: TargetLayout, theme: MdArtTheme): string {
  return `<circle cx="${CENTER_X}" cy="${layout.centerY}" r="${node.r.toFixed(1)}" fill="${theme.primary}${node.fillAlpha}" stroke="${theme.primary}66" stroke-width="1.5">${itemTitleTag(node.item)}</circle>`
}

function renderRingLabel(node: TargetRing, theme: MdArtTheme): string {
  const { display, url } = displayLabel(node.item, { value: !!node.item.value })
  const labelBoxW = Math.max(44, Math.min(116, node.r * 1.55))
  const labelWrap = { ...wrapLabel(display, Math.max(8, Math.floor(labelBoxW / 6)), 1), url }
  return renderWrappedText(CENTER_X, node.rowY + 4, `text-anchor="middle" font-size="10.5" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="${node.labelWeight}"`, display, labelWrap, 12, node.item)
}

function renderValueCallout(node: TargetRing, theme: MdArtTheme): string {
  if (!node.item.value) return ''
  const valueWrap = wrapLabel(node.item.value, 50, 3)
  const valueY = node.rowY - ((valueWrap.lines.length - 1) * 12) / 2 + 4
  return `<circle cx="${node.dotX.toFixed(1)}" cy="${node.rowY.toFixed(1)}" r="3.5" fill="${theme.primary}" opacity="${node.index === 0 ? '1' : '0.8'}"/>`
    + `<path d="M${(node.dotX + 6).toFixed(1)},${node.rowY.toFixed(1)} L${(VALUE_X - 18).toFixed(1)},${node.rowY.toFixed(1)}" fill="none" stroke="${theme.primary}66" stroke-width="1"/>`
    + renderWrappedText(VALUE_X, valueY, `font-size="9.5" fill="${theme.textMuted}" ${FONT_SANS_ATTR}`, node.item.value, valueWrap, 12)
}

function renderRing(node: TargetRing, layout: TargetLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const unit = renderRingShape(node, layout, theme) + renderRingLabel(node, theme) + renderValueCallout(node, theme)
  return wrapItem(unit, node.index, animate, instrument)
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const layout = resolveLayout(spec)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const rings = placeRings(spec, layout)
  const parts = [
    ...(animate ? [seqSpotlightCSS(layout.n, spec, { scale: false })] : []),
    renderCrosshair(layout, theme),
    ...rings.slice().reverse().map(node => renderRing(node, layout, theme, animate, instrument)),
  ]
  return svg(layout, theme, spec.title, parts)
}
