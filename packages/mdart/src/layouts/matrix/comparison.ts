import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, renderEmpty, itemTitleTag, shouldAnimate, seqSpotlightCSS, type ItemLike } from '../shared'

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

const LINE_H  = 12
const PAD_V   = 7    // top+bottom padding inside cells
const MIN_ROW_H = 30

/** Emit a <text> from a pre-computed wrap result, optionally wrapped in <a>. */
function labelText(
  cx: number | string,
  y1: number,
  attrs: string,
  label: string,
  wrap: { lines: string[]; truncated: boolean; url?: string | null },
  lineH = LINE_H,
  item?: ItemLike,
): string {
  const { lines, truncated, url = null } = wrap
  // Prefer full item summary (label + value + attrs) so attrs are never silently dropped.
  // Fall back to label-on-truncation when no item context is available.
  const tip   = item ? itemTitleTag(item) : (truncated ? `<title>${escapeXml(label)}</title>` : '')
  const spans = lines
    .map((l, i) => `<tspan x="${cx}" dy="${i === 0 ? 0 : lineH}">${escapeXml(l)}</tspan>`)
    .join('')
  return aWrap(`<text x="${cx}" y="${y1}" ${attrs}>${tip}${spans}</text>`, url)
}

/** First-line baseline that centres n lines in cellH. */
function centerY(baseY: number, cellH: number, n: number, lineH = LINE_H): number {
  return baseY + Math.round(cellH / 2) - Math.round((n - 1) * lineH / 2) + 5
}

function rowH(maxLines: number): number {
  return Math.max(MIN_ROW_H, PAD_V + maxLines * LINE_H + PAD_V)
}

function validateComparisonSpec(spec: MdArtSpec): boolean {
  const children = spec.items.flatMap(item => item.children)
  if (children.length === 0) return false

  const hasKeyedChildren = children.some(child => child.value !== undefined)
  const hasUnkeyedChildren = children.some(child => child.value === undefined)
  return !(hasKeyedChildren && hasUnkeyedChildren)
}

function renderComparisonError(theme: MdArtTheme): string {
  const W = 620, H = 280, lineH = 20, pad = 14
  const titleY = 40, descY = 75, boxY = 110
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    <text x="${W / 2}" y="${titleY}" text-anchor="middle" font-size="15" fill="${theme.danger}" font-family="system-ui,sans-serif" font-weight="700">Invalid comparison diagram syntax</text>
    <text x="${W / 2}" y="${descY}" text-anchor="middle" font-size="12" fill="${theme.textMuted}" font-family="system-ui,sans-serif">Comparison needs all children keyed or all children unkeyed:</text>
    <rect x="80" y="${boxY}" width="${W - 160}" height="${lineH * 6 + pad * 2}" rx="6" fill="${theme.surface}" stroke="${theme.border}" stroke-width="1"/>
    <text x="96" y="${boxY + pad + 14}" font-size="12" fill="${theme.text}" font-family="ui-monospace,monospace">- Option A</text>
    <text x="112" y="${boxY + pad + 14 + lineH}" font-size="12" fill="${theme.text}">  - Start: CLI command</text>
    <text x="112" y="${boxY + pad + 14 + lineH * 2}" font-size="12" fill="${theme.text}">  - Fit: Human-facing</text>
    <text x="96" y="${boxY + pad + 14 + lineH * 3}" font-size="12" fill="${theme.text}" font-family="ui-monospace,monospace">- Option B</text>
    <text x="112" y="${boxY + pad + 14 + lineH * 4}" font-size="12" fill="${theme.text}">  - Start: API call</text>
    <text x="112" y="${boxY + pad + 14 + lineH * 5}" font-size="12" fill="${theme.text}">  - Fit: Automation</text>
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (!validateComparisonSpec(spec)) return renderComparisonError(theme)
  return spec.direction === 'LR' ? renderLR(spec, theme) : renderTB(spec, theme)
}

// ── LR: top-level items are columns (set explicitly via `direction: LR`) ─────
function renderLR(spec: MdArtSpec, theme: MdArtTheme): string {
  const cols = spec.items
  if (cols.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)

  const allChildrenPositional = cols.every(col => col.children.every(ch => !ch.value))
  const isPositional = allChildrenPositional && cols.length >= 2

  const rowLabelColHeader = isPositional ? cols[0].label : 'Feature'
  const rowLabels: string[] = isPositional
    ? cols[0].children.map(ch => ch.label)
    : Array.from(new Set(cols.flatMap(c => c.children.map(ch => ch.label))))
  const dataCols = isPositional ? cols.slice(1) : cols

  const LABEL_W  = 120
  const PAD      = 12
  const titleH   = spec.title ? 28 : 0
  const W        = Math.max(400, dataCols.length * 140 + LABEL_W)
  const COL_W    = Math.floor((W - LABEL_W) / dataCols.length)
  const cellMax  = Math.floor(COL_W / 7)
  const rowMax   = 16

  // Pre-compute column header wraps (needed for dynamic HEADER_H)
  const colHeaderWraps = dataCols.map(col => wrapLabel(col.label, Math.floor(COL_W / 7), 5))
  const cornerWrap     = wrapLabel(rowLabelColHeader, Math.floor(LABEL_W / 7), 5)
  const maxHLines      = Math.max(...colHeaderWraps.map(w => w.lines.length), cornerWrap.lines.length, 1)
  const HEADER_H       = Math.max(32, PAD_V + maxHLines * LINE_H + PAD_V)

  // Pre-compute cell values and wraps
  const cellValues: string[][] = rowLabels.map((rowLabel, ri) =>
    dataCols.map(col => {
      if (isPositional) return col.children[ri]?.label ?? '—'
      const child = col.children.find(ch => ch.label === rowLabel)
      return child?.value ?? (child ? '✓' : '—')
    })
  )
  const cellItems: (ItemLike | undefined)[][] = rowLabels.map((rowLabel, ri) =>
    dataCols.map(col => {
      if (isPositional) return col.children[ri]
      return col.children.find(ch => ch.label === rowLabel)
    })
  )
  const rowLabelWraps = rowLabels.map(rl => wrapLabel(rl, rowMax, 5))
  const cellWraps     = cellValues.map(row => row.map(v => wrapLabel(v, cellMax, 5)))

  // Dynamic row heights
  const dataRowHeights = rowLabels.map((_, ri) => {
    const rlN   = rowLabelWraps[ri].lines.length
    const cellN = cellWraps[ri].map(w => w.lines.length)
    return rowH(Math.max(rlN, ...cellN, 1))
  })

  const dataRowY: number[] = []
  let cumY = PAD + titleH + HEADER_H
  for (const rh of dataRowHeights) { dataRowY.push(cumY); cumY += rh }
  const H = cumY + PAD

  let svg = ''
  if (spec.title) {
    svg += `<text x="${W / 2}" y="${PAD + 16}" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`
  }

  const baseY = PAD + titleH

  const headerUnit: string[] = []

  // Row label column header (corner)
  headerUnit.push(`<rect x="0" y="${baseY}" width="${LABEL_W}" height="${HEADER_H}" fill="${theme.surface}" />`)
  headerUnit.push(labelText(LABEL_W / 2, centerY(baseY, HEADER_H, cornerWrap.lines.length),
    `text-anchor="middle" font-size="11" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600"`,
    rowLabelColHeader, cornerWrap))

  // Data column headers
  for (let ci = 0; ci < dataCols.length; ci++) {
    const col  = dataCols[ci]
    const colX = LABEL_W + ci * COL_W
    const t    = dataCols.length > 1 ? ci / (dataCols.length - 1) : 0.5
    const fill = lerpColorLocal('#1e3a8a', '#1d4ed8', t)
    headerUnit.push(`<rect x="${colX}" y="${baseY}" width="${COL_W}" height="${HEADER_H}" fill="${fill}" />`)
    const hw   = colHeaderWraps[ci]
    const hy   = centerY(baseY, HEADER_H, hw.lines.length)
    headerUnit.push(labelText(colX + COL_W / 2, hy,
      `text-anchor="middle" font-size="12" fill="#bfdbfe" font-family="system-ui,sans-serif" font-weight="700"`,
      col.label, hw, LINE_H, col))
  }
  svg += animate ? `<g class="mdart-n0">${headerUnit.join('')}</g>` : headerUnit.join('')

  // Header / data separator
  svg += `<line x1="0" y1="${baseY + HEADER_H}" x2="${W}" y2="${baseY + HEADER_H}" stroke="${theme.border}" stroke-width="1.5" />`

  // Data rows
  for (let ri = 0; ri < rowLabels.length; ri++) {
    const rowUnit: string[] = []
    const rowLabel = rowLabels[ri]
    const ry       = dataRowY[ri]
    const rH       = dataRowHeights[ri]
    const rowBg    = ri % 2 === 0 ? theme.surface : theme.bg

    rowUnit.push(`<rect x="0" y="${ry}" width="${W}" height="${rH}" fill="${rowBg}" />`)

    // Row label
    const rlW = rowLabelWraps[ri]
    rowUnit.push(labelText(PAD, centerY(ry, rH, rlW.lines.length),
      `font-size="11" fill="${theme.textMuted}" font-family="system-ui,sans-serif"`,
      rowLabel, rlW))

    // Data cells
    for (let ci = 0; ci < dataCols.length; ci++) {
      const colX = LABEL_W + ci * COL_W
      const val  = cellValues[ri][ci]
      const cw   = cellWraps[ri][ci]
      const ci_  = cellItems[ri][ci]
      rowUnit.push(labelText(colX + COL_W / 2, centerY(ry, rH, cw.lines.length),
        `text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif"`,
        val, cw, LINE_H, ci_))
    }

    rowUnit.push(`<line x1="0" y1="${ry + rH}" x2="${W}" y2="${ry + rH}" stroke="${theme.border}" stroke-width="0.5" />`)
    svg += animate ? `<g class="mdart-n${ri + 1}">${rowUnit.join('')}</g>` : rowUnit.join('')
  }

  // Column dividers
  for (let ci = 0; ci <= dataCols.length; ci++) {
    const lx = LABEL_W + ci * COL_W
    svg += `<line x1="${lx}" y1="${baseY}" x2="${lx}" y2="${H - PAD}" stroke="${theme.border}" stroke-width="0.5" />`
  }
  svg += `<line x1="${LABEL_W}" y1="${baseY}" x2="${LABEL_W}" y2="${H - PAD}" stroke="${theme.border}" stroke-width="1" />`
  if (animate) svg = seqSpotlightCSS(rowLabels.length + 1, spec, { scale: false }) + svg

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svg}
  </svg>`
}

// ── TB (default): top-level items are rows ──────────────────────────────────
function renderTB(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)

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
  const PAD      = 12
  const titleH   = spec.title ? 28 : 0
  const W        = Math.max(400, numCols * 130 + LABEL_W)
  const COL_W    = Math.floor((W - LABEL_W) / numCols)
  const cellMax  = Math.floor(COL_W / 7)
  const rowMax   = 16

  // Pre-compute column header wraps (needed for dynamic HEADER_H)
  const colHeaderWraps = colLabels.map(label => wrapLabel(label, cellMax, 5))
  const cornerWrap     = topLeftHeader ? wrapLabel(topLeftHeader, Math.floor(LABEL_W / 7), 5) : null
  const maxHLines      = Math.max(...colHeaderWraps.map(w => w.lines.length), cornerWrap ? cornerWrap.lines.length : 1, 1)
  const HEADER_H       = Math.max(28, PAD_V + maxHLines * LINE_H + PAD_V)

  // Pre-compute cell values and wraps
  const cellValues: string[][] = dataRows.map(row =>
    colLabels.map((colLabel, ci) => {
      const kvChild = row.children.find(ch => ch.label === colLabel)
      if (kvChild) return kvChild.value ?? '✓'
      return row.children[ci]?.label ?? '—'
    })
  )
  const cellItems: (ItemLike | undefined)[][] = dataRows.map(row =>
    colLabels.map((colLabel, ci) => {
      const kvChild = row.children.find(ch => ch.label === colLabel)
      return kvChild ?? row.children[ci]
    })
  )
  const rowLabelWraps = dataRows.map(r => wrapLabel(r.label, rowMax, 5))
  const cellWraps     = cellValues.map(row => row.map(v => wrapLabel(v, cellMax, 5)))

  // Dynamic row heights
  const dataRowHeights = dataRows.map((_, ri) => {
    const rlN   = rowLabelWraps[ri].lines.length
    const cellN = cellWraps[ri].map(w => w.lines.length)
    return rowH(Math.max(rlN, ...cellN, 1))
  })

  const dataRowY: number[] = []
  let cumY = PAD + titleH + HEADER_H
  for (const rh of dataRowHeights) { dataRowY.push(cumY); cumY += rh }
  const H = cumY + PAD

  let svg = ''
  if (spec.title) {
    svg += `<text x="${W / 2}" y="${PAD + 16}" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`
  }

  const baseY = PAD + titleH

  const headerUnit: string[] = []

  // Top-left corner + column headers
  headerUnit.push(`<rect x="0" y="${baseY}" width="${LABEL_W}" height="${HEADER_H}" fill="${theme.surface}" />`)
  if (topLeftHeader && cornerWrap) {
    headerUnit.push(labelText(LABEL_W / 2, centerY(baseY, HEADER_H, cornerWrap.lines.length),
      `text-anchor="middle" font-size="11" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600"`,
      topLeftHeader, cornerWrap))
  }
  for (let ci = 0; ci < numCols; ci++) {
    const colX = LABEL_W + ci * COL_W
    headerUnit.push(`<rect x="${colX}" y="${baseY}" width="${COL_W}" height="${HEADER_H}" fill="${theme.surface}" />`)
    const hw   = colHeaderWraps[ci]
    const hy   = centerY(baseY, HEADER_H, hw.lines.length)
    headerUnit.push(labelText(colX + COL_W / 2, hy,
      `text-anchor="middle" font-size="11" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600"`,
      colLabels[ci], hw))
  }
  svg += animate ? `<g class="mdart-n0">${headerUnit.join('')}</g>` : headerUnit.join('')

  // Header / data separator
  svg += `<line x1="0" y1="${baseY + HEADER_H}" x2="${W}" y2="${baseY + HEADER_H}" stroke="${theme.border}" stroke-width="1.5" />`

  // Data rows
  for (let ri = 0; ri < dataRows.length; ri++) {
    const rowUnit: string[] = []
    const row  = dataRows[ri]
    const ry   = dataRowY[ri]
    const rH   = dataRowHeights[ri]
    const t    = dataRows.length > 1 ? ri / (dataRows.length - 1) : 0.5
    const fill = lerpColorLocal('#1e3a8a', '#1d4ed8', t)

    // Colored row label cell
    rowUnit.push(`<rect x="0" y="${ry}" width="${LABEL_W}" height="${rH}" fill="${fill}" />`)
    const rlW = rowLabelWraps[ri]
    rowUnit.push(labelText(LABEL_W / 2, centerY(ry, rH, rlW.lines.length),
      `text-anchor="middle" font-size="11" fill="#bfdbfe" font-family="system-ui,sans-serif" font-weight="700"`,
      row.label, rlW, LINE_H, row))

    const rowBg = ri % 2 === 0 ? theme.surface : theme.bg
    rowUnit.push(`<rect x="${LABEL_W}" y="${ry}" width="${W - LABEL_W}" height="${rH}" fill="${rowBg}" />`)

    for (let ci = 0; ci < numCols; ci++) {
      const colX = LABEL_W + ci * COL_W
      const val  = cellValues[ri][ci]
      const cw   = cellWraps[ri][ci]
      const ci_  = cellItems[ri][ci]
      rowUnit.push(`<rect x="${colX}" y="${ry}" width="${COL_W}" height="${rH}" fill="${rowBg}" />`)
      rowUnit.push(labelText(colX + COL_W / 2, centerY(ry, rH, cw.lines.length),
        `text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif"`,
        val, cw, LINE_H, ci_))
    }

    rowUnit.push(`<line x1="0" y1="${ry + rH}" x2="${W}" y2="${ry + rH}" stroke="${theme.border}" stroke-width="0.5" />`)
    svg += animate ? `<g class="mdart-n${ri + 1}">${rowUnit.join('')}</g>` : rowUnit.join('')
  }

  // Vertical dividers
  for (let ci = 0; ci <= numCols; ci++) {
    const lx = LABEL_W + ci * COL_W
    svg += `<line x1="${lx}" y1="${baseY}" x2="${lx}" y2="${H - PAD}" stroke="${theme.border}" stroke-width="0.5" />`
  }
  svg += `<line x1="${LABEL_W}" y1="${baseY}" x2="${LABEL_W}" y2="${H - PAD}" stroke="${theme.border}" stroke-width="1" />`
  if (animate) svg = seqSpotlightCSS(dataRows.length + 1, spec, { scale: false }) + svg

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svg}
  </svg>`
}
