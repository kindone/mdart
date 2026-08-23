import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, aWrap, itemTitleTag, displayLabelValue, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

// ── Node geometry ────────────────────────────────────────────────────────────

const CENTER_RX = 72,  CENTER_RY = 30
const BRANCH_RX = 58,  BRANCH_RY = 27
const SUB_RX    = 36,  SUB_RY    = 23

const CENTER_FS_MAX = 12
const BRANCH_FS_MAX = 10
const SUB_FS_MAX    = 8.5
const FS_MIN = 7

const W  = 720, H  = 660
const cx = W / 2, cy = H / 2
const R1 = 170
const R2 = 100

interface MindMapLayout {
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

function resolveLayout(spec: MdArtSpec): MindMapLayout {
  if (spec.title) return { centerLabel: spec.title, branches: spec.items }
  if (spec.items.length === 1) return { centerLabel: spec.items[0].label, branches: spec.items[0].children }
  return { centerLabel: 'Topic', branches: spec.items }
}

function fitCenter(label: string): FitBlock {
  return fitTextToWidthShared([label], CENTER_RX * 2 - 16, {
    maxSize: CENTER_FS_MAX,
    minSize: FS_MIN,
    maxLines: 3,
    boxH: CENTER_RY * 1.5,
  })
}

function fitBranches(branches: MdArtItem[]): FitBlock[] {
  return branches
    .map(branch => displayLabelValue(branch).display)
    .map(label => fitTextToWidthShared([label], BRANCH_RX * 2 - 14, {
      maxSize: BRANCH_FS_MAX,
      minSize: FS_MIN,
      maxLines: 3,
      boxH: BRANCH_RY * 1.5,
    }))
}

function fitSubs(branches: MdArtItem[]): FitBlock[] {
  return branches
    .flatMap(branch => branch.children)
    .map(sub => displayLabelValue(sub).display)
    .map(label => fitTextToWidthShared([label], SUB_RX * 2 - 10, {
      maxSize: SUB_FS_MAX,
      minSize: FS_MIN,
      maxLines: 3,
      boxH: SUB_RY * 1.5,
    }))
}

function branchPoint(index: number, count: number): BranchPoint {
  const angle = (2 * Math.PI * index / count) - Math.PI / 2
  return { angle, x: cx + R1 * Math.cos(angle), y: cy + R1 * Math.sin(angle) }
}

function subPoint(branch: BranchPoint, index: number, count: number): { x: number; y: number } {
  const step = count <= 1 ? 0 : Math.max((2 * SUB_RX + 8) / R2, 0.45)
  const angle = count <= 1 ? branch.angle : branch.angle + (index - (count - 1) / 2) * step
  return { x: branch.x + R2 * Math.cos(angle), y: branch.y + R2 * Math.sin(angle) }
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

function renderCenter(label: string, fit: FitBlock, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  return wrapItem(
    `<ellipse cx="${cx}" cy="${cy}" rx="${CENTER_RX}" ry="${CENTER_RY}" fill="${theme.bg}"/>` +
    `<ellipse cx="${cx}" cy="${cy}" rx="${CENTER_RX}" ry="${CENTER_RY}" fill="${theme.primary}28" stroke="${theme.accent}" stroke-width="1.5"/>` +
    mlText(cx, cy, fit.results[0], label, fit.fontSize, fit.lineHeight, theme.text, '600'),
    0,
    animate,
    instrument,
  )
}

function renderBranch(
  branch: MdArtItem,
  index: number,
  branchCount: number,
  branchFit: FitBlock,
  subFits: FitBlock[],
  subStart: number,
  theme: MdArtTheme,
  animate: boolean,
  instrument: boolean,
): string {
  const point = branchPoint(index, branchCount)
  const connectors: string[] = []
  const shapes: string[] = []
  const texts: string[] = []

  connectors.push(`<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${point.x.toFixed(1)}" y2="${point.y.toFixed(1)}" stroke="${theme.accent}99" stroke-width="2"/>`)
  shapes.push(`<ellipse cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" rx="${BRANCH_RX}" ry="${BRANCH_RY}" fill="${theme.bg}"/>`)
  shapes.push(`<ellipse cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" rx="${BRANCH_RX}" ry="${BRANCH_RY}" fill="${theme.accent}28" stroke="${theme.accent}" stroke-width="1">${itemTitleTag(branch)}</ellipse>`)
  texts.push(mlText(point.x, point.y, branchFit.results[0], displayLabelValue(branch).display, branchFit.fontSize, branchFit.lineHeight, theme.text, 'normal'))

  branch.children.forEach((sub, subIndex) => {
    const subFit = subFits[subStart + subIndex]
    const subPos = subPoint(point, subIndex, branch.children.length)
    connectors.push(`<line x1="${point.x.toFixed(1)}" y1="${point.y.toFixed(1)}" x2="${subPos.x.toFixed(1)}" y2="${subPos.y.toFixed(1)}" stroke="${theme.textMuted}" stroke-width="1" opacity="0.7"/>`)
    shapes.push(`<ellipse cx="${subPos.x.toFixed(1)}" cy="${subPos.y.toFixed(1)}" rx="${SUB_RX}" ry="${SUB_RY}" fill="${theme.bg}"/>`)
    shapes.push(`<ellipse cx="${subPos.x.toFixed(1)}" cy="${subPos.y.toFixed(1)}" rx="${SUB_RX}" ry="${SUB_RY}" fill="${theme.textMuted}12" stroke="${theme.textMuted}aa" stroke-width="1">${itemTitleTag(sub)}</ellipse>`)
    texts.push(mlText(subPos.x, subPos.y, subFit.results[0], displayLabelValue(sub).display, subFit.fontSize, subFit.lineHeight, theme.textMuted, 'normal'))
  })

  return wrapItem([...connectors, ...shapes, ...texts].join(''), index + 1, animate, instrument)
}

function renderBranches(layout: MindMapLayout, branchFits: FitBlock[], subFits: FitBlock[], theme: MdArtTheme, animate: boolean, instrument: boolean): string[] {
  let subCursor = 0
  return layout.branches.map((branch, index) => {
    const out = renderBranch(branch, index, layout.branches.length, branchFits[index], subFits, subCursor, theme, animate, instrument)
    subCursor += branch.children.length
    return out
  })
}

function renderSvg(parts: string[], theme: MdArtTheme): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layout = resolveLayout(spec)
  const parts = [
    ...renderBranches(layout, fitBranches(layout.branches), fitSubs(layout.branches), theme, animate, instrument),
    renderCenter(layout.centerLabel, fitCenter(layout.centerLabel), theme, animate, instrument),
  ]
  if (animate) parts.unshift(seqSpotlightCSS(layout.branches.length + 1, spec, { scale: false }))
  return renderSvg(parts, theme)
}
