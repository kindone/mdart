import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'
import { countLeaves, maxDepth, layoutNodes, flatNodes } from './shared'
import type { RenderedNode } from './shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const depth = maxDepth(spec.items)
  // Width now scales with leaf count (matching tree.ts/org-chart.ts) instead
  // of a flat 640 regardless of content — a small 2-3-leaf decision tree was
  // otherwise stuck with the same full-width canvas as a 10-leaf one, making
  // it look disproportionately flat/wide for what little it actually draws.
  const totalLeaves = spec.items.reduce((s, i) => s + countLeaves(i), 0) || 1
  const LW = 90, LH = 60
  const W = Math.max(640, totalLeaves * 130 + 80)
  const levelH = 120
  const TITLE_H = spec.title ? 28 : 10
  const H = Math.max(240, depth * levelH + TITLE_H + 40)
  const DW = 60, DH = 36
  const startY = TITLE_H + DH
  // HPAD must clear both leaf half-width (LW/2) and diamond half-width (DW)
  // — whichever is larger — so neither clips the SVG edge.
  const HPAD = Math.max(LW / 2 + 4, DW + 8)

  const nodes = layoutNodes(spec.items, HPAD, startY, W - HPAD * 2, levelH)
  const flat = flatNodes(nodes)

  // Per-node fitting: decision diamonds all share one width (DW), leaf
  // rects all share another (LW), so — same as process.ts/circular-
  // process.ts — each node's label is sized to ITS OWN worst-fitting need
  // rather than the whole group's, replacing the old flat "10 chars" /
  // "13 chars" truncation that had no relationship to the actual box width
  // at all.
  //
  // Diamonds allow 2 lines: the shape tapers toward its top/bottom tips, so
  // the text budget is derived from the available width at the extreme line
  // positions of a 2-line block (see comment below), not the full DW×2. Leaf
  // rects are a plain box and get 3 lines; the old code capped at 1 line with
  // no boxH, so a smaller font never unlocked a 2nd line — it just shrank
  // to the floor and truncated.
  const decisionNodes = flat.filter(n => n.children.length > 0)
  const leafNodes = flat.filter(n => n.children.length === 0)
  const decisionDisplays = decisionNodes.map(n => displayLabel(n))
  const leafDisplays = leafNodes.map(n => displayLabel(n))
  // Diamond text budget (DW*2 - 42 = 78px) is derived from the available
  // width at the extreme line positions of a 2-line block at maxSize=10:
  //   half_width = DW × (1 − v/DH) where v = half_visual_height ≈ 11.5px
  //   = 60 × (1 − 11.5/36) ≈ 40.8px → full ≈ 81.6px → budget 78px (3.6px margin)
  // With LH=60, leafBoxH=52 fits 3 lines even at maxSize=11:
  //   linesAtSize = ⌊52 / (11×1.3)⌋ = ⌊52/14.3⌋ = 3 → long labels wrap at full size.
  const leafBoxH = Math.max(LH - 8, 8 * 1.3 * 3)
  const decisionFits = decisionDisplays.map(d =>
    fitTextToWidthShared([d.display], DW * 2 - 42, { maxSize: 10, minSize: 7, maxLines: 2, boxH: DH * 1.7 }),
  )
  const leafFits = leafDisplays.map(d =>
    fitTextToWidthShared([d.display], LW - 16, { maxSize: 11, minSize: 8, maxLines: 3, boxH: leafBoxH }),
  )
  const decisionFitByNode = new Map<RenderedNode, { url: string | null; fontSize: number; lineHeight: number; lines: string[]; truncated: boolean }>(
    decisionNodes.map((n, idx) => {
      const { fontSize, lineHeight, results: [{ lines, truncated }] } = decisionFits[idx]
      return [n, { url: decisionDisplays[idx].url, fontSize, lineHeight, lines, truncated }]
    }),
  )
  const leafFitByNode = new Map<RenderedNode, { url: string | null; fontSize: number; lineHeight: number; lines: string[]; truncated: boolean }>(
    leafNodes.map((n, idx) => {
      const { fontSize, lineHeight, results: [{ lines, truncated }] } = leafFits[idx]
      return [n, { url: leafDisplays[idx].url, fontSize, lineHeight, lines, truncated }]
    }),
  )

  const parts: string[] = []

  for (const [i, n] of flat.entries()) {
    const unit: string[] = []
    if (n.parentX !== undefined && n.parentY !== undefined) {
      const isLeaf = n.children.length === 0
      const x1 = n.parentX, y1 = n.parentY + DH
      const x2 = n.x,       y2 = isLeaf ? n.y - LH / 2 : n.y - DH
      const mid = (y1 + y2) / 2
      unit.push(`<path d="M${x1.toFixed(1)},${y1.toFixed(1)} C${x1.toFixed(1)},${mid.toFixed(1)} ${x2.toFixed(1)},${mid.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${theme.textMuted}cc" stroke-width="1.5"/>`)
      const siblings = n.parentX !== undefined ? flat.filter(s => s.parentX === n.parentX && s.parentY === n.parentY) : []
      if (siblings.length === 2) {
        const isFirst = siblings[0] === n
        const lx = (x1 + x2) / 2 + (isFirst ? -18 : 12)
        const ly = (y1 + y2) / 2
        const lbl = isFirst ? 'Yes' : 'No'
        const lcolor = isFirst ? theme.primary : theme.secondary
        unit.push(`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="9" fill="${lcolor}" ${FONT_SANS_ATTR} font-weight="700">${lbl}</text>`)
      }
    }
    const { x, y } = n
    const itemTip = itemTitleTag(n)
    if (n.children.length > 0) {
      const { url: ndUrl, fontSize: decisionFS, lineHeight: decisionLH, lines: decLines, truncated: decTruncated } = decisionFitByNode.get(n)!
      unit.push(`<polygon points="${x},${(y-DH).toFixed(1)} ${(x+DW).toFixed(1)},${y} ${x},${(y+DH).toFixed(1)} ${(x-DW).toFixed(1)},${y}" fill="${theme.surface}" stroke="${theme.primary}aa" stroke-width="1.5">${itemTip}</polygon>`)
      // Multi-line block vertically centred on the diamond's midpoint (y).
      const decStartY = y - ((decLines.length - 1) * decisionLH) / 2 + decisionFS * 0.35
      const decTip = decTruncated ? `<title>${escapeXml(n.label)}</title>` : ''
      const decSpans = decLines
        .map((l, li) => `<tspan x="${x}" dy="${li === 0 ? 0 : decisionLH.toFixed(1)}">${escapeXml(l)}</tspan>`)
        .join('')
      unit.push(aWrap(`<text x="${x}" y="${decStartY.toFixed(1)}" text-anchor="middle" font-size="${decisionFS}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${itemTip}${decTip}${decSpans}</text>`, ndUrl))
    } else {
      const { url: ndUrl, fontSize: leafFS, lineHeight: leafLH, lines, truncated } = leafFitByNode.get(n)!
      const bx = x - LW / 2, by = y - LH / 2
      unit.push(`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${LW}" height="${LH}" rx="5" fill="${theme.surface}" stroke="${theme.accent}88" stroke-width="1.2">${itemTip}</rect>`)
      // Use (n-1)×lh + fs for visual block height (cap-top to descender-bottom)
      // instead of n×lh which adds a trailing line-gap and shifts text upward.
      const startY = y - ((lines.length - 1) * leafLH) / 2 + leafFS * 0.35
      const fullTip = truncated ? `<title>${escapeXml(n.label)}</title>` : ''
      const spans = lines
        .map((l, li) => `<tspan x="${x.toFixed(1)}" dy="${li === 0 ? 0 : leafLH.toFixed(1)}">${escapeXml(l)}</tspan>`)
        .join('')
      unit.push(aWrap(`<text x="${x.toFixed(1)}" y="${startY.toFixed(1)}" text-anchor="middle" font-size="${leafFS}" fill="${theme.text}" ${FONT_SANS_ATTR}>${itemTip}${fullTip}${spans}</text>`, ndUrl))
    }
    parts.push(wrapItem(unit.join(''), i, animate, instrument))
  }
  if (animate) parts.unshift(seqSpotlightCSS(flat.length, spec, { scale: false }))

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${spec.title ? `<text x="${W/2}" y="18" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(spec.title)}</text>` : ''}
  ${parts.join('\n  ')}
</svg>`
}

function renderEmpty(theme: MdArtTheme): string {
  return `<svg viewBox="0 0 300 80" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  <text x="150" y="42" text-anchor="middle" font-size="12" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>No items</text>
</svg>`
}
