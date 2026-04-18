import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, renderEmpty } from '../shared'

function svgWrap(W: number, H: number, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const columns = spec.items
  if (columns.length === 0) return renderEmpty(theme)

  const W = 600
  const TITLE_H = spec.title ? 30 : 8
  const n = columns.length
  const GAP = 10
  const COL_W = (W - (n + 1) * GAP) / n
  const HEADER_H = 34
  const CARD_H = 28
  const CARD_GAP = 6
  const PAD = 8

  const maxCards = Math.max(...columns.map(c => c.children.length), 0)
  const colBodyH = maxCards * (CARD_H + CARD_GAP) + PAD
  const COL_H = HEADER_H + colBodyH + PAD
  const H = TITLE_H + 8 + COL_H + 12

  const parts: string[] = []

  columns.forEach((col, ci) => {
    const colX = GAP + ci * (COL_W + GAP)
    const colY = TITLE_H + 8

    parts.push(`<rect x="${colX.toFixed(1)}" y="${colY.toFixed(1)}" width="${COL_W.toFixed(1)}" height="${COL_H}" rx="8" fill="${theme.surface}" stroke="${theme.border}" stroke-width="1"/>`)
    parts.push(`<path d="M${(colX + 8).toFixed(1)},${colY.toFixed(1)} Q${colX.toFixed(1)},${colY.toFixed(1)} ${colX.toFixed(1)},${(colY + 8).toFixed(1)} L${colX.toFixed(1)},${(colY + HEADER_H).toFixed(1)} L${(colX + COL_W).toFixed(1)},${(colY + HEADER_H).toFixed(1)} L${(colX + COL_W).toFixed(1)},${(colY + 8).toFixed(1)} Q${(colX + COL_W).toFixed(1)},${colY.toFixed(1)} ${(colX + COL_W - 8).toFixed(1)},${colY.toFixed(1)} Z" fill="${theme.accent}22"/>`)
    parts.push(`<text x="${(colX + COL_W / 2).toFixed(1)}" y="${(colY + 21).toFixed(1)}" text-anchor="middle" font-size="12" fill="${theme.accent}" font-family="system-ui,sans-serif" font-weight="600">${tt(col.label, 14)}</text>`)

    if (col.children.length > 0) {
      const bx = colX + COL_W - 18
      parts.push(
        `<circle cx="${bx.toFixed(1)}" cy="${(colY + 17).toFixed(1)}" r="9" fill="${theme.accent}44"/>`,
        `<text x="${bx.toFixed(1)}" y="${(colY + 21).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.text}" font-family="system-ui,sans-serif">${col.children.length}</text>`,
      )
    }

    parts.push(`<line x1="${colX}" y1="${(colY + HEADER_H).toFixed(1)}" x2="${(colX + COL_W).toFixed(1)}" y2="${(colY + HEADER_H).toFixed(1)}" stroke="${theme.border}" stroke-width="1"/>`)

    col.children.forEach((card, idx) => {
      const cardX = colX + PAD
      const cardY = colY + HEADER_H + PAD + idx * (CARD_H + CARD_GAP)
      const cardW = COL_W - PAD * 2
      const isDone = card.attrs.includes('done')

      parts.push(
        `<rect x="${cardX.toFixed(1)}" y="${cardY.toFixed(1)}" width="${cardW.toFixed(1)}" height="${CARD_H}" rx="5" fill="${theme.bg}" stroke="${theme.border}" stroke-width="1"/>`,
        `<text x="${(cardX + 10).toFixed(1)}" y="${(cardY + 17).toFixed(1)}" font-size="11" fill="${isDone ? theme.muted : theme.text}" font-family="system-ui,sans-serif" ${isDone ? 'text-decoration="line-through"' : ''}>${tt(card.label, Math.floor(cardW / 7))}</text>`,
      )
    })
  })

  return svgWrap(W, H, theme, spec.title, parts)
}
