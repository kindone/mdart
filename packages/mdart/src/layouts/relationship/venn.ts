import type { MdArtSpec, MdArtItem } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt } from '../shared'

/**
 * Unified Venn renderer.
 *   - 2 circles → side-by-side overlap
 *   - 3 circles → triangle
 *   - 4 circles → 2×2 grid (5+ caps at 4)
 *
 * Intersection items are detected by the parser (label contains `∩` or `&&`).
 * Their labels are split on those separators to find which circles they
 * involve; the label is then placed at the geometric midpoint of those
 * circles' centres. A single all-circles intersection lands at the centre.
 *
 * Type aliases `venn-3` and `venn-4` re-export this renderer for backward
 * compatibility — circle count comes from the data, not the type name.
 */

const SEP_RE = /\s*∩\s*|\s*&&\s*/

/** Word-wrap into ≤2 lines of maxChars; truncate the second. */
function wrapIx(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if (!cur) { cur = w; continue }
    if (cur.length + 1 + w.length <= maxChars) cur += ' ' + w
    else { lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  if (lines.length === 0) return [tt(text, maxChars)]
  return lines.length === 1 ? lines : [lines[0], tt(lines.slice(1).join(' '), maxChars)]
}

function svg(W: number, H: number, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

/** Names mentioned in an intersection label, e.g. "Marketing && Sales" → ["Marketing","Sales"]. */
function intersectionNames(label: string): string[] {
  return label.split(SEP_RE).map(s => s.trim()).filter(Boolean)
}

/**
 * Position for an intersection label.
 *   - Match the named circles → take their centroid (geometric midpoint).
 *   - If this is the all-circles intersection, leave it at the centroid.
 *   - Otherwise push it outward from the all-circles centre by `spread`,
 *     so pairwise labels don't pile up on the central all-circles label.
 */
function intersectionPos(
  names: string[],
  circles: MdArtItem[],
  centres: { x: number; y: number }[],
  allCentre: { x: number; y: number },
  spread: number,
): { x: number; y: number } {
  const pts: { x: number; y: number }[] = []
  for (const n of names) {
    const idx = circles.findIndex(c => c.label.toLowerCase() === n.toLowerCase())
    if (idx >= 0 && idx < centres.length) pts.push(centres[idx])
  }
  if (pts.length === 0) return allCentre
  const mid = {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  }
  // All-circles intersection stays put; partial intersections get spread out.
  if (pts.length === circles.length) return mid
  return {
    x: allCentre.x + (mid.x - allCentre.x) * spread,
    y: allCentre.y + (mid.y - allCentre.y) * spread,
  }
}

// ── Layout configurations ───────────────────────────────────────────────────

interface Layout {
  W: number
  H: number
  R: number
  centres: { x: number; y: number }[]
  /** Where to put each circle's text label (offset from circle centre). */
  labelOff: [number, number][]
  /** Per-circle fill colours. */
  colors: string[]
}

function layout2(theme: MdArtTheme, titleH: number): Layout {
  const W = 560, H = 320 + titleH
  const cy = titleH + (H - titleH) / 2
  const R = 115
  const overlap = 72
  const cx1 = W / 2 - R + overlap / 2
  const cx2 = W / 2 + R - overlap / 2
  return {
    W, H, R,
    centres: [{ x: cx1, y: cy }, { x: cx2, y: cy }],
    labelOff: [[-R / 3.5, -10], [R / 3.5, -10]],
    colors: [theme.primary, theme.secondary],
  }
}

function layout3(theme: MdArtTheme, titleH: number): Layout {
  const W = 560, H = 380 + titleH
  const cy = titleH + (H - titleH) / 2
  const R = 105, off = 62
  return {
    W, H, R,
    centres: [
      { x: W / 2 - off, y: cy - off * 0.65 },
      { x: W / 2 + off, y: cy - off * 0.65 },
      { x: W / 2,       y: cy + off * 0.9 },
    ],
    labelOff: [[-50, -R * 0.55], [50, -R * 0.55], [0, R * 0.6]],
    colors: [theme.primary, theme.secondary, theme.accent],
  }
}

function layout4(theme: MdArtTheme, titleH: number): Layout {
  const W = 560, H = 380 + titleH
  const cx = W / 2, cy = titleH + (H - titleH) / 2
  const R = 105, dx = 60, dy = 44
  return {
    W, H, R,
    centres: [
      { x: cx - dx, y: cy - dy }, { x: cx + dx, y: cy - dy },
      { x: cx - dx, y: cy + dy }, { x: cx + dx, y: cy + dy },
    ],
    labelOff: [
      [-R * 0.58, -R * 0.52], [R * 0.58, -R * 0.52],
      [-R * 0.58,  R * 0.52], [R * 0.58,  R * 0.52],
    ],
    colors: [theme.primary, theme.secondary, theme.accent, theme.primary],
  }
}

// ── Main entry ──────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const all        = spec.items
  const circles    = all.filter(i => !i.isIntersection).slice(0, 4)
  const intersects = all.filter(i => i.isIntersection)
  const n          = circles.length

  if (n === 0) {
    return `<svg viewBox="0 0 300 80" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  <text x="150" y="42" text-anchor="middle" font-size="12" fill="${theme.textMuted}" font-family="system-ui,sans-serif">No items</text>
</svg>`
  }

  const titleH = spec.title ? 28 : 8
  const layout = n >= 4 ? layout4(theme, titleH)
               : n === 3 ? layout3(theme, titleH)
               :           layout2(theme, titleH)
  const { W, H, R, centres, labelOff, colors } = layout

  const parts: string[] = []

  // Circles
  centres.forEach((c, i) => {
    parts.push(`<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${R}" fill="${colors[i % colors.length]}28" stroke="${colors[i % colors.length]}88" stroke-width="1.5"/>`)
  })

  // Circle labels (+ first 2 children inline)
  circles.forEach((item, i) => {
    const c = centres[i]
    const lx = c.x + labelOff[i][0]
    const ly = c.y + labelOff[i][1]
    const labelFontSize = n === 2 ? 13 : (n === 3 ? 12 : 11)
    const labelMax      = n === 2 ? 14 : (n === 3 ? 13 : 12)
    parts.push(`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="${labelFontSize}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, labelMax)}</text>`)
    const maxChildren = n === 2 ? 4 : 2
    item.children.slice(0, maxChildren).forEach((ch, j) => {
      const childY = ly + (n === 2 ? 12 + j * 16 : 14 + j * 13)
      const fs     = n === 2 ? 10 : 8.5
      parts.push(`<text x="${lx.toFixed(1)}" y="${childY.toFixed(1)}" text-anchor="middle" font-size="${fs}" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(ch.label, n === 2 ? 13 : 10)}</text>`)
    })
  })

  // Intersections — partial ones get spread outward so they don't pile up
  // on the central all-circles label. 2-circle layout has no centre conflict
  // (only one possible intersection), so spread=1.
  const allCentre = {
    x: centres.reduce((s, c) => s + c.x, 0) / centres.length,
    y: centres.reduce((s, c) => s + c.y, 0) / centres.length,
  }
  const spread = n === 2 ? 1 : (n === 3 ? 2.0 : 1.6)
  intersects.forEach(ix => {
    const names = intersectionNames(ix.label)
    const pos   = intersectionPos(names, circles, centres, allCentre, spread)
    // Display text strips the separator-name list and shows just the value
    // (if user wrote `A && B: caption`) or a clean "A ∩ B" form otherwise.
    const display = ix.value ?? names.join(' ∩ ')
    const lines   = wrapIx(display, 12)
    const lineH   = n === 2 ? 13 : 11
    const startY  = pos.y - (lines.length - 1) * lineH / 2 + (n === 2 ? -4 : 3)
    const fs      = n === 2 ? 11 : 9
    const fw      = n === 2 ? '500' : '600'
    lines.forEach((line, li) => {
      parts.push(`<text x="${pos.x.toFixed(1)}" y="${(startY + li * lineH).toFixed(1)}" text-anchor="middle" font-size="${fs}" fill="${theme.accent}" font-family="system-ui,sans-serif" font-weight="${fw}">${escapeXml(line)}</text>`)
    })
  })

  return svg(W, H, theme, spec.title, parts)
}
