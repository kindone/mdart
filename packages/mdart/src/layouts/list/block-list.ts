import type { MdArtSpec, MdArtItem } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, lerpColor, renderEmpty } from '../shared'

// ── Layout constants ─────────────────────────────────────────────────────────

const COLS   = 2
const W      = 500
const GAP    = 8
const CELL_W = (W - (COLS - 1) * GAP) / COLS   // 246 px

const PAD_L  = 16   // left padding (after 6px accent bar)
const PAD_T  = 14   // top → first label baseline
const PAD_B  = 10   // below last text line
const SEC_G  = 5    // vertical gap between label / value / children sections

const LBL_FS = 12
const LBL_LH = 15
const VAL_FS = 10
const VAL_LH = 13
const CHD_FS = 10
const CHD_LH = 13

// Character limits: px available ÷ avg px/char at each font size
const LABEL_MAX = Math.max(8,  Math.floor((CELL_W - PAD_L - 8) / 6.5))   // ~34
const VALUE_MAX = Math.max(10, Math.floor((CELL_W - PAD_L - 8) / 5.5))   // ~40
// Child continuation lines indent by ~8 px (width of "· "), reducing available width slightly
const CHILD_MAX = Math.max(8,  Math.floor((CELL_W - PAD_L - 8) / 5.5) - 2) // ~38

// ── Pre-compute per-item layout ──────────────────────────────────────────────

interface ItemLayout {
  lblLines: string[]
  lblTrunc: boolean
  valLines: string[]
  valTrunc: boolean
  // Each child's wrapped lines (maxLines=4 to let long sentences flow naturally)
  chdLayouts: Array<{ lines: string[]; truncated: boolean }>
  h: number           // desired cell height for this item
}

function computeItemLayout(item: MdArtItem): ItemLayout {
  const { lines: lblLines, truncated: lblTrunc } = wrapLabel(item.label, LABEL_MAX, 2)
  const { lines: valLines, truncated: valTrunc } = item.value
    ? wrapLabel(item.value, VALUE_MAX, 2)
    : { lines: [], truncated: false }

  const chdLayouts = item.children.map(ch => wrapLabel(ch.label, CHILD_MAX, 4))
  const totalChdLines = chdLayouts.reduce((s, cl) => s + cl.lines.length, 0)

  let h = PAD_T
  h += lblLines.length * LBL_LH
  if (valLines.length > 0)    h += SEC_G + valLines.length * VAL_LH
  if (totalChdLines > 0)      h += SEC_G + totalChdLines * CHD_LH
  h += PAD_B

  return { lblLines, lblTrunc, valLines, valTrunc, chdLayouts, h: Math.max(56, h) }
}

// ── Renderer ─────────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const layouts  = items.map(computeItemLayout)
  const rows     = Math.ceil(items.length / COLS)
  const titleH   = spec.title ? 30 : 8

  // Row height = max cell height in each row (so both columns stay aligned)
  const rowHeights: number[] = []
  for (let r = 0; r < rows; r++) {
    const a = layouts[r * COLS]?.h ?? 56
    const b = layouts[r * COLS + 1]?.h ?? 0
    rowHeights.push(Math.max(a, b))
  }

  // Cumulative Y positions for each row
  const rowY: number[] = []
  let cumY = titleH
  for (const rh of rowHeights) {
    rowY.push(cumY)
    cumY += rh + GAP
  }
  const H = cumY - GAP + 8   // trim trailing gap + bottom margin

  const parts: string[] = []

  if (spec.title) {
    parts.push(`<text x="${W / 2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`)
  }

  items.forEach((item, i) => {
    const col   = i % COLS
    const row   = Math.floor(i / COLS)
    const x     = col * (CELL_W + GAP)
    const y     = rowY[row]
    const cellH = rowHeights[row]
    const t     = items.length > 1 ? i / (items.length - 1) : 0
    const fill  = lerpColor(theme.primary, theme.secondary, t)
    const { lblLines, lblTrunc, valLines, valTrunc, chdLayouts } = layouts[i]

    // Cell background rect + left accent bar
    parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${CELL_W.toFixed(1)}" height="${cellH}" rx="8" fill="${fill}33" stroke="${fill}88" stroke-width="1.5"/>`)
    parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="6" height="${cellH}" rx="3" fill="${fill}"/>`)

    const tx  = (x + PAD_L).toFixed(1)       // first-line x
    const ctx = (x + PAD_L + 8).toFixed(1)   // continuation indent (past "· ")

    // ── Label (bold, up to 2 lines) ──────────────────────────────────────────
    const lblTip   = lblTrunc ? `<title>${escapeXml(item.label)}</title>` : ''
    const lblSpans = lblLines
      .map((l, li) => `<tspan x="${tx}" dy="${li === 0 ? 0 : LBL_LH}">${escapeXml(l)}</tspan>`)
      .join('')
    parts.push(`<text x="${tx}" y="${(y + PAD_T).toFixed(1)}" font-size="${LBL_FS}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${lblTip}${lblSpans}</text>`)

    let textY = y + PAD_T + lblLines.length * LBL_LH

    // ── Value (italic muted subtitle, up to 2 lines) ─────────────────────────
    if (valLines.length > 0) {
      textY += SEC_G
      const valTip   = valTrunc ? `<title>${escapeXml(item.value!)}</title>` : ''
      const valSpans = valLines
        .map((l, li) => `<tspan x="${tx}" dy="${li === 0 ? 0 : VAL_LH}">${escapeXml(l)}</tspan>`)
        .join('')
      parts.push(`<text x="${tx}" y="${textY.toFixed(1)}" font-size="${VAL_FS}" fill="${theme.textMuted}" font-style="italic" font-family="system-ui,sans-serif">${valTip}${valSpans}</text>`)
      textY += valLines.length * VAL_LH
    }

    // ── Children: bulleted, multi-line wrap, all items ────────────────────────
    if (chdLayouts.length > 0) {
      textY += SEC_G
      chdLayouts.forEach(({ lines, truncated }, ci) => {
        const child  = item.children[ci]
        const chTip  = truncated ? `<title>${escapeXml(child.label)}</title>` : ''
        const op     = ci < 2 ? '1' : '0.7'
        // First tspan carries the bullet; continuation lines indent to align with text
        const spans  = lines
          .map((l, li) => li === 0
            ? `<tspan x="${tx}"  dy="0">· ${escapeXml(l)}</tspan>`
            : `<tspan x="${ctx}" dy="${CHD_LH}">${escapeXml(l)}</tspan>`)
          .join('')
        parts.push(`<text x="${tx}" y="${textY.toFixed(1)}" font-size="${CHD_FS}" fill="${theme.textMuted}" fill-opacity="${op}" font-family="system-ui,sans-serif">${chTip}${spans}</text>`)
        textY += lines.length * CHD_LH
      })
    }
  })

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}
