import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, lerpColor, renderEmpty, getCaption } from '../shared'

// ── Layout constants ─────────────────────────────────────────────────────────

const W       = 500
const LINE_X  = W / 2       // 250
const CARD_W  = 185
const PAD_V   = 10          // top + bottom padding inside card
const SEC_G   = 4           // gap between label and caption blocks
const DOT_R   = 7
const CARD_GAP = 20         // vertical gap between cards

const LBL_FS  = 11, LBL_LH = 14
const CAP_FS  = 10, CAP_LH = 13
const ATTR_FS = 9,  ATTR_LH = 11

const MIN_CARD_H = 44

// label/cap fit within card's inner width
const INNER_W   = CARD_W - 16   // 8px hpad each side
const LABEL_MAX = Math.max(10, Math.floor(INNER_W / 5.8))   // ~29
const CAP_MAX   = Math.max(12, Math.floor(INNER_W / 5.2))   // ~32

// ── Per-card layout ───────────────────────────────────────────────────────────

interface CardLayout {
  lblLines: string[]
  lblTrunc: boolean
  capLines: string[]
  capTrunc: boolean
  caption:  string | null
  hasAttr:  boolean
  cardH:    number
}

function computeCard(item: MdArtSpec['items'][number]): CardLayout {
  const { lines: lblLines, truncated: lblTrunc } = wrapLabel(item.label, LABEL_MAX, 3)
  const caption = getCaption(item)
  const { lines: capLines, truncated: capTrunc } = caption
    ? wrapLabel(caption, CAP_MAX, 2)
    : { lines: [], truncated: false }
  const hasAttr = item.attrs.length > 0

  let blockH = lblLines.length * LBL_LH
  if (capLines.length > 0) blockH += SEC_G + capLines.length * CAP_LH
  if (hasAttr)             blockH += SEC_G + ATTR_LH

  const cardH = Math.max(MIN_CARD_H, PAD_V + blockH + PAD_V)
  return { lblLines, lblTrunc, capLines, capTrunc, caption, hasAttr, cardH }
}

// ── Renderer ─────────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const PAD    = 20
  const titleH = spec.title ? 28 : 0
  const cards  = items.map(computeCard)

  // Cumulative Y positions (card top)
  const cardY: number[] = []
  let cumY = PAD + titleH
  for (const c of cards) {
    cardY.push(cumY)
    cumY += c.cardH + CARD_GAP
  }
  const H = cumY - CARD_GAP + PAD

  let svgContent = ''

  if (spec.title) {
    svgContent += `<text x="${W / 2}" y="${PAD + 16}" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`
  }

  // Vertical timeline line: spans from top card centre to bottom card centre
  const topCy    = cardY[0] + cards[0].cardH / 2
  const bottomCy = cardY[items.length - 1] + cards[items.length - 1].cardH / 2
  svgContent += `<line x1="${LINE_X}" y1="${topCy}" x2="${LINE_X}" y2="${bottomCy}" stroke="${theme.border}" stroke-width="2" />`

  for (let i = 0; i < items.length; i++) {
    const item  = items[i]
    const { lblLines, lblTrunc, capLines, capTrunc, caption, hasAttr, cardH } = cards[i]
    const cy    = cardY[i] + cardH / 2
    const t     = items.length > 1 ? i / (items.length - 1) : 0
    const fill  = lerpColor(theme.secondary, theme.primary, t)
    const left  = i % 2 === 0

    const cardX = left ? LINE_X - 14 - CARD_W : LINE_X + 14
    const cy0   = cardY[i]

    // Card rect
    svgContent += `<rect x="${cardX}" y="${cy0}" width="${CARD_W}" height="${cardH}" rx="6" fill="${theme.surface}" stroke="${fill}" stroke-width="1.5" />`

    // Timeline dot
    svgContent += `<circle cx="${LINE_X}" cy="${cy}" r="${DOT_R}" fill="${fill}" />`

    // Text block vertically centred in card
    const blockH = lblLines.length * LBL_LH
      + (capLines.length > 0 ? SEC_G + capLines.length * CAP_LH : 0)
      + (hasAttr ? SEC_G + ATTR_LH : 0)
    const cx    = cardX + CARD_W / 2
    let textY   = cy0 + (cardH - blockH) / 2 + LBL_FS * 0.75

    // Label
    const lblTip   = lblTrunc ? `<title>${escapeXml(item.label)}</title>` : ''
    const lblSpans = lblLines
      .map((l, li) => `<tspan x="${cx}" dy="${li === 0 ? 0 : LBL_LH}">${escapeXml(l)}</tspan>`)
      .join('')
    svgContent += `<text x="${cx}" y="${textY.toFixed(1)}" text-anchor="middle" font-size="${LBL_FS}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${lblTip}${lblSpans}</text>`
    textY += lblLines.length * LBL_LH

    // Caption
    if (capLines.length > 0) {
      textY += SEC_G
      const capTip   = capTrunc ? `<title>${escapeXml(caption!)}</title>` : ''
      const capSpans = capLines
        .map((l, li) => `<tspan x="${cx}" dy="${li === 0 ? 0 : CAP_LH}">${escapeXml(l)}</tspan>`)
        .join('')
      svgContent += `<text x="${cx}" y="${textY.toFixed(1)}" text-anchor="middle" font-size="${CAP_FS}" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${capTip}${capSpans}</text>`
      textY += capLines.length * CAP_LH
    }

    // Attrs
    if (hasAttr) {
      textY += SEC_G
      svgContent += `<text x="${cx}" y="${textY.toFixed(1)}" text-anchor="middle" font-size="${ATTR_FS}" fill="${theme.accent}" font-family="system-ui,sans-serif">${escapeXml(item.attrs.join(', '))}</text>`
    }
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svgContent}
  </svg>`
}
