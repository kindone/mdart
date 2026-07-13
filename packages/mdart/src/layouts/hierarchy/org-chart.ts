import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument } from '../shared'
import { countLeaves, maxDepth, layoutNodes, flatNodes } from './shared'

const BOX_W = 110
const BOX_H = 30
const NODE_FS_MAX = 11
const NODE_FS_MIN = 8

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()

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

  // Per-node fitting: every box shares BOX_W, but each label is sized
  // independently rather than to the diagram's worst-case label — a short
  // label ("CEO") stays large instead of being dragged down to match a
  // long neighbor several levels away, same approach as process.ts/
  // circular-process.ts.
  //
  // The fit was also capped at a flat maxLines: 1 with no boxH — so a
  // smaller font never unlocked a second line, it just kept shrinking a
  // single line down to the floor before truncating. orgBoxH below gives
  // fitTextToWidthShared the real vertical budget (BOX_H is fixed — used
  // by the connector math above — so text can't grow the box, only use
  // more of the room already in it).
  const displays = flat.map(n => displayLabel(n))
  const orgBoxH = BOX_H - 6

  const parts: string[] = []

  for (const [i, n] of flat.entries()) {
    const unit: string[] = []
    if (n.parentX !== undefined && n.parentY !== undefined) {
      const x1 = n.parentX, y1 = n.parentY + BOX_H / 2
      const x2 = n.x,       y2 = n.y - BOX_H / 2
      const mid = (y1 + y2) / 2
      unit.push(
        `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} C${x1.toFixed(1)},${mid.toFixed(1)} ${x2.toFixed(1)},${mid.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${theme.textMuted}cc" stroke-width="1.5"/>`
      )
    }
    const bx = n.x - BOX_W / 2
    const by = n.y - BOX_H / 2
    const { url: nUrl, display: nDisplay } = displays[i]
    const tip = itemTitleTag(n)
    unit.push(
      `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${BOX_W}" height="${BOX_H}" rx="6" fill="${theme.surface}" stroke="${theme.accent}88" stroke-width="1.2">${tip}</rect>`,
    )
    const { fontSize: nodeFS, lineHeight: lineH, results: [{ lines, truncated }] } = fitTextToWidthShared(
      [nDisplay], BOX_W - 16, { maxSize: NODE_FS_MAX, minSize: NODE_FS_MIN, maxLines: 2, boxH: orgBoxH },
    )
    const textBlockH = lines.length * lineH
    const textStartY = n.y - textBlockH / 2 + lineH - 2
    const fullTip = truncated ? `<title>${escapeXml(nDisplay)}</title>` : ''
    const spans = lines
      .map((l, li) => `<tspan x="${n.x.toFixed(1)}" dy="${li === 0 ? 0 : lineH}">${escapeXml(l)}</tspan>`)
      .join('')
    unit.push(aWrap(`<text x="${n.x.toFixed(1)}" y="${textStartY.toFixed(1)}" text-anchor="middle" font-size="${nodeFS}" fill="${theme.text}" font-family="system-ui,sans-serif">${tip}${fullTip}${spans}</text>`, nUrl))
    parts.push(wrapItem(unit.join(''), i, animate, instrument))
  }
  if (animate) parts.unshift(seqSpotlightCSS(flat.length, spec, { scale: false }))

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
