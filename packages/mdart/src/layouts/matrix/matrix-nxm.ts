import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, renderEmpty, ellipsisIfDropped, itemTitleTag } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const rows = spec.items
  if (rows.length === 0) return renderEmpty(theme)

  const numCols    = Math.max(...rows.map(r => r.children.length), 1)
  const COL_W      = Math.min(160, Math.max(90, 520 / numCols))
  const LABEL_W    = 110
  const LINE_H     = 12
  const PAD_V      = 8      // top + bottom inside each cell
  const MIN_CELL_H = 32
  const TITLE_H    = spec.title ? 28 : 0
  const W          = LABEL_W + numCols * COL_W

  const colHeaders   = Array.from({ length: numCols }, (_, c) =>
    spec.columns?.[c] ?? String.fromCharCode(65 + c)
  )
  const colLabelMax  = Math.floor(COL_W / 7)
  const rowLabelMax  = Math.floor(LABEL_W / 7)
  const cellMax      = Math.floor(COL_W / 6.5)

  // ── Pre-compute all wraps ─────────────────────────────────────────────────

  const colHeaderWraps = colHeaders.map(h => wrapLabel(h, colLabelMax, 5))
  // Row labels: append " …" when the row's value/attrs would be invisible.
  // Cells: same treatment per cell, since children are rendered as just the
  // label string (no visible value/attrs slot).
  const rowLabelWraps  = rows.map(r => wrapLabel(ellipsisIfDropped(r.label, r), rowLabelMax, 5))
  const cellWraps      = rows.map(r =>
    Array.from({ length: numCols }, (_, c) => {
      const cell = r.children[c]
      return cell ? wrapLabel(ellipsisIfDropped(cell.label, cell), cellMax, 5) : { lines: [] as string[], truncated: false }
    })
  )

  // ── Dynamic heights ───────────────────────────────────────────────────────

  const maxHeaderLines = Math.max(...colHeaderWraps.map(w => w.lines.length), 1)
  const HEADER_H       = Math.max(MIN_CELL_H, PAD_V + maxHeaderLines * LINE_H + PAD_V)

  const rowHeights = rows.map((_, r) => {
    const rlN    = rowLabelWraps[r].lines.length
    const cellNs = cellWraps[r].map(w => w.lines.length)
    return Math.max(MIN_CELL_H, PAD_V + Math.max(rlN, ...cellNs, 1) * LINE_H + PAD_V)
  })

  const rowY: number[] = []
  let cumY = TITLE_H + HEADER_H
  for (const rh of rowHeights) { rowY.push(cumY); cumY += rh }
  const H = cumY + 8

  // ── Render helpers ────────────────────────────────────────────────────────

  /** Emit a pre-computed <text> block with tspans, optionally wrapped in <a>. */
  function lbl(
    cx: number | string,
    y1: number,
    attrs: string,
    label: string,
    wrap: { lines: string[]; truncated: boolean; url?: string | null },
  ): string {
    const { lines, truncated, url = null } = wrap
    const tip   = truncated ? `<title>${escapeXml(label)}</title>` : ''
    const spans = lines
      .map((l, i) => `<tspan x="${cx}" dy="${i === 0 ? 0 : LINE_H}">${escapeXml(l)}</tspan>`)
      .join('')
    return aWrap(`<text x="${cx}" y="${y1}" ${attrs}>${tip}${spans}</text>`, url)
  }

  /** First-line baseline that centres n lines vertically in cellH. */
  function centredY(baseY: number, cellH: number, n: number): number {
    return baseY + Math.round(cellH / 2) - Math.round((n - 1) * LINE_H / 2) + 5
  }

  // ── SVG output ────────────────────────────────────────────────────────────

  let svg = ''
  if (spec.title) {
    svg += `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`
  }

  // Column headers
  svg += `<rect x="0" y="${TITLE_H}" width="${LABEL_W}" height="${HEADER_H}" fill="${theme.surface}" stroke="${theme.border}" stroke-width="0.5"/>`
  for (let c = 0; c < numCols; c++) {
    const colX = LABEL_W + c * COL_W
    svg += `<rect x="${colX}" y="${TITLE_H}" width="${COL_W}" height="${HEADER_H}" fill="${theme.primary}28" stroke="${theme.border}" stroke-width="0.5"/>`
    const w = colHeaderWraps[c]
    svg += lbl(colX + COL_W / 2, centredY(TITLE_H, HEADER_H, w.lines.length),
      `text-anchor="middle" font-size="11" fill="${theme.primary}" font-family="system-ui,sans-serif" font-weight="700"`,
      colHeaders[c], w)
  }

  // Rows
  for (let r = 0; r < rows.length; r++) {
    const row  = rows[r]
    const ry   = rowY[r]
    const rH   = rowHeights[r]
    const rowBg = r % 2 === 0 ? theme.surface : theme.bg

    // Row label cell — tooltip carries full label + value + attrs
    svg += `<rect x="0" y="${ry}" width="${LABEL_W}" height="${rH}" fill="${rowBg}" stroke="${theme.border}" stroke-width="0.5">${itemTitleTag(row)}</rect>`
    const rlW = rowLabelWraps[r]
    svg += lbl(8, centredY(ry, rH, rlW.lines.length),
      `font-size="10.5" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600"`,
      row.label, rlW)

    // Data cells
    for (let c = 0; c < numCols; c++) {
      const colX = LABEL_W + c * COL_W
      const cell = row.children[c]
      const cellTip = cell ? itemTitleTag(cell) : ''
      svg += `<rect x="${colX}" y="${ry}" width="${COL_W}" height="${rH}" fill="${rowBg}" stroke="${theme.border}" stroke-width="0.5">${cellTip}</rect>`
      if (cell) {
        const cw = cellWraps[r][c]
        svg += lbl(colX + COL_W / 2, centredY(ry, rH, cw.lines.length),
          `text-anchor="middle" font-size="10.5" fill="${theme.text}" font-family="system-ui,sans-serif"`,
          cell.label, cw)
      }
    }
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svg}
  </svg>`
}
