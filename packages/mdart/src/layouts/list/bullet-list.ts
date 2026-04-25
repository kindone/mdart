import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, tt, renderEmpty } from '../shared'

/**
 * Tier-2 "outline" list:
 *   item.label    → main row text
 *   item.value    → muted subtitle under the label
 *   item.children → indented sub-rows (1 level deep)
 */
export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const W      = 460
  const PAD    = 16
  const titleH = spec.title ? 28 : 0

  // ── Per-item vertical offsets (from item top) ───────────────────────────────
  //   label baseline      = 22
  //   value baseline      = 38   (only if item.value)
  //   first child BL      = (value ? 38 + 20 : 22 + 26)
  //   child-to-child step = 17
  //   bottom padding      = 10
  //
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

  // ── X positions ─────────────────────────────────────────────────────────────
  const mainMarkerX    = PAD + 8          // circle centre
  const mainTextStart  = PAD + 22
  const subMarkerX     = PAD + 28         // small circle centre, indented
  const subTextStart   = PAD + 38

  const mainLabelMax  = Math.floor(((W - PAD) - mainTextStart - 4) / 5.8)
  const valueMax      = Math.floor(((W - PAD) - mainTextStart - 4) / 5.0)
  const childLabelMax = Math.floor(((W - PAD) - subTextStart  - 4) / 5.3)

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

    // Main bullet + label
    const labelBL  = y + 22
    const markerCy = labelBL - 4
    svg += `<circle cx="${mainMarkerX}" cy="${markerCy}" r="5" fill="${fill}" />`
    svg += `<text x="${mainTextStart}" y="${labelBL}" font-size="12" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, mainLabelMax)}</text>`

    // Optional value subtitle
    let anchorBL = labelBL
    if (item.value) {
      const valueBL = y + 38
      svg += `<text x="${mainTextStart}" y="${valueBL}" font-size="11" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-style="italic">${tt(item.value, valueMax)}</text>`
      anchorBL = valueBL
    }

    // Indented child rows (1 level deep)
    const gap = firstChildGap(!!item.value)
    item.children.forEach((child, j) => {
      const childBL       = anchorBL + gap + j * 17
      const childMarkerCy = childBL - 4
      svg += `<circle cx="${subMarkerX}" cy="${childMarkerCy}" r="3" fill="${fill}" fill-opacity="0.7" />`
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
