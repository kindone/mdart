import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, lerpColor, titleEl, renderEmpty, itemTitleTag } from '../shared'

// ── Layout constants ─────────────────────────────────────────────────────────

const W       = 560
const SPINE_X = 80          // spine x — left column is 0…SPINE_X
const DOT_R   = 7

const TAG_FS = 9,  TAG_LH = 12   // left column: short label / timestamp
const LBL_FS = 11, LBL_LH = 14   // right column: main title (item.value or item.label)
const DET_FS = 9,  DET_LH = 12   // right column: children detail
const SEC_G  = 5                  // gap between title and detail lines

const PAD_T     = 8
const PAD_B     = 8
const MIN_ROW_H = 40

const rightM = 16
const textX  = SPINE_X + DOT_R + 8  // first character of right column

// Left column: text is right-aligned at SPINE_X − DOT_R − 4
const TAG_X   = SPINE_X - DOT_R - 4
const TAG_MAX = Math.max(5, Math.floor((TAG_X - 8) / 5.5))   // ≈ 12 chars

// Right column character budgets
const LBL_MAX = Math.max(12, Math.floor((W - textX - rightM) / 6.0))   // ~76
const DET_MAX = Math.max(16, Math.floor((W - textX - rightM) / 5.2))   // ~88

// ── Per-row layout ────────────────────────────────────────────────────────────

interface RowLayout {
  // Left column (item.label used as a short tag / timestamp)
  tagLines: string[]
  tagTrunc: boolean
  tagUrl:   string | null

  // Right column — primary text:
  //   when item.value is present → item.value
  //   otherwise                  → item.label  (backward-compat for value-less items)
  mainLines: string[]
  mainTrunc: boolean
  mainUrl:   string | null
  mainText:  string          // raw text, used for tooltip

  // Right column — detail (children joined with · )
  detLines:  string[]
  detTrunc:  boolean
  detail:    string

  hasValue:  boolean
  rightH:    number          // height of right-column block (title + detail)
  rowH:      number
}

function computeRow(item: MdArtSpec['items'][number]): RowLayout {
  const hasValue = !!item.value

  // Left tag: always item.label (shown only when there is a value to go on the right)
  const tagResult = hasValue
    ? wrapLabel(item.label, TAG_MAX, 5)
    : { lines: [] as string[], truncated: false, url: null }
  const { lines: tagLines, truncated: tagTrunc, url: tagUrl } = tagResult

  // Right main: item.value when present, else item.label
  const mainText  = hasValue ? item.value! : item.label
  const { lines: mainLines, truncated: mainTrunc, url: mainUrl } = wrapLabel(mainText, LBL_MAX, 5)

  // Detail: children labels joined
  const detail = item.children.map(c => c.label).join(' · ')
  const { lines: detLines, truncated: detTrunc } = detail
    ? wrapLabel(detail, DET_MAX, 5)
    : { lines: [] as string[], truncated: false }

  // Height of the right-column content block
  const rightH = mainLines.length * LBL_LH
    + (detLines.length > 0 ? SEC_G + detLines.length * DET_LH : 0)

  // Row height must accommodate both columns
  const leftH  = tagLines.length * TAG_LH
  const blockH = Math.max(rightH, leftH)
  const rowH   = Math.max(MIN_ROW_H, PAD_T + blockH + PAD_B)

  return {
    tagLines, tagTrunc, tagUrl,
    mainLines, mainTrunc, mainUrl, mainText,
    detLines, detTrunc, detail,
    hasValue, rightH, rowH,
  }
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
  for (const r of rows) { rowY.push(cumY); cumY += r.rowH }
  const H = cumY + 8

  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  // Spine line + arrowhead
  const spineTop  = titleH + DOT_R
  const lastCy    = rowY[n - 1] + rows[n - 1].rowH / 2
  const arrowTipY = lastCy + DOT_R + 8
  parts.push(`<line x1="${SPINE_X}" y1="${spineTop}" x2="${SPINE_X}" y2="${(lastCy + DOT_R).toFixed(1)}" stroke="${theme.border}" stroke-width="2"/>`)
  parts.push(`<polygon points="${(SPINE_X - 5).toFixed(1)},${(arrowTipY - 8).toFixed(1)} ${(SPINE_X + 5).toFixed(1)},${(arrowTipY - 8).toFixed(1)} ${SPINE_X},${arrowTipY.toFixed(1)}" fill="${theme.border}"/>`)

  items.forEach((item, i) => {
    const cy   = rowY[i] + rows[i].rowH / 2
    const { tagLines, tagTrunc, tagUrl,
            mainLines, mainTrunc, mainUrl, mainText,
            detLines, detTrunc, detail,
            rightH, rowH } = rows[i]

    const t    = n > 1 ? i / (n - 1) : 0
    const fill = i === n - 1 ? theme.accent : lerpColor(theme.primary, theme.secondary, t)

    // Dot on spine — tooltip carries full item summary
    parts.push(`<circle cx="${SPINE_X}" cy="${cy.toFixed(1)}" r="${DOT_R}" fill="${fill}">${itemTitleTag(item)}</circle>`)

    // ── Left column: short tag (item.label), centred at dot, right-aligned ───
    if (tagLines.length > 0) {
      const tagBlockH = tagLines.length * TAG_LH
      const tagStartY = cy - tagBlockH / 2 + TAG_FS * 0.75
      const tip       = tagTrunc ? `<title>${escapeXml(item.label)}</title>` : ''
      const spans     = tagLines
        .map((l, li) => `<tspan x="${TAG_X}" dy="${li === 0 ? 0 : TAG_LH}">${escapeXml(l)}</tspan>`)
        .join('')
      parts.push(aWrap(
        `<text x="${TAG_X}" y="${tagStartY.toFixed(1)}" text-anchor="end" font-size="${TAG_FS}" fill="${fill}" font-family="system-ui,sans-serif" font-weight="700">${tip}${spans}</text>`,
        tagUrl,
      ))
    }

    // ── Right column: main title, centred vertically ─────────────────────────
    // Centre the right-column block (title + detail) in the row
    const mainStartY = rowY[i] + (rowH - rightH) / 2 + LBL_FS * 0.75
    const mainTip    = mainTrunc ? `<title>${escapeXml(mainText)}</title>` : ''
    const mainSpans  = mainLines
      .map((l, li) => `<tspan x="${textX}" dy="${li === 0 ? 0 : LBL_LH}">${escapeXml(l)}</tspan>`)
      .join('')
    parts.push(aWrap(
      `<text x="${textX}" y="${mainStartY.toFixed(1)}" font-size="${LBL_FS}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${mainTip}${mainSpans}</text>`,
      mainUrl,
    ))

    // ── Right column: detail (children) below main title ─────────────────────
    if (detLines.length > 0) {
      const detStartY = mainStartY + mainLines.length * LBL_LH + SEC_G
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
