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

  const W = 520
  const ROW_H = 40
  const LABEL_W = 155
  const BAR_X = LABEL_W + 20
  const BAR_W = W - BAR_X - 52
  const TITLE_H = spec.title ? 30 : 10
  const H = TITLE_H + items.length * ROW_H + 12

  const rows: string[] = []

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const y = TITLE_H + i * ROW_H + 4
    const barY = y + 11

    const raw = (item.value ?? item.attrs[0] ?? '0').replace('%', '')
    const num = parseFloat(raw)
    const pct = isNaN(num) ? 0 : num > 1 ? Math.min(num, 100) : num * 100
    const fillW = Math.max(0, BAR_W * pct / 100)

    const barColor = pct >= 70 ? theme.accent : pct >= 40 ? theme.warning : theme.danger

    rows.push(
      `<rect x="${BAR_X}" y="${barY}" width="${BAR_W}" height="16" rx="8" fill="${theme.muted}33"/>`,
      `<rect x="${BAR_X}" y="${barY}" width="${fillW.toFixed(1)}" height="16" rx="8" fill="${barColor}"/>`,
      `<text x="${LABEL_W}" y="${barY + 11}" text-anchor="end" font-size="12" fill="${theme.text}" font-family="system-ui,sans-serif">${tt(item.label, 20)}</text>`,
      `<text x="${BAR_X + BAR_W + 8}" y="${barY + 11}" font-size="11" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${pct % 1 === 0 ? pct : pct.toFixed(1)}%</text>`,
    )
  }

  return svg(W, H, theme, spec.title, rows)
}
