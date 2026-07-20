import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import {
  escapeXml,
  wrapLabel,
  aWrap,
  lerpColor,
  renderEmpty,
  getCaption,
  itemTitleTag,
  shouldAnimate,
  seqSpotlightCSS,
  wrapItem,
  shouldInstrument,
  renderInlineMarkdown,
  FONT_SANS_ATTR,
} from '../shared'

const W = 500
const LINE_X = W / 2
const CARD_W = 185
const CARD_GAP = 20
const OUTER_PAD = 20
const TITLE_H = 28

const PAD_V = 10
const SEC_G = 4
const DOT_R = 7
const CARD_RX = 6
const CARD_LINE_GAP = 14

const LBL_FS = 11
const LBL_LH = 14
const CAP_FS = 10
const CAP_LH = 13
const ATTR_FS = 9
const ATTR_LH = 11
const MIN_CARD_H = 44
const INNER_W = CARD_W - 16
const LABEL_MAX = Math.max(10, Math.floor(INNER_W / 5.8))
const CAP_MAX = Math.max(12, Math.floor(INNER_W / 5.2))

interface CardLayout {
  lblLines: string[]
  lblTrunc: boolean
  lblUrl: string | null
  capLines: string[]
  capTrunc: boolean
  caption: string | null
  hasAttr: boolean
  blockH: number
  cardH: number
}

interface TimelineLayout {
  titleH: number
  height: number
  cardY: number[]
  cards: CardLayout[]
}

interface CardPlacement {
  item: MdArtItem
  layout: CardLayout
  index: number
  x: number
  y: number
  cx: number
  cy: number
  fill: string
}

function titleHeight(spec: MdArtSpec): number {
  return spec.title ? TITLE_H : 0
}

function computeCard(item: MdArtItem): CardLayout {
  const { lines: lblLines, truncated: lblTrunc, url: lblUrl } = wrapLabel(item.label, LABEL_MAX, 5)
  const caption = getCaption(item)
  const { lines: capLines, truncated: capTrunc } = caption
    ? wrapLabel(caption, CAP_MAX, 5)
    : { lines: [], truncated: false }
  const hasAttr = item.attrs.length > 0
  const blockH = lblLines.length * LBL_LH +
    (capLines.length > 0 ? SEC_G + capLines.length * CAP_LH : 0) +
    (hasAttr ? SEC_G + ATTR_LH : 0)
  return { lblLines, lblTrunc, lblUrl, capLines, capTrunc, caption, hasAttr, blockH, cardH: Math.max(MIN_CARD_H, PAD_V + blockH + PAD_V) }
}

function resolveLayout(spec: MdArtSpec): TimelineLayout {
  const cards = spec.items.map(computeCard)
  const cardY: number[] = []
  let y = OUTER_PAD + titleHeight(spec)
  for (const card of cards) {
    cardY.push(y)
    y += card.cardH + CARD_GAP
  }
  return { titleH: titleHeight(spec), height: y - CARD_GAP + OUTER_PAD, cardY, cards }
}

function placeCards(spec: MdArtSpec, layout: TimelineLayout, theme: MdArtTheme): CardPlacement[] {
  return spec.items.map((item, index) => {
    const card = layout.cards[index]
    const left = index % 2 === 0
    const x = left ? LINE_X - CARD_LINE_GAP - CARD_W : LINE_X + CARD_LINE_GAP
    const y = layout.cardY[index]
    const t = spec.items.length > 1 ? index / (spec.items.length - 1) : 0
    return {
      item,
      layout: card,
      index,
      x,
      y,
      cx: x + CARD_W / 2,
      cy: y + card.cardH / 2,
      fill: lerpColor(theme.secondary, theme.primary, t),
    }
  })
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  if (!spec.title) return ''
  return `<text x="${W / 2}" y="${OUTER_PAD + 16}" text-anchor="middle" font-size="13" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(spec.title)}</text>`
}

function renderBackbone(cards: CardPlacement[], theme: MdArtTheme): string {
  if (cards.length === 0) return ''
  return `<line x1="${LINE_X}" y1="${cards[0].cy}" x2="${LINE_X}" y2="${cards[cards.length - 1].cy}" stroke="${theme.border}" stroke-width="2" />`
}

function richSpans(lines: string[], x: number, lineH: number): string {
  return lines.map((line, lineIndex) => renderInlineMarkdown(line, { x, dy: lineIndex === 0 ? 0 : lineH })).join('')
}

function renderCardShape(card: CardPlacement, theme: MdArtTheme): string {
  return `<rect x="${card.x}" y="${card.y}" width="${CARD_W}" height="${card.layout.cardH}" rx="${CARD_RX}" fill="${theme.surface}" stroke="${card.fill}" stroke-width="1.5" >${itemTitleTag(card.item)}</rect>` +
    `<circle cx="${LINE_X}" cy="${card.cy}" r="${DOT_R}" fill="${card.fill}" />`
}

function renderCardText(card: CardPlacement, theme: MdArtTheme): string {
  let y = card.y + (card.layout.cardH - card.layout.blockH) / 2 + LBL_FS * 0.75
  const labelTip = card.layout.lblTrunc ? `<title>${escapeXml(card.item.label)}</title>` : ''
  let svg = aWrap(`<text x="${card.cx}" y="${y.toFixed(1)}" text-anchor="middle" font-size="${LBL_FS}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${labelTip}${richSpans(card.layout.lblLines, card.cx, LBL_LH)}</text>`, card.layout.lblUrl)
  y += card.layout.lblLines.length * LBL_LH

  if (card.layout.capLines.length > 0) {
    y += SEC_G
    const capTip = card.layout.capTrunc ? `<title>${escapeXml(card.layout.caption!)}</title>` : ''
    svg += `<text x="${card.cx}" y="${y.toFixed(1)}" text-anchor="middle" font-size="${CAP_FS}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${capTip}${richSpans(card.layout.capLines, card.cx, CAP_LH)}</text>`
    y += card.layout.capLines.length * CAP_LH
  }

  if (card.layout.hasAttr) {
    y += SEC_G
    svg += `<text x="${card.cx}" y="${y.toFixed(1)}" text-anchor="middle" font-size="${ATTR_FS}" fill="${theme.accent}" ${FONT_SANS_ATTR}>${escapeXml(card.item.attrs.join(', '))}</text>`
  }

  return svg
}

function renderCard(card: CardPlacement, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  return wrapItem(renderCardShape(card, theme) + renderCardText(card, theme), card.index, animate, instrument)
}

function renderSvg(layout: TimelineLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
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
  const cards = placeCards(spec, layout, theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts = [
    renderTitle(spec, theme),
    renderBackbone(cards, theme),
    ...cards.map(card => renderCard(card, theme, animate, instrument)),
  ].filter(Boolean)

  return renderSvg(layout, spec, theme, parts)
}
