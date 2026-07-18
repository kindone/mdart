import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, aWrap, lerpColor, titleEl, renderEmpty, itemTitleTag, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, type FitTextResult, FONT_SANS_ATTR } from '../shared'

// ── Layout constants ─────────────────────────────────────────────────────────

const W       = 560
const SPINE_X = 80          // spine x — left column is 0…SPINE_X
const DOT_R   = 7

const TAG_FS_MAX = 9,  TAG_LH_RATIO = 12 / 9    // left column: short label / timestamp
const LBL_FS_MAX = 11, LBL_LH_RATIO = 14 / 11   // right column: main title (item.value or item.label)
const DET_FS_MAX = 9,  DET_LH_RATIO = 12 / 9    // right column: children detail
const SEC_G  = 5                  // gap between title and detail lines

const PAD_T     = 8
const PAD_B     = 8
const MIN_ROW_H = 40

const rightM = 16
const textX  = SPINE_X + DOT_R + 8  // first character of right column

// Left column: text is right-aligned at SPINE_X − DOT_R − 4
const TAG_X   = SPINE_X - DOT_R - 4
const RIGHT_COL_W = W - textX - rightM

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

// ── Renderer ─────────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const n = items.length
  const animate = shouldAnimate(spec)

  const titleH = spec.title ? 28 : 8

  // One shared font size per column across the WHOLE diagram — every row
  // shares the same column widths here (unlike process/circular-process's
  // per-item varying box widths), so this is a plain batch fit per column.
  // Replaces the old flat char-budget wrapLabel calls (TAG_MAX/LBL_MAX/
  // DET_MAX derived from a fixed average, not an actual font search).
  const hasValueIdx: number[] = []
  items.forEach((it, i) => { if (it.value) hasValueIdx.push(i) })
  const tagTexts = hasValueIdx.map(i => items[i].label)
  const tagFit = tagTexts.length
    ? fitTextToWidthShared(tagTexts, TAG_X - 8, { maxSize: TAG_FS_MAX, minSize: 6.5, maxLines: 5 })
    : { fontSize: TAG_FS_MAX, results: [] as FitTextResult[] }
  const tagFitByIdx = new Map(hasValueIdx.map((idx, j) => [idx, j]))
  const tagLH = tagFit.fontSize * TAG_LH_RATIO

  const mainTexts = items.map(it => it.value ?? it.label)
  const mainFit = fitTextToWidthShared(mainTexts, RIGHT_COL_W, { maxSize: LBL_FS_MAX, minSize: 7, maxLines: 5 })
  const mainLH = mainFit.fontSize * LBL_LH_RATIO

  const detailIdx: number[] = []
  const detailTexts: string[] = []
  items.forEach((it, i) => {
    const d = it.children.map(c => c.label).join(' · ')
    if (d) { detailIdx.push(i); detailTexts.push(d) }
  })
  const detFit = detailTexts.length
    ? fitTextToWidthShared(detailTexts, RIGHT_COL_W, { maxSize: DET_FS_MAX, minSize: 6.5, maxLines: 5 })
    : { fontSize: DET_FS_MAX, results: [] as FitTextResult[] }
  const detFitByIdx = new Map(detailIdx.map((idx, j) => [idx, j]))
  const detLH = detFit.fontSize * DET_LH_RATIO

  const rows: RowLayout[] = items.map((item, i) => {
    const hasValue = !!item.value
    const tagFitIdx = tagFitByIdx.get(i)
    const { lines: tagLines, truncated: tagTrunc, url: tagUrl } =
      tagFitIdx !== undefined ? tagFit.results[tagFitIdx] : { lines: [] as string[], truncated: false, url: null }

    const mainText = mainTexts[i]
    const { lines: mainLines, truncated: mainTrunc, url: mainUrl } = mainFit.results[i]

    const detFitIdx = detFitByIdx.get(i)
    const { lines: detLines, truncated: detTrunc } =
      detFitIdx !== undefined ? detFit.results[detFitIdx] : { lines: [] as string[], truncated: false }
    const detail = detFitIdx !== undefined ? detailTexts[detFitIdx] : ''

    const rightH = mainLines.length * mainLH
      + (detLines.length > 0 ? SEC_G + detLines.length * detLH : 0)
    const leftH  = tagLines.length * tagLH
    const blockH = Math.max(rightH, leftH)
    const rowH   = Math.max(MIN_ROW_H, PAD_T + blockH + PAD_B)

    return { tagLines, tagTrunc, tagUrl, mainLines, mainTrunc, mainUrl, mainText, detLines, detTrunc, detail, hasValue, rightH, rowH }
  })

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
  parts.push(`<g class="mdart-n0">
      <line x1="${SPINE_X}" y1="${spineTop}" x2="${SPINE_X}" y2="${(lastCy + DOT_R).toFixed(1)}" stroke="${theme.border}" stroke-width="2"/>
      <polygon points="${(SPINE_X - 5).toFixed(1)},${(arrowTipY - 8).toFixed(1)} ${(SPINE_X + 5).toFixed(1)},${(arrowTipY - 8).toFixed(1)} ${SPINE_X},${arrowTipY.toFixed(1)}" fill="${theme.border}"/>
    </g>`)

  items.forEach((item, i) => {
    const unit: string[] = []
    const cy   = rowY[i] + rows[i].rowH / 2
    const { tagLines, tagTrunc, tagUrl,
            mainLines, mainTrunc, mainUrl, mainText,
            detLines, detTrunc, detail,
            rightH, rowH } = rows[i]

    const t    = n > 1 ? i / (n - 1) : 0
    const fill = i === n - 1 ? theme.accent : lerpColor(theme.primary, theme.secondary, t)

    // Dot on spine — tooltip carries full item summary
    unit.push(`<circle cx="${SPINE_X}" cy="${cy.toFixed(1)}" r="${DOT_R}" fill="${fill}">${itemTitleTag(item)}</circle>`)

    // ── Left column: short tag (item.label), centred at dot, right-aligned ───
    if (tagLines.length > 0) {
      const tagBlockH = tagLines.length * tagLH
      const tagStartY = cy - tagBlockH / 2 + tagFit.fontSize * 0.75
      const tip       = tagTrunc ? `<title>${escapeXml(item.label)}</title>` : ''
      const spans     = tagLines
        .map((l, li) => `<tspan x="${TAG_X}" dy="${li === 0 ? 0 : tagLH}">${escapeXml(l)}</tspan>`)
        .join('')
      unit.push(aWrap(
        `<text x="${TAG_X}" y="${tagStartY.toFixed(1)}" text-anchor="end" font-size="${tagFit.fontSize}" fill="${fill}" ${FONT_SANS_ATTR} font-weight="700">${tip}${spans}</text>`,
        tagUrl,
      ))
    }

    // ── Right column: main title, centred vertically ─────────────────────────
    // Centre the right-column block (title + detail) in the row
    const mainStartY = rowY[i] + (rowH - rightH) / 2 + mainFit.fontSize * 0.75
    const mainTip    = mainTrunc ? `<title>${escapeXml(mainText)}</title>` : ''
    const mainSpans  = mainLines
      .map((l, li) => `<tspan x="${textX}" dy="${li === 0 ? 0 : mainLH}">${escapeXml(l)}</tspan>`)
      .join('')
    unit.push(aWrap(
      `<text x="${textX}" y="${mainStartY.toFixed(1)}" font-size="${mainFit.fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${mainTip}${mainSpans}</text>`,
      mainUrl,
    ))

    // ── Right column: detail (children) below main title ─────────────────────
    if (detLines.length > 0) {
      const detStartY = mainStartY + mainLines.length * mainLH + SEC_G
      const detTip    = detTrunc ? `<title>${escapeXml(detail)}</title>` : ''
      const detSpans  = detLines
        .map((l, li) => `<tspan x="${textX}" dy="${li === 0 ? 0 : detLH}">${escapeXml(l)}</tspan>`)
        .join('')
      unit.push(`<text x="${textX}" y="${detStartY.toFixed(1)}" font-size="${detFit.fontSize}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${detTip}${detSpans}</text>`)
    }

    parts.push(`<g class="mdart-n${i + 1}">${unit.join('\n      ')}</g>`)
  })

  if (animate) parts.unshift(seqSpotlightCSS(n + 1, spec, { scale: false }))

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}
