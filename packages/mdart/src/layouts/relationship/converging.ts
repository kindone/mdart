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
  const sources = items.length > 1 ? items.slice(0, -1) : items
  const target  = items.length > 1 ? items[items.length - 1] : { label: spec.title ?? 'Result', children: [] as typeof items[0]['children'] }
  const n = sources.length
  const W = 520, TITLE_H = spec.title ? 28 : 8
  const ROW_H = Math.max(44, Math.min(60, 300 / n))
  const H = Math.max(200, n * ROW_H + TITLE_H + 40)
  const cy = TITLE_H + (H - TITLE_H) / 2
  const SRC_X = 10, TGT_X = W - 130
  const parts: string[] = []
  parts.push(`<defs><marker id="arr-c" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L7,4 L0,8 Z" fill="${theme.accent}cc"/></marker></defs>`)
  const tBH = Math.min(64, n * 18 + 20)
  parts.push(`<rect x="${TGT_X}" y="${(cy - tBH / 2).toFixed(1)}" width="116" height="${tBH}" rx="6" fill="${theme.accent}28" stroke="${theme.accent}" stroke-width="1.5"/>`)
  const tw = target.label.split(' '), tm = Math.ceil(tw.length / 2)
  parts.push(`<text x="${(TGT_X + 58).toFixed(1)}" y="${tw.length > 1 ? (cy - 2).toFixed(1) : (cy + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${tt(tw.slice(0, tm).join(' '), 13)}</text>`)
  if (tw.length > 1) parts.push(`<text x="${(TGT_X + 58).toFixed(1)}" y="${(cy + 12).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${tt(tw.slice(tm).join(' '), 13)}</text>`)
  sources.forEach((item, i) => {
    const sy = n === 1 ? cy : TITLE_H + 20 + i * (H - TITLE_H - 40) / (n - 1)
    parts.push(`<rect x="${SRC_X}" y="${(sy - 16).toFixed(1)}" width="112" height="32" rx="5" fill="${theme.surface}" stroke="${theme.primary}66" stroke-width="1.2"/>`)
    parts.push(`<text x="${(SRC_X + 56).toFixed(1)}" y="${(sy + 5).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif">${tt(item.label, 13)}</text>`)
    const x1 = SRC_X + 112, x2 = TGT_X - 4
    const mid = (x1 + x2) / 2
    parts.push(`<path d="M${x1},${sy.toFixed(1)} C${mid},${sy.toFixed(1)} ${mid},${cy.toFixed(1)} ${x2},${cy.toFixed(1)}" fill="none" stroke="${theme.primary}66" stroke-width="1.5" marker-end="url(#arr-c)"/>`)
  })
  return svg(W, H, theme, spec.title, parts)
}
