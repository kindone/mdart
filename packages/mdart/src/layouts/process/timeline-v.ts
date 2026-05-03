import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, lerpColor, titleEl, renderEmpty } from '../shared'

// ── Layout constants ─────────────────────────────────────────────────────────

const W       = 560
const SPINE_X = 72
const DOT_R   = 7

const LBL_FS = 11, LBL_LH = 14
const DET_FS = 9,  DET_LH = 12
const SEC_G  = 5

const PAD_T    = 8    // above label baseline
const PAD_B    = 8    // below last content
const MIN_ROW_H = 40

const rightM   = 16
const textX    = SPINE_X + DOT_R + 8   // ~87

// Max chars: remaining width after spine/dot gap
const LABEL_MAX = Math.max(12, Math.floor((W - textX - rightM) / 6.0))   // ~76
const DETAIL_MAX = Math.max(16, Math.floor((W - textX - rightM) / 5.2))  // ~88

// ── Per-row layout ────────────────────────────────────────────────────────────

interface RowLayout {
  lblLines:  string[]
  lblTrunc:  boolean
  detLines:  string[]
  detTrunc:  boolean
  hasValue:  boolean
  detail:    string
  blockH:    number
  rowH:      number
}

function computeRow(item: MdArtSpec['items'][number]): RowLayout {
  const { lines: lblLines, truncated: lblTrunc } = wrapLabel(item.label, LABEL_MAX, 2)
  const detail   = item.children.map(c => c.label).join(' · ')
  const { lines: detLines, truncated: detTrunc } = detail
    ? wrapLabel(detail, DETAIL_MAX, 2)
    : { lines: [], truncated: false }

  const blockH = lblLines.length * LBL_LH
    + (detLines.length > 0 ? SEC_G + detLines.length * DET_LH : 0)
  const rowH = Math.max(MIN_ROW_H, PAD_T + blockH + PAD_B)

  return { lblLines, lblTrunc, detLines, detTrunc, hasValue: !!item.value, detail, blockH, rowH }
}

// ── Renderer ─────────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const n = items.length

  const titleH = spec.title ? 28 : 8
  const rows   = items.map(computeRow)

  const rowY: number[] = []
  let cumY = titleH
  for (const r of rows) {
    rowY.push(cumY)
    cumY += r.rowH
  }
  const H = cumY + 8

  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  // Spine line + arrowhead
  const spineTop    = titleH + DOT_R
  const lastRowCy   = rowY[n - 1] + rows[n - 1].rowH / 2
  const arrowTipY   = lastRowCy + DOT_R + 8
  parts.push(`<line x1="${SPINE_X}" y1="${spineTop}" x2="${SPINE_X}" y2="${(lastRowCy + DOT_R).toFixed(1)}" stroke="${theme.border}" stroke-width="2"/>`)
  parts.push(`<polygon points="${(SPINE_X - 5).toFixed(1)},${(arrowTipY - 8).toFixed(1)} ${(SPINE_X + 5).toFixed(1)},${(arrowTipY - 8).toFixed(1)} ${SPINE_X},${arrowTipY.toFixed(1)}" fill="${theme.border}"/>`)

  items.forEach((item, i) => {
    const cy    = rowY[i] + rows[i].rowH / 2
    const { lblLines, lblTrunc, detLines, detTrunc, hasValue, detail, blockH, rowH } = rows[i]
    const t     = n > 1 ? i / (n - 1) : 0
    const fill  = i === n - 1 ? theme.accent : lerpColor(theme.primary, theme.secondary, t)

    parts.push(`<circle cx="${SPINE_X}" cy="${cy.toFixed(1)}" r="${DOT_R}" fill="${fill}"/>`)

    // Value (date/label) on left of spine
    if (item.value) {
      parts.push(`<text x="${(SPINE_X - DOT_R - 4).toFixed(1)}" y="${(cy + 3).toFixed(1)}" text-anchor="end" font-size="8" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(item.value)}</text>`)
    }

    // Label on right — vertically centred
    const lblStartY = rowY[i] + (rowH - blockH) / 2 + LBL_FS * 0.75
    const lblTip    = lblTrunc ? `<title>${escapeXml(item.label)}</title>` : ''
    const lblSpans  = lblLines
      .map((l, li) => `<tspan x="${textX}" dy="${li === 0 ? 0 : LBL_LH}">${escapeXml(l)}</tspan>`)
      .join('')
    parts.push(`<text x="${textX}" y="${lblStartY.toFixed(1)}" font-size="${LBL_FS}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${lblTip}${lblSpans}</text>`)

    // Detail (children joined) below label
    if (detLines.length > 0) {
      const detStartY = lblStartY + lblLines.length * LBL_LH + SEC_G
      const detTip    = detTrunc ? `<title>${escapeXml(detail)}</title>` : ''
      const detSpans  = detLines
        .map((l, li) => `<tspan x="${textX}" dy="${li === 0 ? 0 : DET_LH}">${escapeXml(l)}</tspan>`)
        .join('')
      parts.push(`<text x="${textX}" y="${detStartY.toFixed(1)}" font-size="${DET_FS}" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${detTip}${detSpans}</text>`)
    }
  })

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}
