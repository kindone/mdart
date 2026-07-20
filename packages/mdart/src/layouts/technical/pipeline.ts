import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, lerpColor, renderEmpty, aWrap, itemTitleTag, displayLabelValue, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 600
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 8
const H_BODY = 100
const SIDE_PAD = 12
const ARROW_W = 18
const STAGE_H = 50
const STAGE_RX = 6
const ARROW_INSET = 4
const ARROW_HALF_H = 6
const TEXT_CHAR_PX = 7

interface PipelineLayout {
  titleH: number
  h: number
  stageW: number
  stageY: number
}

interface StagePlacement {
  item: MdArtItem
  index: number
  x: number
  fill: string
}

function resolveLayout(spec: MdArtSpec): PipelineLayout {
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const h = H_BODY + titleH
  const n = spec.items.length
  return {
    titleH,
    h,
    stageW: (W - SIDE_PAD * 2 - (n - 1) * ARROW_W) / n,
    stageY: titleH + (h - titleH - STAGE_H) / 2,
  }
}

function placeStages(spec: MdArtSpec, layout: PipelineLayout, theme: MdArtTheme): StagePlacement[] {
  const n = spec.items.length
  return spec.items.map((item, index) => ({
    item,
    index,
    x: SIDE_PAD + index * (layout.stageW + ARROW_W),
    fill: lerpColor(theme.primary, theme.secondary, index / Math.max(n - 1, 1)),
  }))
}

function renderTitle(theme: MdArtTheme, title: string | undefined): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return titleEl
}

function renderArrow(placement: StagePlacement, layout: PipelineLayout, theme: MdArtTheme): string {
  if (placement.index === 0) return ''
  const ax = placement.x - ARROW_W + ARROW_INSET
  const ay = layout.stageY + STAGE_H / 2
  return `<path d="M${ax.toFixed(1)},${(ay - ARROW_HALF_H).toFixed(1)} L${(ax + ARROW_W - ARROW_INSET).toFixed(1)},${ay.toFixed(1)} L${ax.toFixed(1)},${(ay + ARROW_HALF_H).toFixed(1)}" fill="${theme.textMuted}bb" stroke="none"/>`
}

function renderStageBox(placement: StagePlacement, layout: PipelineLayout): string {
  return `<rect x="${placement.x.toFixed(1)}" y="${layout.stageY.toFixed(1)}" width="${layout.stageW.toFixed(1)}" height="${STAGE_H}" rx="${STAGE_RX}" fill="${placement.fill}33" stroke="${placement.fill}99" stroke-width="1.5">${itemTitleTag(placement.item)}</rect>`
}

function renderStageText(placement: StagePlacement, layout: PipelineLayout, theme: MdArtTheme): string {
  const { display, url } = displayLabelValue(placement.item)
  const maxChars = Math.floor(layout.stageW / TEXT_CHAR_PX)
  return aWrap(`<text x="${(placement.x + layout.stageW / 2).toFixed(1)}" y="${(layout.stageY + STAGE_H / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="12" fill="${theme.text}" ${FONT_SANS_ATTR}>${tt(display, maxChars, placement.item)}</text>`, url)
}

function renderStage(placement: StagePlacement, layout: PipelineLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  return wrapItem([
    renderArrow(placement, layout, theme),
    renderStageBox(placement, layout),
    renderStageText(placement, layout, theme),
  ].join(''), placement.index, animate, instrument)
}

function svgWrap(layout: PipelineLayout, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${layout.h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${renderTitle(theme, title)}
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layout = resolveLayout(spec)
  const parts = placeStages(spec, layout, theme).map(stage =>
    renderStage(stage, layout, theme, animate, instrument),
  )

  if (animate) parts.unshift(seqSpotlightCSS(items.length, spec, { scale: false }))
  return svgWrap(layout, theme, spec.title, parts)
}
