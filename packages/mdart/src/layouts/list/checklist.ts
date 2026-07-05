import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, renderEmpty, itemTitleTag, shouldAnimate, seqSpotlightCSS } from '../shared'

const DONE_ATTRS = ['done', '✓', 'complete']
const isDone = (it: { attrs: string[] }) => it.attrs.some(a => DONE_ATTRS.includes(a))

// ── Layout constants ─────────────────────────────────────────────────────────

const W   = 480
const PAD = 16

const LBL_FS = 12, LBL_LH = 15
const VAL_FS = 10, VAL_LH = 13
const CHD_FS = 10.5

const TOP_PAD         = 8    // yCur → checkbox top
const FIRST_LBL_BL    = 22   // yCur → first label baseline (centres x-height on checkbox)
const SEC_G           = 14   // label baseline → value baseline (full LBL_LH gap, prevents overlap)
const GAP_BEFORE_SUBS = 10   // last text zone bottom → first sub-checkbox top
const SUB_BOX         = 12
const SUB_GAP         = 4
const BOTTOM_PAD      = 8
const ITEM_GAP        = 6

// Character limits
const LBL_MAX = Math.max(12, Math.floor((W - PAD - 26 - PAD) / 4.8))  // ~88
const VAL_MAX = Math.max(12, Math.floor((W - PAD - 26 - PAD) / 4.0))  // ~106
const CHD_MAX = Math.max(12, Math.floor((W - PAD - 50 - PAD) / 4.2))  // ~83

// ── Per-item layout ───────────────────────────────────────────────────────────

interface ItemLayout {
  lblLines:    string[]
  lblTrunc:    boolean
  lblUrl:      string | null
  valLines:    string[]
  valTrunc:    boolean
  valUrl:      string | null
  chdLayouts:  Array<{ lines: string[]; truncated: boolean }>
  itemH:       number
  firstValBL:  number  // relative to yCur; 0 if no value
  firstSubTop: number  // relative to yCur; 0 if no children
}

function computeItemLayout(
  item: MdArtSpec['items'][number],
  extraAttrChars: number,
): ItemLayout {
  // Account for [tag] label on the right reducing available width
  const lblMaxAdj = extraAttrChars > 0
    ? Math.max(12, Math.floor((W - PAD - 26 - PAD - extraAttrChars * 5.5 - 30) / 4.8))
    : LBL_MAX

  const { lines: lblLines, truncated: lblTrunc, url: lblUrl } = wrapLabel(item.label, lblMaxAdj, 5)
  const { lines: valLines, truncated: valTrunc, url: valUrl } = item.value
    ? wrapLabel(item.value, VAL_MAX, 5)
    : { lines: [], truncated: false, url: null }
  const chdLayouts = item.children.map(ch => wrapLabel(ch.label, CHD_MAX, 5))

  const lastLblBL  = FIRST_LBL_BL + (lblLines.length - 1) * LBL_LH
  let zoneBottom   = lastLblBL + 4   // approx descent below baseline
  let firstValBL   = 0
  if (valLines.length > 0) {
    firstValBL = lastLblBL + SEC_G
    zoneBottom = firstValBL + (valLines.length - 1) * VAL_LH + 4
  }

  let firstSubTop  = 0
  let lastBottom   = zoneBottom
  if (item.children.length > 0) {
    firstSubTop = zoneBottom + GAP_BEFORE_SUBS
    let subH    = 0
    for (const { lines } of chdLayouts) {
      subH += Math.max(SUB_BOX, lines.length * VAL_LH) + SUB_GAP
    }
    subH    -= SUB_GAP  // no trailing gap
    lastBottom = firstSubTop + subH
  }

  return {
    lblLines, lblTrunc, lblUrl, valLines, valTrunc, valUrl, chdLayouts,
    itemH: lastBottom + BOTTOM_PAD,
    firstValBL, firstSubTop,
  }
}

// ── Renderer ─────────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const titleH = spec.title ? 28 : 0
  const layouts = items.map(item => {
    const extraAttrs = item.attrs.filter(a => !DONE_ATTRS.includes(a))
    return computeItemLayout(item, extraAttrs.join(', ').length)
  })

  const totalContent = layouts.reduce((a, l) => a + l.itemH, 0)
    + ITEM_GAP * Math.max(0, items.length - 1)
  const H = PAD + titleH + totalContent + PAD

  const n = items.length
  const animate = shouldAnimate(spec)
  let svgContent = ''
  if (spec.title) {
    svgContent += `<text x="${PAD}" y="${PAD + 16}" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`
  }

  let yCur = PAD + titleH

  for (let i = 0; i < items.length; i++) {
    const item   = items[i]
    const layout = layouts[i]
    const done   = isDone(item)
    const extraAttrs = item.attrs.filter(a => !DONE_ATTRS.includes(a))
    const { lblLines, lblTrunc, lblUrl, valLines, valTrunc, valUrl, chdLayouts, itemH, firstValBL, firstSubTop } = layout

    // ── Main checkbox ──────────────────────────────────────────────────────────
    const boxY = yCur + TOP_PAD

    // ── Main label (up to 3 lines) ─────────────────────────────────────────────
    const labelY     = yCur + FIRST_LBL_BL
    const labelStyle = done
      ? `fill="${theme.text}" fill-opacity="0.62" font-style="italic"`
      : `fill="${theme.text}"`
    const lblTip   = lblTrunc ? `<title>${escapeXml(item.label)}</title>` : ''
    const lblSpans = lblLines
      .map((l, li) => `<tspan x="${PAD + 26}" dy="${li === 0 ? 0 : LBL_LH}">${escapeXml(l)}</tspan>`)
      .join('')

    // ── Value / description (up to 2 lines) ────────────────────────────────────
    let valStr = ''
    if (valLines.length > 0) {
      const valY   = yCur + firstValBL
      const valTip = valTrunc ? `<title>${escapeXml(item.value ?? '')}</title>` : ''
      const valSpans = valLines
        .map((l, li) => `<tspan x="${PAD + 26}" dy="${li === 0 ? 0 : VAL_LH}">${escapeXml(l)}</tspan>`)
        .join('')
      valStr = aWrap(`<text x="${PAD + 26}" y="${valY}" font-size="${VAL_FS}" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${valTip}${valSpans}</text>`, valUrl)
    }

    // ── Subtasks ───────────────────────────────────────────────────────────────
    const subX   = PAD + 32
    const cTextX = subX + SUB_BOX + 6
    let subTop   = yCur + firstSubTop
    let subStr   = ''

    for (let ci = 0; ci < item.children.length; ci++) {
      const child     = item.children[ci]
      const { lines: chLines, truncated: chTrunc } = chdLayouts[ci]
      const childDone = done || isDone(child)
      const subCy     = subTop + SUB_BOX / 2
      const cLabelY   = subTop + 10

      subStr += `<rect x="${subX}" y="${subTop}" width="${SUB_BOX}" height="${SUB_BOX}" rx="2" fill="none" stroke="${theme.primary}" stroke-width="1.2" opacity="0.85" />`
      if (childDone) {
        subStr += `<polyline points="${subX + 3},${subCy} ${subX + 6},${subCy + 2.5} ${subX + 10},${subCy - 3}" fill="none" stroke="${theme.accent}" stroke-width="1.5" stroke-linecap="round" />`
      }

      const cStyle = childDone
        ? `fill="${theme.text}" fill-opacity="0.55" font-style="italic"`
        : `fill="${theme.text}" fill-opacity="0.85"`
      const chTip   = chTrunc ? `<title>${escapeXml(child.label)}</title>` : ''
      const chSpans = chLines
        .map((l, li) => `<tspan x="${cTextX}" dy="${li === 0 ? 0 : VAL_LH}">${escapeXml(l)}</tspan>`)
        .join('')
      subStr += `<text x="${cTextX}" y="${cLabelY}" font-size="${CHD_FS}" font-family="system-ui,sans-serif" ${cStyle}>${chTip}${chSpans}</text>`

      subTop += Math.max(SUB_BOX, chLines.length * VAL_LH) + SUB_GAP
    }

    // ── Assemble node (checkbox + label + tags + value + subtasks) ────────────
    let nodeStr = ''
    nodeStr += `<rect x="${PAD}" y="${boxY}" width="18" height="18" rx="3" fill="none" stroke="${theme.primary}" stroke-width="1.5" >${itemTitleTag(item)}</rect>`
    if (done) {
      const cy = boxY + 9
      nodeStr += `<polyline points="${PAD + 4},${cy} ${PAD + 8},${cy + 4} ${PAD + 14},${cy - 4}" fill="none" stroke="${theme.accent}" stroke-width="2" stroke-linecap="round" />`
    }
    nodeStr += aWrap(`<text x="${PAD + 26}" y="${labelY}" font-size="${LBL_FS}" font-family="system-ui,sans-serif" ${labelStyle}>${lblTip}${lblSpans}</text>`, lblUrl)
    if (extraAttrs.length > 0) {
      nodeStr += `<text x="${W - PAD}" y="${labelY}" text-anchor="end" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">[${extraAttrs.join(', ')}]</text>`
    }
    nodeStr += valStr + subStr
    svgContent += animate ? `<g class="mdart-n${i}">${nodeStr}</g>` : nodeStr

    // ── Separator — not part of the item ──────────────────────────────────────
    if (i < items.length - 1) {
      const sepY = yCur + itemH + ITEM_GAP / 2
      svgContent += `<line x1="${PAD}" y1="${sepY.toFixed(1)}" x2="${W - PAD}" y2="${sepY.toFixed(1)}" stroke="${theme.border}" stroke-width="0.5" />`
    }

    yCur += itemH + ITEM_GAP
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${animate ? seqSpotlightCSS(n, spec) : ''}
    ${svgContent}
  </svg>`
}
