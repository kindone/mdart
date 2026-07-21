import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, renderEmpty, parseLink, aWrap, itemTitleTag, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 600
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 8
const GAP = 12
const VALUE_FS = 22
const LABEL_FS = 11
const LABEL_LH = 13
const CHANGE_FS = 10
const PAD_TOP = 8
const PAD_BOTTOM = 8
const VALUE_BASELINE = PAD_TOP + VALUE_FS
const LABEL_GAP = 14
const LABEL_BASELINE = VALUE_BASELINE + LABEL_GAP
const CHANGE_GAP = 11

interface ScorecardLayout {
  cols: number
  rows: number
  titleH: number
  cardW: number
  rowHeights: number[]
  rowY: number[]
  height: number
  cards: CardMetrics[]
}

interface CardMetrics {
  item: MdArtItem
  index: number
  display: string
  url: string | null
  value: string
  change: string | undefined
  changeColor: string
  labelLines: string[]
  labelTruncated: boolean
  cardH: number
}

function svg(layout: ScorecardLayout, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

function columnCount(items: MdArtItem[]): number {
  return items.length <= 2 ? items.length : items.length <= 4 ? 2 : Math.min(4, items.length)
}

function measureCard(item: MdArtItem, index: number, cardW: number, theme: MdArtTheme): CardMetrics {
  const { display, url } = parseLink(item.label)
  const value = item.value ?? item.attrs[0] ?? '—'
  const change = item.attrs.find(attr => /^[+\-]/.test(attr))
  const changeColor = change?.startsWith('+') ? theme.accent : theme.danger
  const maxChars = Math.max(10, Math.floor((cardW - 16) / 6.5))
  const { lines, truncated } = wrapLabel(display, maxChars, 3)
  const lastLabelBaseline = LABEL_BASELINE + (lines.length - 1) * LABEL_LH
  const changeBaseline = lastLabelBaseline + CHANGE_GAP
  const cardH = Math.max(60, (change ? changeBaseline : lastLabelBaseline) + PAD_BOTTOM)
  return { item, index, display, url, value, change, changeColor, labelLines: lines, labelTruncated: truncated, cardH }
}

function rowHeights(cards: CardMetrics[], cols: number, rows: number): number[] {
  return Array.from({ length: rows }, (_, row) => {
    let max = 0
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col
      if (idx < cards.length) max = Math.max(max, cards[idx].cardH)
    }
    return max
  })
}

function resolveLayout(spec: MdArtSpec, theme: MdArtTheme): ScorecardLayout {
  const cols = columnCount(spec.items)
  const rows = Math.ceil(spec.items.length / cols)
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const cardW = (W - (cols + 1) * GAP) / cols
  const cards = spec.items.map((item, index) => measureCard(item, index, cardW, theme))
  const heights = rowHeights(cards, cols, rows)
  const rowY: number[] = []
  let cursorY = titleH + GAP
  for (const height of heights) {
    rowY.push(cursorY)
    cursorY += height + GAP
  }
  return { cols, rows, titleH, cardW, cards, rowHeights: heights, rowY, height: cursorY }
}

function renderCard(metric: CardMetrics, layout: ScorecardLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const col = metric.index % layout.cols
  const row = Math.floor(metric.index / layout.cols)
  const x = GAP + col * (layout.cardW + GAP)
  const y = layout.rowY[row]
  const cardH = layout.rowHeights[row]
  const cx = (x + layout.cardW / 2).toFixed(1)
  const labelTip = metric.labelTruncated ? `<title>${escapeXml(metric.display)}</title>` : ''
  const labelSpans = metric.labelLines
    .map((line, lineIndex) => `<tspan x="${cx}" dy="${lineIndex === 0 ? 0 : LABEL_LH}">${escapeXml(line)}</tspan>`)
    .join('')
  const unit = [
    `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${layout.cardW.toFixed(1)}" height="${cardH}" rx="8" fill="${theme.surface}" stroke="${theme.border}" stroke-width="1">${itemTitleTag(metric.item)}</rect>`,
    `<text x="${cx}" y="${(y + VALUE_BASELINE).toFixed(1)}" text-anchor="middle" font-size="${VALUE_FS}" fill="${theme.accent}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(metric.value)}</text>`,
    aWrap(`<text x="${cx}" y="${(y + LABEL_BASELINE).toFixed(1)}" text-anchor="middle" font-size="${LABEL_FS}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${labelTip}${labelSpans}</text>`, metric.url),
  ]
  if (metric.change) {
    const lastLabelBaseline = LABEL_BASELINE + (metric.labelLines.length - 1) * LABEL_LH
    unit.push(`<text x="${cx}" y="${(y + lastLabelBaseline + CHANGE_GAP).toFixed(1)}" text-anchor="middle" font-size="${CHANGE_FS}" fill="${metric.changeColor}" ${FONT_SANS_ATTR}>${escapeXml(metric.change)}</text>`)
  }
  return wrapItem(unit.join(''), metric.index, animate, instrument)
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layout = resolveLayout(spec, theme)
  const parts = [
    ...(animate ? [seqSpotlightCSS(spec.items.length, spec, { scale: false })] : []),
    ...layout.cards.map(card => renderCard(card, layout, theme, animate, instrument)),
  ]
  return svg(layout, theme, spec.title, parts)
}
