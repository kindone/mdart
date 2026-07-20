import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, titleEl, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 560
const MAX_PHASES = 4
const GAP = 6
const HEADER_H = 32
const ROW_H = 28
const TITLE_H_WITH_TITLE = 28
const TITLE_H_NO_TITLE = 8
const BOTTOM_PAD = 8
const BODY_BOTTOM_PAD = 12
const HEADER_BOTTOM_FILL_H = 6
const CARD_RX = 6
const CHILD_RX = 3
const CHILD_PAD_X = 4

interface PhaseLayout {
  n: number
  titleH: number
  colW: number
  colH: number
  maxChildren: number
  height: number
}

interface PhasePlacement {
  item: MdArtItem
  index: number
  x: number
  y: number
  fill: string
  display: ReturnType<typeof displayLabel>
}

function titleHeight(spec: MdArtSpec): number {
  return spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
}

function resolveLayout(spec: MdArtSpec): PhaseLayout {
  const n = Math.min(spec.items.length, MAX_PHASES)
  const shownItems = spec.items.slice(0, n)
  const maxChildren = Math.max(...shownItems.map(item => item.children.length), 2)
  const titleH = titleHeight(spec)
  const colH = HEADER_H + maxChildren * ROW_H + BODY_BOTTOM_PAD
  return {
    n,
    titleH,
    colW: (W - (n - 1) * GAP) / n,
    colH,
    maxChildren,
    height: titleH + colH + BOTTOM_PAD,
  }
}

function placePhases(spec: MdArtSpec, layout: PhaseLayout, theme: MdArtTheme): PhasePlacement[] {
  return spec.items.slice(0, layout.n).map((item, index) => {
    const t = layout.n > 1 ? index / (layout.n - 1) : 0
    return {
      item,
      index,
      x: index * (layout.colW + GAP),
      y: layout.titleH,
      fill: lerpColor(theme.primary, theme.secondary, t),
      display: displayLabel(item),
    }
  })
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  return spec.title ? titleEl(W, spec.title, theme) : ''
}

function renderPhaseShell(phase: PhasePlacement, layout: PhaseLayout, theme: MdArtTheme): string {
  return `<rect x="${phase.x.toFixed(1)}" y="${phase.y.toFixed(1)}" width="${layout.colW.toFixed(1)}" height="${layout.colH}" rx="${CARD_RX}" fill="${theme.surface}" stroke="${phase.fill}55" stroke-width="1">${itemTitleTag(phase.item)}</rect>` +
    `<rect x="${phase.x.toFixed(1)}" y="${phase.y.toFixed(1)}" width="${layout.colW.toFixed(1)}" height="${HEADER_H}" rx="${CARD_RX}" fill="${phase.fill}"/>` +
    `<rect x="${phase.x.toFixed(1)}" y="${(phase.y + HEADER_H - HEADER_BOTTOM_FILL_H).toFixed(1)}" width="${layout.colW.toFixed(1)}" height="${HEADER_BOTTOM_FILL_H}" fill="${phase.fill}"/>`
}

function tspans(lines: string[], x: number, lineH: number): string {
  return lines.map((line, lineIndex) => `<tspan x="${x.toFixed(1)}" dy="${lineIndex === 0 ? 0 : lineH.toFixed(1)}">${escapeXml(line)}</tspan>`).join('')
}

function renderHeader(phase: PhasePlacement, layout: PhaseLayout): string {
  const fit = fitTextToWidthShared([phase.display.display], layout.colW - 8, {
    maxSize: 10,
    minSize: 6.5,
    maxLines: 2,
    boxH: HEADER_H - 6,
  })
  const { lines, truncated } = fit.results[0]
  const tip = truncated ? `<title>${escapeXml(phase.display.display)}</title>` : ''
  const x = phase.x + layout.colW / 2
  const y = phase.y + HEADER_H / 2 - ((lines.length - 1) * fit.lineHeight) / 2 + fit.lineHeight * 0.35
  return aWrap(`${tip}<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="${fit.fontSize}" fill="#fff" ${FONT_SANS_ATTR} font-weight="700">${tspans(lines, x, fit.lineHeight)}</text>`, phase.display.url)
}

function renderChildRow(phase: PhasePlacement, layout: PhaseLayout, child: MdArtItem, childIndex: number, theme: MdArtTheme): string {
  const rowY = phase.y + HEADER_H + childIndex * ROW_H + 6
  const fit = fitTextToWidthShared([child.label], layout.colW - 8, {
    maxSize: 9,
    minSize: 6,
    maxLines: 2,
    boxH: ROW_H - 4,
  })
  const { lines, truncated } = fit.results[0]
  const tip = truncated ? `<title>${escapeXml(child.label)}</title>` : ''
  const x = phase.x + layout.colW / 2
  const y = rowY + ROW_H / 2 - ((lines.length - 1) * (fit.fontSize * 1.3)) / 2 + fit.fontSize * 0.35
  return `<rect x="${(phase.x + CHILD_PAD_X).toFixed(1)}" y="${rowY.toFixed(1)}" width="${(layout.colW - CHILD_PAD_X * 2).toFixed(1)}" height="${ROW_H - 2}" rx="${CHILD_RX}" fill="${phase.fill}22"/>` +
    `${tip}<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="${fit.fontSize}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tspans(lines, x, fit.fontSize * 1.3)}</text>`
}

function renderChildren(phase: PhasePlacement, layout: PhaseLayout, theme: MdArtTheme): string {
  return phase.item.children
    .slice(0, layout.maxChildren)
    .map((child, childIndex) => renderChildRow(phase, layout, child, childIndex, theme))
    .join('')
}

function renderPhase(phase: PhasePlacement, layout: PhaseLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const node = renderPhaseShell(phase, layout, theme) +
    renderHeader(phase, layout) +
    renderChildren(phase, layout, theme)
  return wrapItem(node, phase.index, animate, instrument)
}

function renderSvg(layout: PhaseLayout, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${layout.height}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)

  const layout = resolveLayout(spec)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const phases = placePhases(spec, layout, theme)
  const parts = [
    ...(animate ? [seqSpotlightCSS(layout.n, spec)] : []),
    renderTitle(spec, theme),
    ...phases.map(phase => renderPhase(phase, layout, theme, animate, instrument)),
  ].filter(Boolean)

  return renderSvg(layout, theme, parts)
}
