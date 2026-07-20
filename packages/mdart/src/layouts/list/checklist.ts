import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, renderEmpty, itemTitleTag, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const DONE_ATTRS = ['done', '✓', 'complete']
const W = 480
const PAD = 16
const TITLE_H = 28

const LBL_FS = 12
const LBL_LH = 15
const VAL_FS = 10
const VAL_LH = 13
const CHD_FS = 10.5

const TOP_PAD = 8
const FIRST_LBL_BL = 22
const SEC_G = 14
const GAP_BEFORE_SUBS = 10
const SUB_BOX = 12
const SUB_GAP = 4
const BOTTOM_PAD = 8
const ITEM_GAP = 6
const MAIN_BOX = 18
const MAIN_TEXT_X = PAD + 26
const SUB_X = PAD + 32
const CHILD_TEXT_X = SUB_X + SUB_BOX + 6

const LBL_MAX = Math.max(12, Math.floor((W - PAD - 26 - PAD) / 4.8))
const VAL_MAX = Math.max(12, Math.floor((W - PAD - 26 - PAD) / 4.0))
const CHD_MAX = Math.max(12, Math.floor((W - PAD - 50 - PAD) / 4.2))

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
  firstSubTop: number
  extraAttrs: string[]
}

interface ChecklistLayout {
  titleH: number
  height: number
  items: ItemLayout[]
}

interface ChecklistItem {
  item: MdArtItem
  layout: ItemLayout
  index: number
  y: number
  done: boolean
}

function isDone(item: { attrs: string[] }): boolean {
  return item.attrs.some(attr => DONE_ATTRS.includes(attr))
}

function titleHeight(spec: MdArtSpec): number {
  return spec.title ? TITLE_H : 0
}

function computeItemLayout(item: MdArtItem): ItemLayout {
  const extraAttrs = item.attrs.filter(attr => !DONE_ATTRS.includes(attr))
  const lblMaxAdj = extraAttrs.length > 0
    ? Math.max(12, Math.floor((W - PAD - 26 - PAD - extraAttrs.join(', ').length * 5.5 - 30) / 4.8))
    : LBL_MAX

  const { lines: lblLines, truncated: lblTrunc, url: lblUrl } = wrapLabel(item.label, lblMaxAdj, 5)
  const { lines: valLines, truncated: valTrunc, url: valUrl } = item.value
    ? wrapLabel(item.value, VAL_MAX, 5)
    : { lines: [], truncated: false, url: null }
  const chdLayouts = item.children.map(ch => wrapLabel(ch.label, CHD_MAX, 5))

  const lastLblBL = FIRST_LBL_BL + (lblLines.length - 1) * LBL_LH
  let zoneBottom = lastLblBL + 4
  let firstValBL = 0
  if (valLines.length > 0) {
    firstValBL = lastLblBL + SEC_G
    zoneBottom = firstValBL + (valLines.length - 1) * VAL_LH + 4
  }

  let firstSubTop = 0
  let lastBottom = zoneBottom
  if (item.children.length > 0) {
    firstSubTop = zoneBottom + GAP_BEFORE_SUBS
    const subH = chdLayouts.reduce((sum, { lines }) => sum + Math.max(SUB_BOX, lines.length * VAL_LH) + SUB_GAP, 0) - SUB_GAP
    lastBottom = firstSubTop + subH
  }

  return {
    lblLines,
    lblTrunc,
    lblUrl,
    valLines,
    valTrunc,
    valUrl,
    chdLayouts,
    itemH: lastBottom + BOTTOM_PAD,
    firstValBL,
    firstSubTop,
    extraAttrs,
  }
}

function resolveLayout(spec: MdArtSpec): ChecklistLayout {
  const items = spec.items.map(computeItemLayout)
  const titleH = titleHeight(spec)
  const totalContent = items.reduce((sum, layout) => sum + layout.itemH, 0) + ITEM_GAP * Math.max(0, items.length - 1)
  return { titleH, height: PAD + titleH + totalContent + PAD, items }
}

function placeItems(spec: MdArtSpec, layout: ChecklistLayout): ChecklistItem[] {
  let y = PAD + layout.titleH
  return spec.items.map((item, index) => {
    const placement = { item, layout: layout.items[index], index, y, done: isDone(item) }
    y += placement.layout.itemH + ITEM_GAP
    return placement
  })
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  if (!spec.title) return ''
  return `<text x="${PAD}" y="${PAD + 16}" font-size="13" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(spec.title)}</text>`
}

function spans(lines: string[], x: number, lineH: number): string {
  return lines.map((line, lineIndex) => `<tspan x="${x}" dy="${lineIndex === 0 ? 0 : lineH}">${escapeXml(line)}</tspan>`).join('')
}

function renderCheck(x: number, y: number, stroke: string, large = false): string {
  if (large) {
    const cy = y + 9
    return `<polyline points="${x + 4},${cy} ${x + 8},${cy + 4} ${x + 14},${cy - 4}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" />`
  }
  const cy = y + SUB_BOX / 2
  return `<polyline points="${x + 3},${cy} ${x + 6},${cy + 2.5} ${x + 10},${cy - 3}" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linecap="round" />`
}

function renderMainBox(placement: ChecklistItem, theme: MdArtTheme): string {
  const boxY = placement.y + TOP_PAD
  return `<rect x="${PAD}" y="${boxY}" width="${MAIN_BOX}" height="${MAIN_BOX}" rx="3" fill="none" stroke="${theme.primary}" stroke-width="1.5" >${itemTitleTag(placement.item)}</rect>` +
    (placement.done ? renderCheck(PAD, boxY, theme.accent, true) : '')
}

function renderLabel(placement: ChecklistItem, theme: MdArtTheme): string {
  const style = placement.done
    ? `fill="${theme.text}" fill-opacity="0.62" font-style="italic"`
    : `fill="${theme.text}"`
  const tip = placement.layout.lblTrunc ? `<title>${escapeXml(placement.item.label)}</title>` : ''
  return aWrap(`<text x="${MAIN_TEXT_X}" y="${placement.y + FIRST_LBL_BL}" font-size="${LBL_FS}" ${FONT_SANS_ATTR} ${style}>${tip}${spans(placement.layout.lblLines, MAIN_TEXT_X, LBL_LH)}</text>`, placement.layout.lblUrl)
}

function renderAttrs(placement: ChecklistItem, theme: MdArtTheme): string {
  if (placement.layout.extraAttrs.length === 0) return ''
  return `<text x="${W - PAD}" y="${placement.y + FIRST_LBL_BL}" text-anchor="end" font-size="10" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>[${escapeXml(placement.layout.extraAttrs.join(', '))}]</text>`
}

function renderValue(placement: ChecklistItem, theme: MdArtTheme): string {
  if (placement.layout.valLines.length === 0) return ''
  const tip = placement.layout.valTrunc ? `<title>${escapeXml(placement.item.value ?? '')}</title>` : ''
  return aWrap(`<text x="${MAIN_TEXT_X}" y="${placement.y + placement.layout.firstValBL}" font-size="${VAL_FS}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tip}${spans(placement.layout.valLines, MAIN_TEXT_X, VAL_LH)}</text>`, placement.layout.valUrl)
}

function renderSubtask(placement: ChecklistItem, child: MdArtItem, childIndex: number, subTop: number, theme: MdArtTheme): string {
  const { lines, truncated } = placement.layout.chdLayouts[childIndex]
  const childDone = placement.done || isDone(child)
  const style = childDone
    ? `fill="${theme.text}" fill-opacity="0.55" font-style="italic"`
    : `fill="${theme.text}" fill-opacity="0.85"`
  const tip = truncated ? `<title>${escapeXml(child.label)}</title>` : ''
  return `<rect x="${SUB_X}" y="${subTop}" width="${SUB_BOX}" height="${SUB_BOX}" rx="2" fill="none" stroke="${theme.primary}" stroke-width="1.2" opacity="0.85" />` +
    (childDone ? renderCheck(SUB_X, subTop, theme.accent) : '') +
    `<text x="${CHILD_TEXT_X}" y="${subTop + 10}" font-size="${CHD_FS}" ${FONT_SANS_ATTR} ${style}>${tip}${spans(lines, CHILD_TEXT_X, VAL_LH)}</text>`
}

function renderSubtasks(placement: ChecklistItem, theme: MdArtTheme): string {
  let subTop = placement.y + placement.layout.firstSubTop
  return placement.item.children.map((child, childIndex) => {
    const svg = renderSubtask(placement, child, childIndex, subTop, theme)
    subTop += Math.max(SUB_BOX, placement.layout.chdLayouts[childIndex].lines.length * VAL_LH) + SUB_GAP
    return svg
  }).join('')
}

function renderSeparator(placement: ChecklistItem, rowCount: number, theme: MdArtTheme): string {
  if (placement.index >= rowCount - 1) return ''
  const sepY = placement.y + placement.layout.itemH + ITEM_GAP / 2
  return `<line x1="${PAD}" y1="${sepY.toFixed(1)}" x2="${W - PAD}" y2="${sepY.toFixed(1)}" stroke="${theme.border}" stroke-width="0.5" />`
}

function renderItem(placement: ChecklistItem, rowCount: number, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const node = renderMainBox(placement, theme) +
    renderLabel(placement, theme) +
    renderAttrs(placement, theme) +
    renderValue(placement, theme) +
    renderSubtasks(placement, theme)
  return wrapItem(node, placement.index, animate, instrument) + renderSeparator(placement, rowCount, theme)
}

function renderSvg(layout: ChecklistLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
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
  const placements = placeItems(spec, layout)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts = [
    renderTitle(spec, theme),
    ...placements.map(placement => renderItem(placement, placements.length, theme, animate, instrument)),
  ].filter(Boolean)

  return renderSvg(layout, spec, theme, parts)
}
