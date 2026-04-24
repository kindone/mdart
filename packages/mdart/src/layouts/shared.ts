import type { MdArtTheme } from '../theme'
import type { MdArtItem } from '../parser'

// ── XML / text helpers ────────────────────────────────────────────────────────

export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

export function tt(s: string, max: number): string {
  const tr = truncate(s, max)
  if (tr === s) return escapeXml(s)
  return `<title>${escapeXml(s)}</title>${escapeXml(tr)}`
}

/**
 * Resolve a single-line description for an item, preferring `value` (explicit
 * inline `: desc` form) and falling back to a summary of `children` labels
 * (nested `  - child` form). Used by renderers that have only one description
 * slot, so authors can use either syntax interchangeably.
 *
 * Returns null when neither is present.
 */
export function getCaption(item: MdArtItem, maxChildren = 3, sep = ' · '): string | null {
  if (item.value) return item.value
  if (!item.children || item.children.length === 0) return null
  return item.children.slice(0, maxChildren).map(c => c.label).join(sep)
}

// ── Color helpers ─────────────────────────────────────────────────────────────

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function lerpColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1)
  const [r2, g2, b2] = hexToRgb(c2)
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t)
  return '#' + [lerp(r1, r2), lerp(g1, g2), lerp(b1, b2)].map(v => v.toString(16).padStart(2, '0')).join('')
}

// ── SVG wrappers ──────────────────────────────────────────────────────────────

export function renderEmpty(theme: MdArtTheme): string {
  return `<svg viewBox="0 0 400 80" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="80" fill="${theme.bg}" rx="6"/>
    <text x="200" y="44" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif">No items</text>
  </svg>`
}

export function svgWrap(W: number, H: number, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

export function titleEl(W: number, title: string, theme: MdArtTheme): string {
  return `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(title)}</text>`
}

// ── Staircase helper (shared by step-up and step-down) ────────────────────────

import type { MdArtSpec } from '../parser'

export function renderStaircase(spec: MdArtSpec, theme: MdArtTheme, ascending: boolean): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const n = items.length
  const W = 560
  const GAP_X = 6, GAP_Y = 6
  const BOX_W = Math.min(110, Math.floor((W - 16 - (n - 1) * GAP_X) / n))
  const BOX_H = 36
  const titleH = spec.title ? 28 : 8
  const totalDiagH = (n - 1) * (BOX_H + GAP_Y) + BOX_H
  const H = titleH + totalDiagH + 16
  const startX = 8

  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))
  parts.push(`<defs><marker id="step-arr" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto"><polygon points="0,0 5,2.5 0,5" fill="${theme.accent}"/></marker></defs>`)

  items.forEach((item, i) => {
    const x = startX + i * (BOX_W + GAP_X)
    const y = ascending
      ? titleH + 4 + (n - 1 - i) * (BOX_H + GAP_Y)
      : titleH + 4 + i * (BOX_H + GAP_Y)
    const t = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)

    parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${BOX_W}" height="${BOX_H}" rx="5" fill="${fill}33" stroke="${fill}" stroke-width="1.2"/>`)
    parts.push(`<text x="${(x + BOX_W / 2).toFixed(1)}" y="${(y + BOX_H / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, Math.floor(BOX_W / 6))}</text>`)
    const caption = getCaption(item)
    if (caption) parts.push(`<text x="${(x + BOX_W / 2).toFixed(1)}" y="${(y + BOX_H / 2 + 16).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(caption, Math.floor(BOX_W / 5))}</text>`)

    if (i < n - 1) {
      const nextY = ascending
        ? titleH + 4 + (n - 2 - i) * (BOX_H + GAP_Y)
        : titleH + 4 + (i + 1) * (BOX_H + GAP_Y)
      const x1 = x + BOX_W
      const y1 = ascending ? y : y + BOX_H
      const x2 = x + BOX_W + GAP_X
      const y2 = ascending ? nextY + BOX_H : nextY
      parts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${theme.accent}cc" stroke-width="2.5" marker-end="url(#step-arr)"/>`)
    }
  })
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}
