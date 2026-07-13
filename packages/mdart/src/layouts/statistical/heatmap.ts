import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, centeredTextY, renderWrappedText, wrapItem, shouldInstrument } from '../shared'

function svg(W: number, H: number, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const rows = spec.items
  if (rows.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()

  const numCols = Math.max(...rows.map(r => r.children.length), 1)
  const CELL_W = Math.min(96, Math.max(54, 560 / numCols))
  const LABEL_W = 116
  const PAD_V = 7
  const MIN_CELL_H = 40
  const MIN_HEADER_H = 30
  const TITLE_H = spec.title ? 30 : 8
  const W = LABEL_W + numCols * CELL_W

  const allVals: number[] = []
  rows.forEach(r => r.children.forEach(c => {
    const raw = (c.value ?? c.attrs[0] ?? c.label.match(/[\d.]+/)?.[0] ?? '0').replace('%', '')
    allVals.push(parseFloat(raw) || 0)
  }))
  const maxVal = Math.max(...allVals, 1)

  const parts: string[] = []

  // Column headers: explicit spec.columns wins; otherwise derive from the
  // first row's child labels (intuitive when users write `Morning: 5` etc.).
  const derivedCols = rows[0]?.children.map(ch => ch.label) ?? []
  const colHeaders = Array.from({ length: numCols }, (_, c) =>
    spec.columns?.[c] ?? derivedCols[c] ?? String.fromCharCode(65 + c)
  )
  const colHeaderFits = colHeaders.map(h =>
    fitTextToWidthShared([h], CELL_W - 8, { maxSize: 10, minSize: 6.5, maxLines: 3, boxH: 48 }),
  )
  const rowDisplays = rows.map(row => displayLabel(row))
  const rowLabelFits = rowDisplays.map(({ display }) =>
    fitTextToWidthShared([display], LABEL_W - 14, { maxSize: 10, minSize: 6.5, maxLines: 3, boxH: 54 }),
  )
  const cellFits = rows.map(row =>
    Array.from({ length: numCols }, (_, c) => {
      const cell = row.children[c]
      if (!cell) return null
      const cellText = cell.value ?? cell.label
      return fitTextToWidthShared([cellText], CELL_W - 8, { maxSize: 10, minSize: 6, maxLines: 3, boxH: 54 })
    }),
  )
  const blockH = (fit: ReturnType<typeof fitTextToWidthShared>) =>
    fit.results[0].lines.length * fit.lineHeight
  const HEADER_H = Math.max(MIN_HEADER_H, PAD_V * 2, ...colHeaderFits.map(f => PAD_V * 2 + blockH(f)))
  const rowHeights = rows.map((_, r) => {
    const rowLabelH = blockH(rowLabelFits[r])
    const cellHs = cellFits[r].map(f => f ? blockH(f) : 0)
    return Math.max(MIN_CELL_H, PAD_V * 2 + rowLabelH, PAD_V * 2 + Math.max(...cellHs, 0))
  })
  const rowY: number[] = []
  let cursorY = TITLE_H + HEADER_H
  for (const h of rowHeights) { rowY.push(cursorY); cursorY += h }
  const H = cursorY + 8

  const textBlock = (
    x: number,
    baseY: number,
    boxH: number,
    fit: ReturnType<typeof fitTextToWidthShared>,
    attrs: string,
    fullText: string,
  ): string => {
    const wrap = fit.results[0]
    return renderWrappedText(x, centeredTextY(baseY, boxH, wrap.lines.length, fit.lineHeight), attrs, fullText, wrap, fit.lineHeight)
  }

  const headerUnit: string[] = []
  headerUnit.push(`<rect x="0" y="${TITLE_H}" width="${LABEL_W}" height="${HEADER_H}" fill="${theme.surface}" stroke="${theme.border}" stroke-width="0.5"/>`)
  for (let c = 0; c < numCols; c++) {
    const colX = LABEL_W + c * CELL_W
    headerUnit.push(`<rect x="${colX}" y="${TITLE_H}" width="${CELL_W}" height="${HEADER_H}" fill="${theme.surface}" stroke="${theme.border}" stroke-width="0.5"/>`)
    headerUnit.push(textBlock(colX + CELL_W / 2, TITLE_H, HEADER_H, colHeaderFits[c],
      `text-anchor="middle" font-size="${colHeaderFits[c].fontSize}" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600"`,
      colHeaders[c]))
  }
  parts.push(wrapItem(headerUnit.join(''), 0, animate, instrument))

  rows.forEach((row, r) => {
    const unit: string[] = []
    const y = rowY[r]
    const rowH = rowHeights[r]
    const { display: rowDisplay, url: rowUrl } = rowDisplays[r]
    unit.push(`<rect x="0" y="${y}" width="${LABEL_W}" height="${rowH}" fill="${theme.surface}" stroke="${theme.border}" stroke-width="0.5">${itemTitleTag(row)}</rect>`)
    unit.push(aWrap(textBlock(8, y, rowH, rowLabelFits[r],
      `font-size="${rowLabelFits[r].fontSize}" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600"`,
      rowDisplay), rowUrl))
    row.children.slice(0, numCols).forEach((cell, c) => {
      const colX = LABEL_W + c * CELL_W
      const raw = (cell.value ?? cell.attrs[0] ?? cell.label.match(/[\d.]+/)?.[0] ?? '0').replace('%', '')
      const v = Math.min((parseFloat(raw) || 0) / maxVal, 1)
      const alpha = Math.round(18 + v * 210).toString(16).padStart(2, '0')
      unit.push(`<rect x="${colX}" y="${y}" width="${CELL_W}" height="${rowH}" fill="${theme.primary}${alpha}" stroke="${theme.border}55" stroke-width="0.5">${itemTitleTag(cell)}</rect>`)
      const textFill = v > 0.55 ? theme.bg : theme.text
      // Prefer the cell's value (e.g. "5"); fall back to label when absent.
      const cellText = cell.value ?? cell.label
      const fit = cellFits[r][c]
      if (fit) {
        unit.push(textBlock(colX + CELL_W / 2, y, rowH, fit,
          `text-anchor="middle" font-size="${fit.fontSize}" fill="${textFill}" font-family="system-ui,sans-serif"`,
          cellText))
      }
    })
    parts.push(wrapItem(unit.join(''), r + 1, animate, instrument))
  })
  if (animate) parts.unshift(seqSpotlightCSS(rows.length + 1, spec, { scale: false, loopStartIndex: 1 }))

  return svg(W, H, theme, spec.title, parts)
}
