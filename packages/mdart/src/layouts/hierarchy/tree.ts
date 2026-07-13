import type { MdArtSpec, MdArtItem } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, aWrap, renderEmpty, itemTitleTag, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument } from '../shared'
import { countLeaves, maxDepth, layoutNodes, flatNodes } from './shared'

// ── Layout constants ─────────────────────────────────────────────────────────

const BOX_W    = 124
const FONT_SIZE_MAX = 10
const FONT_SIZE_MIN = 8
const VPAD     = 7     // top + bottom inner padding
const MAX_LINES = 4
// Vertical space reserved for bezier connectors between levels. Sibling
// layout org-chart.ts uses an ~56px gap between box bottom and next box
// top; this was 30, giving a visibly tighter per-level rhythm than its
// sibling and making wide, shallow trees (many leaves, few levels — the
// common case) look flatter than intended relative to their width.
const CONN_GAP = 46

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Walk the whole item tree and collect every label, in the same pre-order
 *  traversal flatNodes(layoutNodes(...)) produces — so the result lines up
 *  index-for-index with `flat` in render() below without needing a lookup. */
function collectLabels(items: MdArtItem[]): string[] {
  const out: string[] = []
  for (const item of items) {
    out.push(item.label)
    if (item.children.length) out.push(...collectLabels(item.children))
  }
  return out
}

// ── Renderer ─────────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()

  const depth       = maxDepth(spec.items)
  const totalLeaves = spec.items.reduce((s, i) => s + countLeaves(i), 0) || 1
  const W           = Math.max(640, totalLeaves * (BOX_W + 10) + 80)

  // Per-node fitting: every box shares BOX_W, but each label is sized
  // independently rather than to the diagram's worst-case label — a short
  // label stays large instead of being dragged down to match a long
  // neighbor several levels away, same approach as process.ts/
  // circular-process.ts. Unlike those fixed-height boxes, BOX_H here is
  // derived AFTER fitting (below) to whatever the tallest node's own
  // text block needs at ITS OWN font size — so there's no boxH-starvation
  // concern: MAX_LINES was already a generous flat cap since the box
  // simply grows to whatever room the chosen size needs, not the other
  // way around.
  const allLabels = collectLabels(spec.items)
  const nodeFits = allLabels.map(label =>
    fitTextToWidthShared([label], BOX_W - 16, { maxSize: FONT_SIZE_MAX, minSize: FONT_SIZE_MIN, maxLines: MAX_LINES }),
  )

  // Size every box uniformly to the tallest per-node text block (own font
  // size × own line count), so connector math stays simple (all boxes on
  // a level share the same height) without forcing every node to share one
  // font size.
  const BOX_H  = nodeFits.reduce((m, f) => {
    const lh = f.lineHeight
    return Math.max(m, VPAD * 2 + f.results[0].lines.length * lh)
  }, VPAD * 2)
  const levelH = BOX_H + CONN_GAP

  const TITLE_H = spec.title ? 28 : 10
  const H       = Math.max(160, depth * levelH + TITLE_H + 30)
  const startY  = TITLE_H + BOX_H / 2
  const HPAD    = BOX_W / 2 + 4

  const nodes = layoutNodes(spec.items, HPAD, startY, W - HPAD * 2, levelH)
  const flat  = flatNodes(nodes)

  const parts: string[] = []

  for (const [i, n] of flat.entries()) {
    const unit: string[] = []
    // Bezier connector from parent bottom-centre to this node's top-centre
    if (n.parentX !== undefined && n.parentY !== undefined) {
      const x1 = n.parentX,  y1 = n.parentY + BOX_H / 2
      const x2 = n.x,        y2 = n.y       - BOX_H / 2
      const mid = (y1 + y2) / 2
      unit.push(
        `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} C${x1.toFixed(1)},${mid.toFixed(1)} ${x2.toFixed(1)},${mid.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${theme.textMuted}cc" stroke-width="1.5"/>`,
      )
    }

    const { fontSize: nodeFS, lineHeight: lineH, results: [{ lines: lblLines, url: lblUrl, truncated }] } = nodeFits[i]
    const bx  = n.x - BOX_W / 2
    const by  = n.y - BOX_H / 2
    const tip = itemTitleTag(n)

    unit.push(
      `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${BOX_W}" height="${BOX_H}" rx="6" fill="${theme.surface}" stroke="${theme.accent}88" stroke-width="1.2">${tip}</rect>`,
    )

    // Vertically centre the text block within the box
    const textBlockH = lblLines.length * lineH
    const textStartY = n.y - textBlockH / 2 + lineH - 2  // first-line baseline

    const fullTip = truncated ? `<title>${escapeXml(n.label)}</title>` : ''
    const spans   = lblLines
      .map((l, li) => `<tspan x="${n.x.toFixed(1)}" dy="${li === 0 ? 0 : lineH}">${escapeXml(l)}</tspan>`)
      .join('')

    unit.push(aWrap(
      `<text x="${n.x.toFixed(1)}" y="${textStartY.toFixed(1)}" text-anchor="middle" font-size="${nodeFS}" fill="${theme.text}" font-family="system-ui,sans-serif">${fullTip}${spans}</text>`,
      lblUrl,
    ))
    parts.push(wrapItem(unit.join(''), i, animate, instrument))
  }
  if (animate) parts.unshift(seqSpotlightCSS(flat.length, spec, { scale: false }))

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${spec.title ? `<text x="${(W / 2).toFixed(1)}" y="18" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(spec.title)}</text>` : ''}
  ${parts.join('\n  ')}
</svg>`
}
