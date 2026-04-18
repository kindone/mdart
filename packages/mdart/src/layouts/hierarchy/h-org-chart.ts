import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt } from '../shared'
import { countLeaves, maxDepth } from './shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const depth = maxDepth(spec.items)
  const totalLeaves = spec.items.reduce((s, i) => s + countLeaves(i), 0) || 1
  const ROW_H = 40, COL_W = 140, NODE_W = 110, NODE_H = 28
  const TITLE_H = spec.title ? 28 : 8
  const W = depth * COL_W + NODE_W + 20
  const H = Math.max(100, totalLeaves * ROW_H + TITLE_H + 20)

  interface HNode { label: string; x: number; y: number; parentX?: number; parentY?: number }
  const hnodes: HNode[] = []

  function layoutH(items: MdArtItem[], level: number, leafStart: number, totalH: number, px?: number, py?: number) {
    const tot = items.reduce((s, i) => s + countLeaves(i), 0) || 1
    let leafY = leafStart
    for (const item of items) {
      const leaves = countLeaves(item)
      const span = (leaves / tot) * totalH
      const ny = leafY + span / 2
      const nx = 10 + level * COL_W + NODE_W / 2
      hnodes.push({ label: item.label, x: nx, y: ny, parentX: px, parentY: py })
      layoutH(item.children, level + 1, leafY, span, nx + NODE_W / 2, ny)
      leafY += span
    }
  }
  layoutH(spec.items, 0, TITLE_H + 10, H - TITLE_H - 20)

  const lines: string[] = [], boxes: string[] = []
  for (const n of hnodes) {
    if (n.parentX !== undefined && n.parentY !== undefined) {
      const mid = (n.parentX + n.x - NODE_W / 2) / 2
      lines.push(`<path d="M${n.parentX.toFixed(1)},${n.parentY.toFixed(1)} H${mid.toFixed(1)} V${n.y.toFixed(1)} H${(n.x - NODE_W / 2).toFixed(1)}" fill="none" stroke="${theme.border}" stroke-width="1.5"/>`)
    }
    const bx = n.x - NODE_W / 2, by = n.y - NODE_H / 2
    boxes.push(`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${NODE_W}" height="${NODE_H}" rx="5" fill="${theme.surface}" stroke="${theme.accent}88" stroke-width="1.2"/>`)
    boxes.push(`<text x="${n.x.toFixed(1)}" y="${(n.y + 4).toFixed(1)}" text-anchor="middle" font-size="10.5" fill="${theme.text}" font-family="system-ui,sans-serif">${tt(n.label, 14)}</text>`)
  }
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${spec.title ? `<text x="${(W/2).toFixed(1)}" y="18" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(spec.title)}</text>` : ''}
  ${lines.join('\n  ')}
  ${boxes.join('\n  ')}
</svg>`
}

function renderEmpty(theme: MdArtTheme): string {
  return `<svg viewBox="0 0 300 80" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  <text x="150" y="42" text-anchor="middle" font-size="12" fill="${theme.textMuted}" font-family="system-ui,sans-serif">No items</text>
</svg>`
}
