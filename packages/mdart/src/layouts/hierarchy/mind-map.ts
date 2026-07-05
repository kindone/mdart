import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, itemTitleTag, ellipsisIfDropped, shouldAnimate, seqSpotlightCSS, type ItemLike } from '../shared'

// ── Node geometry ────────────────────────────────────────────────────────────
// Three tiers, each an ellipse. rx/ry chosen so 2 wrapped lines fit.

const CENTER_RX = 72,  CENTER_RY = 30
const BRANCH_RX = 58,  BRANCH_RY = 27
const SUB_RX    = 36,  SUB_RY    = 23

const CENTER_FS = 12,  CENTER_LH = 15
const BRANCH_FS = 10,  BRANCH_LH = 13
const SUB_FS    = 8.5, SUB_LH   = 11

// Max chars per line ≈ (2·rx − padding) / avg-px-per-char
const CENTER_MC = Math.floor((CENTER_RX * 2 - 16) / 6.5)   // ~20
const BRANCH_MC = Math.floor((BRANCH_RX * 2 - 14) / 5.8)   // ~17
// Sub-nodes: text is intentionally wider than the ellipse — spill is fine
const SUB_MC    = 20

// Canvas — tall enough so top/bottom sub-nodes don't clip
const W  = 720, H  = 660
const cx = W / 2, cy = H / 2
const R1 = 170   // center → branch
const R2 = 100   // branch → sub-node (further out so subs don't crowd the branch)

// ── Helper: centered multi-line <text> ───────────────────────────────────────

function mlText(
  x: number, y: number,
  label: string,
  maxChars: number,
  fontSize: number,
  lineH: number,
  fill: string,
  weight = 'normal',
  ellipsisItem?: ItemLike,
): string {
  // Apply ellipsis cue when value/attrs would otherwise be invisible.
  const labelStr = ellipsisItem ? ellipsisIfDropped(label, ellipsisItem) : label
  const { lines, truncated, url } = wrapLabel(labelStr, maxChars, 3)
  // Shift baseline up by half the total text-block height so it centers in the ellipse
  const startY = y - (lines.length - 1) * lineH / 2 + fontSize * 0.32
  const tip    = truncated ? `<title>${escapeXml(label)}</title>` : ''
  const spans  = lines
    .map((l, li) => `<tspan x="${x.toFixed(1)}" dy="${li === 0 ? 0 : lineH}">${escapeXml(l)}</tspan>`)
    .join('')
  return aWrap(`<text x="${x.toFixed(1)}" y="${startY.toFixed(1)}" text-anchor="middle" font-size="${fontSize}" fill="${fill}" font-family="system-ui,sans-serif" font-weight="${weight}">${tip}${spans}</text>`, url)
}

// ── Renderer ─────────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const animate = shouldAnimate(spec)
  let centerLabel: string
  let branches: MdArtSpec['items']

  if (spec.title) {
    centerLabel = spec.title
    branches    = spec.items
  } else if (spec.items.length === 1) {
    centerLabel = spec.items[0].label
    branches    = spec.items[0].children
  } else {
    centerLabel = 'Topic'
    branches    = spec.items
  }

  const n = branches.length

  const parts: string[] = []

  // ── Center node ─────────────────────────────────────────────────────────────
  const centerUnit = [
    `<ellipse cx="${cx}" cy="${cy}" rx="${CENTER_RX}" ry="${CENTER_RY}" fill="${theme.surface}" stroke="${theme.accent}" stroke-width="1.5"/>`,
    mlText(cx, cy, centerLabel, CENTER_MC, CENTER_FS, CENTER_LH, theme.text, '600'),
  ].join('')

  // ── Branches ────────────────────────────────────────────────────────────────
  for (let i = 0; i < n; i++) {
    const connectors: string[] = []
    const shapes: string[] = []
    const texts: string[] = []
    const angle = (2 * Math.PI * i / n) - Math.PI / 2
    const bx = cx + R1 * Math.cos(angle)
    const by = cy + R1 * Math.sin(angle)
    const branch = branches[i]

    connectors.push(`<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="${theme.accent}99" stroke-width="2"/>`)
    shapes.push(`<ellipse cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" rx="${BRANCH_RX}" ry="${BRANCH_RY}" fill="${theme.surface}" stroke="${theme.accent}cc" stroke-width="1">${itemTitleTag(branch)}</ellipse>`)
    texts.push(mlText(bx, by, branch.label, BRANCH_MC, BRANCH_FS, BRANCH_LH, theme.text, 'normal', branch))

    // ── Sub-nodes ──────────────────────────────────────────────────────────────
    const subs = branch.children
    const ns   = subs.length
    for (let j = 0; j < ns; j++) {
      // Angular step sized so adjacent sub-ellipse edges have at least 8 px clearance.
      // chord ≈ R2·θ for small θ  →  θ_min = (2·SUB_RX + 8) / R2
      const step     = ns <= 1 ? 0 : Math.max((2 * SUB_RX + 8) / R2, 0.45)
      const subAngle = ns <= 1
        ? angle
        : angle + (j - (ns - 1) / 2) * step
      const sx = bx + R2 * Math.cos(subAngle)
      const sy = by + R2 * Math.sin(subAngle)

      connectors.push(`<line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}" stroke="${theme.textMuted}" stroke-width="1" opacity="0.7"/>`)
      shapes.push(`<ellipse cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" rx="${SUB_RX}" ry="${SUB_RY}" fill="${theme.surface}" stroke="${theme.textMuted}aa" stroke-width="1">${itemTitleTag(subs[j])}</ellipse>`)
      texts.push(mlText(sx, sy, subs[j].label, SUB_MC, SUB_FS, SUB_LH, theme.textMuted, 'normal', subs[j]))
    }
    const unit = [...connectors, ...shapes, ...texts].join('')
    parts.push(animate ? `<g class="mdart-n${i + 1}">${unit}</g>` : unit)
  }
  parts.push(animate ? `<g class="mdart-n0">${centerUnit}</g>` : centerUnit)
  if (animate) parts.unshift(seqSpotlightCSS(n + 1, spec, { scale: false }))

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${parts.join('\n  ')}
</svg>`
}
