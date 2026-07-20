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

const BADGE_W = 22
const BADGE_H = 22
const SUB_W = 14
const SUB_H = 14
const MAIN_BADGE_X = PAD
const MAIN_TEXT_X = PAD + BADGE_W + 8
const SUB_BADGE_X = PAD + 16
const SUB_TEXT_X = SUB_BADGE_X + SUB_W + 6
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

function subLetter(j: number): string {
  return j < 26 ? String.fromCharCode(97 + j) : String(j + 1)
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
  const titleH = titleHeight(spec)
  return {
    titleH,
    height: PAD + titleH + itemLayouts.reduce((s, l) => s + l.itemH, 0) + PAD,
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

function renderMainBadge(placement: ItemPlacement, theme: MdArtTheme): string {
  const cy = placement.y + FIRST_LBL_BL - MARKER_BASELINE_OFFSET
  return `<rect x="${MAIN_BADGE_X}" y="${(cy - BADGE_H / 2).toFixed(1)}" width="${BADGE_W}" height="${BADGE_H}" rx="4" fill="${placement.fill}" >${itemTitleTag(placement.item)}</rect>` +
    `<text x="${(MAIN_BADGE_X + BADGE_W / 2).toFixed(1)}" y="${(cy + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${placement.index + 1}</text>`
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

function renderChildBadge(placement: ItemPlacement, childIndex: number, baseline: number, theme: MdArtTheme): string {
  const cy = baseline - MARKER_BASELINE_OFFSET
  if (placement.item.children.length > 1) {
    return `<rect x="${SUB_BADGE_X}" y="${(cy - SUB_H / 2).toFixed(1)}" width="${SUB_W}" height="${SUB_H}" rx="3" fill="${placement.fill}" fill-opacity="0.6" />` +
      `<text x="${(SUB_BADGE_X + SUB_W / 2).toFixed(1)}" y="${(cy + 3).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${subLetter(childIndex)}</text>`
  }
  return `<circle cx="${(SUB_BADGE_X + SUB_W / 2).toFixed(1)}" cy="${cy.toFixed(1)}" r="4" fill="${placement.fill}" fill-opacity="0.7" />`
}

function renderChild(placement: ItemPlacement, child: MdArtItem, childIndex: number, baseline: number, theme: MdArtTheme): string {
  const { lines, truncated } = placement.layout.chdLayouts[childIndex]
  const tip = truncated ? `<title>${escapeXml(child.label)}</title>` : ''
  const spans = renderInlineLines(lines, SUB_TEXT_X, CHD_LH)
  return renderChildBadge(placement, childIndex, baseline, theme) +
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
  const node = renderMainBadge(placement, theme) +
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
