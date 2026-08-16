import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import {
  escapeXml, tt, renderEmpty, wrapItem,
  shouldAnimate, shouldInstrument, seqSpotlightCSS,
  FONT_SANS_ATTR, displayLabel, itemTitleTag,
} from '../shared'

// ── Constants ──────────────────────────────────────────────────────────────

const W            = 580
const TITLE_H_WITH = 30
const TITLE_H_NONE = 8

const PROC_W  = 140   // process rect full width
const PROC_H  = 44    // process rect full height
const PROC_RX = 6

const DIA_HW  = 80    // decision diamond half-width
const DIA_HH  = 46    // decision diamond half-height

const TERM_W  = 110   // terminal pill full width
const TERM_H  = 34    // terminal pill full height

const EDGE_CLEARANCE = 26  // min face-to-face gap between adjacent nodes
                            // = 2×ENTER_PAD + 20 px min visible arrow
                            // Gap between layers l and l+1: maxHH(l) + maxHH(l+1) + EDGE_CLEARANCE
const BRANCH_DX    = 166  // horizontal offset from trunk to right branch column
const BACK_ARC_X      = W - 18  // x of right-margin backward-edge arc  (= 562)
const BACK_ARC_LEFT_X = 18       // x of left-margin backward-edge arc
const ENTER_PAD    = 3    // gap between edge endpoint and node face
const HOP_R        = 5    // radius of crossing-hop arc on backward H1 segment

// Half-sizes keyed by node type (for edge anchor computation)
const HW: Record<NodeType, number> = { start: TERM_W/2, end: TERM_W/2, process: PROC_W/2, decision: DIA_HW }
const HH: Record<NodeType, number> = { start: TERM_H/2, end: TERM_H/2, process: PROC_H/2, decision: DIA_HH }

// ── Types ──────────────────────────────────────────────────────────────────

type NodeType = 'start' | 'end' | 'process' | 'decision'

interface FNode {
  id:      string
  type:    NodeType
  display: string
  url?:    string
  srcItem: MdArtItem
  layer:   number   // 0-based row index
  col:     number   // 0 = trunk centre, 1 = right branch, 2 = further right …
  x:       number   // pixel centre-x
  y:       number   // pixel centre-y
}

interface FEdge {
  from:     string
  to:       string
  label?:   string
  backward: boolean
}

type AdjEntry = { to: string; label?: string }
type Adj      = Map<string, AdjEntry[]>

// ── Graph construction ─────────────────────────────────────────────────────

function nodeType(item: MdArtItem): NodeType {
  const lc = item.label.toLowerCase()
  if (item.attrs.includes('start')    || lc === 'start') return 'start'
  if (item.attrs.includes('end')      || lc === 'end')   return 'end'
  if (item.attrs.includes('decision'))                    return 'decision'
  return 'process'
}

function buildAdj(spec: MdArtSpec): { adj: Adj; items: Map<string, MdArtItem> } {
  const adj  : Adj = new Map()
  const items: Map<string, MdArtItem> = new Map()

  for (const item of spec.items) {
    items.set(item.label, item)
    if (!adj.has(item.label)) adj.set(item.label, [])
    for (const child of item.flowChildren) {
      adj.get(item.label)!.push({ to: child.label, label: child.value })
      if (!adj.has(child.label)) adj.set(child.label, [])
      if (!items.has(child.label)) {
        // implicitly declared target node — treat as process
        items.set(child.label, { label: child.label, attrs: [], children: [], flowChildren: [] })
      }
    }
  }
  return { adj, items }
}

// ── Backward-edge detection (DFS gray-set) ─────────────────────────────────

function findBackward(startId: string, adj: Adj): Set<string> {
  const backward = new Set<string>()
  const state    = new Map<string, 'white' | 'gray' | 'black'>()
  for (const id of adj.keys()) state.set(id, 'white')

  const dfs = (id: string) => {
    state.set(id, 'gray')
    for (const { to } of adj.get(id) ?? []) {
      if (state.get(to) === 'gray')  backward.add(`${id}→${to}`)
      else if (state.get(to) === 'white') dfs(to)
    }
    state.set(id, 'black')
  }
  dfs(startId)
  return backward
}

// ── Layer assignment (Bellman-Ford relaxation, forward edges only) ─────────

function assignLayers(startId: string, adj: Adj, backward: Set<string>): Map<string, number> {
  const layers = new Map<string, number>([[startId, 0]])
  let changed = true
  while (changed) {
    changed = false
    for (const [from, edges] of adj) {
      const fl = layers.get(from) ?? 0
      for (const { to } of edges) {
        if (backward.has(`${from}→${to}`)) continue
        const cur = layers.get(to) ?? -1
        if (fl + 1 > cur) { layers.set(to, fl + 1); changed = true }
      }
    }
  }
  return layers
}

// ── Column assignment (BFS: first forward child = same col, rest = col+1) ──

function assignCols(startId: string, adj: Adj, backward: Set<string>): Map<string, number> {
  const cols    = new Map<string, number>([[startId, 0]])
  const visited = new Set([startId])
  const queue   = [startId]

  while (queue.length) {
    const id  = queue.shift()!
    const pc  = cols.get(id) ?? 0
    const fwd = (adj.get(id) ?? []).filter(e => !backward.has(`${id}→${e.to}`))
    fwd.forEach(({ to }, i) => {
      const newCol = i === 0 ? pc : pc + 1
      // First-visit wins: trunk beats branch because BFS reaches trunk nodes first.
      // Never override an already-assigned column — that would snap merge nodes back
      // to col=0 and cause downstream same-column edges to draw through other nodes.
      if (!cols.has(to)) cols.set(to, newCol)
      if (!visited.has(to)) { visited.add(to); queue.push(to) }
    })
  }
  return cols
}

// ── Full layout ────────────────────────────────────────────────────────────

interface FlowLayout {
  titleH: number
  nodes:  Map<string, FNode>
  edges:  FEdge[]
  height: number
}

function buildLayout(spec: MdArtSpec): FlowLayout {
  const titleH = spec.title ? TITLE_H_WITH : TITLE_H_NONE
  const { adj, items } = buildAdj(spec)
  if (items.size === 0) return { titleH, nodes: new Map(), edges: [], height: 80 }

  // Find start node
  let startId = ''
  for (const [id, item] of items) {
    if (item.attrs.includes('start') || item.label.toLowerCase() === 'start') { startId = id; break }
  }
  if (!startId) startId = spec.items[0]?.label ?? items.keys().next().value!

  const backward = findBackward(startId, adj)
  const layers   = assignLayers(startId, adj, backward)
  const cols     = assignCols(startId, adj, backward)

  // Ensure every node has layer + col (unreachable nodes fall back to 0)
  for (const id of items.keys()) {
    if (!layers.has(id)) layers.set(id, 0)
    if (!cols.has(id))   cols.set(id, 0)
  }

  // ── Adaptive per-layer y positions ───────────────────────────────────────
  // Gap between layers l and l+1 = maxHH(l) + maxHH(l+1) + EDGE_CLEARANCE.
  // This keeps process→process pairs compact (~70 px) while giving
  // decision→decision pairs the room they need (~118 px).
  const maxLayer = Math.max(...[...layers.values()], 0)
  const layerMaxHH = new Map<number, number>()
  for (const [id, item] of items) {
    const l  = layers.get(id) ?? 0
    const nh = HH[nodeType(item)]
    if ((layerMaxHH.get(l) ?? 0) < nh) layerMaxHH.set(l, nh)
  }
  const yOf = new Map<number, number>([[0, titleH + 30]])
  for (let l = 1; l <= maxLayer; l++) {
    const prev = yOf.get(l - 1)!
    const gap  = (layerMaxHH.get(l - 1) ?? PROC_H / 2)
               + (layerMaxHH.get(l)     ?? PROC_H / 2)
               + EDGE_CLEARANCE
    yOf.set(l, prev + gap)
  }

  // Centre all columns horizontally: shift cx so the span [0 … maxCol] is
  // symmetric around W/2.  For a single-column layout this leaves cx = W/2.
  const maxCol = cols.size > 0 ? Math.max(...cols.values()) : 0
  const cx     = W / 2 - maxCol * BRANCH_DX / 2
  const nodes = new Map<string, FNode>()
  for (const [id, item] of items) {
    const type   = nodeType(item)
    const layer  = layers.get(id)!
    const col    = cols.get(id)!
    const { display, url: urlRaw } = displayLabel(item, { value: false })
    nodes.set(id, {
      id, type, display, url: urlRaw ?? undefined, srcItem: item,
      layer, col,
      x: cx + col * BRANCH_DX,
      y: yOf.get(layer)!,
    })
  }

  const edges: FEdge[] = []
  for (const item of spec.items) {
    for (const child of item.flowChildren) {
      if (!items.has(child.label)) continue
      edges.push({
        from: item.label, to: child.label,
        label: child.value,
        backward: backward.has(`${item.label}→${child.label}`),
      })
    }
  }

  return {
    titleH, nodes, edges,
    height: yOf.get(maxLayer)! + (layerMaxHH.get(maxLayer) ?? PROC_H / 2) + 30,
  }
}

// ── Diamond edge-intersection helper ──────────────────────────────────────

/** Point on diamond boundary in unit direction (nx, ny) from centre (cx, cy). */
function diaEdge(cx: number, cy: number, nx: number, ny: number) {
  // |x/hw| + |y/hh| = 1 → t = 1 / (|nx|/hw + |ny|/hh)
  const denom = Math.abs(nx) / DIA_HW + Math.abs(ny) / DIA_HH
  const t = denom > 1e-9 ? 1 / denom : 0
  return { x: cx + nx * t, y: cy + ny * t }
}

// ── Node rendering ─────────────────────────────────────────────────────────

function renderDefs(theme: MdArtTheme): string {
  return `<defs>
    <marker id="fc-arr" markerWidth="7" markerHeight="7" refX="7" refY="3.5" orient="auto">
      <path d="M0,0 L7,3.5 L0,7 Z" fill="${theme.textMuted}cc"/>
    </marker>
  </defs>`
}

function renderTitle(title: string | undefined, theme: MdArtTheme): string {
  return title
    ? `<text x="${W/2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
}

/**
 * Split a diamond label into 1 or 2 lines.
 * Short labels (≤ MAX1 chars) stay on one line. Longer labels are split at the
 * space closest to the midpoint so both halves fit within the diamond face.
 */
function diamondLines(text: string): [string] | [string, string] {
  const MAX1 = 13  // max chars on a single centred line
  const MAX2 = 13  // max chars per line when wrapping
  if (text.length <= MAX1) return [text]
  const mid = Math.floor(text.length / 2)
  let bestIdx = -1, bestDist = Infinity
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ' ') {
      const d = Math.abs(i - mid)
      if (d < bestDist) { bestDist = d; bestIdx = i }
    }
  }
  if (bestIdx < 0) return [tt(text, MAX1)]  // no space — fall back to truncation
  return [tt(text.slice(0, bestIdx), MAX2), tt(text.slice(bestIdx + 1), MAX2)]
}

function renderNodeSvg(node: FNode, theme: MdArtTheme): string {
  const { x, y, type, display, srcItem } = node
  const title = itemTitleTag(srcItem)

  switch (type) {
    case 'start': {
      const hw = HW.start, hh = HH.start
      return [
        `<rect x="${(x-hw).toFixed(1)}" y="${(y-hh).toFixed(1)}" width="${(hw*2).toFixed(1)}" height="${(hh*2).toFixed(1)}" rx="${hh}" fill="${theme.accent}" stroke="${theme.accent}" stroke-width="1.5">${title}</rect>`,
        `<text x="${x.toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="600" fill="${theme.bg}" ${FONT_SANS_ATTR}>${tt(display, 16)}</text>`,
      ].join('')
    }
    case 'end': {
      const hw = HW.end, hh = HH.end
      return [
        `<rect x="${(x-hw).toFixed(1)}" y="${(y-hh).toFixed(1)}" width="${(hw*2).toFixed(1)}" height="${(hh*2).toFixed(1)}" rx="${hh}" fill="${theme.surface}" stroke="${theme.accent}" stroke-width="2">${title}</rect>`,
        `<rect x="${(x-hw+3).toFixed(1)}" y="${(y-hh+3).toFixed(1)}" width="${(hw*2-6).toFixed(1)}" height="${(hh*2-6).toFixed(1)}" rx="${hh-3}" fill="${theme.accent}33"/>`,
        `<text x="${x.toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="600" fill="${theme.text}" ${FONT_SANS_ATTR}>${tt(display, 16)}</text>`,
      ].join('')
    }
    case 'decision': {
      const pts   = `${x.toFixed(1)},${(y-DIA_HH).toFixed(1)} ${(x+DIA_HW).toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${(y+DIA_HH).toFixed(1)} ${(x-DIA_HW).toFixed(1)},${y.toFixed(1)}`
      const lines  = diamondLines(display)
      const LDY    = 7  // half-gap between two lines (px)
      const textSvg = lines.length === 1
        ? `<text x="${x.toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" ${FONT_SANS_ATTR}>${lines[0]}</text>`
        : [
            `<text x="${x.toFixed(1)}" y="${(y - LDY + 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" ${FONT_SANS_ATTR}>${lines[0]}</text>`,
            `<text x="${x.toFixed(1)}" y="${(y + LDY + 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" ${FONT_SANS_ATTR}>${lines[1]}</text>`,
          ].join('')
      return [
        `<polygon points="${pts}" fill="${theme.surface}" stroke="${theme.primary}99" stroke-width="1.5"><title>${escapeXml(display)}</title></polygon>`,
        textSvg,
      ].join('')
    }
    default: { // process
      const hw = HW.process, hh = HH.process
      return [
        `<rect x="${(x-hw).toFixed(1)}" y="${(y-hh).toFixed(1)}" width="${(hw*2).toFixed(1)}" height="${(hh*2).toFixed(1)}" rx="${PROC_RX}" fill="${theme.surface}" stroke="${theme.accent}88" stroke-width="1.5">${title}</rect>`,
        `<text x="${x.toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" ${FONT_SANS_ATTR}>${tt(display, 20)}</text>`,
      ].join('')
    }
  }
}

function renderNode(node: FNode, index: number, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  return wrapItem(renderNodeSvg(node, theme), index, animate, instrument)
}

// ── Crossing detection ─────────────────────────────────────────────────────

/**
 * For each backward arc, find every x position where its H1 (horizontal exit)
 * segment is crossed by the V segment of a forward branch edge (col → col+1).
 * Returns a map keyed by "from→to" edge id → sorted crossing x list.
 *
 * Only H1 is checked (the horizontal exit at sy). H2 (horizontal entry at dy)
 * is always above or below any forward V segment in valid flowchart layouts.
 */
function detectCrossings(edges: FEdge[], nodes: Map<string, FNode>): Map<string, number[]> {
  const result    = new Map<string, number[]>()
  const fwdBranch = edges.filter(e =>
    !e.backward && (nodes.get(e.from)?.col ?? 0) < (nodes.get(e.to)?.col ?? 0))
  const bwdEdges  = edges.filter(e => e.backward)

  for (const bwd of bwdEdges) {
    const bwdSrc = nodes.get(bwd.from); const bwdDst = nodes.get(bwd.to)
    if (!bwdSrc || !bwdDst) continue
    const sx    = bwdSrc.x + HW[bwdSrc.type] + ENTER_PAD
    const sy    = bwdSrc.y
    const dxBwd = bwdDst.x + HW[bwdDst.type] + ENTER_PAD
    const mx    = Math.max(BACK_ARC_X, sx + 20, dxBwd + 20)
    const h1End = mx - 10  // corner-arc R=10

    for (const fwd of fwdBranch) {
      const fwdSrc = nodes.get(fwd.from); const fwdDst = nodes.get(fwd.to)
      if (!fwdSrc || !fwdDst) continue
      // V segment of forward edge: x = fwdDst.x, y ∈ [fwdSrc.y, fwdDst.y - HH - pad]
      const vx  = fwdDst.x
      const vy1 = fwdSrc.y
      const vy2 = fwdDst.y - HH[fwdDst.type] - ENTER_PAD
      if (sx <= vx && vx <= h1End && vy1 <= sy && sy <= vy2) {
        const key = `${bwd.from}→${bwd.to}`
        const arr = result.get(key) ?? []
        arr.push(vx)
        result.set(key, arr)
      }
    }
  }
  for (const [k, xs] of result) result.set(k, xs.sort((a, b) => a - b))
  return result
}

/** Build the H1 path string, inserting upward hop arcs at each crossing x. */
function buildH1(sx: number, sy: number, endX: number, hopXs: number[]): string {
  if (!hopXs.length) return `H${endX.toFixed(1)}`
  const parts: string[] = []
  let cur = sx
  for (const cx of hopXs) {
    if (cx - HOP_R > cur) parts.push(`H${(cx - HOP_R).toFixed(1)}`)
    // sweep=1 → arc bends upward (y decreases) — visually bridges over the forward edge
    parts.push(`A${HOP_R},${HOP_R} 0 0,1 ${(cx + HOP_R).toFixed(1)},${sy.toFixed(1)}`)
    cur = cx + HOP_R
  }
  if (cur < endX) parts.push(`H${endX.toFixed(1)}`)
  return parts.join(' ')
}

// ── Edge rendering ─────────────────────────────────────────────────────────

function edgeLabelSvg(
  label: string | undefined, x: number, y: number,
  anchor: 'start' | 'middle' | 'end',
  theme: MdArtTheme,
): string {
  if (!label) return ''
  const w = Math.min(label.length * 5.5 + 8, 80)
  return [
    `<rect x="${(x - (anchor === 'middle' ? w/2 : anchor === 'end' ? w : 0)).toFixed(1)}" y="${(y-10).toFixed(1)}" width="${w.toFixed(1)}" height="12" rx="3" fill="${theme.surface}" opacity="0.85"/>`,
    `<text x="${x.toFixed(1)}" y="${(y).toFixed(1)}" font-size="9" fill="${theme.textMuted}" ${FONT_SANS_ATTR} text-anchor="${anchor}">${tt(label, 13)}</text>`,
  ].join('')
}

function renderEdge(
  edge: FEdge, nodes: Map<string, FNode>, theme: MdArtTheme,
  animate = false, nodeIndex?: Map<string, number>,
  hops?: Map<string, number[]>,
): string {
  const src = nodes.get(edge.from)
  const dst = nodes.get(edge.to)
  if (!src || !dst) return ''

  const stroke = `${theme.textMuted}bb`
  let d: string
  let lx: number, ly: number, la: 'start' | 'middle' | 'end' = 'middle'

  if (edge.backward) {
    // Rounded-corner rectangular arc — three segments joined by quadratic corners:
    //   ① horizontal exit  →  ② vertical margin run  →  ③ horizontal entry
    // When the destination is to the LEFT of the source (cross-column back-edge)
    // we route along the LEFT margin so the two right-margin arcs don't overlap.
    const R = 10
    if (dst.x < src.x) {
      // ── Left-margin arc: exit left face of src → up → enter left face of dst ──
      const sx = src.x - HW[src.type] - ENTER_PAD
      const sy = src.y
      const dx = dst.x - HW[dst.type] - ENTER_PAD
      const dy = dst.y
      // Swing ~50px past the destination's left face — matches right-arc visual weight
      const mx = Math.max(BACK_ARC_LEFT_X, dx - 50)
      d = [
        `M${sx.toFixed(1)},${sy.toFixed(1)}`,
        `H${(mx + R).toFixed(1)}`,
        `Q${mx},${sy.toFixed(1)} ${mx},${(sy - R).toFixed(1)}`,
        `V${(dy + R).toFixed(1)}`,
        `Q${mx},${dy.toFixed(1)} ${(mx + R).toFixed(1)},${dy.toFixed(1)}`,
        `H${dx.toFixed(1)}`,
      ].join(' ')
      lx = mx + 5; ly = (sy + dy) / 2; la = 'start'
    } else {
      // ── Right-margin arc: exit right face of src → up → enter right face of dst ──
      const sx = src.x + HW[src.type] + ENTER_PAD
      const sy = src.y
      const dx = dst.x + HW[dst.type] + ENTER_PAD
      const dy = dst.y
      const mx = Math.max(BACK_ARC_X, sx + 20, dx + 20)
      const hopXs = hops?.get(`${edge.from}→${edge.to}`) ?? []
      d = [
        `M${sx.toFixed(1)},${sy.toFixed(1)}`,
        buildH1(sx, sy, mx - R, hopXs),
        `Q${mx},${sy.toFixed(1)} ${mx},${(sy - R).toFixed(1)}`,
        `V${(dy + R).toFixed(1)}`,
        `Q${mx},${dy.toFixed(1)} ${(mx - R).toFixed(1)},${dy.toFixed(1)}`,
        `H${dx.toFixed(1)}`,
      ].join(' ')
      lx = mx - 5; ly = (sy + dy) / 2; la = 'end'
    }

  } else if (src.col === dst.col) {
    // Same column → straight vertical
    const p1y = src.y + HH[src.type] + ENTER_PAD
    const p2y = dst.y - HH[dst.type] - ENTER_PAD
    d  = `M${src.x.toFixed(1)},${p1y.toFixed(1)} L${dst.x.toFixed(1)},${p2y.toFixed(1)}`
    lx = src.x + 8; ly = (p1y + p2y) / 2; la = 'start'

  } else if (src.col < dst.col) {
    // Decision → right branch
    // Exit right side of diamond (or right of rect), elbow right then down into branch top
    const exit = src.type === 'decision'
      ? diaEdge(src.x, src.y, 1, 0)
      : { x: src.x + HW[src.type] + ENTER_PAD, y: src.y }
    const p2y = dst.y - HH[dst.type] - ENTER_PAD
    // Horizontal then vertical (last segment V → arrowhead points down ✓)
    d  = `M${exit.x.toFixed(1)},${exit.y.toFixed(1)} H${dst.x.toFixed(1)} V${p2y.toFixed(1)}`
    lx = (exit.x + dst.x) / 2; ly = exit.y - 10; la = 'middle'

  } else {
    // Branch → merge (higher col to lower col)
    // Cubic bezier: exit bottom of branch, curve down-left into top of merge
    const p1x = src.x, p1y = src.y + HH[src.type] + ENTER_PAD
    const p2x = dst.x, p2y = dst.y - HH[dst.type] - ENTER_PAD
    const ctrl_y = p2y - 22
    d  = `M${p1x.toFixed(1)},${p1y.toFixed(1)} C${p1x.toFixed(1)},${ctrl_y.toFixed(1)} ${p2x.toFixed(1)},${ctrl_y.toFixed(1)} ${p2x.toFixed(1)},${p2y.toFixed(1)}`
    lx = (p1x + p2x) / 2; ly = (p1y + p2y) / 2; la = 'middle'
  }

  const inner =
    `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="1.5" marker-end="url(#fc-arr)"/>` +
    edgeLabelSvg(edge.label, lx, ly, la, theme)

  if (animate && nodeIndex) {
    // Forward edges appear with the destination node (arrow "arrives" with its target).
    // Backward edges appear with the source node — the loop-back path is revealed
    // when the branching node is introduced, not when the already-visible target was.
    const slotId  = edge.backward ? edge.from : edge.to
    const slotIdx = nodeIndex.get(slotId) ?? 0
    return `<g class="mdart-arr-n${slotIdx}">${inner}</g>`
  }
  return inner
}

// ── Export ─────────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)

  const animate    = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layout     = buildLayout(spec)
  const { nodes, edges, height } = layout

  // Stable render order: lower layers first, then by col (for animation indexing)
  const nodeList = [...nodes.values()].sort((a, b) => a.layer - b.layer || a.col - b.col)
  // Map node id → its index in nodeList so edges can reference the destination slot
  const nodeIndex = new Map(nodeList.map((n, i) => [n.id, i]))
  // Pre-compute where backward arcs cross forward branch edges so we can draw hops
  const crossings = detectCrossings(edges, nodes)

  const parts: string[] = [
    renderDefs(theme),
    renderTitle(spec.title, theme),
    // Edges drawn first (below nodes)
    ...edges.map(e => renderEdge(e, nodes, theme, animate, nodeIndex, crossings)),
    // Nodes on top
    ...nodeList.map((n, i) => renderNode(n, i, theme, animate, instrument)),
  ]

  if (animate) parts.unshift(seqSpotlightCSS(nodeList.length, spec, { scale: false }))

  return `<svg viewBox="0 0 ${W} ${height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${parts.join('\n  ')}
</svg>`
}
