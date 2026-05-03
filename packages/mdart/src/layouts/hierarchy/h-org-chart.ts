import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel } from '../shared'
import { countLeaves, maxDepth } from './shared'

// ── Node geometry ─────────────────────────────────────────────────────────────

const ROW_H  = 44   // vertical space per leaf node
const COL_W  = 150  // horizontal space per depth level
const NODE_W = 120  // node rectangle width
const NODE_H = 36   // node rectangle height (tall enough for 2 lines)
const FS     = 10.5
const LH     = 13

// Max chars per line ≈ (NODE_W - 8px hpad) / avg px per char at 10.5px
const LABEL_MAX = Math.max(8, Math.floor((NODE_W - 8) / 5.5))  // ~20

// ── Renderer ─────────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)

  const depth       = maxDepth(spec.items)
  const totalLeaves = spec.items.reduce((s, i) => s + countLeaves(i), 0) || 1
  const TITLE_H     = spec.title ? 28 : 8
  const W           = depth * COL_W + NODE_W + 20
  const H           = Math.max(100, totalLeaves * ROW_H + TITLE_H + 20)

  interface HNode {
    label:    string
    lines:    string[]
    truncated: boolean
    x:        number
    y:        number
    parentX?: number
    parentY?: number
  }
  const hnodes: HNode[] = []

  function layoutH(items: MdArtItem[], level: number, leafStart: number, totalH: number, px?: number, py?: number) {
    const tot  = items.reduce((s, i) => s + countLeaves(i), 0) || 1
    let leafY  = leafStart
    for (const item of items) {
      const leaves = countLeaves(item)
      const span   = (leaves / tot) * totalH
      const ny     = leafY + span / 2
      const nx     = 10 + level * COL_W + NODE_W / 2
      const { lines, truncated } = wrapLabel(item.label, LABEL_MAX, 2)
      hnodes.push({ label: item.label, lines, truncated, x: nx, y: ny, parentX: px, parentY: py })
      layoutH(item.children, level + 1, leafY, span, nx + NODE_W / 2, ny)
      leafY += span
    }
  }
  layoutH(spec.items, 0, TITLE_H + 10, H - TITLE_H - 20)

  const lines: string[] = []
  const boxes: string[] = []

  for (const n of hnodes) {
    if (n.parentX !== undefined && n.parentY !== undefined) {
      const mid = (n.parentX + n.x - NODE_W / 2) / 2
      lines.push(`<path d="M${n.parentX.toFixed(1)},${n.parentY.toFixed(1)} H${mid.toFixed(1)} V${n.y.toFixed(1)} H${(n.x - NODE_W / 2).toFixed(1)}" fill="none" stroke="${theme.border}" stroke-width="1.5"/>`)
    }

    const bx = n.x - NODE_W / 2
    const by = n.y - NODE_H / 2
    boxes.push(`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${NODE_W}" height="${NODE_H}" rx="5" fill="${theme.surface}" stroke="${theme.accent}88" stroke-width="1.2"/>`)

    // Multi-line label centred in node
    const textBlockH = n.lines.length * LH
    const startY     = n.y - textBlockH / 2 + FS * 0.75
    const tip        = n.truncated ? `<title>${escapeXml(n.label)}</title>` : ''
    const spans      = n.lines
      .map((l, li) => `<tspan x="${n.x.toFixed(1)}" dy="${li === 0 ? 0 : LH}">${escapeXml(l)}</tspan>`)
      .join('')
    boxes.push(`<text x="${n.x.toFixed(1)}" y="${startY.toFixed(1)}" text-anchor="middle" font-size="${FS}" fill="${theme.text}" font-family="system-ui,sans-serif">${tip}${spans}</text>`)
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${spec.title ? `<text x="${(W / 2).toFixed(1)}" y="18" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(spec.title)}</text>` : ''}
  ${lines.join('\n  ')}
  ${boxes.join('\n  ')}
</svg>`
}

function renderEmpty(theme: MdArtTheme): string {
  return `<svg viewBox="0 0 300 80" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  <text x="150" y="42" text-anchor="middle" font-size="12" fill="${theme.textMuted}" font-family="system-ui,sans-serif">No items</text>
</svg>`
}
