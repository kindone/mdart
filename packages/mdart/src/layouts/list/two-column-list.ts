import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, lerpColor, renderEmpty, getCaption, itemTitleTag } from '../shared'

// ── Layout constants ─────────────────────────────────────────────────────────

const W      = 500
const PAD    = 16
const ROW_GAP = 6
const SEC_G  = 4

const LBL_FS = 11, LBL_LH = 14
const CAP_FS = 10, CAP_LH = 13

const HALF     = W / 2
const COL_TEXTX = 18   // dot radius (4) + gap (6) + padding = offset from column start
const COL_W    = HALF - PAD - COL_TEXTX - 4  // available text width per column
const MIN_ROW_H = 32
const PAD_V    = 8

const LABEL_MAX = Math.max(10, Math.floor(COL_W / 5.6))  // ~38
const CAP_MAX   = Math.max(10, Math.floor(COL_W / 5.0))  // ~43

// ── Per-item layout ───────────────────────────────────────────────────────────

interface ItemLayout {
  lblLines: string[]
  lblTrunc: boolean
  lblUrl:   string | null
  capLines: string[]
  capTrunc: boolean
  caption:  string | null
  blockH:   number
  itemH:    number
}

function computeLayout(item: MdArtSpec['items'][number]): ItemLayout {
  const { lines: lblLines, truncated: lblTrunc, url: lblUrl } = wrapLabel(item.label, LABEL_MAX, 5)
  const caption = getCaption(item)
  const { lines: capLines, truncated: capTrunc } = caption
    ? wrapLabel(caption, CAP_MAX, 5)
    : { lines: [], truncated: false }

  const blockH = lblLines.length * LBL_LH
    + (capLines.length > 0 ? SEC_G + capLines.length * CAP_LH : 0)
  const itemH  = Math.max(MIN_ROW_H, PAD_V + blockH + PAD_V)

  return { lblLines, lblTrunc, lblUrl, capLines, capTrunc, caption, blockH, itemH }
}

// ── Renderer ─────────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const half         = Math.ceil(items.length / 2)
  const left         = items.slice(0, half)
  const right        = items.slice(half)
  const maxRows      = Math.max(left.length, right.length)

  const titleH       = spec.title ? 28 : 0
  const layouts      = items.map(computeLayout)
  const leftLayouts  = layouts.slice(0, half)
  const rightLayouts = layouts.slice(half)

  // Row height = max of both columns per row
  const rowHeights: number[] = []
  for (let r = 0; r < maxRows; r++) {
    const lh = leftLayouts[r]?.itemH ?? MIN_ROW_H
    const rh = rightLayouts[r]?.itemH ?? 0
    rowHeights.push(Math.max(lh, rh))
  }

  const rowY: number[] = []
  let cumY = PAD + titleH
  for (const rh of rowHeights) {
    rowY.push(cumY)
    cumY += rh + ROW_GAP
  }
  const H = cumY - ROW_GAP + PAD

  let svgContent = ''

  if (spec.title) {
    svgContent += `<text x="${W / 2}" y="${PAD + 16}" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`
  }

  svgContent += `<line x1="${HALF}" y1="${PAD + titleH}" x2="${HALF}" y2="${H - PAD}" stroke="${theme.border}" stroke-width="1" />`

  const renderColItem = (
    item: typeof items[number],
    layout: ItemLayout,
    colStartX: number,
    rowH: number,
    rowYoffset: number,
    globalIdx: number,
  ) => {
    const { lblLines, lblTrunc, lblUrl, capLines, capTrunc, caption, blockH } = layout
    const t    = items.length > 1 ? globalIdx / (items.length - 1) : 0
    const fill = lerpColor(theme.secondary, theme.primary, t)

    // Vertically centre text block in the row
    const topY   = rowYoffset + (rowH - blockH) / 2
    const dotCy  = topY + LBL_FS * 0.4
    const lblY   = topY + LBL_FS * 0.75

    svgContent += `<circle cx="${colStartX + 8}" cy="${dotCy.toFixed(1)}" r="4" fill="${fill}" >${itemTitleTag(item)}</circle>`

    const lblTip   = lblTrunc ? `<title>${escapeXml(lblLines.join(' '))}</title>` : ''
    const lblSpans = lblLines
      .map((l, li) => `<tspan x="${colStartX + COL_TEXTX}" dy="${li === 0 ? 0 : LBL_LH}">${escapeXml(l)}</tspan>`)
      .join('')
    svgContent += aWrap(`<text x="${colStartX + COL_TEXTX}" y="${lblY.toFixed(1)}" font-size="${LBL_FS}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${lblTip}${lblSpans}</text>`, lblUrl)

    if (capLines.length > 0) {
      const capY   = lblY + lblLines.length * LBL_LH + SEC_G
      const capTip = capTrunc ? `<title>${escapeXml(caption!)}</title>` : ''
      const capSpans = capLines
        .map((l, li) => `<tspan x="${colStartX + COL_TEXTX}" dy="${li === 0 ? 0 : CAP_LH}">${escapeXml(l)}</tspan>`)
        .join('')
      svgContent += `<text x="${colStartX + COL_TEXTX}" y="${capY.toFixed(1)}" font-size="${CAP_FS}" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${capTip}${capSpans}</text>`
    }
  }

  for (let r = 0; r < maxRows; r++) {
    const rY = rowY[r]
    const rH = rowHeights[r]

    if (leftLayouts[r]) renderColItem(left[r],  leftLayouts[r],  PAD,        rH, rY, r)
    if (rightLayouts[r]) renderColItem(right[r], rightLayouts[r], HALF + PAD, rH, rY, half + r)

    if (r < maxRows - 1) {
      svgContent += `<line x1="${PAD}" y1="${rY + rH}" x2="${W - PAD}" y2="${rY + rH}" stroke="${theme.border}" stroke-width="0.5" />`
    }
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svgContent}
  </svg>`
}
