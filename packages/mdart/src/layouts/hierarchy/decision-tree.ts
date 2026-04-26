import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt } from '../shared'
import { maxDepth, layoutNodes, flatNodes } from './shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const W = 640
  const depth = maxDepth(spec.items)
  const levelH = 80
  const TITLE_H = spec.title ? 28 : 10
  const H = Math.max(160, depth * levelH + TITLE_H + 40)
  const DW = 54, DH = 18
  const LW = 90, LH = 26
  const startY = TITLE_H + DH

  const nodes = layoutNodes(spec.items, 0, startY, W, levelH)
  const flat = flatNodes(nodes)

  const lines: string[] = [], shapes: string[] = []

  for (const n of flat) {
    if (n.parentX !== undefined && n.parentY !== undefined) {
      const isLeaf = n.children.length === 0
      const x1 = n.parentX, y1 = n.parentY + DH
      const x2 = n.x,       y2 = isLeaf ? n.y - LH / 2 : n.y - DH
      const mid = (y1 + y2) / 2
      lines.push(`<path d="M${x1.toFixed(1)},${y1.toFixed(1)} C${x1.toFixed(1)},${mid.toFixed(1)} ${x2.toFixed(1)},${mid.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${theme.textMuted}cc" stroke-width="1.5"/>`)
      const siblings = n.parentX !== undefined ? flat.filter(s => s.parentX === n.parentX && s.parentY === n.parentY) : []
      if (siblings.length === 2) {
        const isFirst = siblings[0] === n
        const lx = (x1 + x2) / 2 + (isFirst ? -18 : 12)
        const ly = (y1 + y2) / 2
        const lbl = isFirst ? 'Yes' : 'No'
        const lcolor = isFirst ? theme.primary : theme.secondary
        lines.push(`<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="9" fill="${lcolor}" font-family="system-ui,sans-serif" font-weight="700">${lbl}</text>`)
      }
    }
    const { x, y } = n
    if (n.children.length > 0) {
      shapes.push(`<polygon points="${x},${(y-DH).toFixed(1)} ${(x+DW).toFixed(1)},${y} ${x},${(y+DH).toFixed(1)} ${(x-DW).toFixed(1)},${y}" fill="${theme.surface}" stroke="${theme.primary}aa" stroke-width="1.5"/>`)
      shapes.push(`<text x="${x}" y="${(y+4).toFixed(1)}" text-anchor="middle" font-size="9.5" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(n.label, 10)}</text>`)
    } else {
      const bx = x - LW / 2, by = y - LH / 2
      shapes.push(`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${LW}" height="${LH}" rx="5" fill="${theme.surface}" stroke="${theme.accent}88" stroke-width="1.2"/>`)
      shapes.push(`<text x="${x.toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif">${tt(n.label, 13)}</text>`)
    }
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${spec.title ? `<text x="${W/2}" y="18" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(spec.title)}</text>` : ''}
  ${lines.join('\n  ')}
  ${shapes.join('\n  ')}
</svg>`
}

function renderEmpty(theme: MdArtTheme): string {
  return `<svg viewBox="0 0 300 80" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  <text x="150" y="42" text-anchor="middle" font-size="12" fill="${theme.textMuted}" font-family="system-ui,sans-serif">No items</text>
</svg>`
}
