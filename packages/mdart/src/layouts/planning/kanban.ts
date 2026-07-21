import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 600
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 8
const GAP = 5
const HEADER_H = 34
const CARD_H = 28
const CARD_GAP = 6
const PAD = 8

interface KanbanLayout {
  n: number
  titleH: number
  colW: number
  colH: number
  height: number
  columns: ColumnLayout[]
}

interface ColumnLayout {
  item: MdArtItem
  index: number
  x: number
  y: number
  cards: CardLayout[]
}

interface CardLayout {
  item: MdArtItem
  index: number
  x: number
  y: number
  width: number
  lines: string[]
  url: string | null
  done: boolean
}

function wrapCardLabel(label: string, maxPerLine: number): string[] {
  if (label.length <= maxPerLine) return [label]
  const lines: string[] = []
  let current = ''
  for (const word of label.split(/\s+/)) {
    const next = current ? `${current} ${word}` : word
    if (next.length <= maxPerLine) {
      current = next
    } else {
      if (current) lines.push(current)
      current = word
      if (current.length > maxPerLine) {
        lines.push(`${current.slice(0, maxPerLine - 1)}…`)
        current = ''
      }
    }
  }
  if (current) lines.push(current)
  return lines.slice(0, 5)
}

function svg(layout: KanbanLayout, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

function resolveLayout(spec: MdArtSpec): KanbanLayout {
  const n = spec.items.length
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const colW = (W - (n + 1) * GAP) / n
  const maxCards = Math.max(...spec.items.map(column => column.children.length), 0)
  const colBodyH = maxCards * (CARD_H + CARD_GAP) + PAD
  const colH = HEADER_H + colBodyH + PAD
  const columns = spec.items.map((column, colIndex) => {
    const x = GAP + colIndex * (colW + GAP)
    const y = titleH + 8
    const cards = column.children.map((card, cardIndex) => {
      const cardX = x + PAD
      const cardY = y + HEADER_H + PAD + cardIndex * (CARD_H + CARD_GAP)
      const width = colW - PAD * 2
      const maxPerLine = Math.floor((width - 20) / 7)
      const { display, url } = displayLabel(card, { attrs: true })
      return {
        item: card,
        index: cardIndex,
        x: cardX,
        y: cardY,
        width,
        lines: wrapCardLabel(display, maxPerLine),
        url,
        done: card.attrs.includes('done'),
      }
    })
    return { item: column, index: colIndex, x, y, cards }
  })
  return { n, titleH, colW, colH, columns, height: titleH + 8 + colH + 12 }
}

function renderColumnHeader(column: ColumnLayout, layout: KanbanLayout, theme: MdArtTheme): string {
  const { display, url } = displayLabel(column.item)
  const badgeX = column.x + layout.colW - 18
  return `<rect x="${column.x.toFixed(1)}" y="${column.y.toFixed(1)}" width="${layout.colW.toFixed(1)}" height="${layout.colH}" rx="8" fill="${theme.surface}" stroke="${theme.border}" stroke-width="1">${itemTitleTag(column.item)}</rect>`
    + `<path d="M${(column.x + 8).toFixed(1)},${column.y.toFixed(1)} Q${column.x.toFixed(1)},${column.y.toFixed(1)} ${column.x.toFixed(1)},${(column.y + 8).toFixed(1)} L${column.x.toFixed(1)},${(column.y + HEADER_H).toFixed(1)} L${(column.x + layout.colW).toFixed(1)},${(column.y + HEADER_H).toFixed(1)} L${(column.x + layout.colW).toFixed(1)},${(column.y + 8).toFixed(1)} Q${(column.x + layout.colW).toFixed(1)},${column.y.toFixed(1)} ${(column.x + layout.colW - 8).toFixed(1)},${column.y.toFixed(1)} Z" fill="${theme.accent}22"/>`
    + aWrap(`<text x="${(column.x + layout.colW / 2).toFixed(1)}" y="${(column.y + 21).toFixed(1)}" text-anchor="middle" font-size="12" fill="${theme.accent}" ${FONT_SANS_ATTR} font-weight="600">${tt(display, 14, column.item)}</text>`, url)
    + (column.cards.length > 0
      ? `<circle cx="${badgeX.toFixed(1)}" cy="${(column.y + 17).toFixed(1)}" r="9" fill="${theme.accent}44"/>`
        + `<text x="${badgeX.toFixed(1)}" y="${(column.y + 21).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.text}" ${FONT_SANS_ATTR}>${column.cards.length}</text>`
      : '')
    + `<line x1="${column.x}" y1="${(column.y + HEADER_H).toFixed(1)}" x2="${(column.x + layout.colW).toFixed(1)}" y2="${(column.y + HEADER_H).toFixed(1)}" stroke="${theme.border}" stroke-width="1"/>`
}

function renderCard(card: CardLayout, theme: MdArtTheme): string {
  const textX = (card.x + 10).toFixed(1)
  const y1 = card.lines.length === 1 ? card.y + 18 : card.y + 12
  const y2 = card.y + 24
  const textAttrs = `font-size="11" fill="${card.done ? theme.muted : theme.text}" ${FONT_SANS_ATTR} ${card.done ? 'text-decoration="line-through"' : ''}`
  const body = card.lines.length === 1
    ? aWrap(`<text x="${textX}" y="${y1.toFixed(1)}" ${textAttrs}>${escapeXml(card.lines[0])}</text>`, card.url)
    : aWrap(`<text x="${textX}" y="${y1.toFixed(1)}" ${textAttrs}>${escapeXml(card.lines[0])}</text><text x="${textX}" y="${y2.toFixed(1)}" ${textAttrs}>${escapeXml(card.lines[1])}</text>`, card.url)
  return `<rect x="${card.x.toFixed(1)}" y="${card.y.toFixed(1)}" width="${card.width.toFixed(1)}" height="${CARD_H}" rx="5" fill="${theme.bg}" stroke="${theme.border}" stroke-width="1">${itemTitleTag(card.item)}</rect>`
    + body
}

function renderColumn(column: ColumnLayout, layout: KanbanLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const unit = [
    renderColumnHeader(column, layout, theme),
    ...column.cards.map(card => renderCard(card, theme)),
  ]
  return wrapItem(unit.join(''), column.index, animate, instrument)
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layout = resolveLayout(spec)
  const parts = [
    ...(animate ? [seqSpotlightCSS(layout.n, spec, { scale: false })] : []),
    ...layout.columns.map(column => renderColumn(column, layout, theme, animate, instrument)),
  ]
  return svg(layout, theme, spec.title, parts)
}
