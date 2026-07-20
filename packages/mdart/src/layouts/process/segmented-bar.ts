import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import {
  escapeXml,
  lerpColor,
  titleEl,
  renderEmpty,
  aWrap,
  itemTitleTag,
  displayLabel,
  shouldAnimate,
  seqSpotlightCSS,
  fitTextToWidthShared,
  wrapItem,
  shouldInstrument,
  roundedRectPath,
  FONT_SANS_ATTR,
} from '../shared'

const W = 560
const BAR_H = 32
const LABEL_H = 22
const TITLE_H_WITH_TITLE = 28
const TITLE_H_NO_TITLE = 8
const BAR_TOP_GAP = 12
const PAD = 8
const BOTTOM_PAD = 20
const OUTER_R = 5
const LABEL_FIT_PAD = 6

interface SegmentedBarLayout {
  titleH: number
  height: number
  barY: number
  barW: number
  weights: number[]
  totalWeight: number
  segmentWidths: number[]
}

interface SegmentPlacement {
  item: MdArtItem
  index: number
  x: number
  w: number
  fill: string
  label: ReturnType<typeof displayLabel>
  pctLabel: string
}

function titleHeight(spec: MdArtSpec): number {
  return spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
}

function resolveLayout(spec: MdArtSpec): SegmentedBarLayout {
  const weights = spec.items.map(item => parseFloat(item.value ?? '') || 1)
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  const barW = W - PAD * 2
  const titleH = titleHeight(spec)
  return {
    titleH,
    height: titleH + BAR_H + LABEL_H + BOTTOM_PAD,
    barY: titleH + BAR_TOP_GAP,
    barW,
    weights,
    totalWeight,
    segmentWidths: weights.map(weight => (weight / totalWeight) * barW),
  }
}

function placeSegments(spec: MdArtSpec, layout: SegmentedBarLayout, theme: MdArtTheme): SegmentPlacement[] {
  let x = PAD
  return spec.items.map((item, index) => {
    const w = layout.segmentWidths[index]
    const t = spec.items.length > 1 ? index / (spec.items.length - 1) : 0
    const placement = {
      item,
      index,
      x,
      w,
      fill: lerpColor(theme.primary, theme.secondary, t),
      label: displayLabel(item, { value: true }),
      pctLabel: item.value ?? `${Math.round(layout.weights[index] / layout.totalWeight * 100)}%`,
    }
    x += w
    return placement
  })
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  return spec.title ? titleEl(W, spec.title, theme) : ''
}

function segmentRadius(index: number, count: number): { left: number; right: number } {
  return {
    left: index === 0 ? OUTER_R : 0,
    right: index === count - 1 ? OUTER_R : 0,
  }
}

function renderSegmentShape(segment: SegmentPlacement, layout: SegmentedBarLayout, count: number): string {
  const radius = segmentRadius(segment.index, count)
  return `<path class="mdart-glow-stroke" d="${roundedRectPath(segment.x, layout.barY, segment.w, BAR_H, { tl: radius.left, bl: radius.left, tr: radius.right, br: radius.right })}" fill="${segment.fill}">${itemTitleTag(segment.item)}</path>`
}

function renderSegmentLabel(segment: SegmentPlacement, layout: SegmentedBarLayout): string {
  const fitW = Math.max(20, segment.w - LABEL_FIT_PAD)
  const { fontSize, results: [{ lines, truncated }] } = fitTextToWidthShared([segment.label.display], fitW, {
    maxSize: 10,
    minSize: 6.5,
    maxLines: 1,
  })
  const tip = truncated ? `<title>${escapeXml(segment.label.display)}</title>` : ''
  const x = segment.x + segment.w / 2
  return aWrap(`${tip}<text x="${x.toFixed(1)}" y="${(layout.barY + BAR_H / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="${fontSize}" fill="#fff" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(lines[0])}</text>`, segment.label.url)
}

function renderSegmentPercent(segment: SegmentPlacement, layout: SegmentedBarLayout): string {
  const fitW = Math.max(20, segment.w - LABEL_FIT_PAD)
  const { fontSize, results: [{ lines, truncated }] } = fitTextToWidthShared([segment.pctLabel], fitW, {
    maxSize: 9,
    minSize: 6,
    maxLines: 1,
  })
  const tip = truncated ? `<title>${escapeXml(segment.pctLabel)}</title>` : ''
  const x = segment.x + segment.w / 2
  return `${tip}<text x="${x.toFixed(1)}" y="${(layout.barY + BAR_H + 14).toFixed(1)}" text-anchor="middle" font-size="${fontSize}" fill="${segment.fill}" ${FONT_SANS_ATTR}>${escapeXml(lines[0])}</text>`
}

function renderSegment(segment: SegmentPlacement, layout: SegmentedBarLayout, count: number, animate: boolean, instrument: boolean): string {
  const node = renderSegmentShape(segment, layout, count) +
    renderSegmentLabel(segment, layout) +
    renderSegmentPercent(segment, layout)
  return wrapItem(node, segment.index, animate, instrument)
}

function renderSvg(layout: SegmentedBarLayout, theme: MdArtTheme, parts: string[]): string {
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
  const segments = placeSegments(spec, layout, theme)
  const parts = [
    ...(animate ? [seqSpotlightCSS(spec.items.length, spec, { scale: false })] : []),
    renderTitle(spec, theme),
    ...segments.map(segment => renderSegment(segment, layout, segments.length, animate, instrument)),
  ].filter(Boolean)

  return renderSvg(layout, theme, parts)
}
