import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 560
const TITLE_H_WITH_TITLE = 28
const TITLE_H_NO_TITLE = 8
const ROW_H = 180
const BOTTOM_PAD = 20
const CELL_GAP = 10
const CLUSTER_H = 168
const COLORS_PER_ROW = 5

interface ClusterLayout {
  n: number
  cols: number
  rows: number
  titleH: number
  height: number
  clusterW: number
  clusterH: number
}

interface ClusterGroup {
  item: MdArtItem
  index: number
  x: number
  y: number
  color: string
}

interface MemberLayout {
  members: MdArtItem[]
  count: number
  cols: number
  rows: number
  radius: number
  useableSpan: number
  stepSize: number
  rowSpacing: number
  firstRowY: number
  fontSize: number
  labelMax: number
}

function resolveLayout(spec: MdArtSpec): ClusterLayout {
  const n = spec.items.length
  const cols = n <= 2 ? n : n <= 4 ? 2 : 3
  const rows = Math.ceil(n / cols)
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  return {
    n,
    cols,
    rows,
    titleH,
    height: titleH + rows * ROW_H + BOTTOM_PAD,
    clusterW: (W - 20) / cols - CELL_GAP,
    clusterH: CLUSTER_H,
  }
}

function palette(theme: MdArtTheme): string[] {
  return [theme.primary, theme.secondary, theme.accent, theme.primary, theme.secondary].slice(0, COLORS_PER_ROW)
}

function svg(layout: ClusterLayout, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

function placeGroups(spec: MdArtSpec, layout: ClusterLayout, theme: MdArtTheme): ClusterGroup[] {
  const colors = palette(theme)
  return spec.items.map((item, index) => {
    const col = index % layout.cols
    const row = Math.floor(index / layout.cols)
    const isOrphan = layout.n % layout.cols !== 0 && index === layout.n - 1
    return {
      item,
      index,
      x: isOrphan ? W / 2 : 10 + col * (layout.clusterW + CELL_GAP) + layout.clusterW / 2,
      y: layout.titleH + 10 + row * (layout.clusterH + CELL_GAP) + layout.clusterH / 2,
      color: colors[index % colors.length],
    }
  })
}

function resolveMemberLayout(group: ClusterGroup, layout: ClusterLayout): MemberLayout {
  const members = group.item.children.slice(0, 6)
  const count = members.length
  const cols = count === 0 ? 1 : (count <= 3 ? count : Math.ceil(count / 2))
  const rows = Math.max(1, Math.ceil(count / cols))
  const marginFrac = cols <= 1 ? 0 : (cols === 2 ? 0.26 : 0.18)
  const useableSpan = cols > 1 ? layout.clusterW * (1 - 2 * marginFrac) : 0
  const stepSize = cols > 1 ? useableSpan / (cols - 1) : 0
  const ellipseMargin = 8
  const minGap = 8
  const radiusFromEllipse = layout.clusterW / 2 - (cols > 1 ? useableSpan / 2 : 0) - ellipseMargin
  const radiusFromGap = cols > 1 ? (stepSize - minGap) / 2 : Infinity
  let radius = Math.max(13, Math.min(40, Math.floor(Math.min(radiusFromEllipse, radiusFromGap))))
  let verticalOffset = rows === 1 ? 9 : 0

  if (rows > 1) {
    const xFar = useableSpan / 2
    while (radius > 13) {
      verticalOffset = Math.max(0, 2 * radius - 52)
      const yFar = verticalOffset + radius + 4
      const rxEff = layout.clusterW / 2 - ellipseMargin
      const ryEff = layout.clusterH / 2 - ellipseMargin
      if ((xFar * xFar) / ((rxEff - radius) ** 2) + (yFar * yFar) / ((ryEff - radius) ** 2) <= 1) break
      radius--
    }
  }

  const rowSpacing = radius * 2 + 8
  const blockH = (rows - 1) * rowSpacing
  return {
    members,
    count,
    cols,
    rows,
    radius,
    useableSpan,
    stepSize,
    rowSpacing,
    firstRowY: group.y + verticalOffset - blockH / 2,
    fontSize: radius >= 22 ? 9 : (radius >= 16 ? 8 : 7),
    labelMax: Math.max(5, Math.floor(radius * 0.55)),
  }
}

function renderGroupShell(group: ClusterGroup, layout: ClusterLayout, theme: MdArtTheme): string {
  const { display, url } = displayLabel(group.item)
  return `<ellipse cx="${group.x.toFixed(1)}" cy="${group.y.toFixed(1)}" rx="${(layout.clusterW / 2).toFixed(1)}" ry="${(layout.clusterH / 2).toFixed(1)}" fill="${group.color}14" stroke="${group.color}55" stroke-width="1.5">${itemTitleTag(group.item)}</ellipse>`
    + aWrap(`<text x="${group.x.toFixed(1)}" y="${(group.y - layout.clusterH / 2 + 16).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${tt(display, 16, group.item)}</text>`, url)
}

function renderMember(group: ClusterGroup, layout: MemberLayout, member: MdArtItem, index: number, theme: MdArtTheme): string {
  const memberCol = index % layout.cols
  const memberRow = Math.floor(index / layout.cols)
  const offset = layout.cols === 1 ? 0 : -layout.useableSpan / 2 + memberCol * layout.stepSize
  const x = group.x + offset
  const y = layout.firstRowY + memberRow * layout.rowSpacing
  const { display } = displayLabel(member)
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${layout.radius}" fill="${group.color}2a" stroke="${group.color}66" stroke-width="1">${itemTitleTag(member)}</circle>`
    + `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-size="${layout.fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR}>${tt(display, layout.labelMax, member)}</text>`
}

function renderGroup(group: ClusterGroup, layout: ClusterLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const members = resolveMemberLayout(group, layout)
  const unit = [
    renderGroupShell(group, layout, theme),
    ...members.members.map((member, index) => renderMember(group, members, member, index, theme)),
  ]
  return wrapItem(unit.join(''), group.index, animate, instrument)
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const layout = resolveLayout(spec)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const groups = placeGroups(spec, layout, theme)
  const parts = [
    ...(animate ? [seqSpotlightCSS(layout.n, spec, { scale: false })] : []),
    ...groups.map(group => renderGroup(group, layout, theme, animate, instrument)),
  ]
  return svg(layout, theme, spec.title, parts)
}
