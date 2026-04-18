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

  const W = 640
  const TITLE_H = spec.title ? 32 : 8
  const n = columns.length
  const GAP = 10
  const COL_W = (W - (n + 1) * GAP) / n
  const HEADER_H = 44
  const CARD_H = 30, CARD_GAP = 6, PAD = 8
  const FOOTER_H = 30

  const maxCards = Math.max(...columns.map(c => c.children.length), 0)
  const COL_H = HEADER_H + maxCards * (CARD_H + CARD_GAP) + PAD * 2
  const H = TITLE_H + 8 + COL_H + FOOTER_H + 12

  let totalPts = 0, donePts = 0
  const parts: string[] = []

  columns.forEach((col, ci) => {
    const colX = GAP + ci * (COL_W + GAP), colY = TITLE_H + 8
    const isDoneCol = /done|complete/i.test(col.label)

    parts.push(`<rect x="${colX.toFixed(1)}" y="${colY}" width="${COL_W.toFixed(1)}" height="${COL_H}" rx="8" fill="${theme.surface}" stroke="${theme.border}" stroke-width="1"/>`)
    parts.push(`<path d="M${(colX+8).toFixed(1)},${colY} Q${colX},${colY} ${colX},${colY+8} L${colX},${colY+HEADER_H} L${(colX+COL_W).toFixed(1)},${colY+HEADER_H} L${(colX+COL_W).toFixed(1)},${colY+8} Q${(colX+COL_W).toFixed(1)},${colY} ${(colX+COL_W-8).toFixed(1)},${colY} Z" fill="${theme.accent}22"/>`)
    parts.push(`<text x="${(colX+COL_W/2).toFixed(1)}" y="${colY+19}" text-anchor="middle" font-size="12" fill="${theme.accent}" font-family="system-ui,sans-serif" font-weight="600">${tt(col.label, 14)}</text>`)

    let colPts = 0
    col.children.forEach(c => {
      const p = parseInt(c.value ?? c.attrs.find(a => /^\d+$/.test(a)) ?? '0') || 0
      colPts += p; totalPts += p
      if (isDoneCol || c.attrs.includes('done')) donePts += p
    })
    parts.push(`<text x="${(colX+COL_W/2).toFixed(1)}" y="${colY+34}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${colPts} pts</text>`)
    parts.push(`<line x1="${colX}" y1="${colY+HEADER_H}" x2="${(colX+COL_W).toFixed(1)}" y2="${colY+HEADER_H}" stroke="${theme.border}" stroke-width="1"/>`)

    col.children.forEach((card, idx) => {
      const cx = colX + PAD, cy = colY + HEADER_H + PAD + idx * (CARD_H + CARD_GAP)
      const cw = COL_W - PAD * 2
      const pts = parseInt(card.value ?? card.attrs.find(a => /^\d+$/.test(a)) ?? '0') || 0
      const done = isDoneCol || card.attrs.includes('done')
      const active = card.attrs.includes('active') || card.attrs.includes('doing') || card.attrs.includes('wip')
      const border = active ? theme.accent : theme.border

      parts.push(`<rect x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" width="${cw.toFixed(1)}" height="${CARD_H}" rx="5" fill="${theme.bg}" stroke="${border}" stroke-width="${active ? 1.5 : 1}"/>`)
      if (active) parts.push(`<rect x="${cx.toFixed(1)}" y="${(cy+4).toFixed(1)}" width="3" height="${CARD_H-8}" rx="1.5" fill="${theme.accent}"/>`)

      const maxChars = Math.floor((cw - (pts > 0 ? 30 : 12)) / 6.5)
      const tx = cx + (active ? 10 : 6)
      parts.push(`<text x="${(tx+2).toFixed(1)}" y="${(cy+19).toFixed(1)}" font-size="11" fill="${done ? theme.textMuted : theme.text}" font-family="system-ui,sans-serif" ${done ? 'text-decoration="line-through"' : ''}>${tt(card.label, maxChars)}</text>`)
      if (pts > 0) {
        const bx = cx + cw - 13
        parts.push(`<circle cx="${bx.toFixed(1)}" cy="${(cy+15).toFixed(1)}" r="9" fill="${theme.accent}30"/>`)
        parts.push(`<text x="${bx.toFixed(1)}" y="${(cy+19).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.accent}" font-family="system-ui,sans-serif" font-weight="600">${pts}</text>`)
      }
    })
  })

  const barY = TITLE_H + 8 + COL_H + 8
  const barX = GAP, barW = W - GAP * 2
  parts.push(`<rect x="${barX}" y="${barY}" width="${barW}" height="10" rx="5" fill="${theme.surface}" stroke="${theme.border}" stroke-width="1"/>`)
  if (totalPts > 0) {
    const fw = Math.max(0, (donePts / totalPts) * barW)
    parts.push(`<rect x="${barX}" y="${barY}" width="${fw.toFixed(1)}" height="10" rx="5" fill="${theme.accent}cc"/>`)
    parts.push(`<text x="${barX + barW / 2}" y="${(barY+22).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">Velocity: ${donePts}/${totalPts} pts · ${Math.round(donePts/totalPts*100)}% complete</text>`)
  }

  return svgWrap(W, H, theme, spec.title, parts)
}
