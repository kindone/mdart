import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, lerpColor, renderEmpty, itemTitleTag, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument } from '../shared'

// ── Layout constants ─────────────────────────────────────────────────────────

const W   = 460
const PAD = 16

const LBL_FS = 12, LBL_LH = 15   // main label
const VAL_FS = 11, VAL_LH = 14   // value subtitle
const CHD_FS = 11, CHD_LH = 17   // child rows

const FIRST_LBL_BL = 22    // baseline of first label line from item top
const LBL_VAL_STEP = 16    // advance from last label baseline to first value baseline
const PAD_B        = 10    // padding below last baseline to item bottom

// Badge + text x positions (unchanged from original)
const BADGE_W       = 22, BADGE_H = 22
const SUB_W         = 14, SUB_H   = 14
const mainBadgeX    = PAD
const mainTextStart = PAD + BADGE_W + 8       // 46
const subBadgeX     = PAD + 16
const subTextStart  = subBadgeX + SUB_W + 6   // 52

// Right margin = PAD (16 px); px/char calibrated to system-ui at each font size
const LABEL_MAX = Math.max(12, Math.floor((W - PAD * 2 - mainTextStart) / 6.5))  // 12 px → ~58
const VALUE_MAX = Math.max(12, Math.floor((W - PAD * 2 - mainTextStart) / 6.0))  // 11 px → ~63
const CHILD_MAX = Math.max(12, Math.floor((W - PAD * 2 - subTextStart)  / 6.0))  // 11 px → ~62

const subLetter = (j: number) => j < 26 ? String.fromCharCode(97 + j) : String(j + 1)

// ── Per-item layout pre-computation ──────────────────────────────────────────

interface ItemLayout {
  lblLines:   string[]
  lblTrunc:   boolean
  lblUrl:     string | null
  valLines:   string[]
  valTrunc:   boolean
  valUrl:     string | null
  chdLayouts: Array<{ lines: string[]; truncated: boolean }>
  itemH:      number   // total item height
  firstValBL: number   // first value line baseline offset from item top (0 if no value)
  firstChdBL: number   // first child line baseline offset from item top (0 if no children)
}

function computeItemLayout(item: MdArtSpec['items'][number]): ItemLayout {
  const { lines: lblLines, truncated: lblTrunc, url: lblUrl } = wrapLabel(item.label, LABEL_MAX, 5)
  const { lines: valLines, truncated: valTrunc, url: valUrl } = item.value
    ? wrapLabel(item.value, VALUE_MAX, 5)
    : { lines: [], truncated: false, url: null }
  const chdLayouts = item.children.map(ch => wrapLabel(ch.label, CHILD_MAX, 5))

  // Walk baselines top-to-bottom
  const lastLblBL = FIRST_LBL_BL + (lblLines.length - 1) * LBL_LH
  let anchorBL    = lastLblBL
  let firstValBL  = 0
  if (valLines.length > 0) {
    firstValBL = lastLblBL + LBL_VAL_STEP
    anchorBL   = firstValBL + (valLines.length - 1) * VAL_LH
  }

  let firstChdBL = 0
  let lastBL     = anchorBL
  if (item.children.length > 0) {
    const gap   = item.value ? 20 : 26   // same heuristic as original
    firstChdBL  = anchorBL + gap
    const total = chdLayouts.reduce((s, { lines }) => s + lines.length, 0)
    lastBL      = firstChdBL + (total - 1) * CHD_LH
  }

  return {
    lblLines, lblTrunc, lblUrl, valLines, valTrunc, valUrl, chdLayouts,
    itemH: lastBL + PAD_B,
    firstValBL, firstChdBL,
  }
}

// ── Renderer ─────────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const titleH  = spec.title ? 28 : 0
  const layouts = items.map(computeItemLayout)
  const H       = PAD + titleH + layouts.reduce((s, l) => s + l.itemH, 0) + PAD

  const n = items.length
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  let svg = ''
  if (spec.title) {
    svg += `<text x="${PAD}" y="${PAD + 16}" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`
  }

  let y = PAD + titleH
  for (let i = 0; i < items.length; i++) {
    const item   = items[i]
    const layout = layouts[i]
    const t      = items.length > 1 ? i / (items.length - 1) : 0
    const fill   = lerpColor(theme.secondary, theme.primary, t)
    const { lblLines, lblTrunc, lblUrl, valLines, valTrunc, valUrl, chdLayouts,
            itemH, firstValBL, firstChdBL } = layout

    const labelBL = y + FIRST_LBL_BL
    const badgeCy = labelBL - 4

    // ── Main label (bold, up to 2 lines) ─────────────────────────────────────
    const lblTip   = lblTrunc ? `<title>${escapeXml(item.label)}</title>` : ''
    const lblSpans = lblLines
      .map((l, li) => `<tspan x="${mainTextStart}" dy="${li === 0 ? 0 : LBL_LH}">${escapeXml(l)}</tspan>`)
      .join('')

    // ── Value subtitle (italic muted, up to 2 lines) ──────────────────────────
    let valStr = ''
    if (valLines.length > 0) {
      const valBL    = y + firstValBL
      const valTip   = valTrunc ? `<title>${escapeXml(item.value ?? '')}</title>` : ''
      const valSpans = valLines
        .map((l, li) => `<tspan x="${mainTextStart}" dy="${li === 0 ? 0 : VAL_LH}">${escapeXml(l)}</tspan>`)
        .join('')
      valStr = aWrap(`<text x="${mainTextStart}" y="${valBL}" font-size="${VAL_FS}" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-style="italic">${valTip}${valSpans}</text>`, valUrl)
    }

    // ── Child rows with letter badges (up to 2 lines each) ───────────────────
    // Single child → plain bullet; multiple children → letter badges a, b, c…
    const useLetterBadge = item.children.length > 1
    let chdStr = ''
    let chdBL = y + firstChdBL
    item.children.forEach((child, j) => {
      const { lines: chLines, truncated: chTrunc } = chdLayouts[j]
      const subCy = chdBL - 4

      if (useLetterBadge) {
        chdStr += `<rect x="${subBadgeX}" y="${(subCy - SUB_H / 2).toFixed(1)}" width="${SUB_W}" height="${SUB_H}" rx="3" fill="${fill}" fill-opacity="0.6" />`
        chdStr += `<text x="${(subBadgeX + SUB_W / 2).toFixed(1)}" y="${(subCy + 3).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${subLetter(j)}</text>`
      } else {
        chdStr += `<circle cx="${(subBadgeX + SUB_W / 2).toFixed(1)}" cy="${subCy.toFixed(1)}" r="4" fill="${fill}" fill-opacity="0.7" />`
      }

      const chTip   = chTrunc ? `<title>${escapeXml(child.label)}</title>` : ''
      // Continuation lines align to subTextStart (indented under the badge, no repeat badge)
      const chSpans = chLines
        .map((l, li) => `<tspan x="${subTextStart}" dy="${li === 0 ? 0 : CHD_LH}">${escapeXml(l)}</tspan>`)
        .join('')
      chdStr += `<text x="${subTextStart}" y="${chdBL}" font-size="${CHD_FS}" fill="${theme.text}" fill-opacity="0.85" font-family="system-ui,sans-serif">${chTip}${chSpans}</text>`

      chdBL += chLines.length * CHD_LH   // advance by actual wrapped line count
    })

    // ── Assemble node (badge + label + value + children) ─────────────────────
    const nodeStr =
      `<rect x="${mainBadgeX}" y="${(badgeCy - BADGE_H / 2).toFixed(1)}" width="${BADGE_W}" height="${BADGE_H}" rx="4" fill="${fill}" >${itemTitleTag(item)}</rect>` +
      `<text x="${(mainBadgeX + BADGE_W / 2).toFixed(1)}" y="${(badgeCy + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${i + 1}</text>` +
      aWrap(`<text x="${mainTextStart}" y="${labelBL}" font-size="${LBL_FS}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${lblTip}${lblSpans}</text>`, lblUrl) +
      valStr + chdStr
    svg += wrapItem(nodeStr, i, animate, instrument)

    // ── Divider — separator, not part of the item ──────────────────────────────
    if (i < items.length - 1) {
      svg += `<line x1="${PAD}" y1="${y + itemH}" x2="${W - PAD}" y2="${y + itemH}" stroke="${theme.border}" stroke-width="0.5" />`
    }

    y += itemH
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${animate ? seqSpotlightCSS(n, spec) : ''}
    ${svg}
  </svg>`
}
