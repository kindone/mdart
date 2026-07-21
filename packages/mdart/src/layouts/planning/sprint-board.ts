import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, renderEmpty, aWrap, itemTitleTag, ellipsisIfDropped, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

function svgWrap(W: number, H: number, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

// ── Layout constants ─────────────────────────────────────────────────────────

const W       = 640
const GAP     = 10
const HEADER_H = 44
const CARD_LH  = 14    // line height inside cards
const CARD_PAD = 8     // vertical padding inside card
const CARD_GAP = 6
const FOOTER_H = 30

type SprintCard = {
  src: MdArtItem
  lines: string[]
  truncated: boolean
  url: string | null
  pts: number
  done: boolean
  active: boolean
  cardH: number
  cw: number
}

type SprintColumn = {
  src: MdArtItem
  index: number
  x: number
  y: number
  isDoneCol: boolean
  cards: SprintCard[]
  pts: number
}

type SprintLayout = {
  titleH: number
  colW: number
  colH: number
  height: number
  columns: SprintColumn[]
  totalPts: number
  donePts: number
}

function pointsOf(item: MdArtItem): number {
  return parseInt(item.value ?? item.attrs.find(a => /^\d+$/.test(a)) ?? '0') || 0
}

function measureCard(card: MdArtItem, colW: number, isDoneCol: boolean): SprintCard {
  const pts = pointsOf(card)
  const done = isDoneCol || card.attrs.includes('done')
  const active = card.attrs.includes('active') || card.attrs.includes('doing') || card.attrs.includes('wip')
  const cw = colW - CARD_PAD * 2
  const ptsW = pts > 0 ? 30 : 12
  const maxChars = Math.max(8, Math.floor((cw - (active ? 10 : 0) - ptsW) / 6.5))
  // pts come from value or first numeric attr; done/active are visible.
  // Ellipsis cue when other attrs would be invisible.
  const cardLbl = ellipsisIfDropped(card.label, card, { value: pts > 0, attrs: true })
  const { lines, truncated, url } = wrapLabel(cardLbl, maxChars, 5)
  const cardH = CARD_PAD + lines.length * CARD_LH + CARD_PAD
  return { src: card, lines, truncated, url, pts, done, active, cardH, cw }
}

function resolveLayout(spec: MdArtSpec): SprintLayout {
  const titleH = spec.title ? 32 : 8
  const n = spec.items.length
  const colW = (W - (n + 1) * GAP) / n
  const colY = titleH + 8

  let totalPts = 0
  let donePts = 0
  const columns = spec.items.map((col, index) => {
    const isDoneCol = /done|complete/i.test(col.label)
    const cards = col.children.map(card => {
      const info = measureCard(card, colW, isDoneCol)
      totalPts += info.pts
      if (info.done) donePts += info.pts
      return info
    })
    const pts = cards.reduce((sum, card) => sum + card.pts, 0)
    return {
      src: col,
      index,
      x: GAP + index * (colW + GAP),
      y: colY,
      isDoneCol,
      cards,
      pts,
    }
  })

  // Column height = HEADER + sum of card heights + CARD_GAP between them + CARD_PAD top/bottom
  const colH = Math.max(
    HEADER_H + 60,
    ...columns.map(col => {
      const cards = col.cards
      const cardsH = cards.reduce((s, c) => s + c.cardH + CARD_GAP, 0) - CARD_GAP
      return HEADER_H + CARD_PAD * 2 + (cards.length > 0 ? cardsH : 0)
    })
  )

  return {
    titleH,
    colW,
    colH,
    height: titleH + 8 + colH + FOOTER_H + 12,
    columns,
    totalPts,
    donePts,
  }
}

function renderColumnHeader(column: SprintColumn, layout: SprintLayout, theme: MdArtTheme): string {
  const x = column.x
  const y = column.y
  const w = layout.colW
  const labelMax = Math.max(6, Math.floor((w - 10) / 6.5))
  const { lines } = wrapLabel(column.src.label, labelMax, 1)
  return [
    `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${layout.colH}" rx="8" fill="${theme.surface}" stroke="${theme.border}" stroke-width="1">${itemTitleTag(column.src)}</rect>`,
    `<path d="M${(x + 8).toFixed(1)},${y} Q${x},${y} ${x},${y + 8} L${x},${y + HEADER_H} L${(x + w).toFixed(1)},${y + HEADER_H} L${(x + w).toFixed(1)},${y + 8} Q${(x + w).toFixed(1)},${y} ${(x + w - 8).toFixed(1)},${y} Z" fill="${theme.accent}22"/>`,
    `<text x="${(x + w / 2).toFixed(1)}" y="${y + 19}" text-anchor="middle" font-size="12" fill="${theme.accent}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(lines[0] ?? column.src.label)}</text>`,
    `<text x="${(x + w / 2).toFixed(1)}" y="${y + 34}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${column.pts} pts</text>`,
    `<line x1="${x}" y1="${y + HEADER_H}" x2="${(x + w).toFixed(1)}" y2="${y + HEADER_H}" stroke="${theme.border}" stroke-width="1"/>`,
  ].join('')
}

function renderSprintCard(card: SprintCard, x: number, y: number, theme: MdArtTheme): string {
  const { src, lines, truncated, url, pts, done, active, cardH, cw } = card
  const border = active ? theme.accent : theme.border
  const tx = x + (active ? 10 : 6)
  const out: string[] = []

  out.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${cw.toFixed(1)}" height="${cardH}" rx="5" fill="${theme.bg}" stroke="${border}" stroke-width="${active ? 1.5 : 1}">${itemTitleTag(src)}</rect>`)
  if (active) {
    out.push(`<rect x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" width="3" height="${cardH - 8}" rx="1.5" fill="${theme.accent}"/>`)
  }

  const tip = truncated ? `<title>${escapeXml(src.label)}</title>` : ''
  const spans = lines
    .map((line, index) => `<tspan x="${(tx + 2).toFixed(1)}" dy="${index === 0 ? 0 : CARD_LH}">${escapeXml(line)}</tspan>`)
    .join('')
  const textY = y + CARD_PAD + CARD_LH * 0.75
  out.push(aWrap(`<text x="${(tx + 2).toFixed(1)}" y="${textY.toFixed(1)}" font-size="11" fill="${done ? theme.textMuted : theme.text}" ${FONT_SANS_ATTR} ${done ? 'text-decoration="line-through"' : ''}>${tip}${spans}</text>`, url))

  if (pts > 0) {
    const bx = x + cw - 13
    const bcy = y + cardH / 2
    out.push(`<circle cx="${bx.toFixed(1)}" cy="${bcy.toFixed(1)}" r="9" fill="${theme.accent}30"/>`)
    out.push(`<text x="${bx.toFixed(1)}" y="${(bcy + 3).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.accent}" ${FONT_SANS_ATTR} font-weight="600">${pts}</text>`)
  }

  return out.join('')
}

function renderColumn(column: SprintColumn, layout: SprintLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const out = [renderColumnHeader(column, layout, theme)]
  let cardY = column.y + HEADER_H + CARD_PAD
  for (const card of column.cards) {
    out.push(renderSprintCard(card, column.x + CARD_PAD, cardY, theme))
    cardY += card.cardH + CARD_GAP
  }
  return wrapItem(out.join(''), column.index, animate, instrument)
}

function renderSummary(layout: SprintLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const barY = layout.titleH + 8 + layout.colH + 8
  const barX = GAP
  const barW = W - GAP * 2
  const out: string[] = []
  out.push(`<rect x="${barX}" y="${barY}" width="${barW}" height="10" rx="5" fill="${theme.surface}" stroke="${theme.border}" stroke-width="1"/>`)
  if (layout.totalPts > 0) {
    const fw = Math.max(0, (layout.donePts / layout.totalPts) * barW)
    out.push(`<rect x="${barX}" y="${barY}" width="${fw.toFixed(1)}" height="10" rx="5" fill="${theme.accent}cc"/>`)
    out.push(`<text x="${barX + barW / 2}" y="${(barY + 22).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>Velocity: ${layout.donePts}/${layout.totalPts} pts · ${Math.round(layout.donePts / layout.totalPts * 100)}% complete</text>`)
  }
  return wrapItem(out.join(''), layout.columns.length, animate, instrument)
}

// ── Renderer ─────────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)

  const layout = resolveLayout(spec)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts = [
    ...layout.columns.map(column => renderColumn(column, layout, theme, animate, instrument)),
    renderSummary(layout, theme, animate, instrument),
  ]

  if (animate) parts.unshift(seqSpotlightCSS(layout.columns.length + 1, spec, { scale: false }))
  return svgWrap(W, layout.height, theme, spec.title, parts)
}
