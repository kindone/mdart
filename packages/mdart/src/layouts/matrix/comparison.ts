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
  // Default is TB: top-level items become rows (with colored bold left headers).
  // This matches the conventional "rows = features, columns = options" reading
  // of a product comparison table. Set `direction: LR` to flip — top-level
  // items become columns instead (with colored bold top headers).
  return spec.direction === 'LR' ? renderLR(spec, theme) : renderTB(spec, theme)
}

// ── LR (default): top-level items are columns ───────────────────────────────
function renderLR(spec: MdArtSpec, theme: MdArtTheme): string {
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

  // Data column headers (colored)
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

// ── TB (axis-flipped): top-level items are rows ─────────────────────────────
function renderTB(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  // Source of column headers (priority order):
  //   1. spec.columns front-matter
  //   2. First item's children labels (positional convention, mirrors LR)
  //   3. Union of child labels (key-value mode)
  const allChildrenPositional = items.every(it => it.children.every(ch => !ch.value))
  const useFirstRowHeaders    = allChildrenPositional && items.length >= 2 && !spec.columns

  let colLabels: string[]
  let dataRows: typeof items
  let topLeftHeader: string

  if (spec.columns && spec.columns.length > 0) {
    colLabels     = spec.columns
    dataRows      = items
    topLeftHeader = ''
  } else if (useFirstRowHeaders) {
    colLabels     = items[0].children.map(ch => ch.label)
    dataRows      = items.slice(1)
    topLeftHeader = items[0].label
  } else if (allChildrenPositional) {
    // Single row + no columns front-matter: fall back to A, B, C…
    const numCols = items[0]?.children.length ?? 0
    colLabels     = Array.from({ length: numCols }, (_, i) => String.fromCharCode(65 + i))
    dataRows      = items
    topLeftHeader = ''
  } else {
    // Key-value mode: cell is matched by label across rows
    colLabels     = Array.from(new Set(items.flatMap(it => it.children.map(ch => ch.label))))
    dataRows      = items
    topLeftHeader = 'Field'
  }

  const numCols  = colLabels.length || 1
  const LABEL_W  = 130
  const ROW_H    = 36
  const HEADER_H = 32
  const PAD      = 12
  const titleH   = spec.title ? 28 : 0
  const W        = Math.max(400, numCols * 130 + LABEL_W)
  const COL_W    = Math.floor((W - LABEL_W) / numCols)
  const H        = PAD + titleH + HEADER_H + dataRows.length * ROW_H + PAD

  let svg = ''
  if (spec.title) {
    svg += `<text x="${W / 2}" y="${PAD + 16}" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`
  }

  const baseY = PAD + titleH

  // Top-left corner cell + muted column headers across the top
  svg += `<rect x="0" y="${baseY}" width="${LABEL_W}" height="${HEADER_H}" fill="${theme.surface}" />`
  if (topLeftHeader) {
    svg += `<text x="${LABEL_W / 2}" y="${baseY + 21}" text-anchor="middle" font-size="11" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${tt(topLeftHeader, 18)}</text>`
  }
  for (let ci = 0; ci < numCols; ci++) {
    const colX = LABEL_W + ci * COL_W
    svg += `<rect x="${colX}" y="${baseY}" width="${COL_W}" height="${HEADER_H}" fill="${theme.surface}" />`
    svg += `<text x="${colX + COL_W / 2}" y="${baseY + 21}" text-anchor="middle" font-size="11" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${tt(colLabels[ci], Math.floor(COL_W / 7))}</text>`
  }

  // Rows: bold colored row label on the left + cells
  for (let ri = 0; ri < dataRows.length; ri++) {
    const row  = dataRows[ri]
    const rowY = baseY + HEADER_H + ri * ROW_H

    // Colored row label cell (mirrors the colored column header in LR mode)
    const t    = dataRows.length > 1 ? ri / (dataRows.length - 1) : 0.5
    const fill = lerpColorLocal('#1e3a8a', '#1d4ed8', t)
    svg += `<rect x="0" y="${rowY}" width="${LABEL_W}" height="${ROW_H}" fill="${fill}" />`
    svg += `<text x="${LABEL_W / 2}" y="${rowY + 23}" text-anchor="middle" font-size="12" fill="#bfdbfe" font-family="system-ui,sans-serif" font-weight="700">${tt(row.label, 16)}</text>`

    // Alternating background for the data cells
    const rowBg = ri % 2 === 0 ? theme.surface : theme.bg
    svg += `<rect x="${LABEL_W}" y="${rowY}" width="${W - LABEL_W}" height="${ROW_H}" fill="${rowBg}" />`

    for (let ci = 0; ci < numCols; ci++) {
      const colX = LABEL_W + ci * COL_W
      let val: string
      // Positional cell first; if user used key-value, match by column label.
      const kvChild = row.children.find(ch => ch.label === colLabels[ci])
      if (kvChild) {
        val = kvChild.value ?? '✓'
      } else {
        val = row.children[ci]?.label ?? '—'
      }
      svg += `<text x="${colX + COL_W / 2}" y="${rowY + 23}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif">${tt(val, Math.floor(COL_W / 7))}</text>`
    }

    svg += `<line x1="0" y1="${rowY + ROW_H}" x2="${W}" y2="${rowY + ROW_H}" stroke="${theme.border}" stroke-width="0.5" />`
  }

  // Vertical dividers
  for (let ci = 0; ci <= numCols; ci++) {
    const lx = LABEL_W + ci * COL_W
    svg += `<line x1="${lx}" y1="${baseY}" x2="${lx}" y2="${H - PAD}" stroke="${theme.border}" stroke-width="0.5" />`
  }
  // Heavy divider between row labels and data
  svg += `<line x1="${LABEL_W}" y1="${baseY}" x2="${LABEL_W}" y2="${H - PAD}" stroke="${theme.border}" stroke-width="1" />`

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svg}
  </svg>`
}
