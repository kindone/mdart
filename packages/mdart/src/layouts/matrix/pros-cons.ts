import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, itemTitleTag, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

// ── Layout constants ─────────────────────────────────────────────────────────

const W        = 500
const PAD      = 16
const HALF     = W / 2
const HEADER_H = 40
const PAD_V    = 8
const MIN_ROW_H = 32
const LBL_FS   = 11, LBL_LH = 14

// prefix "✓ " ≈ 14px; right margin 6px
const COL_MAX = Math.max(10, Math.floor((HALF - PAD - 14 - 6) / 5.8))  // ~33

// ── Helpers ───────────────────────────────────────────────────────────────────

function colText(
  item: MdArtItem,
  layout: { lines: string[]; truncated: boolean; url: string | null },
  startX: number,
  textX: number,
  textY: number,
  color: string,
  prefix: string,
): string {
  const { lines, truncated, url } = layout
  // Always emit a tooltip with the full item summary (label + value + attrs);
  // the truncation tip is now subsumed by it.
  const tip = itemTitleTag(item) || (truncated ? `<title>${escapeXml(item.label)}</title>` : '')
  // First span carries the prefix; continuation lines align to textX
  const spans = lines
    .map((l, li) => li === 0
      ? `<tspan x="${startX}">${escapeXml(prefix)}</tspan><tspan x="${textX}">${escapeXml(l)}</tspan>`
      : `<tspan x="${textX}" dy="${LBL_LH}">${escapeXml(l)}</tspan>`)
    .join('')
  return aWrap(`<text x="${startX}" y="${textY.toFixed(1)}" font-size="${LBL_FS}" fill="${color}" ${FONT_SANS_ATTR}>${tip}${spans}</text>`, url)
}

// ── Renderer ─────────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  let pros: MdArtItem[] = []
  let cons: MdArtItem[] = []
  let currentSection: 'pros' | 'cons' | null = null

  const PROS_HEADERS = new Set(['pros', 'pro', 'advantages', 'advantage', 'benefits', 'benefit', 'for'])
  const CONS_HEADERS = new Set(['cons', 'con', 'disadvantages', 'disadvantage', 'risks', 'risk', 'against'])

  for (const item of spec.items) {
    const normalized  = item.label.toLowerCase().trim().replace(/:$/, '').trim()
    const hasProsAttr = item.attrs.some(a => a.toLowerCase() === 'pros')
    const hasConsAttr = item.attrs.some(a => a.toLowerCase() === 'cons')
    const isProsHeader = hasProsAttr || PROS_HEADERS.has(normalized)
    const isConsHeader = hasConsAttr || CONS_HEADERS.has(normalized)

    if (isProsHeader) {
      currentSection = 'pros'
      if (item.children.length) { pros.push(...item.children); currentSection = null }
      continue
    }
    if (isConsHeader) {
      currentSection = 'cons'
      if (item.children.length) { cons.push(...item.children); currentSection = null }
      continue
    }
    if (item.prefix === '+') { pros.push(item); continue }
    if (currentSection === 'pros') { pros.push(item); continue }
    if (currentSection === 'cons') { cons.push(item); continue }
    if (item.prefix === '-') cons.push(item)
  }

  const maxRows = Math.max(pros.length, cons.length, 1)

  const proLayouts = pros.map(p => wrapLabel(p.label, COL_MAX, 5))
  const conLayouts = cons.map(c => wrapLabel(c.label, COL_MAX, 5))

  // Per-row height = max of pro and con line counts
  const rowHeights: number[] = []
  for (let i = 0; i < maxRows; i++) {
    const pLines = proLayouts[i]?.lines.length ?? 0
    const cLines = conLayouts[i]?.lines.length ?? 0
    rowHeights.push(Math.max(MIN_ROW_H, PAD_V + Math.max(pLines, cLines, 1) * LBL_LH + PAD_V))
  }

  const titleH      = spec.title ? 28 : 0
  const totalRowsH  = rowHeights.reduce((a, b) => a + b, 0)
  const H           = PAD + titleH + HEADER_H + totalRowsH + PAD
  const baseY       = PAD + titleH
  const itemsY      = baseY + HEADER_H

  const rowY: number[] = []
  let cumY = itemsY
  for (const rh of rowHeights) { rowY.push(cumY); cumY += rh }

  let svgContent = ''

  if (spec.title) {
    svgContent += `<text x="${W / 2}" y="${PAD + 16}" text-anchor="middle" font-size="13" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(spec.title)}</text>`
  }

  // Item text colors: light tints for dark-mode row backgrounds, dark shades for light-mode
  const isLight  = theme.surface === '#ffffff'
  const proColor = isLight ? '#065f46' : '#6ee7b7'
  const conColor = isLight ? '#881337' : '#fda4af'

  const headerUnit = [
    `<rect x="0" y="${baseY}" width="${HALF}" height="${HEADER_H}" fill="#064e3b" />`,
    `<text x="${HALF / 2}" y="${baseY + 25}" text-anchor="middle" font-size="13" fill="#6ee7b7" ${FONT_SANS_ATTR} font-weight="700">Pros</text>`,
    `<rect x="${HALF}" y="${baseY}" width="${HALF}" height="${HEADER_H}" fill="#4c0519" />`,
    `<text x="${HALF + HALF / 2}" y="${baseY + 25}" text-anchor="middle" font-size="13" fill="#fda4af" ${FONT_SANS_ATTR} font-weight="700">Cons</text>`,
  ].join('')
  svgContent += wrapItem(headerUnit, 0, animate, instrument)

  for (let i = 0; i < maxRows; i++) {
    const unit: string[] = []
    const rY   = rowY[i]
    const rH   = rowHeights[i]
    const rowBg = i % 2 === 0 ? theme.surface : theme.bg

    unit.push(`<rect x="0" y="${rY}" width="${HALF}" height="${rH}" fill="${rowBg}" />`)
    unit.push(`<rect x="${HALF}" y="${rY}" width="${HALF}" height="${rH}" fill="${rowBg}" />`)

    // Top-align multi-line, vertically centre single-line
    const lines = Math.max(proLayouts[i]?.lines.length ?? 0, conLayouts[i]?.lines.length ?? 0, 1)
    const textY = lines > 1 ? rY + PAD_V + LBL_FS * 0.75 : rY + rH / 2 + 4

    if (i < pros.length) {
      unit.push(colText(pros[i], proLayouts[i], PAD, PAD + 14, textY, proColor, '✓'))
    }
    if (i < cons.length) {
      unit.push(colText(cons[i], conLayouts[i], HALF + PAD, HALF + PAD + 14, textY, conColor, '✗'))
    }

    if (i < maxRows - 1) {
      unit.push(`<line x1="0" y1="${rY + rH}" x2="${W}" y2="${rY + rH}" stroke="${theme.border}" stroke-width="0.5" />`)
    }
    svgContent += wrapItem(unit.join(''), i + 1, animate, instrument)
  }

  svgContent += `<line x1="${HALF}" y1="${baseY}" x2="${HALF}" y2="${H}" stroke="${theme.bg}" stroke-width="2" />`
  if (animate) svgContent = seqSpotlightCSS(maxRows + 1, spec, { scale: false, loopStartIndex: 1 }) + svgContent

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svgContent}
  </svg>`
}
