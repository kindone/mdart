import type { MdArtItem } from '../../parser'
import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, aWrap, itemTitleTag, displayLabelValue, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const CX = 0
const CY = 0
const BRANCH_R = 150
const SUB_R = 72
const CENTER_R = 32
const BRANCH_NODE_R = 22
const SUB_NODE_R = 14

const CENTER_FS_MAX = 11
const BRANCH_FS_MAX = 9
const SUB_FS_MAX = 8
const FS_MIN = 6.5

const BBOX_PAD = 16

interface RadialLayout {
  centerLabel: string
  branches: MdArtItem[]
}

interface FitBlock {
  fontSize: number
  lineHeight: number
  results: Array<{ lines: string[]; truncated: boolean; url: string | null }>
}

interface BranchPoint {
  angle: number
  x: number
  y: number
}

function resolveLayout(spec: MdArtSpec): RadialLayout {
  if (spec.title) return { centerLabel: spec.title, branches: spec.items }
  if (spec.items.length === 1) return { centerLabel: spec.items[0].label, branches: spec.items[0].children }
  return { centerLabel: 'Root', branches: spec.items }
}

// ── Text fitting — each label is fit to its own node's actual pixel
// diameter (not a fixed character count), so multi-word/long labels never
// visually overflow their circle. Mirrors mind-map.ts's approach.

function fitCenter(label: string): FitBlock {
  return fitTextToWidthShared([label], CENTER_R * 2 - 12, {
    maxSize: CENTER_FS_MAX,
    minSize: FS_MIN,
    maxLines: 3,
    boxH: CENTER_R * 1.6,
  })
}

function fitBranches(branches: MdArtItem[]): FitBlock[] {
  return branches
    .map(branch => displayLabelValue(branch).display)
    .map(label => fitTextToWidthShared([label], BRANCH_NODE_R * 2 - 8, {
      maxSize: BRANCH_FS_MAX,
      minSize: FS_MIN,
      maxLines: 3,
      boxH: BRANCH_NODE_R * 1.7,
    }))
}

function fitSubs(branches: MdArtItem[]): FitBlock[] {
  return branches
    .flatMap(branch => branch.children)
    .map(sub => displayLabelValue(sub).display)
    .map(label => fitTextToWidthShared([label], SUB_NODE_R * 2 - 6, {
      maxSize: SUB_FS_MAX,
      minSize: FS_MIN,
      maxLines: 2,
      boxH: SUB_NODE_R * 1.7,
    }))
}

function branchPoint(index: number, count: number): BranchPoint {
  const angle = (2 * Math.PI * index / count) - Math.PI / 2
  return { angle, x: CX + BRANCH_R * Math.cos(angle), y: CY + BRANCH_R * Math.sin(angle) }
}

// Node-size-aware spacing: the angular step between adjacent sub-nodes is
// derived from SUB_NODE_R itself (enough arc-length at radius SUB_R for two
// sub-node diameters plus a gap), not just a count-based heuristic — this
// is what actually prevents sub-nodes (and, by spreading wide enough, their
// neighboring branch's territory) from overlapping. The previous version's
// `spread` formula was purely a function of item count with no reference to
// SUB_NODE_R at all, so it couldn't guarantee non-overlap.
function subPoint(branch: BranchPoint, index: number, count: number): { x: number; y: number } {
  const minStep = (2 * SUB_NODE_R + 6) / SUB_R
  const step = count <= 1 ? 0 : Math.max(minStep, 0.42)
  const angle = count <= 1 ? branch.angle : branch.angle + (index - (count - 1) / 2) * step
  return {
    x: branch.x + SUB_R * Math.cos(angle),
    y: branch.y + SUB_R * Math.sin(angle),
  }
}

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
  const startY = y - (lines.length - 1) * lineH / 2 + fontSize * 0.32
  const tip = truncated ? `<title>${escapeXml(fullLabel)}</title>` : ''
  const spans = lines
    .map((line, li) => `<tspan x="${x.toFixed(1)}" dy="${li === 0 ? 0 : lineH}">${escapeXml(line)}</tspan>`)
    .join('')
  return aWrap(`<text x="${x.toFixed(1)}" y="${startY.toFixed(1)}" text-anchor="middle" font-size="${fontSize}" fill="${fill}" ${FONT_SANS_ATTR} font-weight="${weight}">${tip}${spans}</text>`, url)
}

function renderSubNodeAt(branch: { x: number; y: number }, point: { x: number; y: number }, sub: MdArtItem, fit: FitBlock, theme: MdArtTheme): string {
  return `<line x1="${branch.x.toFixed(1)}" y1="${branch.y.toFixed(1)}" x2="${point.x.toFixed(1)}" y2="${point.y.toFixed(1)}" stroke="${theme.border}88" stroke-width="1.5"/>` +
    `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${SUB_NODE_R}" fill="${theme.bg}"/>` +
    `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${SUB_NODE_R}" fill="${theme.accent}18" stroke="${theme.accent}88" stroke-width="1.2">${itemTitleTag(sub)}</circle>` +
    mlText(point.x, point.y, fit.results[0], displayLabelValue(sub).display, fit.fontSize, fit.lineHeight, theme.text)
}

function renderBranch(
  branch: MdArtItem,
  index: number,
  count: number,
  branchFit: FitBlock,
  subFits: FitBlock[],
  subStart: number,
  theme: MdArtTheme,
  animate: boolean,
  instrument: boolean,
): string {
  const point = branchPoint(index, count)
  const unit: string[] = []
  unit.push(`<line x1="${CX}" y1="${CY}" x2="${point.x.toFixed(1)}" y2="${point.y.toFixed(1)}" stroke="${theme.accent}50" stroke-width="2.5"/>`)
  branch.children.forEach((sub, subIndex) => {
    unit.push(renderSubNodeAt(point, subPoint(point, subIndex, branch.children.length), sub, subFits[subStart + subIndex], theme))
  })
  unit.push(
    `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${BRANCH_NODE_R}" fill="${theme.bg}"/>` +
    `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${BRANCH_NODE_R}" fill="${theme.primary}28" stroke="${theme.primary}" stroke-width="1.5">${itemTitleTag(branch)}</circle>`
  )
  unit.push(mlText(point.x, point.y, branchFit.results[0], displayLabelValue(branch).display, branchFit.fontSize, branchFit.lineHeight, theme.text, '700'))
  return wrapItem(unit.join(''), index + 1, animate, instrument)
}

function renderBranches(layout: RadialLayout, branchFits: FitBlock[], subFits: FitBlock[], theme: MdArtTheme, animate: boolean, instrument: boolean): string[] {
  let subCursor = 0
  const count = layout.branches.length || 1
  return layout.branches.map((branch, index) => {
    const out = renderBranch(branch, index, count, branchFits[index], subFits, subCursor, theme, animate, instrument)
    subCursor += branch.children.length
    return out
  })
}

function renderCenter(label: string, fit: FitBlock, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  return wrapItem(
    `<circle cx="${CX}" cy="${CY}" r="${CENTER_R}" fill="${theme.bg}"/>` +
    `<circle cx="${CX}" cy="${CY}" r="${CENTER_R}" fill="${theme.accent}28" stroke="${theme.accent}" stroke-width="1.5"/>` +
    mlText(CX, CY, fit.results[0], label, fit.fontSize, fit.lineHeight, theme.text, '700'),
    0,
    animate,
    instrument,
  )
}

// ── Bounding-box computation — mirrors mind-map.ts: walk every rendered
// node and track the tightest rectangle containing all of them, so the
// viewBox always matches actual content instead of a fixed canvas that
// crowds (and can overlap) content once there are enough branches/subs.

interface BBox { x: number; y: number; w: number; h: number }

function computeBBox(layout: RadialLayout): BBox {
  let minX = CX - CENTER_R, maxX = CX + CENTER_R
  let minY = CY - CENTER_R, maxY = CY + CENTER_R

  const extend = (px: number, py: number, r: number) => {
    if (px - r < minX) minX = px - r
    if (px + r > maxX) maxX = px + r
    if (py - r < minY) minY = py - r
    if (py + r > maxY) maxY = py + r
  }

  const n = layout.branches.length || 1
  layout.branches.forEach((branch, i) => {
    const pt = branchPoint(i, n)
    extend(pt.x, pt.y, BRANCH_NODE_R)
    branch.children.forEach((_, si) => {
      const sp = subPoint(pt, si, branch.children.length)
      extend(sp.x, sp.y, SUB_NODE_R)
    })
  })

  return {
    x: minX - BBOX_PAD,
    y: minY - BBOX_PAD,
    w: maxX - minX + 2 * BBOX_PAD,
    h: maxY - minY + 2 * BBOX_PAD,
  }
}

function renderSvg(parts: string[], theme: MdArtTheme, bbox: BBox): string {
  const vb = `${bbox.x.toFixed(1)} ${bbox.y.toFixed(1)} ${bbox.w.toFixed(1)} ${bbox.h.toFixed(1)}`
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layout = resolveLayout(spec)
  const animationCount = layout.branches.length + 1
  const branchFits = fitBranches(layout.branches)
  const subFits = fitSubs(layout.branches)
  const parts = [
    ...renderBranches(layout, branchFits, subFits, theme, animate, instrument),
    renderCenter(layout.centerLabel, fitCenter(layout.centerLabel), theme, animate, instrument),
  ]
  if (animate) parts.unshift(seqSpotlightCSS(animationCount, spec, { scale: false }))
  return renderSvg(parts, theme, computeBBox(layout))
}
