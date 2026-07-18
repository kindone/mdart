import type { MdArtSpec } from '../../parser'
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

// ── Renderer ─────────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const columns = spec.items
  if (columns.length === 0) return renderEmpty(theme)

  const TITLE_H = spec.title ? 32 : 8
  const n       = columns.length
  const COL_W   = (W - (n + 1) * GAP) / n

  // Pre-compute card label wrapping for each column's cards
  type CardInfo = {
    src: MdArtSpec['items'][0]['children'][0]
    lines: string[]
    truncated: boolean
    url: string | null
    pts: number
    done: boolean
    active: boolean
    cardH: number
    cw: number
  }

  const colCards: CardInfo[][] = columns.map(col => {
    const isDoneCol = /done|complete/i.test(col.label)
    return col.children.map(card => {
      const pts     = parseInt(card.value ?? card.attrs.find(a => /^\d+$/.test(a)) ?? '0') || 0
      const done    = isDoneCol || card.attrs.includes('done')
      const active  = card.attrs.includes('active') || card.attrs.includes('doing') || card.attrs.includes('wip')
      const cw      = COL_W - CARD_PAD * 2
      const ptsW    = pts > 0 ? 30 : 12
      const maxChars = Math.max(8, Math.floor((cw - (active ? 10 : 0) - ptsW) / 6.5))
      // pts come from value or first numeric attr; done/active are visible.
      // Ellipsis cue when other attrs would be invisible.
      const cardLbl = ellipsisIfDropped(card.label, card, { value: pts > 0, attrs: true })
      const { lines, truncated, url } = wrapLabel(cardLbl, maxChars, 5)
      const cardH   = CARD_PAD + lines.length * CARD_LH + CARD_PAD
      return { src: card, lines, truncated, url, pts, done, active, cardH, cw }
    })
  })

  // Column height = HEADER + sum of card heights + CARD_GAP between them + CARD_PAD top/bottom
  const colH = Math.max(
    HEADER_H + 60,
    ...colCards.map(cards => {
      const cardsH = cards.reduce((s, c) => s + c.cardH + CARD_GAP, 0) - CARD_GAP
      return HEADER_H + CARD_PAD * 2 + (cards.length > 0 ? cardsH : 0)
    })
  )
  const H = TITLE_H + 8 + colH + FOOTER_H + 12

  let totalPts = 0, donePts = 0
  const parts: string[] = []
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()

  columns.forEach((col, ci) => {
    const colX    = GAP + ci * (COL_W + GAP)
    const colY    = TITLE_H + 8
    const isDoneCol = /done|complete/i.test(col.label)
    const cards   = colCards[ci]
    const unit: string[] = []

    // Column background + header
    unit.push(`<rect x="${colX.toFixed(1)}" y="${colY}" width="${COL_W.toFixed(1)}" height="${colH}" rx="8" fill="${theme.surface}" stroke="${theme.border}" stroke-width="1">${itemTitleTag(col)}</rect>`)
    unit.push(`<path d="M${(colX + 8).toFixed(1)},${colY} Q${colX},${colY} ${colX},${colY + 8} L${colX},${colY + HEADER_H} L${(colX + COL_W).toFixed(1)},${colY + HEADER_H} L${(colX + COL_W).toFixed(1)},${colY + 8} Q${(colX + COL_W).toFixed(1)},${colY} ${(colX + COL_W - 8).toFixed(1)},${colY} Z" fill="${theme.accent}22"/>`)

    const colLabelMax = Math.max(6, Math.floor((COL_W - 10) / 6.5))
    const { lines: colLabelLines } = wrapLabel(col.label, colLabelMax, 1)
    unit.push(`<text x="${(colX + COL_W / 2).toFixed(1)}" y="${colY + 19}" text-anchor="middle" font-size="12" fill="${theme.accent}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(colLabelLines[0] ?? col.label)}</text>`)

    let colPts = 0
    col.children.forEach(c => {
      const p = parseInt(c.value ?? c.attrs.find(a => /^\d+$/.test(a)) ?? '0') || 0
      colPts += p; totalPts += p
      if (isDoneCol || c.attrs.includes('done')) donePts += p
    })
    unit.push(`<text x="${(colX + COL_W / 2).toFixed(1)}" y="${colY + 34}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${colPts} pts</text>`)
    unit.push(`<line x1="${colX}" y1="${colY + HEADER_H}" x2="${(colX + COL_W).toFixed(1)}" y2="${colY + HEADER_H}" stroke="${theme.border}" stroke-width="1"/>`)

    let cy = colY + HEADER_H + CARD_PAD
    cards.forEach((info) => {
      const cx      = colX + CARD_PAD
      const { src, lines, truncated, url, pts, done, active, cardH, cw } = info
      const border  = active ? theme.accent : theme.border
      const tx      = cx + (active ? 10 : 6)

      unit.push(`<rect x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" width="${cw.toFixed(1)}" height="${cardH}" rx="5" fill="${theme.bg}" stroke="${border}" stroke-width="${active ? 1.5 : 1}">${itemTitleTag(src)}</rect>`)
      if (active) {
        unit.push(`<rect x="${cx.toFixed(1)}" y="${(cy + 4).toFixed(1)}" width="3" height="${cardH - 8}" rx="1.5" fill="${theme.accent}"/>`)
      }

      // Card label (multi-line)
      const tip   = truncated ? `<title>${escapeXml(src.label)}</title>` : ''
      const spans = lines
        .map((l, li) => `<tspan x="${(tx + 2).toFixed(1)}" dy="${li === 0 ? 0 : CARD_LH}">${escapeXml(l)}</tspan>`)
        .join('')
      const textY = cy + CARD_PAD + CARD_LH * 0.75
      unit.push(aWrap(`<text x="${(tx + 2).toFixed(1)}" y="${textY.toFixed(1)}" font-size="11" fill="${done ? theme.textMuted : theme.text}" ${FONT_SANS_ATTR} ${done ? 'text-decoration="line-through"' : ''}>${tip}${spans}</text>`, url))

      if (pts > 0) {
        const bx = cx + cw - 13
        const bcy = cy + cardH / 2
        unit.push(`<circle cx="${bx.toFixed(1)}" cy="${bcy.toFixed(1)}" r="9" fill="${theme.accent}30"/>`)
        unit.push(`<text x="${bx.toFixed(1)}" y="${(bcy + 3).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.accent}" ${FONT_SANS_ATTR} font-weight="600">${pts}</text>`)
      }

      cy += cardH + CARD_GAP
    })
    parts.push(wrapItem(unit.join(''), ci, animate, instrument))
  })

  // Progress bar + velocity
  const barY = TITLE_H + 8 + colH + 8
  const barX = GAP, barW = W - GAP * 2
  const summaryUnit: string[] = []
  summaryUnit.push(`<rect x="${barX}" y="${barY}" width="${barW}" height="10" rx="5" fill="${theme.surface}" stroke="${theme.border}" stroke-width="1"/>`)
  if (totalPts > 0) {
    const fw = Math.max(0, (donePts / totalPts) * barW)
    summaryUnit.push(`<rect x="${barX}" y="${barY}" width="${fw.toFixed(1)}" height="10" rx="5" fill="${theme.accent}cc"/>`)
    summaryUnit.push(`<text x="${barX + barW / 2}" y="${(barY + 22).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>Velocity: ${donePts}/${totalPts} pts · ${Math.round(donePts / totalPts * 100)}% complete</text>`)
  }
  parts.push(wrapItem(summaryUnit.join(''), n, animate, instrument))

  if (animate) parts.unshift(seqSpotlightCSS(n + 1, spec, { scale: false }))
  return svgWrap(W, H, theme, spec.title, parts)
}
