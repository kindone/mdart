import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, truncate, wrapLabel, renderEmpty } from '../shared'

function lerpColorLocal(c1: string, c2: string, t: number): string {
  const hexToRgb = (hex: string) => {
    const n = parseInt(hex.replace('#', ''), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as [number, number, number]
  }
  const [r1, g1, b1] = hexToRgb(c1)
  const [r2, g2, b2] = hexToRgb(c2)
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t)
  return '#' + [lerp(r1, r2), lerp(g1, g2), lerp(b1, b2)].map(v => v.toString(16).padStart(2, '0')).join('')
}

/** Emit a <text> element with tspans and an optional SVG tooltip. */
function labelText(
  cx: number | string,
  y1: number,
  attrs: string,
  label: string,
  maxChars: number,
  lineH = 12
): string {
  const { lines, truncated } = wrapLabel(label, maxChars)
  const tip = truncated ? `<title>${escapeXml(label)}</title>` : ''
  const spans = lines
    .map((l, i) => `<tspan x="${cx}" dy="${i === 0 ? 0 : lineH}">${escapeXml(l)}</tspan>`)
    .join('')
  return `<text x="${cx}" y="${y1}" ${attrs}>${tip}${spans}</text>`
}

/** Compute the baseline y for the first line, centering n lines in cellH. */
function centerY(baseY: number, cellH: number, n: number, lineH = 12): number {
  return baseY + Math.round(cellH / 2) - Math.round((n - 1) * lineH / 2) + 5
}

function validateComparisonSpec(spec: MdArtSpec): boolean {
  return spec.items.some(item => item.children.length > 0)
}

function renderComparisonError(theme: MdArtTheme): string {
  const W = 620, H = 280, lineH = 20, pad = 14
  const titleY = 40, descY = 75, boxY = 110
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    <text x="${W / 2}" y="${titleY}" text-anchor="middle" font-size="15" fill="${theme.danger}" font-family="system-ui,sans-serif" font-weight="700">Invalid comparison diagram syntax</text>
    <text x="${W / 2}" y="${descY}" text-anchor="middle" font-size="12" fill="${theme.textMuted}" font-family="system-ui,sans-serif">Comparison needs parent items with children:</text>
    <rect x="80" y="${boxY}" width="${W - 160}" height="${lineH * 6 + pad * 2}" rx="6" fill="${theme.surface}" stroke="${theme.border}" stroke-width="1"/>
    <text x="96" y="${boxY + pad + 14}" font-size="12" fill="${theme.text}" font-family="ui-monospace,monospace">- Option A</text>
    <text x="112" y="${boxY + pad + 14 + lineH}" font-size="12" fill="${theme.text}">  - Feature 1</text>
    <text x="112" y="${boxY + pad + 14 + lineH * 2}" font-size="12" fill="${theme.text}">  - Feature 2</text>
    <text x="96" y="${boxY + pad + 14 + lineH * 3}" font-size="12" fill="${theme.text}" font-family="ui-monospace,monospace">- Option B</text>
    <text x="112" y="${boxY + pad + 14 + lineH * 4}" font-size="12" fill="${theme.text}">  - Feature 1</text>
    <text x="112" y="${boxY + pad + 14 + lineH * 5}" font-size="12" fill="${theme.text}">  - Feature 3</text>
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (!validateComparisonSpec(spec)) return renderComparisonError(theme)
  return spec.direction === 'LR' ? renderLR(spec, theme) : renderTB(spec, theme)
}

// ── LR (default): top-level items are columns ───────────────────────────────
function renderLR(spec: MdArtSpec, theme: MdArtTheme): string {
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
  const LINE_H = 12
  const titleH = spec.title ? 28 : 0
  const W = Math.max(400, dataCols.length * 140 + LABEL_W)
  const COL_W = Math.floor((W - LABEL_W) / dataCols.length)
  const H = PAD + titleH + HEADER_H + rowLabels.length * ROW_H + PAD

  let svg = ''

  if (spec.title) {
    svg += `<text x="${W / 2}" y="${PAD + 16}" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`
  }

  const baseY = PAD + titleH

  // Row label column header (corner cell)
  svg += `<rect x="0" y="${baseY}" width="${LABEL_W}" height="${HEADER_H}" fill="${theme.surface}" />`
  svg += `<text x="${LABEL_W / 2}" y="${baseY + 27}" text-anchor="middle" font-size="11" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(truncate(rowLabelColHeader, 16))}</text>`

  // Data column headers (colored)
  for (let ci = 0; ci < dataCols.length; ci++) {
    const col = dataCols[ci]
    const colX = LABEL_W + ci * COL_W
    const t = dataCols.length > 1 ? ci / (dataCols.length - 1) : 0.5
    const fill = lerpColorLocal('#1e3a8a', '#1d4ed8', t)
    svg += `<rect x="${colX}" y="${baseY}" width="${COL_W}" height="${HEADER_H}" fill="${fill}" />`
    const { lines } = wrapLabel(col.label, Math.floor(COL_W / 7))
    const hy = centerY(baseY, HEADER_H, lines.length, LINE_H)
    svg += labelText(colX + COL_W / 2, hy,
      `text-anchor="middle" font-size="12" fill="#bfdbfe" font-family="system-ui,sans-serif" font-weight="700"`,
      col.label, Math.floor(COL_W / 7))
  }

  // Rows
  for (let ri = 0; ri < rowLabels.length; ri++) {
    const rowLabel = rowLabels[ri]
    const rowY = baseY + HEADER_H + ri * ROW_H
    const rowBg = ri % 2 === 0 ? theme.surface : theme.bg

    svg += `<rect x="0" y="${rowY}" width="${W}" height="${ROW_H}" fill="${rowBg}" />`

    // Row label
    const { lines: rlLines } = wrapLabel(rowLabel, 16)
    const rly = centerY(rowY, ROW_H, rlLines.length, LINE_H)
    svg += labelText(PAD, rly,
      `font-size="11" fill="${theme.textMuted}" font-family="system-ui,sans-serif"`,
      rowLabel, 16)

    // Data cells
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
      const { lines: vLines } = wrapLabel(val, Math.floor(COL_W / 7))
      const vy = centerY(rowY, ROW_H, vLines.length, LINE_H)
      svg += labelText(colX + COL_W / 2, vy,
        `text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif"`,
        val, Math.floor(COL_W / 7))
    }

    svg += `<line x1="0" y1="${rowY + ROW_H}" x2="${W}" y2="${rowY + ROW_H}" stroke="${theme.border}" stroke-width="0.5" />`
  }

  // Column dividers
  for (let ci = 0; ci <= dataCols.length; ci++) {
    const lx = LABEL_W + ci * COL_W
    svg += `<line x1="${lx}" y1="${baseY}" x2="${lx}" y2="${H - PAD}" stroke="${theme.border}" stroke-width="0.5" />`
  }
  svg += `<line x1="${LABEL_W}" y1="${baseY}" x2="${LABEL_W}" y2="${H - PAD}" stroke="${theme.border}" stroke-width="1" />`

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svg}
  </svg>`
}

// ── TB (axis-flipped): top-level items are rows ───────────────────────────────
function renderTB(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const allChildrenPositional = items.every(it => it.children.every(ch => !ch.value))
  const useFirstRowHeaders = allChildrenPositional && items.length >= 2 && !spec.columns

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
    const numCols = items[0]?.children.length ?? 0
    colLabels     = Array.from({ length: numCols }, (_, i) => String.fromCharCode(65 + i))
    dataRows      = items
    topLeftHeader = ''
  } else {
    colLabels     = Array.from(new Set(items.flatMap(it => it.children.map(ch => ch.label))))
    dataRows      = items
    topLeftHeader = 'Field'
  }

  const numCols  = colLabels.length || 1
  const LABEL_W  = 130
  const ROW_H    = 36
  const HEADER_H = 32
  const PAD      = 12
  const LINE_H   = 12
  const titleH   = spec.title ? 28 : 0
  const W        = Math.max(400, numCols * 130 + LABEL_W)
  const COL_W    = Math.floor((W - LABEL_W) / numCols)
  const H        = PAD + titleH + HEADER_H + dataRows.length * ROW_H + PAD

  let svg = ''

  if (spec.title) {
    svg += `<text x="${W / 2}" y="${PAD + 16}" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`
  }

  const baseY = PAD + titleH

  // Top-left corner + column headers
  svg += `<rect x="0" y="${baseY}" width="${LABEL_W}" height="${HEADER_H}" fill="${theme.surface}" />`
  if (topLeftHeader) {
    svg += `<text x="${LABEL_W / 2}" y="${baseY + 21}" text-anchor="middle" font-size="11" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(truncate(topLeftHeader, 18))}</text>`
  }
  for (let ci = 0; ci < numCols; ci++) {
    const colX = LABEL_W + ci * COL_W
    svg += `<rect x="${colX}" y="${baseY}" width="${COL_W}" height="${HEADER_H}" fill="${theme.surface}" />`
    const { lines } = wrapLabel(colLabels[ci], Math.floor(COL_W / 7))
    const hy = centerY(baseY, HEADER_H, lines.length, LINE_H)
    svg += labelText(colX + COL_W / 2, hy,
      `text-anchor="middle" font-size="11" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600"`,
      colLabels[ci], Math.floor(COL_W / 7))
  }

  // Rows
  for (let ri = 0; ri < dataRows.length; ri++) {
    const row  = dataRows[ri]
    const rowY = baseY + HEADER_H + ri * ROW_H
    const t    = dataRows.length > 1 ? ri / (dataRows.length - 1) : 0.5
    const fill = lerpColorLocal('#1e3a8a', '#1d4ed8', t)

    // Colored row label cell
    svg += `<rect x="0" y="${rowY}" width="${LABEL_W}" height="${ROW_H}" fill="${fill}" />`
    const { lines: rlLines } = wrapLabel(row.label, 16)
    const rly = centerY(rowY, ROW_H, rlLines.length, LINE_H)
    svg += labelText(LABEL_W / 2, rly,
      `text-anchor="middle" font-size="12" fill="#bfdbfe" font-family="system-ui,sans-serif" font-weight="700"`,
      row.label, 16)

    // Data cells
    const rowBg = ri % 2 === 0 ? theme.surface : theme.bg
    svg += `<rect x="${LABEL_W}" y="${rowY}" width="${W - LABEL_W}" height="${ROW_H}" fill="${rowBg}" />`
    for (let ci = 0; ci < numCols; ci++) {
      const colX = LABEL_W + ci * COL_W
      let val: string
      const kvChild = row.children.find(ch => ch.label === colLabels[ci])
      if (kvChild) {
        val = kvChild.value ?? '✓'
      } else {
        val = row.children[ci]?.label ?? '—'
      }
      const { lines: vLines } = wrapLabel(val, Math.floor(COL_W / 7))
      const vy = centerY(rowY, ROW_H, vLines.length, LINE_H)
      svg += labelText(colX + COL_W / 2, vy,
        `text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif"`,
        val, Math.floor(COL_W / 7))
    }

    svg += `<line x1="0" y1="${rowY + ROW_H}" x2="${W}" y2="${rowY + ROW_H}" stroke="${theme.border}" stroke-width="0.5" />`
  }

  // Vertical dividers
  for (let ci = 0; ci <= numCols; ci++) {
    const lx = LABEL_W + ci * COL_W
    svg += `<line x1="${lx}" y1="${baseY}" x2="${lx}" y2="${H - PAD}" stroke="${theme.border}" stroke-width="0.5" />`
  }
  svg += `<line x1="${LABEL_W}" y1="${baseY}" x2="${LABEL_W}" y2="${H - PAD}" stroke="${theme.border}" stroke-width="1" />`

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svg}
  </svg>`
}
