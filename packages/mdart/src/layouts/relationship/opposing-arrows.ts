import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, wrapLabel, renderWrappedText, FONT_SANS_ATTR } from '../shared'

const W = 520
const TITLE_H_WITH_TITLE = 28
const TITLE_H_NO_TITLE = 8
const BODY_H = 180
const ARROW_H = 92
const CENTER_GAP = 18
const EDGE_PAD = 8
const HEAD_DEPTH = 32

interface ArrowLayout {
  titleH: number
  height: number
  cy: number
  leftStartX: number
  leftEndX: number
  rightStartX: number
  rightEndX: number
}

interface ArrowSide {
  item: MdArtItem
  index: number
  centerX: number
  points: string
  fill: string
  stroke: string
}

function resolveLayout(spec: MdArtSpec): ArrowLayout {
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const height = BODY_H + titleH
  const cy = titleH + (height - titleH) / 2
  return {
    titleH,
    height,
    cy,
    leftStartX: EDGE_PAD,
    leftEndX: W / 2 - CENTER_GAP / 2,
    rightStartX: W / 2 + CENTER_GAP / 2,
    rightEndX: W - EDGE_PAD,
  }
}

function fallbackItem(label: string): MdArtItem {
  return { label, children: [], attrs: [], flowChildren: [] }
}

function svg(layout: ArrowLayout, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

function arrowSides(spec: MdArtSpec, layout: ArrowLayout, theme: MdArtTheme): ArrowSide[] {
  const top = layout.cy - ARROW_H / 2
  const bottom = layout.cy + ARROW_H / 2
  const left = spec.items[0] ?? fallbackItem('Force A')
  const right = spec.items[1] ?? fallbackItem('Force B')
  return [
    {
      item: left,
      index: 0,
      centerX: (layout.leftStartX + layout.leftEndX) / 2 - 14,
      points: `${layout.leftStartX},${top} ${layout.leftEndX - HEAD_DEPTH},${top} ${layout.leftEndX},${layout.cy} ${layout.leftEndX - HEAD_DEPTH},${bottom} ${layout.leftStartX},${bottom}`,
      fill: `${theme.primary}2a`,
      stroke: `${theme.primary}77`,
    },
    {
      item: right,
      index: 1,
      centerX: (layout.rightStartX + layout.rightEndX) / 2 + 14,
      points: `${layout.rightEndX},${top} ${layout.rightStartX + HEAD_DEPTH},${top} ${layout.rightStartX},${layout.cy} ${layout.rightStartX + HEAD_DEPTH},${bottom} ${layout.rightEndX},${bottom}`,
      fill: `${theme.secondary}2a`,
      stroke: `${theme.secondary}77`,
    },
  ]
}

function renderArrowSide(side: ArrowSide, layout: ArrowLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const { display, url } = displayLabel(side.item, { value: !!side.item.value })
  const unit: string[] = [
    `<polygon points="${side.points}" fill="${side.fill}" stroke="${side.stroke}" stroke-width="1.5">${itemTitleTag(side.item)}</polygon>`,
  ]
  const labelWrap = wrapLabel(display, 28, 2)
  unit.push(aWrap(renderWrappedText(side.centerX, layout.cy - 24, `text-anchor="middle" font-size="11" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700"`, display, labelWrap, 12, side.item), url))

  let detailY = layout.cy + 4
  if (side.item.value) {
    const wrap = wrapLabel(side.item.value, 30, 2)
    unit.push(renderWrappedText(side.centerX, detailY, `text-anchor="middle" font-size="9" fill="${theme.textMuted}" ${FONT_SANS_ATTR}`, side.item.value, wrap, 11))
    detailY += wrap.lines.length * 11 + 2
  }
  side.item.children.slice(0, 3).forEach((ch) => {
    const wrap = wrapLabel(ch.label, 30, 1)
    unit.push(renderWrappedText(side.centerX, detailY, `text-anchor="middle" font-size="8.5" fill="${theme.textMuted}" ${FONT_SANS_ATTR}`, ch.label, wrap, 10, ch))
    detailY += wrap.lines.length * 10
  })
  return wrapItem(unit.join(''), side.index, animate, instrument)
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const layout = resolveLayout(spec)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts = [
    ...(animate ? [seqSpotlightCSS(2, spec, { scale: false })] : []),
    ...arrowSides(spec, layout, theme).map(side => renderArrowSide(side, layout, theme, animate, instrument)),
  ]
  return svg(layout, theme, spec.title, parts)
}
