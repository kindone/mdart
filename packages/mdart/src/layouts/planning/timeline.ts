import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 720
const PAD = 40
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 10
const BAND = 62
const STEM_H = 16

interface TimelineLayout {
  n: number
  titleH: number
  lineY: number
  height: number
  spacing: number
  slotW: number
  maxChars: number
}

interface TimelineEvent {
  item: MdArtItem
  index: number
  x: number
  above: boolean
  active: boolean
  done: boolean
}

function svg(layout: TimelineLayout, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

function resolveLayout(spec: MdArtSpec): TimelineLayout {
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const n = spec.items.length
  const spacing = n > 1 ? (W - PAD * 2) / (n - 1) : 0
  const slotW = n > 1 ? spacing : W - PAD * 2
  return {
    n,
    titleH,
    lineY: titleH + BAND,
    height: titleH + BAND * 2 + 20,
    spacing,
    slotW,
    maxChars: Math.max(10, Math.floor(slotW / 6.5)),
  }
}

function placeEvents(spec: MdArtSpec, layout: TimelineLayout): TimelineEvent[] {
  return spec.items.map((item, index) => ({
    item,
    index,
    x: layout.n === 1 ? W / 2 : PAD + index * layout.spacing,
    above: index % 2 === 0,
    active: item.attrs.includes('active') || item.attrs.includes('current') || item.attrs.includes('now'),
    done: item.attrs.includes('done') || item.attrs.includes('past'),
  }))
}

function renderSpine(layout: TimelineLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  return wrapItem(`<line x1="${PAD}" y1="${layout.lineY}" x2="${W - PAD}" y2="${layout.lineY}" stroke="${theme.accent}66" stroke-width="2.5"/>`, 0, animate, instrument)
}

function textAnchor(event: TimelineEvent, layout: TimelineLayout): 'start' | 'end' | 'middle' {
  return event.index === 0 ? 'start' : event.index === layout.n - 1 ? 'end' : 'middle'
}

function renderMarker(event: TimelineEvent, layout: TimelineLayout, theme: MdArtTheme): string {
  const radius = event.active ? 8 : 6
  const fill = event.active ? theme.accent : event.done ? `${theme.accent}77` : theme.surface
  const stroke = event.active || event.done ? theme.accent : theme.border
  const stemY1 = event.above ? layout.lineY - radius : layout.lineY + radius
  const stemY2 = event.above ? layout.lineY - radius - STEM_H : layout.lineY + radius + STEM_H
  return `<line x1="${event.x.toFixed(1)}" y1="${stemY1.toFixed(1)}" x2="${event.x.toFixed(1)}" y2="${stemY2.toFixed(1)}" stroke="${theme.border}" stroke-width="1"/>`
    + `<circle cx="${event.x.toFixed(1)}" cy="${layout.lineY}" r="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${event.active ? 2 : 1.5}">${itemTitleTag(event.item)}</circle>`
    + (event.done && !event.active ? `<text x="${event.x.toFixed(1)}" y="${(layout.lineY + 4).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.accent}" ${FONT_SANS_ATTR}>✓</text>` : '')
}

function renderEventLabels(event: TimelineEvent, layout: TimelineLayout, theme: MdArtTheme): string {
  const { display, url } = displayLabel(event.item, { value: !!event.item.value, attrs: true })
  const subLabel = event.item.value ?? ''
  const anchor = textAnchor(event, layout)
  const color = event.active ? theme.accent : event.done ? theme.textMuted : theme.text
  const radius = event.active ? 8 : 6

  if (event.above) {
    if (subLabel) {
      return `<text x="${event.x.toFixed(1)}" y="${(layout.lineY - radius - STEM_H - 18).toFixed(1)}" text-anchor="${anchor}" font-size="10" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tt(display, layout.maxChars)}</text>`
        + aWrap(`<text x="${event.x.toFixed(1)}" y="${(layout.lineY - radius - STEM_H - 5).toFixed(1)}" text-anchor="${anchor}" font-size="11" fill="${color}" ${FONT_SANS_ATTR} font-weight="${event.active ? '600' : '400'}">${tt(subLabel, layout.maxChars)}</text>`, url)
    }
    return aWrap(`<text x="${event.x.toFixed(1)}" y="${(layout.lineY - radius - STEM_H - 5).toFixed(1)}" text-anchor="${anchor}" font-size="11" fill="${color}" ${FONT_SANS_ATTR} font-weight="${event.active ? '600' : '400'}">${tt(display, layout.maxChars)}</text>`, url)
  }

  const first = aWrap(`<text x="${event.x.toFixed(1)}" y="${(layout.lineY + radius + STEM_H + 14).toFixed(1)}" text-anchor="${anchor}" font-size="11" fill="${color}" ${FONT_SANS_ATTR} font-weight="${event.active ? '600' : '400'}">${tt(event.item.value ? subLabel : display, layout.maxChars)}</text>`, url)
  const second = event.item.value
    ? `<text x="${event.x.toFixed(1)}" y="${(layout.lineY + radius + STEM_H + 27).toFixed(1)}" text-anchor="${anchor}" font-size="10" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tt(display, layout.maxChars)}</text>`
    : ''
  return first + second
}

function renderEvent(event: TimelineEvent, layout: TimelineLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  return wrapItem(renderMarker(event, layout, theme) + renderEventLabels(event, layout, theme), event.index + 1, animate, instrument)
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layout = resolveLayout(spec)
  const parts = [
    ...(animate ? [seqSpotlightCSS(layout.n + 1, spec, { scale: false })] : []),
    renderSpine(layout, theme, animate, instrument),
    ...placeEvents(spec, layout).map(event => renderEvent(event, layout, theme, animate, instrument)),
  ]
  return svg(layout, theme, spec.title, parts)
}
