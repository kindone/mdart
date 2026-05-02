import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, renderEmpty } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const rows = spec.items
  if (rows.length === 0) return renderEmpty(theme)
  const numCols = Math.max(...rows.map(r => r.children.length), 1)
  const COL_W = Math.min(160, Math.max(90, 520 / numCols))
  const LABEL_W = 110, ROW_H = 36, HEADER_H = 36, LINE_H = 12
  const TITLE_H = spec.title ? 28 : 0
  const W = LABEL_W + numCols * COL_W
  const H = TITLE_H + HEADER_H + rows.length * ROW_H + 8
  let svg = ''

  if (spec.title) {
    svg += `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`
  }

  const colHeaders = Array.from({ length: numCols }, (_, c) =>
    spec.columns?.[c] ?? String.fromCharCode(65 + c)
  )
  const colHeaderMax = Math.floor(COL_W / 7)

  /** Emit a <text> with tspans and an optional SVG tooltip. */
  function lbl(
    cx: number | string, y1: number, attrs: string, label: string, maxChars: number
  ): string {
    const { lines, truncated } = wrapLabel(label, maxChars)
    const tip = truncated ? `<title>${escapeXml(label)}</title>` : ''
    const spans = lines
      .map((l, i) => `<tspan x="${cx}" dy="${i === 0 ? 0 : LINE_H}">${escapeXml(l)}</tspan>`)
      .join('')
    return `<text x="${cx}" y="${y1}" ${attrs}>${tip}${spans}</text>`
  }

  /** Baseline y for the first of n lines, centred in a cell of height cellH. */
  function cy(baseY: number, cellH: number, n: number): number {
    return baseY + Math.round(cellH / 2) - Math.round((n - 1) * LINE_H / 2) + 5
  }

  // Column headers
  svg += `<rect x="0" y="${TITLE_H}" width="${LABEL_W}" height="${HEADER_H}" fill="${theme.surface}" stroke="${theme.border}" stroke-width="0.5"/>`
  for (let c = 0; c < numCols; c++) {
    const colX = LABEL_W + c * COL_W
    svg += `<rect x="${colX}" y="${TITLE_H}" width="${COL_W}" height="${HEADER_H}" fill="${theme.primary}28" stroke="${theme.border}" stroke-width="0.5"/>`
    const { lines } = wrapLabel(colHeaders[c], colHeaderMax)
    svg += lbl(colX + COL_W / 2, cy(TITLE_H, HEADER_H, lines.length),
      `text-anchor="middle" font-size="11" fill="${theme.primary}" font-family="system-ui,sans-serif" font-weight="700"`,
      colHeaders[c], colHeaderMax)
  }

  // Rows
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]
    const rowY = TITLE_H + HEADER_H + r * ROW_H
    const rowBg = r % 2 === 0 ? theme.surface : theme.bg

    // Row label
    svg += `<rect x="0" y="${rowY}" width="${LABEL_W}" height="${ROW_H}" fill="${rowBg}" stroke="${theme.border}" stroke-width="0.5"/>`
    const { lines: rl } = wrapLabel(row.label, Math.floor(LABEL_W / 7))
    svg += lbl(8, cy(rowY, ROW_H, rl.length),
      `font-size="10.5" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600"`,
      row.label, Math.floor(LABEL_W / 7))

    // Cells
    for (let c = 0; c < numCols; c++) {
      const colX = LABEL_W + c * COL_W
      const cell = row.children[c]
      svg += `<rect x="${colX}" y="${rowY}" width="${COL_W}" height="${ROW_H}" fill="${rowBg}" stroke="${theme.border}" stroke-width="0.5"/>`
      if (cell) {
        const { lines: cl } = wrapLabel(cell.label, Math.floor(COL_W / 7))
        svg += lbl(colX + COL_W / 2, cy(rowY, ROW_H, cl.length),
          `text-anchor="middle" font-size="10.5" fill="${theme.text}" font-family="system-ui,sans-serif"`,
          cell.label, Math.floor(COL_W / 7))
      }
    }
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svg}
  </svg>`
}
