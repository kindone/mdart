import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, renderEmpty } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const rows = spec.items
  if (rows.length === 0) return renderEmpty(theme)
  const numCols = Math.max(...rows.map(r => r.children.length), 1)
  const COL_W = Math.min(160, Math.max(90, 520 / numCols))
  const LABEL_W = 110, ROW_H = 36, HEADER_H = 36
  const TITLE_H = spec.title ? 28 : 0
  const W = LABEL_W + numCols * COL_W
  const H = TITLE_H + HEADER_H + rows.length * ROW_H + 8
  let svgContent = ''

  if (spec.title) {
    svgContent += `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`
  }
  // Column headers — use explicit spec.columns if provided, else A, B, C…
  const colHeaders = Array.from({ length: numCols }, (_, c) =>
    spec.columns?.[c] ?? String.fromCharCode(65 + c)
  )
  const colHeaderMax = Math.floor(COL_W / 7)
  svgContent += `<rect x="0" y="${TITLE_H}" width="${LABEL_W}" height="${HEADER_H}" fill="${theme.surface}" stroke="${theme.border}" stroke-width="0.5"/>`
  for (let c = 0; c < numCols; c++) {
    const colX = LABEL_W + c * COL_W
    svgContent += `<rect x="${colX}" y="${TITLE_H}" width="${COL_W}" height="${HEADER_H}" fill="${theme.primary}28" stroke="${theme.border}" stroke-width="0.5"/>`
    svgContent += `<text x="${colX + COL_W / 2}" y="${TITLE_H + 23}" text-anchor="middle" font-size="11" fill="${theme.primary}" font-family="system-ui,sans-serif" font-weight="700">${tt(colHeaders[c], colHeaderMax)}</text>`
  }
  // Rows
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r]
    const rowY = TITLE_H + HEADER_H + r * ROW_H
    const rowBg = r % 2 === 0 ? theme.surface : theme.bg
    svgContent += `<rect x="0" y="${rowY}" width="${LABEL_W}" height="${ROW_H}" fill="${rowBg}" stroke="${theme.border}" stroke-width="0.5"/>`
    svgContent += `<text x="8" y="${rowY + 23}" font-size="10.5" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${tt(row.label, 13)}</text>`
    for (let c = 0; c < numCols; c++) {
      const colX = LABEL_W + c * COL_W
      const cell = row.children[c]
      svgContent += `<rect x="${colX}" y="${rowY}" width="${COL_W}" height="${ROW_H}" fill="${rowBg}" stroke="${theme.border}" stroke-width="0.5"/>`
      if (cell) {
        svgContent += `<text x="${colX + COL_W / 2}" y="${rowY + 23}" text-anchor="middle" font-size="10.5" fill="${theme.text}" font-family="system-ui,sans-serif">${tt(cell.label, 16)}</text>`
      }
    }
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svgContent}
  </svg>`
}
