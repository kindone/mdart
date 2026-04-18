import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, renderEmpty } from '../shared'

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

  const numCols = Math.max(...rows.map(r => r.children.length), 1)
  const CELL_W = Math.min(88, Math.max(46, 520 / numCols))
  const LABEL_W = 100, CELL_H = 40, HEADER_H = 28
  const TITLE_H = spec.title ? 30 : 8
  const W = LABEL_W + numCols * CELL_W
  const H = TITLE_H + HEADER_H + rows.length * CELL_H + 8

  const allVals: number[] = []
  rows.forEach(r => r.children.forEach(c => {
    const raw = (c.value ?? c.attrs[0] ?? c.label.match(/[\d.]+/)?.[0] ?? '0').replace('%', '')
    allVals.push(parseFloat(raw) || 0)
  }))
  const maxVal = Math.max(...allVals, 1)

  const parts: string[] = []

  parts.push(`<rect x="0" y="${TITLE_H}" width="${LABEL_W}" height="${HEADER_H}" fill="${theme.surface}" stroke="${theme.border}" stroke-width="0.5"/>`)
  for (let c = 0; c < numCols; c++) {
    const colX = LABEL_W + c * CELL_W
    parts.push(`<rect x="${colX}" y="${TITLE_H}" width="${CELL_W}" height="${HEADER_H}" fill="${theme.surface}" stroke="${theme.border}" stroke-width="0.5"/>`)
    parts.push(`<text x="${(colX + CELL_W / 2).toFixed(1)}" y="${(TITLE_H + 19).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${String.fromCharCode(65 + c)}</text>`)
  }

  rows.forEach((row, r) => {
    const rowY = TITLE_H + HEADER_H + r * CELL_H
    parts.push(`<rect x="0" y="${rowY}" width="${LABEL_W}" height="${CELL_H}" fill="${theme.surface}" stroke="${theme.border}" stroke-width="0.5"/>`)
    parts.push(`<text x="8" y="${(rowY + 25).toFixed(1)}" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(row.label, 12)}</text>`)
    row.children.slice(0, numCols).forEach((cell, c) => {
      const colX = LABEL_W + c * CELL_W
      const raw = (cell.value ?? cell.attrs[0] ?? cell.label.match(/[\d.]+/)?.[0] ?? '0').replace('%', '')
      const v = Math.min((parseFloat(raw) || 0) / maxVal, 1)
      const alpha = Math.round(18 + v * 210).toString(16).padStart(2, '0')
      parts.push(`<rect x="${colX}" y="${rowY}" width="${CELL_W}" height="${CELL_H}" fill="${theme.primary}${alpha}" stroke="${theme.border}55" stroke-width="0.5"/>`)
      const textFill = v > 0.55 ? theme.bg : theme.text
      parts.push(`<text x="${(colX + CELL_W / 2).toFixed(1)}" y="${(rowY + 25).toFixed(1)}" text-anchor="middle" font-size="10" fill="${textFill}" font-family="system-ui,sans-serif">${tt(cell.label, 9)}</text>`)
    })
  })

  return svg(W, H, theme, spec.title, parts)
}
