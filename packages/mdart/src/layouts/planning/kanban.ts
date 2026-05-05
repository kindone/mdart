import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, renderEmpty, parseLink, aWrap } from '../shared'

function wrapLabel(label: string, maxPerLine: number): string[] {
  if (label.length <= maxPerLine) return [label];
  const words = label.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxPerLine) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
      if (current.length > maxPerLine) {
        lines.push(current.slice(0, maxPerLine - 1) + '…');
        current = '';
      }
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 5);
}

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
  const GAP = 5
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
    const { display: colDisplay, url: colUrl } = parseLink(col.label)
    parts.push(aWrap(`<text x="${(colX + COL_W / 2).toFixed(1)}" y="${(colY + 21).toFixed(1)}" text-anchor="middle" font-size="12" fill="${theme.accent}" font-family="system-ui,sans-serif" font-weight="600">${tt(colDisplay, 14)}</text>`, colUrl))

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
      const maxPerLine = Math.floor((cardW - 20) / 7)
      const { display: cardDisplay, url: cardUrl } = parseLink(card.label)
      const lines = wrapLabel(cardDisplay, maxPerLine)
      const textX = (cardX + 10).toFixed(1)
      const n = lines.length

      // Baseline math: font-size 11 → baseline ≈ 9px from text top.
      // 1 line:  top at (28-11)/2=8.5, baseline at 8.5+9=17.5 → y=18
      // 2 lines: block top at (28-23)/2=2.5, line1 baseline 11.5→y=12, line2 at 12+12=24
      const y1 = n === 1 ? cardY + 18 : cardY + 12
      const y2 = cardY + 24

      parts.push(
        `<rect x="${cardX.toFixed(1)}" y="${cardY.toFixed(1)}" width="${cardW.toFixed(1)}" height="${CARD_H}" rx="5" fill="${theme.bg}" stroke="${theme.border}" stroke-width="1"/>`,
      )
      if (n === 1) {
        parts.push(
          aWrap(`<text x="${textX}" y="${y1.toFixed(1)}" font-size="11" fill="${isDone ? theme.muted : theme.text}" font-family="system-ui,sans-serif" ${isDone ? 'text-decoration="line-through"' : ''}>${escapeXml(lines[0])}</text>`, cardUrl),
        )
      } else {
        parts.push(
          aWrap(`<text x="${textX}" y="${y1.toFixed(1)}" font-size="11" fill="${isDone ? theme.muted : theme.text}" font-family="system-ui,sans-serif" ${isDone ? 'text-decoration="line-through"' : ''}>${escapeXml(lines[0])}</text><text x="${textX}" y="${y2.toFixed(1)}" font-size="11" fill="${isDone ? theme.muted : theme.text}" font-family="system-ui,sans-serif" ${isDone ? 'text-decoration="line-through"' : ''}>${escapeXml(lines[1])}</text>`, cardUrl),
        )
      }
    })
  })

  return svgWrap(W, H, theme, spec.title, parts)
}
