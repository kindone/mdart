import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, aWrap, itemTitleTag, ellipsisIfDropped, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared } from '../shared'
import { countLeaves, maxDepth } from './shared'

// ── Node geometry ─────────────────────────────────────────────────────────────

const ROW_H  = 56   // vertical space per leaf node (must exceed NODE_H to guarantee gap)
const COL_W  = 150  // horizontal space per depth level
const NODE_W = 120  // node rectangle width
const NODE_H = 44   // node rectangle height — gap = ROW_H − NODE_H = 12 px
const FS_MAX = 10.5
const FS_MIN = 8

// ── Renderer ─────────────────────────────────────────────────────────────────

/** Collect every item's ellipsis-adjusted label in the same pre-order
 *  traversal layoutH() below walks, so results line up index-for-index. */
function collectLabelsH(items: MdArtItem[]): string[] {
  const out: string[] = []
  for (const item of items) {
    out.push(ellipsisIfDropped(item.label, item))
    if (item.children.length) out.push(...collectLabelsH(item.children))
  }
  return out
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)

  const depth       = maxDepth(spec.items)
  const totalLeaves = spec.items.reduce((s, i) => s + countLeaves(i), 0) || 1
  const TITLE_H     = spec.title ? 28 : 8
  const W           = depth * COL_W + NODE_W + 20
  const H           = Math.max(100, totalLeaves * ROW_H + TITLE_H + 20)

  // Per-node fitting: every node shares NODE_W/NODE_H (row-spacing math
  // above depends on fixed box size), but each label is sized independently
  // rather than to the diagram's worst-case label — a short label stays
  // large instead of being dragged down to match a long neighbor several
  // levels away, same approach as org-chart.ts/process.ts.
  //
  // The fit was also capped at a flat maxLines: 3 with no boxH — so a
  // smaller font never unlocked a 4th line even though NODE_H has room for
  // it at a small enough size, it just kept shrinking 3 lines down to the
  // floor before truncating.
  //
  // 4 lines at the font floor (8) need ~4×(8×1.3)=41.6px — a plain "NODE_H
  // minus a fixed padding" (44−6=38) lands just under that, so the 4-line
  // ceiling below would silently never be reachable (same bug caught in
  // circular-process.ts's value fit and decision-tree.ts's leaf fit).
  // Guarantee at least that floor-line-count's worth of room.
  const hBoxH = Math.max(NODE_H - 6, 8 * 1.3 * 4)
  const nodeFits = collectLabelsH(spec.items).map(label =>
    fitTextToWidthShared([label], NODE_W - 8, { maxSize: FS_MAX, minSize: FS_MIN, maxLines: 4, boxH: hBoxH }),
  )

  interface HNode {
    label:    string
    value?:   string
    attrs?:   string[]
    lines:    string[]
    truncated: boolean
    url:      string | null
    fontSize: number
    lineHeight: number
    x:        number
    y:        number
    parentX?: number
    parentY?: number
  }
  const hnodes: HNode[] = []

  let fitIdx = 0
  function layoutH(items: MdArtItem[], level: number, leafStart: number, totalH: number, px?: number, py?: number) {
    const tot  = items.reduce((s, i) => s + countLeaves(i), 0) || 1
    let leafY  = leafStart
    for (const item of items) {
      const leaves = countLeaves(item)
      const span   = (leaves / tot) * totalH
      const ny     = leafY + span / 2
      const nx     = 10 + level * COL_W + NODE_W / 2
      const { fontSize, lineHeight, results: [{ lines, truncated, url }] } = nodeFits[fitIdx++]
      hnodes.push({ label: item.label, value: item.value, attrs: item.attrs, lines, truncated, url, fontSize, lineHeight, x: nx, y: ny, parentX: px, parentY: py })
      layoutH(item.children, level + 1, leafY, span, nx + NODE_W / 2, ny)
      leafY += span
    }
  }
  layoutH(spec.items, 0, TITLE_H + 10, H - TITLE_H - 20)

  const parts: string[] = []

  for (const [i, n] of hnodes.entries()) {
    const unit: string[] = []
    if (n.parentX !== undefined && n.parentY !== undefined) {
      const mid = (n.parentX + n.x - NODE_W / 2) / 2
      unit.push(`<path d="M${n.parentX.toFixed(1)},${n.parentY.toFixed(1)} H${mid.toFixed(1)} V${n.y.toFixed(1)} H${(n.x - NODE_W / 2).toFixed(1)}" fill="none" stroke="${theme.border}" stroke-width="1.5"/>`)
    }

    const bx = n.x - NODE_W / 2
    const by = n.y - NODE_H / 2
    // Full-item summary tooltip — surfaces label + value + attrs even when
    // only the label is rendered visibly. Replaces the older truncation-only
    // tip so value/attrs aren't silently lost.
    const itemTip = itemTitleTag({ label: n.label, value: n.value, attrs: n.attrs })
    unit.push(`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${NODE_W}" height="${NODE_H}" rx="5" fill="${theme.surface}" stroke="${theme.accent}88" stroke-width="1.2">${itemTip}</rect>`)

    // Multi-line label centred in node
    const textBlockH = n.lines.length * n.lineHeight
    const startY     = n.y - textBlockH / 2 + n.fontSize * 0.75
    const spans      = n.lines
      .map((l, li) => `<tspan x="${n.x.toFixed(1)}" dy="${li === 0 ? 0 : n.lineHeight}">${escapeXml(l)}</tspan>`)
      .join('')
    unit.push(aWrap(`<text x="${n.x.toFixed(1)}" y="${startY.toFixed(1)}" text-anchor="middle" font-size="${n.fontSize}" fill="${theme.text}" font-family="system-ui,sans-serif">${itemTip}${spans}</text>`, n.url))
    parts.push(animate ? `<g class="mdart-n${i}">${unit.join('')}</g>` : unit.join(''))
  }
  if (animate) parts.unshift(seqSpotlightCSS(hnodes.length, spec, { scale: false }))

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${spec.title ? `<text x="${(W / 2).toFixed(1)}" y="18" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(spec.title)}</text>` : ''}
  ${parts.join('\n  ')}
</svg>`
}

function renderEmpty(theme: MdArtTheme): string {
  return `<svg viewBox="0 0 300 80" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  <text x="150" y="42" text-anchor="middle" font-size="12" fill="${theme.textMuted}" font-family="system-ui,sans-serif">No items</text>
</svg>`
}
