import type { MdArtItem } from '../../parser'
import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { tt, aWrap, itemTitleTag, displayLabelValue, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 600
const H = 500
const CX = W / 2
const CY = H / 2
const BRANCH_R = 150
const SUB_R = 72
const CENTER_R = 32
const BRANCH_NODE_R = 22
const SUB_NODE_R = 14

interface RadialLayout {
  centerLabel: string
  branches: MdArtItem[]
}

function resolveLayout(spec: MdArtSpec): RadialLayout {
  if (spec.title) return { centerLabel: spec.title, branches: spec.items }
  if (spec.items.length === 1) return { centerLabel: spec.items[0].label, branches: spec.items[0].children }
  return { centerLabel: 'Root', branches: spec.items }
}

function branchPoint(index: number, count: number): { angle: number; x: number; y: number } {
  const angle = (2 * Math.PI * index / count) - Math.PI / 2
  return {
    angle,
    x: CX + BRANCH_R * Math.cos(angle),
    y: CY + BRANCH_R * Math.sin(angle),
  }
}

function subPoint(branch: { angle: number; x: number; y: number }, index: number, count: number): { x: number; y: number } {
  const spread = Math.min(Math.PI * 0.5, Math.max(0.4, (count - 1) * 0.38))
  const angle = count <= 1 ? branch.angle : branch.angle + (index - (count - 1) / 2) * (spread / Math.max(count - 1, 1))
  return {
    x: branch.x + SUB_R * Math.cos(angle),
    y: branch.y + SUB_R * Math.sin(angle),
  }
}

function renderSubNodeAt(branch: { x: number; y: number }, point: { x: number; y: number }, sub: MdArtItem, theme: MdArtTheme): string {
  const { display, url } = displayLabelValue(sub)
  return `<line x1="${branch.x.toFixed(1)}" y1="${branch.y.toFixed(1)}" x2="${point.x.toFixed(1)}" y2="${point.y.toFixed(1)}" stroke="${theme.border}88" stroke-width="1.5"/>` +
    `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${SUB_NODE_R}" fill="${theme.muted}" stroke="${theme.accent}88" stroke-width="1.2">${itemTitleTag(sub)}</circle>` +
    aWrap(`<text x="${point.x.toFixed(1)}" y="${(point.y + 3.5).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.text}" ${FONT_SANS_ATTR}>${tt(display, 9, sub)}</text>`, url)
}

function renderBranchLabel(branch: MdArtItem, x: number, y: number, theme: MdArtTheme): string {
  const { display, url } = displayLabelValue(branch)
  const words = display.split(' ')
  if (words.length === 1) {
    return aWrap(`<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.bg}" font-weight="700" ${FONT_SANS_ATTR}>${tt(display, 9, branch)}</text>`, url)
  }
  const mid = Math.ceil(words.length / 2)
  return aWrap(
    `<text x="${x.toFixed(1)}" y="${(y - 1).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.bg}" font-weight="700" ${FONT_SANS_ATTR}>${tt(words.slice(0, mid).join(' '), 9)}</text>` +
    `<text x="${x.toFixed(1)}" y="${(y + 9).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.bg}" font-weight="700" ${FONT_SANS_ATTR}>${tt(words.slice(mid).join(' '), 9)}</text>`,
    url,
  )
}

function renderBranch(branch: MdArtItem, index: number, count: number, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const point = branchPoint(index, count)
  const unit: string[] = []
  unit.push(`<line x1="${CX}" y1="${CY}" x2="${point.x.toFixed(1)}" y2="${point.y.toFixed(1)}" stroke="${theme.accent}50" stroke-width="2.5"/>`)
  branch.children.forEach((sub, subIndex) => {
    unit.push(renderSubNodeAt(point, subPoint(point, subIndex, branch.children.length), sub, theme))
  })
  unit.push(`<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${BRANCH_NODE_R}" fill="${theme.primary}" stroke="${theme.bg}" stroke-width="2">${itemTitleTag(branch)}</circle>`)
  unit.push(renderBranchLabel(branch, point.x, point.y, theme))
  return wrapItem(unit.join(''), index + 1, animate, instrument)
}

function renderCenterLabel(label: string, theme: MdArtTheme): string {
  const words = label.split(' ')
  if (words.length === 1) {
    return `<text x="${CX}" y="${CY + 4}" text-anchor="middle" font-size="11" fill="${theme.bg}" font-weight="700" ${FONT_SANS_ATTR}>${tt(label, 12)}</text>`
  }
  const mid = Math.ceil(words.length / 2)
  return `<text x="${CX}" y="${CY - 2}" text-anchor="middle" font-size="10" fill="${theme.bg}" font-weight="700" ${FONT_SANS_ATTR}>${tt(words.slice(0, mid).join(' '), 12)}</text>` +
    `<text x="${CX}" y="${CY + 11}" text-anchor="middle" font-size="10" fill="${theme.bg}" font-weight="700" ${FONT_SANS_ATTR}>${tt(words.slice(mid).join(' '), 12)}</text>`
}

function renderCenter(label: string, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  return wrapItem(
    `<circle cx="${CX}" cy="${CY}" r="${CENTER_R}" fill="${theme.accent}" stroke="${theme.bg}" stroke-width="2"/>` +
    renderCenterLabel(label, theme),
    0,
    animate,
    instrument,
  )
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
  const branchCount = layout.branches.length || 1
  const animationCount = layout.branches.length + 1
  const parts = [
    renderCenter(layout.centerLabel, theme, animate, instrument),
    ...layout.branches.map((branch, index) => renderBranch(branch, index, branchCount, theme, animate, instrument)),
  ]
  if (animate) parts.unshift(seqSpotlightCSS(animationCount, spec, { scale: false }))
  return renderSvg(parts, theme)
}
