import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, renderEmpty } from '../shared'

function lerpColorLocal(c1: string, c2: string, t: number): string {
  const hexToRgb = (hex: string): [number, number, number] => {
    const n = parseInt(hex.replace('#', ''), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const [r1, g1, b1] = hexToRgb(c1)
  const [r2, g2, b2] = hexToRgb(c2)
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t)
  return '#' + [lerp(r1, r2), lerp(g1, g2), lerp(b1, b2)].map(v => v.toString(16).padStart(2, '0')).join('')
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  // Top-level items are columns; their children are rows.
  // Two modes:
  //   Positional: no child uses "key: value" syntax → first column = row labels,
  //               remaining columns' Nth child = value for Nth row.
  //   Key-value:  children use "key: value" → matched by label across columns.
  const cols = spec.items
  if (cols.length === 0) return renderEmpty(theme)

  const allChildrenPositional = cols.every(col => col.children.every(ch => !ch.value))
  const isPositional = allChildrenPositional && cols.length >= 2

  const rowLabelColHeader = isPositional ? cols[0].label : 'Feature'
  const rowLabels: string[] = isPositional
    ? cols[0].children.map(ch => ch.label)
    : Array.from(new Set(cols.flatMap(c => c.children.map(ch => ch.label))))
  const dataCols = isPositional ? cols.slice(1) : cols

  const LABEL_W = 120
  const ROW_H = 34
  const HEADER_H = 44
  const PAD = 12
  const titleH = spec.title ? 28 : 0
  const W = Math.max(400, dataCols.length * 140 + LABEL_W)
  const COL_W = Math.floor((W - LABEL_W) / dataCols.length)
  const H = PAD + titleH + HEADER_H + rowLabels.length * ROW_H + PAD

  let svgContent = ''

  if (spec.title) {
    svgContent += `<text x="${W / 2}" y="${PAD + 16}" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`
  }

  const baseY = PAD + titleH

  // Row label column header
  svgContent += `<rect x="0" y="${baseY}" width="${LABEL_W}" height="${HEADER_H}" fill="${theme.surface}" />`
  svgContent += `<text x="${LABEL_W / 2}" y="${baseY + 27}" text-anchor="middle" font-size="11" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${tt(rowLabelColHeader, 16)}</text>`

  // Data column headers
  for (let ci = 0; ci < dataCols.length; ci++) {
    const col = dataCols[ci]
    const colX = LABEL_W + ci * COL_W
    const t = dataCols.length > 1 ? ci / (dataCols.length - 1) : 0.5
    const fill = lerpColorLocal('#1e3a8a', '#1d4ed8', t)
    svgContent += `<rect x="${colX}" y="${baseY}" width="${COL_W}" height="${HEADER_H}" fill="${fill}" />`
    svgContent += `<text x="${colX + COL_W / 2}" y="${baseY + 27}" text-anchor="middle" font-size="12" fill="#bfdbfe" font-family="system-ui,sans-serif" font-weight="700">${tt(col.label, Math.floor(COL_W / 7))}</text>`
  }

  // Rows
  for (let ri = 0; ri < rowLabels.length; ri++) {
    const rowLabel = rowLabels[ri]
    const rowY = baseY + HEADER_H + ri * ROW_H
    const rowBg = ri % 2 === 0 ? theme.surface : theme.bg

    svgContent += `<rect x="0" y="${rowY}" width="${W}" height="${ROW_H}" fill="${rowBg}" />`
    svgContent += `<text x="${PAD}" y="${rowY + 22}" font-size="11" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(rowLabel, 16)}</text>`

    for (let ci = 0; ci < dataCols.length; ci++) {
      const col = dataCols[ci]
      const colX = LABEL_W + ci * COL_W
      let val: string
      if (isPositional) {
        val = col.children[ri]?.label ?? '—'
      } else {
        const child = col.children.find(ch => ch.label === rowLabel)
        val = child?.value ?? (child ? '✓' : '—')
      }
      svgContent += `<text x="${colX + COL_W / 2}" y="${rowY + 22}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif">${tt(val, Math.floor(COL_W / 7))}</text>`
    }

    svgContent += `<line x1="0" y1="${rowY + ROW_H}" x2="${W}" y2="${rowY + ROW_H}" stroke="${theme.border}" stroke-width="0.5" />`
  }

  // Column dividers
  for (let ci = 0; ci <= dataCols.length; ci++) {
    const lx = LABEL_W + ci * COL_W
    svgContent += `<line x1="${lx}" y1="${baseY}" x2="${lx}" y2="${H - PAD}" stroke="${theme.border}" stroke-width="0.5" />`
  }
  svgContent += `<line x1="${LABEL_W}" y1="${baseY}" x2="${LABEL_W}" y2="${H - PAD}" stroke="${theme.border}" stroke-width="1" />`

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svgContent}
  </svg>`
}
