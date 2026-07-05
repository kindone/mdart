import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, lerpColor, renderEmpty, getCaption, itemTitleTag, shouldAnimate, seqSpotlightCSS } from '../shared'

// ── Layout constants ─────────────────────────────────────────────────────────

const W        = 500
const LEFT     = 24          // circle centre x
const CIRCLE_R = 18          // circle radius
const textX    = LEFT + CIRCLE_R + 10   // 52
const PAD_T    = 8
const PAD_B    = 8
const LBL_FS   = 12, LBL_LH = 15
const CAP_FS   = 10, CAP_LH = 13
const SEC_G    = 4
const MIN_H    = 42
const rightM   = 16

const LABEL_MAX = Math.max(12, Math.floor((W - textX - rightM) / 6.5))  // ~66
const CAP_MAX   = Math.max(12, Math.floor((W - textX - rightM) / 5.2))  // ~82

// ── Per-row layout ────────────────────────────────────────────────────────────

interface RowLayout {
  displayLabel: string
  icon:         string
  lblLines:     string[]
  lblTrunc:     boolean
  lblUrl:       string | null
  capLines:     string[]
  capTrunc:     boolean
  caption:      string | null
  blockH:       number
  rowH:         number
}

function computeRowLayout(item: MdArtSpec['items'][number]): RowLayout {
  const emojiMatch  = item.label.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})\s*/u)
  const icon        = emojiMatch ? emojiMatch[1] : (item.attrs[0] ?? '')
  const displayLabel = emojiMatch ? item.label.slice(emojiMatch[0].length) : item.label

  const { lines: lblLines, truncated: lblTrunc, url: lblUrl } = wrapLabel(displayLabel, LABEL_MAX, 5)
  const caption = getCaption(item)
  const { lines: capLines, truncated: capTrunc } = caption
    ? wrapLabel(caption, CAP_MAX, 5)
    : { lines: [], truncated: false }

  const blockH = lblLines.length * LBL_LH
    + (capLines.length > 0 ? SEC_G + capLines.length * CAP_LH : 0)
  const rowH   = Math.max(MIN_H, PAD_T + blockH + PAD_B)

  return { displayLabel, icon, lblLines, lblTrunc, lblUrl, capLines, capTrunc, caption, blockH, rowH }
}

// ── Renderer ─────────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const titleH  = spec.title ? 30 : 8
  const layouts = items.map(computeRowLayout)

  const rowY: number[] = []
  let cumY = titleH
  for (const l of layouts) {
    rowY.push(cumY)
    cumY += l.rowH
  }
  const H = cumY + 8

  const n = items.length
  const animate = shouldAnimate(spec)
  const parts: string[] = []
  if (spec.title) {
    parts.push(`<text x="${W / 2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`)
  }

  items.forEach((item, i) => {
    const y      = rowY[i]
    const { displayLabel, icon, lblLines, lblTrunc, lblUrl, capLines, capTrunc, caption, blockH, rowH } = layouts[i]
    const t      = n > 1 ? i / (n - 1) : 0
    const fill   = lerpColor(theme.primary, theme.secondary, t)
    const cy     = y + rowH / 2
    const lblStartY = y + (rowH - blockH) / 2 + LBL_FS * 0.75
    const lblTip   = lblTrunc ? `<title>${escapeXml(displayLabel)}</title>` : ''
    const lblSpans = lblLines
      .map((l, li) => `<tspan x="${textX}" dy="${li === 0 ? 0 : LBL_LH}">${escapeXml(l)}</tspan>`)
      .join('')

    let nodeStr = ''
    nodeStr += `<circle cx="${LEFT}" cy="${cy.toFixed(1)}" r="${CIRCLE_R}" fill="${fill}">${itemTitleTag(item)}</circle>`
    if (icon) {
      nodeStr += `<text x="${LEFT}" y="${(cy + 5).toFixed(1)}" text-anchor="middle" font-size="14" font-family="system-ui,sans-serif">${escapeXml(icon)}</text>`
    }
    nodeStr += aWrap(`<text x="${textX}" y="${lblStartY.toFixed(1)}" font-size="${LBL_FS}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${lblTip}${lblSpans}</text>`, lblUrl)
    if (capLines.length > 0) {
      const capStartY = lblStartY + lblLines.length * LBL_LH + SEC_G
      const capTip    = capTrunc ? `<title>${escapeXml(caption!)}</title>` : ''
      const capSpans  = capLines
        .map((l, li) => `<tspan x="${textX}" dy="${li === 0 ? 0 : CAP_LH}">${escapeXml(l)}</tspan>`)
        .join('')
      nodeStr += `<text x="${textX}" y="${capStartY.toFixed(1)}" font-size="${CAP_FS}" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${capTip}${capSpans}</text>`
    }
    parts.push(animate ? `<g class="mdart-n${i}">${nodeStr}</g>` : nodeStr)

    // Divider between rows — separator, not part of the item
    if (i < n - 1) {
      parts.push(`<line x1="${textX}" y1="${y + rowH}" x2="${W - 16}" y2="${y + rowH}" stroke="${theme.border}" stroke-width="0.5"/>`)
    }
  })

  if (animate) parts.unshift(seqSpotlightCSS(n, spec))
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}
