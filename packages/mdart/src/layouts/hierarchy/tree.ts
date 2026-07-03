import type { MdArtSpec, MdArtItem } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, renderEmpty, itemTitleTag } from '../shared'
import { countLeaves, maxDepth, layoutNodes, flatNodes } from './shared'

// ── Layout constants ─────────────────────────────────────────────────────────

const BOX_W    = 124
const FONT_SIZE = 10
const LINE_H   = 13
const VPAD     = 7     // top + bottom inner padding
const MAX_LINES = 4
const CHAR_PX  = 5.8
const MAX_CHARS = Math.max(10, Math.floor((BOX_W - 16) / CHAR_PX))  // ~18 chars/line
const CONN_GAP = 30    // vertical space reserved for bezier connectors between levels

// ── Helpers ──────────────────────────────────────────────────────────────────

function boxH(lineCount: number): number {
  return VPAD * 2 + lineCount * LINE_H
}

/** Walk the whole item tree and return the max wrapped-line count of any node. */
function maxLinesAnywhere(items: MdArtItem[]): number {
  let max = 1
  for (const item of items) {
    const { lines } = wrapLabel(item.label, MAX_CHARS, MAX_LINES)
    max = Math.max(max, lines.length)
    if (item.children.length) max = Math.max(max, maxLinesAnywhere(item.children))
  }
  return max
}

// ── Renderer ─────────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)

  const depth       = maxDepth(spec.items)
  const totalLeaves = spec.items.reduce((s, i) => s + countLeaves(i), 0) || 1
  const W           = Math.max(640, totalLeaves * (BOX_W + 10) + 80)

  // Size every box uniformly to the tallest label in the whole diagram so
  // connector math stays simple (all boxes on a level share the same height).
  const BOX_H  = boxH(maxLinesAnywhere(spec.items))
  const levelH = BOX_H + CONN_GAP

  const TITLE_H = spec.title ? 28 : 10
  const H       = Math.max(160, depth * levelH + TITLE_H + 30)
  const startY  = TITLE_H + BOX_H / 2
  const HPAD    = BOX_W / 2 + 4

  const nodes = layoutNodes(spec.items, HPAD, startY, W - HPAD * 2, levelH)
  const flat  = flatNodes(nodes)

  const connectors: string[] = []
  const boxes:      string[] = []

  for (const n of flat) {
    // Bezier connector from parent bottom-centre to this node's top-centre
    if (n.parentX !== undefined && n.parentY !== undefined) {
      const x1 = n.parentX,  y1 = n.parentY + BOX_H / 2
      const x2 = n.x,        y2 = n.y       - BOX_H / 2
      const mid = (y1 + y2) / 2
      connectors.push(
        `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} C${x1.toFixed(1)},${mid.toFixed(1)} ${x2.toFixed(1)},${mid.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${theme.textMuted}cc" stroke-width="1.5"/>`,
      )
    }

    const { lines: lblLines, url: lblUrl, truncated } = wrapLabel(n.label, MAX_CHARS, MAX_LINES)
    const bx  = n.x - BOX_W / 2
    const by  = n.y - BOX_H / 2
    const tip = itemTitleTag(n)

    boxes.push(
      `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${BOX_W}" height="${BOX_H}" rx="6" fill="${theme.surface}" stroke="${theme.accent}88" stroke-width="1.2">${tip}</rect>`,
    )

    // Vertically centre the text block within the box
    const textBlockH = lblLines.length * LINE_H
    const textStartY = n.y - textBlockH / 2 + LINE_H - 2  // first-line baseline

    const fullTip = truncated ? `<title>${escapeXml(n.label)}</title>` : ''
    const spans   = lblLines
      .map((l, li) => `<tspan x="${n.x.toFixed(1)}" dy="${li === 0 ? 0 : LINE_H}">${escapeXml(l)}</tspan>`)
      .join('')

    boxes.push(aWrap(
      `<text x="${n.x.toFixed(1)}" y="${textStartY.toFixed(1)}" text-anchor="middle" font-size="${FONT_SIZE}" fill="${theme.text}" font-family="system-ui,sans-serif">${fullTip}${spans}</text>`,
      lblUrl,
    ))
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${spec.title ? `<text x="${(W / 2).toFixed(1)}" y="18" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(spec.title)}</text>` : ''}
  ${connectors.join('\n  ')}
  ${boxes.join('\n  ')}
</svg>`
}
