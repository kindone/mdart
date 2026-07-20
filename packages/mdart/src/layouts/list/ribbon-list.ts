import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, tt, renderEmpty, getCaption, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 500
const RIB_H = 26
const GAP = 6
const FOLD = 10
const TAIL = 14
const VALUE_H = 12
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 8
const BOTTOM_PAD = 8
const LABEL_CHAR_PX = 5.5
const CAPTION_CHAR_PX = 3.6

interface RibbonRow {
  item: MdArtItem
  index: number
  y: number
  mid: number
  fill: string
  dark: string
  caption: string | null
}

function titleHeight(spec: MdArtSpec): number {
  return spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
}

function rowHeight(): number {
  return RIB_H + VALUE_H
}

function labelMax(): number {
  return Math.max(8, Math.floor((W - FOLD - TAIL - 20) / LABEL_CHAR_PX))
}

function captionMax(): number {
  return Math.max(40, Math.floor((W - 32) / CAPTION_CHAR_PX))
}

function diagramHeight(spec: MdArtSpec): number {
  return titleHeight(spec) + spec.items.length * (rowHeight() + GAP) + BOTTOM_PAD
}

function placeRows(spec: MdArtSpec, theme: MdArtTheme): RibbonRow[] {
  return spec.items.map((item, index) => {
    const y = titleHeight(spec) + index * (rowHeight() + GAP)
    const t = spec.items.length > 1 ? index / (spec.items.length - 1) : 0
    return {
      item,
      index,
      y,
      mid: y + RIB_H / 2,
      fill: lerpColor(theme.primary, theme.secondary, t),
      dark: lerpColor(theme.primary, theme.secondary, Math.min(1, t + 0.15)),
      caption: getCaption(item),
    }
  })
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  return spec.title
    ? `<text x="${W/2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(spec.title)}</text>`
    : ''
}

function renderRibbonShape(row: RibbonRow): string {
  const y = row.y
  const mid = row.mid
  return [
    `<polygon points="0,${y} ${FOLD},${mid} 0,${y+RIB_H}" fill="${row.dark}"/>`,
    `<rect x="${FOLD}" y="${y}" width="${W - FOLD - TAIL}" height="${RIB_H}" fill="${row.fill}">${itemTitleTag(row.item)}</rect>`,
    `<polygon points="${W-TAIL},${y} ${W},${y} ${W-TAIL/2},${mid} ${W},${y+RIB_H} ${W-TAIL},${y+RIB_H}" fill="${row.fill}"/>`,
    `<polygon points="${W-TAIL/2},${mid} ${W},${y} ${W},${y+RIB_H}" fill="${row.dark}"/>`,
  ].join('')
}

function renderRibbonLabel(row: RibbonRow): string {
  const { display, url } = displayLabel(row.item, { value: !!row.caption })
  return aWrap(`<text x="${FOLD + 10}" y="${(row.mid + 4).toFixed(1)}" font-size="11" fill="#fff" ${FONT_SANS_ATTR} font-weight="700" letter-spacing="0.06em">${tt(display.toUpperCase(), labelMax())}</text>`, url)
}

function renderCaption(row: RibbonRow, theme: MdArtTheme): string {
  if (!row.caption) return ''
  return `<text x="${W/2}" y="${(row.y + RIB_H + 12).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tt(row.caption, captionMax())}</text>`
}

function renderRow(row: RibbonRow, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const unit = [
    renderRibbonShape(row),
    renderRibbonLabel(row),
    renderCaption(row, theme),
  ].join('')
  return wrapItem(unit, row.index, animate, instrument)
}

function renderSvg(spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  const h = diagramHeight(spec)
  return `<svg viewBox="0 0 ${W} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${h}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const rows = placeRows(spec, theme)
  const parts = [
    renderTitle(spec, theme),
    ...rows.map(row => renderRow(row, theme, animate, instrument)),
  ]
  if (animate) parts.unshift(seqSpotlightCSS(rows.length, spec, { scale: false }))
  return renderSvg(spec, theme, parts)
}
