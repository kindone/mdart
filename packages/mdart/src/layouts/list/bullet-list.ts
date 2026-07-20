import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import {
  escapeXml,
  wrapLabel,
  aWrap,
  lerpColor,
  renderEmpty,
  itemTitleTag,
  shouldAnimate,
  seqSpotlightCSS,
  wrapItem,
  shouldInstrument,
  renderInlineMarkdown,
  FONT_SANS_ATTR,
} from '../shared'

const W = 460
const PAD = 16
const TITLE_H = 28
const TITLE_FS = 13
const TITLE_Y_OFFSET = 16

const LBL_FS = 12
const LBL_LH = 15
const VAL_FS = 11
const VAL_LH = 14
const CHD_FS = 11
const CHD_LH = 17

const FIRST_LBL_BL = 22
const LBL_VAL_STEP = 16
const PAD_B = 10

const MAIN_MARKER_X = PAD + 8
const MAIN_TEXT_X = PAD + 22
const SUB_MARKER_X = PAD + 28
const SUB_TEXT_X = PAD + 38

const MAIN_MARKER_R = 5
const SUB_MARKER_R = 3
const MARKER_BASELINE_OFFSET = 4

const LABEL_MAX = Math.max(12, Math.floor((W - PAD * 2 - MAIN_TEXT_X) / 6.5))
const VALUE_MAX = Math.max(12, Math.floor((W - PAD * 2 - MAIN_TEXT_X) / 6.0))
const CHILD_MAX = Math.max(12, Math.floor((W - PAD * 2 - SUB_TEXT_X) / 6.0))

interface ItemLayout {
  lblLines: string[]
  lblTrunc: boolean
  lblUrl: string | null
  valLines: string[]
  valTrunc: boolean
  valUrl: string | null
  chdLayouts: Array<{ lines: string[]; truncated: boolean }>
  itemH: number
  firstValBL: number
  firstChdBL: number
}

interface ListLayout {
  titleH: number
  height: number
  items: ItemLayout[]
}

interface ItemPlacement {
  item: MdArtItem
  layout: ItemLayout
  index: number
  y: number
  fill: string
}

function titleHeight(spec: MdArtSpec): number {
  return spec.title ? TITLE_H : 0
}

function computeItemLayout(item: MdArtItem): ItemLayout {
  const { lines: lblLines, truncated: lblTrunc, url: lblUrl } = wrapLabel(item.label, LABEL_MAX, 5)
  const { lines: valLines, truncated: valTrunc, url: valUrl } = item.value
    ? wrapLabel(item.value, VALUE_MAX, 5)
    : { lines: [], truncated: false, url: null }
  const chdLayouts = item.children.map(ch => wrapLabel(ch.label, CHILD_MAX, 5))

  const lastLblBL = FIRST_LBL_BL + (lblLines.length - 1) * LBL_LH
  let anchorBL = lastLblBL
  let firstValBL = 0
  if (valLines.length > 0) {
    firstValBL = lastLblBL + LBL_VAL_STEP
    anchorBL = firstValBL + (valLines.length - 1) * VAL_LH
  }

  let firstChdBL = 0
  let lastBL = anchorBL
  if (item.children.length > 0) {
    const gap = item.value ? 20 : 26
    firstChdBL = anchorBL + gap
    const total = chdLayouts.reduce((s, { lines }) => s + lines.length, 0)
    lastBL = firstChdBL + (total - 1) * CHD_LH
  }

  return {
    lblLines,
    lblTrunc,
    lblUrl,
    valLines,
    valTrunc,
    valUrl,
    chdLayouts,
    itemH: lastBL + PAD_B,
    firstValBL,
    firstChdBL,
  }
}

function resolveLayout(spec: MdArtSpec): ListLayout {
  const itemLayouts = spec.items.map(computeItemLayout)
  return {
    titleH: titleHeight(spec),
    height: PAD + titleHeight(spec) + itemLayouts.reduce((s, l) => s + l.itemH, 0) + PAD,
    items: itemLayouts,
  }
}

function placeItems(spec: MdArtSpec, layout: ListLayout, theme: MdArtTheme): ItemPlacement[] {
  let y = PAD + layout.titleH
  return spec.items.map((item, index) => {
    const itemLayout = layout.items[index]
    const t = spec.items.length > 1 ? index / (spec.items.length - 1) : 0
    const placement = {
      item,
      layout: itemLayout,
      index,
      y,
      fill: lerpColor(theme.secondary, theme.primary, t),
    }
    y += itemLayout.itemH
    return placement
  })
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  if (!spec.title) return ''
  return `<text x="${PAD}" y="${PAD + TITLE_Y_OFFSET}" font-size="${TITLE_FS}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(spec.title)}</text>`
}

function renderInlineLines(lines: string[], x: number, lineH: number): string {
  return lines.map((line, li) => renderInlineMarkdown(line, { x, dy: li === 0 ? 0 : lineH })).join('')
}

function renderMainMarker(placement: ItemPlacement): string {
  const cy = placement.y + FIRST_LBL_BL - MARKER_BASELINE_OFFSET
  return `<circle cx="${MAIN_MARKER_X}" cy="${cy}" r="${MAIN_MARKER_R}" fill="${placement.fill}" >${itemTitleTag(placement.item)}</circle>`
}

function renderLabel(placement: ItemPlacement, theme: MdArtTheme): string {
  const { item, layout } = placement
  const tip = layout.lblTrunc ? `<title>${escapeXml(item.label)}</title>` : ''
  const spans = renderInlineLines(layout.lblLines, MAIN_TEXT_X, LBL_LH)
  return aWrap(`<text x="${MAIN_TEXT_X}" y="${placement.y + FIRST_LBL_BL}" font-size="${LBL_FS}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${tip}${spans}</text>`, layout.lblUrl)
}

function renderValue(placement: ItemPlacement, theme: MdArtTheme): string {
  const { item, layout } = placement
  if (layout.valLines.length === 0) return ''
  const tip = layout.valTrunc ? `<title>${escapeXml(item.value ?? '')}</title>` : ''
  const spans = renderInlineLines(layout.valLines, MAIN_TEXT_X, VAL_LH)
  return aWrap(`<text x="${MAIN_TEXT_X}" y="${placement.y + layout.firstValBL}" font-size="${VAL_FS}" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-style="italic">${tip}${spans}</text>`, layout.valUrl)
}

function renderChild(placement: ItemPlacement, child: MdArtItem, childIndex: number, baseline: number, theme: MdArtTheme): string {
  const { lines, truncated } = placement.layout.chdLayouts[childIndex]
  const cy = baseline - MARKER_BASELINE_OFFSET
  const tip = truncated ? `<title>${escapeXml(child.label)}</title>` : ''
  const spans = renderInlineLines(lines, SUB_TEXT_X, CHD_LH)
  return `<circle cx="${SUB_MARKER_X}" cy="${cy}" r="${SUB_MARKER_R}" fill="${placement.fill}" fill-opacity="0.7" />` +
    `<text x="${SUB_TEXT_X}" y="${baseline}" font-size="${CHD_FS}" fill="${theme.text}" fill-opacity="0.85" ${FONT_SANS_ATTR}>${tip}${spans}</text>`
}

function renderChildren(placement: ItemPlacement, theme: MdArtTheme): string {
  let baseline = placement.y + placement.layout.firstChdBL
  return placement.item.children.map((child, childIndex) => {
    const childSvg = renderChild(placement, child, childIndex, baseline, theme)
    baseline += placement.layout.chdLayouts[childIndex].lines.length * CHD_LH
    return childSvg
  }).join('')
}

function renderDivider(placement: ItemPlacement, rowCount: number, theme: MdArtTheme): string {
  if (placement.index >= rowCount - 1) return ''
  const y = placement.y + placement.layout.itemH
  return `<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="${theme.border}" stroke-width="0.5" />`
}

function renderItem(placement: ItemPlacement, rowCount: number, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const node = renderMainMarker(placement) +
    renderLabel(placement, theme) +
    renderValue(placement, theme) +
    renderChildren(placement, theme)
  return wrapItem(node, placement.index, animate, instrument) + renderDivider(placement, rowCount, theme)
}

function renderSvg(layout: ListLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  const animate = shouldAnimate(spec)
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${layout.height}" fill="${theme.bg}" rx="8"/>
    ${animate ? seqSpotlightCSS(spec.items.length, spec) : ''}
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)

  const layout = resolveLayout(spec)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const placements = placeItems(spec, layout, theme)
  const parts = [
    renderTitle(spec, theme),
    ...placements.map(placement => renderItem(placement, placements.length, theme, animate, instrument)),
  ].filter(Boolean)

  return renderSvg(layout, spec, theme, parts)
}
