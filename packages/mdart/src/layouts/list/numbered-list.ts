import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, tt, renderEmpty } from '../shared'

/**
 * Tier-2 "outline" list:
 *   item.label    → main row text
 *   item.value    → muted subtitle under the label
 *   item.children → indented sub-rows, badged a, b, c… (1 level deep)
 */
export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const W      = 460
  const PAD    = 16
  const titleH = spec.title ? 28 : 0

  // Per-item vertical offsets (see bullet-list for the layout spec).
  // Bigger gap before the first child when there's no value, because the 12 px
  // bold label has more visual weight than an 11 px italic subtitle.
  const firstChildGap = (hasValue: boolean) => hasValue ? 20 : 26
  const heights = items.map(item => {
    const hasValue = !!item.value
    const nCh      = item.children.length
    const topBL    = hasValue ? 38 : 22
    const lastBL   = nCh > 0 ? topBL + firstChildGap(hasValue) + (nCh - 1) * 17 : topBL
    return lastBL + 10
  })
  const H = PAD + titleH + heights.reduce((s, h) => s + h, 0) + PAD

  // ── Badge dimensions & x positions ──────────────────────────────────────────
  const BADGE_W = 22, BADGE_H = 22
  const SUB_W   = 14, SUB_H   = 14
  const mainBadgeX    = PAD
  const mainTextStart = PAD + BADGE_W + 8          // 46
  const subBadgeX     = PAD + 16                   // indented under main text
  const subTextStart  = subBadgeX + SUB_W + 6      // 52

  const mainLabelMax  = Math.floor(((W - PAD) - mainTextStart - 4) / 5.8)
  const valueMax      = Math.floor(((W - PAD) - mainTextStart - 4) / 5.0)
  const childLabelMax = Math.floor(((W - PAD) - subTextStart  - 4) / 5.3)

  const subLetter = (j: number) => j < 26 ? String.fromCharCode(97 + j) : String(j + 1)

  let svg = ''
  if (spec.title) {
    svg += `<text x="${PAD}" y="${PAD + 16}" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`
  }

  let y = PAD + titleH
  for (let i = 0; i < items.length; i++) {
    const item  = items[i]
    const itemH = heights[i]
    const t     = items.length > 1 ? i / (items.length - 1) : 0
    const fill  = lerpColor(theme.secondary, theme.primary, t)

    // Main number badge + label
    const labelBL  = y + 22
    const badgeCy  = labelBL - 4
    svg += `<rect x="${mainBadgeX}" y="${badgeCy - BADGE_H / 2}" width="${BADGE_W}" height="${BADGE_H}" rx="4" fill="${fill}" />`
    svg += `<text x="${mainBadgeX + BADGE_W / 2}" y="${badgeCy + 4}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${i + 1}</text>`
    svg += `<text x="${mainTextStart}" y="${labelBL}" font-size="12" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, mainLabelMax)}</text>`

    // Optional value subtitle
    let anchorBL = labelBL
    if (item.value) {
      const valueBL = y + 38
      svg += `<text x="${mainTextStart}" y="${valueBL}" font-size="11" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-style="italic">${tt(item.value, valueMax)}</text>`
      anchorBL = valueBL
    }

    // Indented child rows with letter badges
    const gap = firstChildGap(!!item.value)
    item.children.forEach((child, j) => {
      const childBL = anchorBL + gap + j * 17
      const subCy   = childBL - 4
      svg += `<rect x="${subBadgeX}" y="${subCy - SUB_H / 2}" width="${SUB_W}" height="${SUB_H}" rx="3" fill="${fill}" fill-opacity="0.6" />`
      svg += `<text x="${subBadgeX + SUB_W / 2}" y="${subCy + 3}" text-anchor="middle" font-size="9" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${subLetter(j)}</text>`
      svg += `<text x="${subTextStart}" y="${childBL}" font-size="11" fill="${theme.text}" fill-opacity="0.85" font-family="system-ui,sans-serif">${tt(child.label, childLabelMax)}</text>`
    })

    // Divider between items
    if (i < items.length - 1) {
      svg += `<line x1="${PAD}" y1="${y + itemH}" x2="${W - PAD}" y2="${y + itemH}" stroke="${theme.border}" stroke-width="0.5" />`
    }

    y += itemH
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svg}
  </svg>`
}
