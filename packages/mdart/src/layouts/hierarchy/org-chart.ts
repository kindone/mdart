import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt } from '../shared'
import { countLeaves, maxDepth, layoutNodes, flatNodes } from './shared'

const BOX_W = 110
const BOX_H = 30

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)

  const depth = maxDepth(spec.items)
  const totalLeaves = spec.items.reduce((s, i) => s + countLeaves(i), 0) || 1
  const W = Math.max(640, totalLeaves * (BOX_W + 8) + 80)
  const levelH = spec.type === 'tree' ? 68 : 86
  const TITLE_H = spec.title ? 28 : 10
  const H = Math.max(160, depth * levelH + TITLE_H + 30)
  const startY = TITLE_H + BOX_H / 2

  const HPAD = BOX_W / 2 + 4
  const nodes = layoutNodes(spec.items, HPAD, startY, W - HPAD * 2, levelH)
  const flat = flatNodes(nodes)

  const lines: string[] = []
  const boxes: string[] = []

  for (const n of flat) {
    if (n.parentX !== undefined && n.parentY !== undefined) {
      const x1 = n.parentX, y1 = n.parentY + BOX_H / 2
      const x2 = n.x,       y2 = n.y - BOX_H / 2
      const mid = (y1 + y2) / 2
      lines.push(
        `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} C${x1.toFixed(1)},${mid.toFixed(1)} ${x2.toFixed(1)},${mid.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${theme.textMuted}cc" stroke-width="1.5"/>`
      )
    }
    const bx = n.x - BOX_W / 2
    const by = n.y - BOX_H / 2
    boxes.push(
      `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${BOX_W}" height="${BOX_H}" rx="6" fill="${theme.surface}" stroke="${theme.accent}88" stroke-width="1.2"/>`,
      `<text x="${n.x.toFixed(1)}" y="${(n.y + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif">${tt(n.label, 15)}</text>`,
    )
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
