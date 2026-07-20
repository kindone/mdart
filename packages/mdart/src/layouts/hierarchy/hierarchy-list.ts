import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, itemTitleTag, displayLabelValue, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

// Layout constants.
// hierarchy-list renders a compact tree outline; rows are intentionally tight.
// Multi-line wrapping per row would break the connector-line geometry, so we
// use a generous single-line limit instead (up from the old hard 40-char tt()).

const W      = 560
const INDENT = 18
const PAD    = 14

const ROW_H_D0 = 26   // depth-0 rows slightly taller
const ROW_H    = 22   // depth 1+ rows

const FS_D0 = 12, FS_D1 = 11, FS_D2 = 10

// Per-depth character limits (wider = less truncation)
const MAX_D0 = Math.max(20, Math.floor((W - PAD * 2) / 6.0))           // ~88
const MAX_D1 = Math.max(20, Math.floor((W - PAD * 2 - INDENT) / 5.8))  // ~89
const MAX_D2 = Math.max(20, Math.floor((W - PAD * 2 - INDENT * 2) / 5.5)) // ~90

interface HierarchyListRow {
  label: string
  truncated: boolean
  url: string | null
  depth: number
  isLast: boolean
  parentHasSibling: boolean[]
  src: MdArtItem
}

interface RowPlacement {
  row: HierarchyListRow
  index: number
  rowH: number
  y: number
  bulletX: number
}

function maxCharsForDepth(depth: number): number {
  return depth === 0 ? MAX_D0 : depth === 1 ? MAX_D1 : MAX_D2
}

function rowHeight(depth: number): number {
  return depth === 0 ? ROW_H_D0 : ROW_H
}

function flattenRows(items: MdArtItem[], depth = 0, parentHasSibling: boolean[] = []): HierarchyListRow[] {
  return items.flatMap((item, i) => {
    const isLast = i === items.length - 1
    const { display: labelStr, url: labelUrl } = displayLabelValue(item)
    const { lines, truncated } = wrapLabel(labelStr, maxCharsForDepth(depth), 1)
    return [
      {
        label: lines[0],
        truncated,
        url: labelUrl,
        depth,
        isLast,
        parentHasSibling: [...parentHasSibling],
        src: item,
      },
      ...flattenRows(item.children, depth + 1, [...parentHasSibling, !isLast]),
    ]
  })
}

function titleHeight(spec: MdArtSpec): number {
  return spec.title ? 28 : 8
}

function measureHeight(spec: MdArtSpec, rows: HierarchyListRow[]): number {
  return titleHeight(spec) + rows.reduce((s, r) => s + rowHeight(r.depth), 0) + 12
}

function placeRows(spec: MdArtSpec, rows: HierarchyListRow[]): RowPlacement[] {
  let curY = titleHeight(spec)
  return rows.map((row, index) => {
    const rowH = rowHeight(row.depth)
    const placement = {
      row,
      index,
      rowH,
      y: curY + rowH / 2,
      bulletX: PAD + row.depth * INDENT,
    }
    curY += rowH
    return placement
  })
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  return spec.title
    ? `<text x="${PAD}" y="20" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(spec.title)}</text>`
    : ''
}

function renderConnectors(placement: RowPlacement, theme: MdArtTheme): string {
  const { row, rowH, y, bulletX } = placement
  if (row.depth === 0) return ''

  const parts: string[] = []
  for (let d = 0; d < row.depth - 1; d++) {
    if (row.parentHasSibling[d]) {
      const lx = PAD + d * INDENT + INDENT - 4
      parts.push(`<line x1="${lx}" y1="${(y - rowH / 2).toFixed(1)}" x2="${lx}" y2="${(y + rowH / 2).toFixed(1)}" stroke="${theme.border}35" stroke-width="1"/>`)
    }
  }

  const px = PAD + (row.depth - 1) * INDENT + INDENT - 4
  parts.push(`<line x1="${px}" y1="${(y - rowH / 2).toFixed(1)}" x2="${px}" y2="${y.toFixed(1)}" stroke="${theme.border}35" stroke-width="1"/>`)
  if (!row.isLast) {
    parts.push(`<line x1="${px}" y1="${y.toFixed(1)}" x2="${px}" y2="${(y + rowH / 2).toFixed(1)}" stroke="${theme.border}35" stroke-width="1"/>`)
  }
  parts.push(`<line x1="${px}" y1="${y.toFixed(1)}" x2="${(bulletX - 2).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${theme.border}35" stroke-width="1"/>`)
  return parts.join('')
}

function bulletRadius(depth: number): number {
  return depth === 0 ? 5 : depth === 1 ? 3.5 : 2.5
}

function bulletFill(depth: number, theme: MdArtTheme): string {
  return depth === 0 ? theme.accent : depth === 1 ? theme.primary : theme.secondary
}

function textSize(depth: number): number {
  return depth === 0 ? FS_D0 : depth === 1 ? FS_D1 : FS_D2
}

function textFill(depth: number, theme: MdArtTheme): string {
  return depth <= 1 ? theme.text : theme.textMuted
}

function renderBullet(placement: RowPlacement, theme: MdArtTheme): string {
  const { row, y, bulletX } = placement
  const radius = bulletRadius(row.depth)
  return `<circle cx="${(bulletX + radius).toFixed(1)}" cy="${y.toFixed(1)}" r="${radius}" fill="${bulletFill(row.depth, theme)}">${itemTitleTag(row.src)}</circle>`
}

function renderRowText(placement: RowPlacement, theme: MdArtTheme): string {
  const { row, y, bulletX } = placement
  const radius = bulletRadius(row.depth)
  const textX = bulletX + radius * 2 + 4
  const fw = row.depth === 0 ? '700' : '400'
  const tip = row.truncated ? `<title>${escapeXml(row.label)}</title>` : ''
  return aWrap(`<text x="${textX.toFixed(1)}" y="${(y + 4).toFixed(1)}" font-size="${textSize(row.depth)}" fill="${textFill(row.depth, theme)}" ${FONT_SANS_ATTR} font-weight="${fw}">${tip}${escapeXml(row.label)}</text>`, row.url)
}

function renderRow(placement: RowPlacement, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const unit = [
    renderConnectors(placement, theme),
    renderBullet(placement, theme),
    renderRowText(placement, theme),
  ].join('')
  return wrapItem(unit, placement.index, animate, instrument)
}

function renderSvg(spec: MdArtSpec, theme: MdArtTheme, rows: HierarchyListRow[], placements: RowPlacement[], animate: boolean, instrument: boolean): string {
  const parts = [
    animate ? seqSpotlightCSS(rows.length, spec, { scale: false }) : '',
    renderTitle(spec, theme),
    ...placements.map(p => renderRow(p, theme, animate, instrument)),
  ].filter(Boolean)

  return `<svg viewBox="0 0 ${W} ${measureHeight(spec, rows)}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${parts.join('\n  ')}
</svg>`
}

// Renderer.

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const rows = flattenRows(spec.items)
  return renderSvg(spec, theme, rows, placeRows(spec, rows), animate, instrument)
}
