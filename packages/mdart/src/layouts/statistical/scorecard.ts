import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, renderEmpty, parseLink, aWrap, itemTitleTag, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

function svgOut(W: number, H: number, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()

  const cols    = items.length <= 2 ? items.length : items.length <= 4 ? 2 : Math.min(4, items.length)
  const rowCount = Math.ceil(items.length / cols)

  const W        = 600
  const TITLE_H  = spec.title ? 30 : 8
  const GAP      = 12
  const CARD_W   = (W - (cols + 1) * GAP) / cols

  // Typography
  const VAL_FS      = 22               // big metric
  const LBL_FS      = 11               // label below metric
  const LBL_LH      = 13               // label line-height
  const CHG_FS      = 10               // change indicator

  // Vertical rhythm (from card-top = 0)
  const PAD_TOP     = 8
  const PAD_BOT     = 8
  const VAL_BL      = PAD_TOP + VAL_FS        // value baseline
  const LBL_GAP     = 14               // gap between value baseline and first label baseline
  const LBL1_BL     = VAL_BL + LBL_GAP
  const CHG_GAP     = 11               // gap from last label baseline to change baseline

  // Label character budget driven by actual card width
  const lblMaxChars = Math.max(10, Math.floor((CARD_W - 16) / 6.5))

  // ── Pre-compute per-item layout ─────────────────────────────────────────────
  const layouts = items.map(item => {
    const { display, url } = parseLink(item.label)
    const value      = item.value ?? item.attrs[0] ?? '—'
    const change     = item.attrs.find(a => /^[+\-]/.test(a))
    const chgColor   = change?.startsWith('+') ? theme.accent : theme.danger
    const { lines: lblLines, truncated: lblTrunc } = wrapLabel(display, lblMaxChars, 3)

    const lastLblBL = LBL1_BL + (lblLines.length - 1) * LBL_LH
    const chgBL     = lastLblBL + CHG_GAP
    const cardH     = Math.max(60, (change ? chgBL : lastLblBL) + PAD_BOT)

    return { display, url, value, change, chgColor, lblLines, lblTrunc, cardH }
  })

  // Cards in the same row share the tallest card's height for visual alignment
  const rowHeights: number[] = Array.from({ length: rowCount }, (_, r) => {
    let max = 0
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c
      if (idx < layouts.length) max = Math.max(max, layouts[idx].cardH)
    }
    return max
  })

  const rowY: number[] = []
  let cumY = TITLE_H + GAP
  for (const rh of rowHeights) { rowY.push(cumY); cumY += rh + GAP }
  const H = cumY

  const cards: string[] = []

  items.forEach((item, i) => {
    const unit: string[] = []
    const col   = i % cols
    const row   = Math.floor(i / cols)
    const x     = GAP + col * (CARD_W + GAP)
    const y     = rowY[row]
    const cardH = rowHeights[row]
    const { display, url, value, change, chgColor, lblLines, lblTrunc } = layouts[i]

    const cx = (x + CARD_W / 2).toFixed(1)

    // Card background — tooltip carries full label/value/attrs
    unit.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${CARD_W.toFixed(1)}" height="${cardH}" rx="8" fill="${theme.surface}" stroke="${theme.border}" stroke-width="1">${itemTitleTag(item)}</rect>`)

    // Big metric value
    unit.push(`<text x="${cx}" y="${(y + VAL_BL).toFixed(1)}" text-anchor="middle" font-size="${VAL_FS}" fill="${theme.accent}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(value)}</text>`)

    // Label — multi-line, width-aware
    const lblTip   = lblTrunc ? `<title>${escapeXml(display)}</title>` : ''
    const lblSpans = lblLines
      .map((l, li) => `<tspan x="${cx}" dy="${li === 0 ? 0 : LBL_LH}">${escapeXml(l)}</tspan>`)
      .join('')
    unit.push(aWrap(
      `<text x="${cx}" y="${(y + LBL1_BL).toFixed(1)}" text-anchor="middle" font-size="${LBL_FS}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${lblTip}${lblSpans}</text>`,
      url,
    ))

    // Change indicator
    if (change) {
      const lastLblBL = LBL1_BL + (lblLines.length - 1) * LBL_LH
      unit.push(`<text x="${cx}" y="${(y + lastLblBL + CHG_GAP).toFixed(1)}" text-anchor="middle" font-size="${CHG_FS}" fill="${chgColor}" ${FONT_SANS_ATTR}>${escapeXml(change)}</text>`)
    }
    cards.push(wrapItem(unit.join(''), i, animate, instrument))
  })
  if (animate) cards.unshift(seqSpotlightCSS(items.length, spec, { scale: false }))

  return svgOut(W, H, theme, spec.title, cards)
}
