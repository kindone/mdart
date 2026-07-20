import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import {
  escapeXml,
  lerpColor,
  tt,
  renderEmpty,
  parseLink,
  aWrap,
  wrapLabel,
  itemTitleTag,
  shouldAnimate,
  seqSpotlightCSS,
  wrapItem,
  shouldInstrument,
  renderInlineMarkdown,
  FONT_SANS_ATTR,
} from '../shared'

const W = 500
const MAX_CARDS = 4
const GAP = 8
const HEADER_H = 32
const VALUE_H = 18
const CHILD_PAD = 8
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 8
const BOTTOM_PAD = 8
const CARD_RX = 7
const HEADER_RX = 7

const KV_KEY_FS = 10
const KV_KEY_LH = 12
const KV_VAL_FS = 9
const KV_VAL_LH = 11
const KV_INNER_G = 2
const KV_OUTER_G = 6
const PLAIN_FS = 10
const PLAIN_LH = 13
const PLAIN_G = 5
const MIN_CHILD_H = 2 * (PLAIN_LH + PLAIN_G)

interface WrapResult {
  lines: string[]
  truncated: boolean
  url: string | null
}

interface ChildLayout {
  child: MdArtItem
  isKV: boolean
  keyWrap: WrapResult | null
  valWrap: WrapResult | null
  plainWrap: WrapResult | null
  slotH: number
}

interface CardLayout {
  item: MdArtItem
  children: ChildLayout[]
}

interface CardDeckLayout {
  n: number
  titleH: number
  anyValue: boolean
  valueH: number
  cardW: number
  cardH: number
  innerW: number
  headerMax: number
  valueMax: number
  childMax: number
  cards: CardLayout[]
  height: number
}

interface CardPlacement {
  item: MdArtItem
  layout: CardLayout
  index: number
  x: number
  y: number
  cx: number
  fill: string
}

function titleHeight(spec: MdArtSpec): number {
  return spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
}

function childLayout(child: MdArtItem, childMax: number): ChildLayout {
  if (child.value) {
    const keyWrap = wrapLabel(child.label, childMax, 2)
    const valWrap = wrapLabel(child.value, childMax, 3)
    return {
      child,
      isKV: true,
      keyWrap,
      valWrap,
      plainWrap: null,
      slotH: keyWrap.lines.length * KV_KEY_LH + KV_INNER_G + valWrap.lines.length * KV_VAL_LH + KV_OUTER_G,
    }
  }

  const plainWrap = wrapLabel(child.label, childMax, 3)
  return {
    child,
    isKV: false,
    keyWrap: null,
    valWrap: null,
    plainWrap,
    slotH: plainWrap.lines.length * PLAIN_LH + PLAIN_G,
  }
}

function resolveLayout(spec: MdArtSpec): CardDeckLayout {
  const n = Math.min(spec.items.length, MAX_CARDS)
  const slice = spec.items.slice(0, n)
  const anyValue = slice.some(item => item.value)
  const valueH = anyValue ? VALUE_H : 0
  const cardW = (W - (n - 1) * GAP) / n
  const innerW = Math.max(40, cardW - 20)
  const headerMax = Math.max(4, Math.floor(innerW / 6.0))
  const valueMax = Math.max(6, Math.floor(innerW / 5.5))
  const childMax = Math.max(4, Math.floor(innerW / 5.5))
  const cards = slice.map(item => ({ item, children: item.children.map(child => childLayout(child, childMax)) }))
  const maxChildH = Math.max(...cards.map(card => card.children.reduce((sum, child) => sum + child.slotH, 0)), MIN_CHILD_H)
  const cardH = HEADER_H + valueH + CHILD_PAD + maxChildH + CHILD_PAD
  const titleH = titleHeight(spec)

  return {
    n,
    titleH,
    anyValue,
    valueH,
    cardW,
    cardH,
    innerW,
    headerMax,
    valueMax,
    childMax,
    cards,
    height: titleH + cardH + BOTTOM_PAD,
  }
}

function placeCards(layout: CardDeckLayout, theme: MdArtTheme): CardPlacement[] {
  return layout.cards.map((card, index) => {
    const x = index * (layout.cardW + GAP)
    const t = layout.n > 1 ? index / (layout.n - 1) : 0
    return {
      item: card.item,
      layout: card,
      index,
      x,
      y: layout.titleH,
      cx: x + layout.cardW / 2,
      fill: lerpColor(theme.primary, theme.secondary, t),
    }
  })
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  if (!spec.title) return ''
  return `<text x="${W / 2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(spec.title)}</text>`
}

function renderCardBody(card: CardPlacement, layout: CardDeckLayout, theme: MdArtTheme): string {
  const x = card.x
  const y = card.y
  const w = layout.cardW
  const headerPath = [
    `M${(x + HEADER_RX).toFixed(1)},${y.toFixed(1)}`,
    `Q${x.toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${(y + HEADER_RX).toFixed(1)}`,
    `L${x.toFixed(1)},${(y + HEADER_H).toFixed(1)}`,
    `L${(x + w).toFixed(1)},${(y + HEADER_H).toFixed(1)}`,
    `L${(x + w).toFixed(1)},${(y + HEADER_RX).toFixed(1)}`,
    `Q${(x + w).toFixed(1)},${y.toFixed(1)} ${(x + w - HEADER_RX).toFixed(1)},${y.toFixed(1)}`,
    'Z',
  ].join(' ')

  return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${layout.cardH}" rx="${CARD_RX}" fill="${theme.surface}" stroke="${card.fill}66" stroke-width="1.2">${itemTitleTag(card.item)}</rect>` +
    `<path d="${headerPath}" fill="${card.fill}"/>`
}

function renderHeader(card: CardPlacement, layout: CardDeckLayout): string {
  const { display, url } = parseLink(card.item.label)
  const text = `<text x="${card.cx.toFixed(1)}" y="${(card.y + HEADER_H / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="#fff" ${FONT_SANS_ATTR} font-weight="700">${tt(display, layout.headerMax)}</text>`
  return aWrap(text, url)
}

function renderValue(card: CardPlacement, layout: CardDeckLayout, theme: MdArtTheme): string {
  if (!layout.anyValue || !card.item.value) return ''
  return `<text x="${card.cx.toFixed(1)}" y="${(card.y + HEADER_H + 13).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" fill-opacity="0.85" ${FONT_SANS_ATTR} font-style="italic">${tt(card.item.value, layout.valueMax)}</text>`
}

function renderRichLines(lines: string[], x: string, lineH: number): string {
  return lines.map((line, lineIndex) => renderInlineMarkdown(line, { x, dy: lineIndex === 0 ? 0 : lineH })).join('')
}

function renderKeyValueChild(child: ChildLayout, rowTop: number, cx: string, theme: MdArtTheme): string {
  const keyWrap = child.keyWrap!
  const valWrap = child.valWrap!
  const keyTip = keyWrap.truncated ? `<title>${escapeXml(child.child.label)}</title>` : ''
  const key = aWrap(`<text x="${cx}" y="${(rowTop + KV_KEY_FS).toFixed(1)}" text-anchor="middle" font-size="${KV_KEY_FS}" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${keyTip}${renderRichLines(keyWrap.lines, cx, KV_KEY_LH)}</text>`, keyWrap.url)
  const valY = rowTop + keyWrap.lines.length * KV_KEY_LH + KV_INNER_G + KV_VAL_FS
  const valTip = valWrap.truncated ? `<title>${escapeXml(child.child.value!)}</title>` : ''
  const value = aWrap(`<text x="${cx}" y="${valY.toFixed(1)}" text-anchor="middle" font-size="${KV_VAL_FS}" fill="${theme.text}" ${FONT_SANS_ATTR}>${valTip}${renderRichLines(valWrap.lines, cx, KV_VAL_LH)}</text>`, valWrap.url)
  return key + value
}

function renderPlainChild(child: ChildLayout, rowTop: number, cx: string, theme: MdArtTheme): string {
  const plainWrap = child.plainWrap!
  const tip = plainWrap.truncated ? `<title>${escapeXml(child.child.label)}</title>` : ''
  return aWrap(`<text x="${cx}" y="${(rowTop + PLAIN_FS).toFixed(1)}" text-anchor="middle" font-size="${PLAIN_FS}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tip}${renderRichLines(plainWrap.lines, cx, PLAIN_LH)}</text>`, plainWrap.url)
}

function renderChildren(card: CardPlacement, layout: CardDeckLayout, theme: MdArtTheme): string {
  const cx = card.cx.toFixed(1)
  let rowTop = card.y + HEADER_H + layout.valueH + CHILD_PAD
  return card.layout.children.map(child => {
    const svg = child.isKV
      ? renderKeyValueChild(child, rowTop, cx, theme)
      : renderPlainChild(child, rowTop, cx, theme)
    rowTop += child.slotH
    return svg
  }).join('')
}

function renderCard(card: CardPlacement, layout: CardDeckLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const node = renderCardBody(card, layout, theme) +
    renderHeader(card, layout) +
    renderValue(card, layout, theme) +
    renderChildren(card, layout, theme)
  return wrapItem(node, card.index, animate, instrument)
}

function renderSvg(layout: CardDeckLayout, theme: MdArtTheme, parts: string[]): string {
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
  const cards = placeCards(layout, theme)
  const parts = [
    ...(animate ? [seqSpotlightCSS(layout.n, spec)] : []),
    renderTitle(spec, theme),
    ...cards.map(card => renderCard(card, layout, theme, animate, instrument)),
  ].filter(Boolean)

  return renderSvg(layout, theme, parts)
}
