import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, renderEmpty, wrapLabel, aWrap, itemTitleTag, displayLabelValue, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 600
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 8
const SIDE_PAD = 12
const ARROW_W = 18
const STAGE_RX = 6
const ARROW_INSET = 4
const ARROW_HALF_H = 6
const TEXT_CHAR_PX = 7
const LINE_H = 16          // px per wrapped text line
const TEXT_PAD_V = 10      // vertical padding inside box, each side
const MIN_STAGE_H = 44     // floor so single-line boxes aren't too squat
const MAX_TEXT_LINES = 5   // hard cap on wrapping
const BODY_PAD_V = 16      // space above/below the stage row

interface PipelineLayout {
  titleH: number
  h: number
  stageW: number
  stageH: number   // dynamic: grows with wrapped line count
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
  const n = spec.items.length
  const stageW = (W - SIDE_PAD * 2 - (n - 1) * ARROW_W) / n
  const perLine = Math.max(4, Math.floor(stageW / TEXT_CHAR_PX))

  // Determine the tallest label across all stages
  const maxLines = Math.max(...spec.items.map(item => {
    const { display } = displayLabelValue(item)
    return wrapLabel(display, perLine, MAX_TEXT_LINES).lines.length
  }))
  const stageH = Math.max(MIN_STAGE_H, TEXT_PAD_V * 2 + maxLines * LINE_H)
  const h = titleH + stageH + BODY_PAD_V * 2

  return {
    titleH,
    h,
    stageW,
    stageH,
    stageY: titleH + BODY_PAD_V,
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
  const ay = layout.stageY + layout.stageH / 2
  return `<path d="M${ax.toFixed(1)},${(ay - ARROW_HALF_H).toFixed(1)} L${(ax + ARROW_W - ARROW_INSET).toFixed(1)},${ay.toFixed(1)} L${ax.toFixed(1)},${(ay + ARROW_HALF_H).toFixed(1)}" fill="${theme.textMuted}bb" stroke="none"/>`
}

function renderStageBox(placement: StagePlacement, layout: PipelineLayout): string {
  return `<rect x="${placement.x.toFixed(1)}" y="${layout.stageY.toFixed(1)}" width="${layout.stageW.toFixed(1)}" height="${layout.stageH}" rx="${STAGE_RX}" fill="${placement.fill}33" stroke="${placement.fill}99" stroke-width="1.5">${itemTitleTag(placement.item)}</rect>`
}

function renderStageText(placement: StagePlacement, layout: PipelineLayout, theme: MdArtTheme): string {
  const { display, url } = displayLabelValue(placement.item)
  const perLine = Math.max(4, Math.floor(layout.stageW / TEXT_CHAR_PX))
  const { lines } = wrapLabel(display, perLine, MAX_TEXT_LINES)
  const cx = placement.x + layout.stageW / 2
  // Baseline of first line: vertically center the text block inside the box
  const blockH = lines.length * LINE_H
  const firstBaseline = layout.stageY + (layout.stageH - blockH) / 2 + LINE_H - 3
  const tspans = lines.map((line, i) =>
    `<tspan x="${cx.toFixed(1)}" dy="${i === 0 ? 0 : LINE_H}">${escapeXml(line)}</tspan>`
  ).join('')
  return aWrap(
    `<text x="${cx.toFixed(1)}" y="${firstBaseline.toFixed(1)}" text-anchor="middle" font-size="12" fill="${theme.text}" ${FONT_SANS_ATTR}>${tspans}</text>`,
    url,
  )
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
