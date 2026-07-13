import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, aWrap, itemTitleTag, ellipsisIfDropped, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument } from '../shared'

// ── Node geometry ────────────────────────────────────────────────────────────
// Three tiers, each an ellipse. Radii are fixed (tied to the R1/R2 radial
// spacing math below — growing one ellipse would crowd its neighbours), so
// font size is the only lever available per tier: each tier shares ONE font
// size across all its nodes, sized to that tier's worst-fitting label.

const CENTER_RX = 72,  CENTER_RY = 30
const BRANCH_RX = 58,  BRANCH_RY = 27
const SUB_RX    = 36,  SUB_RY    = 23

const CENTER_FS_MAX = 12
const BRANCH_FS_MAX = 10
const SUB_FS_MAX    = 8.5
const FS_MIN = 7  // shared floor before a tier accepts truncation

// Canvas — tall enough so top/bottom sub-nodes don't clip
const W  = 720, H  = 660
const cx = W / 2, cy = H / 2
const R1 = 170   // center → branch
const R2 = 100   // branch → sub-node (further out so subs don't crowd the branch)

// ── Helper: centered multi-line <text> from a pre-fitted result ──────────────

function mlText(
  x: number, y: number,
  fit: { lines: string[]; truncated: boolean; url: string | null },
  fullLabel: string,
  fontSize: number,
  lineH: number,
  fill: string,
  weight = 'normal',
): string {
  const { lines, truncated, url } = fit
  // Shift baseline up by half the total text-block height so it centers in the ellipse
  const startY = y - (lines.length - 1) * lineH / 2 + fontSize * 0.32
  const tip    = truncated ? `<title>${escapeXml(fullLabel)}</title>` : ''
  const spans  = lines
    .map((l, li) => `<tspan x="${x.toFixed(1)}" dy="${li === 0 ? 0 : lineH}">${escapeXml(l)}</tspan>`)
    .join('')
  return aWrap(`<text x="${x.toFixed(1)}" y="${startY.toFixed(1)}" text-anchor="middle" font-size="${fontSize}" fill="${fill}" font-family="system-ui,sans-serif" font-weight="${weight}">${tip}${spans}</text>`, url)
}

// ── Renderer ─────────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
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

  // Per-node fitting: within each tier every ellipse shares one RX/RY, but
  // each node's label is now sized to ITS OWN worst-fitting need rather
  // than the whole tier's — a short branch/sub label stays large instead
  // of being dragged down to match a long neighbor, same approach as
  // process.ts/circular-process.ts. maxLines was already a generous flat 3
  // with no boxH; since these are ellipses (not rects), a boxH derived from
  // the full RY*2 diameter would let outer wrapped lines run past the
  // ellipse's tapering silhouette near top/bottom, so — same heuristic as
  // circle-process's circleBoxH — the vertical budget below uses a fraction
  // of the diameter, not the full RY*2.
  const centerFitFull = fitTextToWidthShared(
    [centerLabel], CENTER_RX * 2 - 16, { maxSize: CENTER_FS_MAX, minSize: FS_MIN, maxLines: 3, boxH: CENTER_RY * 1.5 },
  )
  const centerFS = centerFitFull.fontSize
  const centerLH = centerFitFull.lineHeight
  const centerFits = centerFitFull.results

  const branchLabels = branches.map(b => ellipsisIfDropped(b.label, b))
  const branchFitsFull = branchLabels.map(label =>
    fitTextToWidthShared([label], BRANCH_RX * 2 - 14, { maxSize: BRANCH_FS_MAX, minSize: FS_MIN, maxLines: 3, boxH: BRANCH_RY * 1.5 }),
  )

  // Subs are collected across ALL branches up front, then consumed in the
  // same order via subCursor as branches render — each still fit
  // independently (per-node), just gathered up front for indexing.
  const allSubs   = branches.flatMap(b => b.children)
  const subLabels = allSubs.map(s => ellipsisIfDropped(s.label, s))
  const subFitsFull = subLabels.map(label =>
    fitTextToWidthShared([label], SUB_RX * 2 - 10, { maxSize: SUB_FS_MAX, minSize: FS_MIN, maxLines: 3, boxH: SUB_RY * 1.5 }),
  )

  const parts: string[] = []

  // ── Center node ─────────────────────────────────────────────────────────────
  const centerUnit = [
    `<ellipse cx="${cx}" cy="${cy}" rx="${CENTER_RX}" ry="${CENTER_RY}" fill="${theme.surface}" stroke="${theme.accent}" stroke-width="1.5"/>`,
    mlText(cx, cy, centerFits[0], centerLabel, centerFS, centerLH, theme.text, '600'),
  ].join('')

  // ── Branches ────────────────────────────────────────────────────────────────
  let subCursor = 0
  for (let i = 0; i < n; i++) {
    const connectors: string[] = []
    const shapes: string[] = []
    const texts: string[] = []
    const angle = (2 * Math.PI * i / n) - Math.PI / 2
    const bx = cx + R1 * Math.cos(angle)
    const by = cy + R1 * Math.sin(angle)
    const branch = branches[i]

    const { fontSize: branchFS, lineHeight: branchLH, results: branchResults } = branchFitsFull[i]
    connectors.push(`<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="${theme.accent}99" stroke-width="2"/>`)
    shapes.push(`<ellipse cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" rx="${BRANCH_RX}" ry="${BRANCH_RY}" fill="${theme.surface}" stroke="${theme.accent}cc" stroke-width="1">${itemTitleTag(branch)}</ellipse>`)
    texts.push(mlText(bx, by, branchResults[0], branch.label, branchFS, branchLH, theme.text, 'normal'))

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

      const { fontSize: subFS, lineHeight: subLH, results: subResults } = subFitsFull[subCursor]
      connectors.push(`<line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}" stroke="${theme.textMuted}" stroke-width="1" opacity="0.7"/>`)
      shapes.push(`<ellipse cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" rx="${SUB_RX}" ry="${SUB_RY}" fill="${theme.surface}" stroke="${theme.textMuted}aa" stroke-width="1">${itemTitleTag(subs[j])}</ellipse>`)
      texts.push(mlText(sx, sy, subResults[0], subs[j].label, subFS, subLH, theme.textMuted, 'normal'))
      subCursor++
    }
    const unit = [...connectors, ...shapes, ...texts].join('')
    parts.push(wrapItem(unit, i + 1, animate, instrument))
  }
  parts.push(wrapItem(centerUnit, 0, animate, instrument))
  if (animate) parts.unshift(seqSpotlightCSS(n + 1, spec, { scale: false }))

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${parts.join('\n  ')}
</svg>`
}
