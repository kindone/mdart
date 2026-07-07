import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared } from '../shared'
import { countLeaves, maxDepth, layoutNodes, flatNodes } from './shared'
import type { RenderedNode } from './shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const depth = maxDepth(spec.items)
  // Width now scales with leaf count (matching tree.ts/org-chart.ts) instead
  // of a flat 640 regardless of content — a small 2-3-leaf decision tree was
  // otherwise stuck with the same full-width canvas as a 10-leaf one, making
  // it look disproportionately flat/wide for what little it actually draws.
  const totalLeaves = spec.items.reduce((s, i) => s + countLeaves(i), 0) || 1
  const LW = 90, LH = 26
  const W = Math.max(640, totalLeaves * 130 + 80)
  const levelH = 80
  const TITLE_H = spec.title ? 28 : 10
  const H = Math.max(160, depth * levelH + TITLE_H + 40)
  const DW = 54, DH = 18
  const startY = TITLE_H + DH
  const HPAD = LW / 2 + 4

  const nodes = layoutNodes(spec.items, HPAD, startY, W - HPAD * 2, levelH)
  const flat = flatNodes(nodes)

  // Per-node fitting: decision diamonds all share one width (DW), leaf
  // rects all share another (LW), so — same as process.ts/circular-
  // process.ts — each node's label is sized to ITS OWN worst-fitting need
  // rather than the whole group's, replacing the old flat "10 chars" /
  // "13 chars" truncation that had no relationship to the actual box width
  // at all.
  //
  // Diamonds stay single-line: the shape tapers to a point at top/bottom,
  // so a 2nd line positioned off-center would run past the diamond's
  // narrower silhouette there — width-only fitting (shrink-to-fit) is the
  // safe option for that shape. Leaf rects are a plain box, so they get the
  // usual boxH treatment: the label was capped at a flat maxLines: 1 with
  // no vertical-budget check, so a smaller font never unlocked a 2nd line,
  // it just kept shrinking to the floor before truncating.
  const decisionNodes = flat.filter(n => n.children.length > 0)
  const leafNodes = flat.filter(n => n.children.length === 0)
  const decisionDisplays = decisionNodes.map(n => displayLabel(n))
  const leafDisplays = leafNodes.map(n => displayLabel(n))
  // 2 lines at the leaf's own font floor (8) need ~2×(8×1.3)=20.8px — a
  // plain "LH minus a fixed padding" (26−6=20) can land just under that
  // threshold and silently never wrap no matter how long the label is,
  // since the effective per-size line cap floors at 1 before minSize is
  // ever reached (same bug caught in circular-process.ts's value fit).
  // Guarantee at least that floor-line-pair's worth of room.
  const leafBoxH = Math.max(LH - 6, 8 * 1.3 * 2)
  const decisionFits = decisionDisplays.map(d =>
    fitTextToWidthShared([d.display], DW * 2 - 30, { maxSize: 9.5, minSize: 7, maxLines: 1 }),
  )
  const leafFits = leafDisplays.map(d =>
    fitTextToWidthShared([d.display], LW - 16, { maxSize: 10, minSize: 8, maxLines: 2, boxH: leafBoxH }),
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
        unit.push(`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="9" fill="${lcolor}" font-family="system-ui,sans-serif" font-weight="700">${lbl}</text>`)
      }
    }
    const { x, y } = n
    const itemTip = itemTitleTag(n)
    if (n.children.length > 0) {
      const { url: ndUrl, fontSize: decisionFS, lines } = decisionFitByNode.get(n)!
      unit.push(`<polygon points="${x},${(y-DH).toFixed(1)} ${(x+DW).toFixed(1)},${y} ${x},${(y+DH).toFixed(1)} ${(x-DW).toFixed(1)},${y}" fill="${theme.surface}" stroke="${theme.primary}aa" stroke-width="1.5">${itemTip}</polygon>`)
      unit.push(aWrap(`<text x="${x}" y="${(y+4).toFixed(1)}" text-anchor="middle" font-size="${decisionFS}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${itemTip}${escapeXml(lines[0])}</text>`, ndUrl))
    } else {
      const { url: ndUrl, fontSize: leafFS, lineHeight: leafLH, lines, truncated } = leafFitByNode.get(n)!
      const bx = x - LW / 2, by = y - LH / 2
      unit.push(`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${LW}" height="${LH}" rx="5" fill="${theme.surface}" stroke="${theme.accent}88" stroke-width="1.2">${itemTip}</rect>`)
      const textBlockH = lines.length * leafLH
      const startY = y - textBlockH / 2 + leafLH - 2
      const fullTip = truncated ? `<title>${escapeXml(n.label)}</title>` : ''
      const spans = lines
        .map((l, li) => `<tspan x="${x.toFixed(1)}" dy="${li === 0 ? 0 : leafLH}">${escapeXml(l)}</tspan>`)
        .join('')
      unit.push(aWrap(`<text x="${x.toFixed(1)}" y="${startY.toFixed(1)}" text-anchor="middle" font-size="${leafFS}" fill="${theme.text}" font-family="system-ui,sans-serif">${itemTip}${fullTip}${spans}</text>`, ndUrl))
    }
    parts.push(animate ? `<g class="mdart-n${i}">${unit.join('')}</g>` : unit.join(''))
  }
  if (animate) parts.unshift(seqSpotlightCSS(flat.length, spec, { scale: false }))

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${spec.title ? `<text x="${W/2}" y="18" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(spec.title)}</text>` : ''}
  ${parts.join('\n  ')}
</svg>`
}

function renderEmpty(theme: MdArtTheme): string {
  return `<svg viewBox="0 0 300 80" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  <text x="150" y="42" text-anchor="middle" font-size="12" fill="${theme.textMuted}" font-family="system-ui,sans-serif">No items</text>
</svg>`
}
