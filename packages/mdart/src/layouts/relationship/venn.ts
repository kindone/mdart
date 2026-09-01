import type { MdArtSpec, MdArtItem } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, truncate, wrapLabel, aWrap, itemTitleTag, ellipsisIfDropped, shouldAnimate, seqSpotlightCSS, FONT_SANS_ATTR } from '../shared'

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

function svg(W: number, H: number, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
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
 *
 * `spread` takes separate x/y multipliers (not one scalar) because layout4's
 * grid is anisotropic (dx ≠ dy): a uniform multiplier pushes horizontal
 * pairs (left/right) farther in absolute px than vertical pairs (top/bottom)
 * for the same visual "spread", since it's applied to a shorter mid-centre
 * vector on the y axis. Axis-aligned pairs only move along one axis anyway
 * (their other mid-centre component is already 0), so this only changes
 * magnitude, never introduces drift on the zero axis.
 */
function intersectionPos(
  names: string[],
  circles: MdArtItem[],
  centres: { x: number; y: number }[],
  allCentre: { x: number; y: number },
  spread: { x: number; y: number },
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
    x: allCentre.x + (mid.x - allCentre.x) * spread.x,
    y: allCentre.y + (mid.y - allCentre.y) * spread.y,
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
  // R/off tuned for deeper lens overlap (was R=105/off=62, ~43px overlap
  // depth) so pairwise/triple intersection labels have more physical room
  // — see renderIntersectionLabels' charLimit for the matching text budget.
  const R = 115, off = 58
  return {
    W, H, R,
    centres: [
      { x: W / 2 - off, y: cy - off * 0.65 },
      { x: W / 2 + off, y: cy - off * 0.65 },
      { x: W / 2,       y: cy + off * 0.9 },
    ],
    labelOff: [[-R * 0.48, -R * 0.55], [R * 0.48, -R * 0.55], [0, R * 0.6]],
    colors: [theme.primary, theme.secondary, theme.accent],
  }
}

function layout4(theme: MdArtTheme, titleH: number): Layout {
  const W = 560, H = 380 + titleH
  const cx = W / 2, cy = titleH + (H - titleH) / 2
  // Deeper overlap (was R=105/dx=60/dy=44) to match the wider intersection
  // text budget below.
  const R = 112, dx = 52, dy = 40
  return {
    W, H, R,
    centres: [
      { x: cx - dx, y: cy - dy }, { x: cx + dx, y: cy - dy },
      { x: cx - dx, y: cy + dy }, { x: cx + dx, y: cy + dy },
    ],
    labelOff: [
      [-R * 0.48, -R * 0.44], [R * 0.48, -R * 0.44],
      [-R * 0.48,  R * 0.44], [R * 0.48,  R * 0.44],
    ],
    colors: [theme.primary, theme.secondary, theme.accent, theme.primary],
  }
}

function renderNoItems(theme: MdArtTheme): string {
  return `<svg viewBox="0 0 300 80" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  <text x="150" y="42" text-anchor="middle" font-size="12" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>No items</text>
</svg>`
}

function resolveLayout(n: number, theme: MdArtTheme, titleH: number): Layout {
  return n >= 4 ? layout4(theme, titleH)
    : n === 3 ? layout3(theme, titleH)
    : layout2(theme, titleH)
}

function renderCircleShapes(circles: MdArtItem[], layout: Layout, animate: boolean): string[] {
  return layout.centres.map((c, i) => {
    const item = circles[i]
    return `<circle class="${animate ? `mdart-n${i}` : ''}" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${layout.R}" fill="${layout.colors[i % layout.colors.length]}28" stroke="${layout.colors[i % layout.colors.length]}88" stroke-width="1.5">${item ? itemTitleTag(item) : ''}</circle>`
  })
}

function renderCircleLabels(circles: MdArtItem[], layout: Layout, n: number, animate: boolean, theme: MdArtTheme): string[] {
  const parts: string[] = []
  circles.forEach((item, i) => {
    const c = layout.centres[i]
    const lx = c.x + layout.labelOff[i][0]
    const labelFontSize = n === 2 ? 13 : (n === 3 ? 12 : 11)
    const labelMax = n === 2 ? 14 : (n === 3 ? 13 : 12)
    const labelStr = ellipsisIfDropped(item.label, item)
    const { lines, truncated, url } = wrapLabel(labelStr, labelMax)
    const lineH = labelFontSize + 2

    const maxChildren = n === 2 ? 4 : 2
    const childGap = n === 2 ? 12 : 14
    const childSpacing = n === 2 ? 16 : 13
    const childFs = n === 2 ? 10 : 8.5
    const childCount = Math.min(item.children.length, maxChildren)

    // `labelOff[i][1]` is the target vertical *centre* for the whole
    // label+children block, not an anchor for the title's own baseline —
    // otherwise a title that wraps to more lines, or has more children,
    // just grows downward from a fixed point and drifts below the circle's
    // visually balanced position. So: work out the full block's height
    // first (title lines + optional children run), then derive the title's
    // baseline (`ly`) by centring that whole span on the target.
    const titleSpanH = (lines.length - 1) * lineH + labelFontSize
    const childrenSpanH = childCount > 0 ? childGap + (childCount - 1) * childSpacing + childFs : 0
    const blockH = titleSpanH + childrenSpanH
    const targetCenter = c.y + layout.labelOff[i][1]
    const ly = targetCenter - blockH / 2 + labelFontSize * 0.75

    const tip = truncated ? `<title>${escapeXml(item.label)}</title>` : ''
    const tspans = lines
      .map((line, lineIndex) => `<tspan x="${lx.toFixed(1)}" dy="${lineIndex === 0 ? 0 : lineH}">${escapeXml(line)}</tspan>`)
      .join('')
    parts.push(aWrap(`<text class="${animate ? `mdart-n${i}` : ''}" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="${labelFontSize}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${tip}${tspans}</text>`, url))

    const childBaseY = ly + (lines.length - 1) * lineH + childGap
    item.children.slice(0, maxChildren).forEach((ch, j) => {
      const max = n === 2 ? 18 : 10
      const trunc = truncate(ch.label, max)
      const childTip = trunc !== ch.label ? `<title>${escapeXml(ch.label)}</title>` : ''
      parts.push(`<text class="${animate ? `mdart-n${i}` : ''}" x="${lx.toFixed(1)}" y="${(childBaseY + j * childSpacing).toFixed(1)}" text-anchor="middle" font-size="${childFs}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${childTip}${escapeXml(trunc)}</text>`)
    })
  })
  return parts
}

function allCircleCentre(centres: { x: number; y: number }[]): { x: number; y: number } {
  return {
    x: centres.reduce((s, c) => s + c.x, 0) / centres.length,
    y: centres.reduce((s, c) => s + c.y, 0) / centres.length,
  }
}

function intersectionPrimary(ix: MdArtItem, names: string[]): { primary: string, children: MdArtItem[] } {
  const primary = ix.value ?? (ix.children.length > 0 ? ix.children[0].label : names.join(' ∩ '))
  const children = (ix.value || ix.children.length === 0) ? ix.children : ix.children.slice(1)
  return { primary, children }
}

function renderIntersectionChildren(children: MdArtItem[], x: number, y: number, lineCount: number, lineH: number, n: number, animate: boolean, classIndex: number, theme: MdArtTheme): string[] {
  const maxChildren = n === 2 ? 3 : 2
  const fs = 8
  const childLineH = 11
  const charLimit = n === 2 ? 14 : 11
  const baseY = y + (lineCount - 1) * lineH + (n === 2 ? 10 : 7) + fs
  return children.slice(0, maxChildren).map((ch, index) => {
    const trunc = truncate(ch.label, charLimit)
    const tip = trunc !== ch.label ? `<title>${escapeXml(ch.label)}</title>` : ''
    return `<text class="${animate ? `mdart-n${classIndex}` : ''}" x="${x.toFixed(1)}" y="${(baseY + index * childLineH).toFixed(1)}" text-anchor="middle" font-size="${fs}" fill="${theme.accent}" opacity="0.75" ${FONT_SANS_ATTR}>${tip}${escapeXml(trunc)}</text>`
  })
}

function renderIntersectionLabels(intersects: MdArtItem[], circles: MdArtItem[], layout: Layout, n: number, animate: boolean, theme: MdArtTheme): string[] {
  const parts: string[] = []
  const centre = allCircleCentre(layout.centres)
  // Pushes pairwise labels away from the all-circle centroid so they land
  // in the "pure pairwise" part of the lens, clear of the triple-overlap
  // zone. Tuned against layout3/layout4's current R/off — if those change,
  // re-check the pairwise label lands before the lens tip (zero-width) and
  // past the other circles' encroachment boundary, not just re-tune blindly.
  //
  // n===4 uses separate x/y multipliers because layout4's grid is
  // anisotropic (dx=52 > dy=40): the same scalar spread pushes left/right
  // pairs (whose mid-centre vector runs along the longer dx axis) farther
  // in absolute px than top/bottom pairs (along the shorter dy axis). The
  // y multiplier is boosted more to compensate.
  const spread = n === 2 ? { x: 1, y: 1 }
    : n === 3 ? { x: 2.5, y: 2.5 }
    : { x: 2.0, y: 2.3 }
  intersects.forEach((ix, i) => {
    const names = intersectionNames(ix.label)
    const pos = intersectionPos(names, circles, layout.centres, centre, spread)
    const lineH = n === 2 ? 13 : 12
    const fs = n === 2 ? 11 : 9.5
    const fw = n === 2 ? '500' : '600'
    const classIndex = n + i
    const { primary, children } = intersectionPrimary(ix, names)
    const charLimit = n === 2 ? 14 : 13
    const { lines, truncated } = wrapLabel(primary, charLimit, 3)
    const startY = pos.y - (lines.length - 1) * lineH / 2 + (n === 2 ? -4 : 3)
    const tip = truncated ? `<title>${escapeXml(primary)}</title>` : ''
    const tspans = lines
      .map((line, lineIndex) => `<tspan x="${pos.x.toFixed(1)}" dy="${lineIndex === 0 ? 0 : lineH}">${escapeXml(line)}</tspan>`)
      .join('')
    parts.push(`<text class="${animate ? `mdart-n${classIndex}` : ''}" x="${pos.x.toFixed(1)}" y="${startY.toFixed(1)}" text-anchor="middle" font-size="${fs}" fill="${theme.accent}" ${FONT_SANS_ATTR} font-weight="${fw}">${tip}${tspans}</text>`)
    parts.push(...renderIntersectionChildren(children, pos.x, startY, lines.length, lineH, n, animate, classIndex, theme))
  })
  return parts
}

// ── Main entry ──────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const all        = spec.items
  const circles    = all.filter(i => !i.isIntersection).slice(0, 4)
  const intersects = all.filter(i => i.isIntersection)
  const n          = circles.length

  if (n === 0) {
    return renderNoItems(theme)
  }

  const titleH = spec.title ? 28 : 8
  const layout = resolveLayout(n, theme, titleH)
  const { W, H } = layout

  const parts: string[] = []
  const animate = shouldAnimate(spec)

  parts.push(...renderCircleShapes(circles, layout, animate))
  parts.push(...renderCircleLabels(circles, layout, n, animate, theme))
  parts.push(...renderIntersectionLabels(intersects, circles, layout, n, animate, theme))

  if (animate) parts.unshift(seqSpotlightCSS(n + intersects.length, spec, { scale: false }))
  return svg(W, H, theme, spec.title, parts)
}
