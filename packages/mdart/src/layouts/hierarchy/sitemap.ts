import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt } from '../shared'
import { countLeaves, maxDepth } from './shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  interface SNode { label: string; level: number; x: number; y: number; parentX?: number; parentY?: number }
  const snodes: SNode[] = []
  const W = 640, levelH = 52, TITLE_H = spec.title ? 28 : 10
  const depth = maxDepth(spec.items)
  const H = Math.max(120, depth * levelH + TITLE_H + 30)

  const BW = [90, 76, 64], BH = [26, 22, 18]
  function bw(l: number) { return BW[Math.min(l, 2)] }
  function bh(l: number) { return BH[Math.min(l, 2)] }

  function layout(items: MdArtItem[], level: number, x0: number, x1: number, px?: number, py?: number) {
    const tot = items.reduce((s, i) => s + countLeaves(i), 0) || 1
    let cx2 = x0
    for (const item of items) {
      const leaves = countLeaves(item)
      const myW = (leaves / tot) * (x1 - x0)
      const nx = cx2 + myW / 2
      const ny = TITLE_H + level * levelH + bh(level) / 2
      snodes.push({ label: item.label, level, x: nx, y: ny, parentX: px, parentY: py })
      layout(item.children, level + 1, cx2, cx2 + myW, nx, ny)
      cx2 += myW
    }
  }
  layout(spec.items, 0, 0, W)

  const lines: string[] = [], boxes: string[] = []
  for (const n of snodes) {
    if (n.parentX !== undefined && n.parentY !== undefined) {
      const py = n.parentY + bh(n.level - 1) / 2
      const cy = n.y - bh(n.level) / 2
      lines.push(`<line x1="${n.parentX.toFixed(1)}" y1="${py.toFixed(1)}" x2="${n.x.toFixed(1)}" y2="${cy.toFixed(1)}" stroke="${theme.border}55" stroke-width="1.2"/>`)
    }
    const fill = n.level === 0 ? theme.accent : n.level === 1 ? theme.primary : theme.secondary
    boxes.push(`<rect x="${(n.x - bw(n.level)/2).toFixed(1)}" y="${(n.y - bh(n.level)/2).toFixed(1)}" width="${bw(n.level)}" height="${bh(n.level)}" rx="4" fill="${fill}" stroke="${theme.bg}" stroke-width="1.5"/>`)
    const fs = n.level === 0 ? 10 : n.level === 1 ? 9 : 8
    boxes.push(`<text x="${n.x.toFixed(1)}" y="${(n.y + 4).toFixed(1)}" text-anchor="middle" font-size="${fs}" fill="${theme.bg}" font-family="system-ui,sans-serif" font-weight="600">${tt(n.label, 12)}</text>`)
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${spec.title ? `<text x="${W/2}" y="18" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(spec.title)}</text>` : ''}
  ${lines.join('\n  ')}
  ${boxes.join('\n  ')}
</svg>`
}

function renderEmpty(theme: MdArtTheme): string {
  return `<svg viewBox="0 0 300 80" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  <text x="150" y="42" text-anchor="middle" font-size="12" fill="${theme.textMuted}" font-family="system-ui,sans-serif">No items</text>
</svg>`
}
