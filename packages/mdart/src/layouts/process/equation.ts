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
  FONT_SANS_ATTR,
} from '../shared'

const W = 560
const CARD_H = 100
const CARD_W_MAX = 110
const OP_W = 24
const SIDE_PAD = 16
const TITLE_H_WITH_TITLE = 28
const TITLE_H_NO_TITLE = 8
const CARD_TOP_GAP = 8
const BOTTOM_PAD = 16
const HEADER_H = 22
const HEADER_BOTTOM_FILL_H = 8
const HEADER_RX = 7
const BODY_ROW_H = 16

interface EquationLayout {
  n: number
  titleH: number
  height: number
  cardW: number
  startX: number
  cardY: number
  displays: ReturnType<typeof displayLabel>[]
  headerFit: ReturnType<typeof fitTextToWidthShared>
  subLists: string[][]
  visibleSubLists: string[][]
  subFit: ReturnType<typeof fitTextToWidthShared>
}

interface CardPlacement {
  item: MdArtItem
  index: number
  x: number
  fill: string
}

function titleHeight(spec: MdArtSpec): number {
  return spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
}

function cardWidth(count: number): number {
  return Math.min(CARD_W_MAX, (W - SIDE_PAD - OP_W * (count - 1)) / count)
}

function itemSubList(item: MdArtItem): string[] {
  if (item.children.length) return item.children.map(child => child.label)
  if (item.value) return [item.value]
  return []
}

function visibleSubs(subs: string[]): string[] {
  return subs.length > 4 ? subs.slice(0, 3) : subs.slice(0, 4)
}

function resolveLayout(spec: MdArtSpec): EquationLayout {
  const n = spec.items.length
  const cardW = cardWidth(n)
  const titleH = titleHeight(spec)
  const totalW = n * cardW + (n - 1) * OP_W
  const displays = spec.items.map(item => displayLabel(item, { value: !!(item.children.length || item.value) }))
  const headerFit = fitTextToWidthShared(displays.map(display => display.display), cardW - 8, {
    maxSize: 10,
    minSize: 6.5,
    maxLines: 1,
  })
  const subLists = spec.items.map(itemSubList)
  const visibleSubLists = subLists.map(visibleSubs)
  const allVisibleSubs = visibleSubLists.flat()
  const subFit = allVisibleSubs.length
    ? fitTextToWidthShared(allVisibleSubs, cardW - 8, { maxSize: 9, minSize: 6, maxLines: 1 })
    : { fontSize: 9, lineHeight: 11.7, results: [] as ReturnType<typeof fitTextToWidthShared>['results'] }

  return {
    n,
    titleH,
    height: titleH + CARD_H + BOTTOM_PAD,
    cardW,
    startX: (W - totalW) / 2,
    cardY: titleH + CARD_TOP_GAP,
    displays,
    headerFit,
    subLists,
    visibleSubLists,
    subFit,
  }
}

function placeCards(spec: MdArtSpec, layout: EquationLayout, theme: MdArtTheme): CardPlacement[] {
  return spec.items.map((item, index) => {
    const isResult = index === spec.items.length - 1
    const t = spec.items.length > 1 ? index / (spec.items.length - 1) : 0
    return {
      item,
      index,
      x: layout.startX + index * (layout.cardW + OP_W),
      fill: isResult ? theme.accent : lerpColor(theme.primary, theme.secondary, t),
    }
  })
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  return spec.title ? titleEl(W, spec.title, theme) : ''
}

function renderCardShell(card: CardPlacement, layout: EquationLayout): string {
  const x = card.x
  const y = layout.cardY
  return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${layout.cardW.toFixed(1)}" height="${CARD_H}" rx="${HEADER_RX}" fill="${card.fill}22" stroke="${card.fill}88" stroke-width="1.5">${itemTitleTag(card.item)}</rect>` +
    `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${layout.cardW.toFixed(1)}" height="${HEADER_H}" rx="${HEADER_RX}" fill="${card.fill}"/>` +
    `<rect x="${x.toFixed(1)}" y="${(y + HEADER_H - HEADER_BOTTOM_FILL_H).toFixed(1)}" width="${layout.cardW.toFixed(1)}" height="${HEADER_BOTTOM_FILL_H}" fill="${card.fill}"/>`
}

function renderCardHeader(card: CardPlacement, layout: EquationLayout): string {
  const display = layout.displays[card.index]
  const fit = layout.headerFit.results[card.index]
  const tip = fit.truncated ? `<title>${escapeXml(display.display)}</title>` : ''
  const cx = card.x + layout.cardW / 2
  const y = layout.cardY + HEADER_H / 2 + 4
  return aWrap(`${tip}<text x="${cx.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="${layout.headerFit.fontSize}" fill="#fff" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(fit.lines[0])}</text>`, display.url)
}

function renderSubRows(card: CardPlacement, layout: EquationLayout, theme: MdArtTheme, subCursorStart: number): { svg: string; nextCursor: number } {
  const subs = layout.subLists[card.index]
  const visible = layout.visibleSubLists[card.index]
  const moreCount = subs.length - visible.length
  const bodyCy = layout.cardY + HEADER_H + (CARD_H - HEADER_H) / 2
  const totalRows = visible.length + (moreCount > 0 ? 1 : 0)
  const cx = card.x + layout.cardW / 2
  let cursor = subCursorStart
  let svg = ''

  visible.forEach((_, subIndex) => {
    const fit = layout.subFit.results[cursor++]
    const y = bodyCy + (subIndex - (totalRows - 1) / 2) * BODY_ROW_H + 4
    const tip = fit.truncated ? `<title>${escapeXml(subs[subIndex])}</title>` : ''
    svg += `${tip}<text x="${cx.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="${layout.subFit.fontSize}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${escapeXml(fit.lines[0])}</text>`
  })

  if (moreCount > 0) {
    const y = bodyCy + (visible.length - (totalRows - 1) / 2) * BODY_ROW_H + 4
    svg += `<text x="${cx.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="${layout.subFit.fontSize}" fill="${theme.textMuted}" fill-opacity="0.7" ${FONT_SANS_ATTR} font-style="italic">+${moreCount} more</text>`
  }

  return { svg, nextCursor: cursor }
}

function renderCard(card: CardPlacement, layout: EquationLayout, theme: MdArtTheme, subCursorStart: number, animate: boolean, instrument: boolean): { svg: string; nextCursor: number } {
  const subRows = renderSubRows(card, layout, theme, subCursorStart)
  const node = renderCardShell(card, layout) + renderCardHeader(card, layout) + subRows.svg
  return {
    svg: wrapItem(node, card.index, animate, instrument),
    nextCursor: subRows.nextCursor,
  }
}

function renderOperator(card: CardPlacement, layout: EquationLayout, theme: MdArtTheme, animate: boolean): string {
  if (card.index >= layout.n - 1) return ''
  const op = card.index === layout.n - 2 ? '=' : '+'
  const x = card.x + layout.cardW + OP_W / 2
  const y = layout.cardY + CARD_H / 2 + 8
  const text = `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="20" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="400">${op}</text>`
  return animate ? `<g class="mdart-arr-n${card.index + 1}">${text}</g>` : text
}

function renderCards(cards: CardPlacement[], layout: EquationLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string[] {
  const parts: string[] = []
  let subCursor = 0
  cards.forEach(card => {
    const rendered = renderCard(card, layout, theme, subCursor, animate, instrument)
    parts.push(rendered.svg)
    subCursor = rendered.nextCursor
    const operator = renderOperator(card, layout, theme, animate)
    if (operator) parts.push(operator)
  })
  return parts
}

function renderSvg(layout: EquationLayout, theme: MdArtTheme, parts: string[]): string {
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
  const cards = placeCards(spec, layout, theme)
  const parts = [
    ...(animate ? [seqSpotlightCSS(layout.n, spec)] : []),
    renderTitle(spec, theme),
    ...renderCards(cards, layout, theme, animate, instrument),
  ].filter(Boolean)

  return renderSvg(layout, theme, parts)
}
