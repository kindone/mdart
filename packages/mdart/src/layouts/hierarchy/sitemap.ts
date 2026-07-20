import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, aWrap, itemTitleTag, displayLabelValue, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'
import { countLeaves, maxDepth } from './shared'

const W = 640
const LEVEL_H = 52
const TITLE_H_WITH_TITLE = 28
const TITLE_H_NO_TITLE = 10
const MIN_H = 120
const BOTTOM_PAD = 30
const BOX_W = [90, 76, 64]
const BOX_H = [26, 22, 18]

interface SitemapNode {
  label: string
  value?: string
  attrs?: string[]
  level: number
  x: number
  y: number
  parentX?: number
  parentY?: number
}

interface SitemapLayout {
  H: number
  titleH: number
  nodes: SitemapNode[]
}

function boxW(level: number): number { return BOX_W[Math.min(level, 2)] }
function boxH(level: number): number { return BOX_H[Math.min(level, 2)] }

function layoutNodes(items: MdArtItem[], titleH: number): SitemapNode[] {
  const nodes: SitemapNode[] = []
  function visit(levelItems: MdArtItem[], level: number, x0: number, x1: number, px?: number, py?: number) {
    const tot = levelItems.reduce((s, item) => s + countLeaves(item), 0) || 1
    let cx2 = x0
    for (const item of levelItems) {
      const leaves = countLeaves(item)
      const myW = (leaves / tot) * (x1 - x0)
      const nx = cx2 + myW / 2
      const ny = titleH + level * LEVEL_H + boxH(level) / 2
      nodes.push({ label: item.label, value: item.value, attrs: item.attrs, level, x: nx, y: ny, parentX: px, parentY: py })
      visit(item.children, level + 1, cx2, cx2 + myW, nx, ny)
      cx2 += myW
    }
  }
  visit(items, 0, 0, W)
  return nodes
}

function measureSitemap(spec: MdArtSpec): SitemapLayout {
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const H = Math.max(MIN_H, maxDepth(spec.items) * LEVEL_H + titleH + BOTTOM_PAD)
  return { H, titleH, nodes: layoutNodes(spec.items, titleH) }
}

function renderConnector(node: SitemapNode, theme: MdArtTheme): string {
  if (node.parentX === undefined || node.parentY === undefined) return ''
  const py = node.parentY + boxH(node.level - 1) / 2
  const cy = node.y - boxH(node.level) / 2
  return `<line x1="${node.parentX.toFixed(1)}" y1="${py.toFixed(1)}" x2="${node.x.toFixed(1)}" y2="${cy.toFixed(1)}" stroke="${theme.textMuted}aa" stroke-width="1.2"/>`
}

function nodeFill(level: number, theme: MdArtTheme): string {
  return level === 0 ? theme.accent : level === 1 ? theme.primary : theme.secondary
}

function nodeFontSize(level: number): number {
  return level === 0 ? 10 : level === 1 ? 9 : 8
}

function renderNodeBox(node: SitemapNode, theme: MdArtTheme): string {
  return `<rect x="${(node.x - boxW(node.level) / 2).toFixed(1)}" y="${(node.y - boxH(node.level) / 2).toFixed(1)}" width="${boxW(node.level)}" height="${boxH(node.level)}" rx="4" fill="${nodeFill(node.level, theme)}" stroke="${theme.bg}" stroke-width="1.5">${itemTitleTag(node)}</rect>`
}

function renderNodeText(node: SitemapNode, theme: MdArtTheme): string {
  const { display, url } = displayLabelValue(node)
  return aWrap(`<text x="${node.x.toFixed(1)}" y="${(node.y + 4).toFixed(1)}" text-anchor="middle" font-size="${nodeFontSize(node.level)}" fill="${theme.bg}" ${FONT_SANS_ATTR} font-weight="600">${tt(display, 12, node)}</text>`, url)
}

function renderNode(node: SitemapNode, index: number, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const unit = [
    renderConnector(node, theme),
    renderNodeBox(node, theme),
    renderNodeText(node, theme),
  ].join('')
  return wrapItem(unit, index, animate, instrument)
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  return spec.title
    ? `<text x="${W / 2}" y="18" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(spec.title)}</text>`
    : ''
}

function renderSvg(layout: SitemapLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${layout.H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${renderTitle(spec, theme)}
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layout = measureSitemap(spec)
  const parts = layout.nodes.map((node, index) => renderNode(node, index, theme, animate, instrument))
  if (animate) parts.unshift(seqSpotlightCSS(layout.nodes.length, spec, { scale: false }))

  return renderSvg(layout, spec, theme, parts)
}

function renderEmpty(theme: MdArtTheme): string {
  return `<svg viewBox="0 0 300 80" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  <text x="150" y="42" text-anchor="middle" font-size="12" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>No items</text>
</svg>`
}
