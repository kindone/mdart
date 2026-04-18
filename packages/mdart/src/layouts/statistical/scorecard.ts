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
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const cols = items.length <= 2 ? items.length : items.length <= 4 ? 2 : Math.min(4, items.length)
  const rows = Math.ceil(items.length / cols)
  const W = 600
  const TITLE_H = spec.title ? 30 : 8
  const GAP = 12
  const CARD_W = (W - (cols + 1) * GAP) / cols
  const CARD_H = 76
  const H = TITLE_H + rows * (CARD_H + GAP) + GAP

  const cards: string[] = []

  items.forEach((item, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = GAP + col * (CARD_W + GAP)
    const y = TITLE_H + GAP + row * (CARD_H + GAP)
    const value = item.value ?? item.attrs[0] ?? '—'
    const change = item.attrs.find(a => /^[+\-]/.test(a))
    const changeColor = change?.startsWith('+') ? theme.accent : theme.danger

    cards.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${CARD_W.toFixed(1)}" height="${CARD_H}" rx="8" fill="${theme.surface}" stroke="${theme.border}" stroke-width="1"/>`,
      `<text x="${(x + CARD_W / 2).toFixed(1)}" y="${(y + 32).toFixed(1)}" text-anchor="middle" font-size="22" fill="${theme.accent}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(value)}</text>`,
      `<text x="${(x + CARD_W / 2).toFixed(1)}" y="${(y + 50).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(item.label, 20)}</text>`,
    )
    if (change) {
      cards.push(`<text x="${(x + CARD_W / 2).toFixed(1)}" y="${(y + 65).toFixed(1)}" text-anchor="middle" font-size="10" fill="${changeColor}" font-family="system-ui,sans-serif">${escapeXml(change)}</text>`)
    }
  })

  return svg(W, H, theme, spec.title, cards)
}
