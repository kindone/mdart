import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, lerpColor, renderEmpty, getCaption } from '../shared'

// ── Constants ─────────────────────────────────────────────────────────────────

const LBL_FS = 11, LBL_LH = 14
const VAL_FS = 10, VAL_LH = 13
const PAD_V  = 8     // top + bottom padding inside each band
const SEC_G  = 5     // gap between label block and caption block
const MIN_H  = 26    // minimum band height

// ── Per-item layout ───────────────────────────────────────────────────────────

interface BandLayout {
  lblLines: string[]
  lblTrunc: boolean
  lblUrl:   string | null
  capLines: string[]
  capTrunc: boolean
  caption:  string | null
  blockH:   number   // content height (label lines + gap + caption lines)
  bandH:    number   // total band height (content + padding, ≥ MIN_H)
}

function computeBand(
  item: MdArtSpec['items'][number],
  topInset: number,
  W: number,
): BandLayout {
  // Use the narrowest (top) inset so text never overflows the shape horizontally
  const innerW   = Math.max(120, W - topInset * 2 - 12)
  const labelMax = Math.max(12, Math.floor(innerW / 6.0))
  const captMax  = Math.max(12, Math.floor(innerW / 5.2))
  const caption  = getCaption(item)

  const { lines: lblLines, truncated: lblTrunc, url: lblUrl } = wrapLabel(item.label, labelMax, 5)
  const { lines: capLines, truncated: capTrunc } = caption
    ? wrapLabel(caption, captMax, 5)
    : { lines: [], truncated: false }

  const blockH = lblLines.length * LBL_LH
    + (capLines.length > 0 ? SEC_G + capLines.length * VAL_LH : 0)

  return {
    lblLines, lblTrunc, lblUrl,
    capLines, capTrunc,
    caption,
    blockH,
    bandH: Math.max(MIN_H, PAD_V + blockH + PAD_V),
  }
}

// ── Renderer ──────────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const W        = 500
  const GAP      = 3
  const n        = items.length
  const maxInset = W * 0.18   // narrowest band insets this much on each side

  // Index-based top insets (i=0 → narrowest/top, i=n-1 → widest/bottom)
  const topInsets = items.map((_, i) => {
    const t = n > 1 ? i / (n - 1) : 0
    return maxInset * (1 - t)
  })

  // Pre-compute per-band layout (wrap text, derive heights)
  const bands = items.map((item, i) => computeBand(item, topInsets[i], W))

  // Cumulative Y positions
  const titleH = spec.title ? 30 : 8
  const rowY: number[] = []
  let cumY = titleH
  for (const { bandH } of bands) {
    rowY.push(cumY)
    cumY += bandH + GAP
  }
  const H = cumY - GAP + 8

  const parts: string[] = []

  if (spec.title) {
    parts.push(`<text x="${W / 2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`)
  }

  items.forEach((_item, i) => {
    const y      = rowY[i]
    const { lblLines, lblTrunc, lblUrl, capLines, capTrunc, caption, blockH, bandH } = bands[i]
    const t      = n > 1 ? i / (n - 1) : 0
    const fill   = lerpColor(theme.primary, theme.secondary, t)

    // Bottom inset equals the top inset of the next item (connects trapezoids)
    const topInset = topInsets[i]
    const botInset = i < n - 1 ? topInsets[i + 1] : 0

    // Trapezoidal band path
    const d = [
      `M${topInset.toFixed(1)},${y}`,
      `L${(W - topInset).toFixed(1)},${y}`,
      `L${(W - botInset).toFixed(1)},${(y + bandH)}`,
      `L${botInset.toFixed(1)},${(y + bandH)}`,
      'Z',
    ].join(' ')
    parts.push(`<path d="${d}" fill="${fill}33" stroke="${fill}" stroke-width="1"/>`)

    // Baseline of first label line, text block vertically centred in bandH
    const lblStartY = y + (bandH - blockH) / 2 + LBL_FS * 0.75

    // ── Label (bold, up to 3 lines) ───────────────────────────────────────────
    const lblTip   = lblTrunc ? `<title>${escapeXml(lblLines.join(' '))}</title>` : ''
    const lblSpans = lblLines
      .map((l, li) => `<tspan x="${W / 2}" dy="${li === 0 ? 0 : LBL_LH}">${escapeXml(l)}</tspan>`)
      .join('')
    parts.push(aWrap(`<text x="${W / 2}" y="${lblStartY.toFixed(1)}" text-anchor="middle" font-size="${LBL_FS}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${lblTip}${lblSpans}</text>`, lblUrl))

    // ── Caption (muted, below label block, up to 3 lines) ────────────────────
    if (capLines.length > 0) {
      const capStartY = lblStartY + lblLines.length * LBL_LH + SEC_G
      const capTip    = capTrunc ? `<title>${escapeXml(caption!)}</title>` : ''
      const capSpans  = capLines
        .map((l, li) => `<tspan x="${W / 2}" dy="${li === 0 ? 0 : VAL_LH}">${escapeXml(l)}</tspan>`)
        .join('')
      parts.push(`<text x="${W / 2}" y="${capStartY.toFixed(1)}" text-anchor="middle" font-size="${VAL_FS}" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${capTip}${capSpans}</text>`)
    }
  })

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}
