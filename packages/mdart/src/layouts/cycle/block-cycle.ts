import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, escapeXml, titleEl, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'
import { render as renderCircleCycle } from './cycle'

const W = 560
const SIDE_PAD = 8
const GAP_X = 28
const BOX_H = 68
const HEADER_H = 20
const GAP_Y = 28
const TITLE_H_WITH_TITLE = 28
const TITLE_H_NO_TITLE = 8
const BOTTOM_PAD = 8
const ARROW_ID = 'bc-arr'

interface BlockLayout {
  n: number
  topN: number
  cols: number
  boxW: number
  titleH: number
  height: number
}

interface BlockNode {
  item: MdArtItem
  index: number
  x: number
  y: number
  col: number
  row: 0 | 1
  fill: string
  display: ReturnType<typeof displayLabel>
}

function resolveLayout(spec: MdArtSpec): BlockLayout {
  const n = spec.items.length
  const topN = n / 2
  const cols = topN
  const boxW = Math.floor((W - SIDE_PAD * 2 - (cols - 1) * GAP_X) / cols)
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  return { n, topN, cols, boxW, titleH, height: titleH + 2 * BOX_H + GAP_Y + BOTTOM_PAD }
}

function positions(layout: BlockLayout): Array<{ x: number, y: number, col: number, row: 0 | 1 }> {
  const rowY = [layout.titleH, layout.titleH + BOX_H + GAP_Y]
  const placed: Array<{ x: number, y: number, col: number, row: 0 | 1 }> = []
  for (let col = 0; col < layout.cols; col++) {
    placed.push({ x: SIDE_PAD + col * (layout.boxW + GAP_X), y: rowY[0], col, row: 0 })
  }
  for (let col = layout.cols - 1; col >= 0; col--) {
    placed.push({ x: SIDE_PAD + col * (layout.boxW + GAP_X), y: rowY[1], col, row: 1 })
  }
  return placed
}

function placeNodes(spec: MdArtSpec, layout: BlockLayout, theme: MdArtTheme): BlockNode[] {
  const pos = positions(layout)
  return spec.items.map((item, index) => {
    const t = index / (layout.n - 1 || 1)
    const showsValue = item.children.length > 0 || !!item.value
    return {
      item,
      index,
      ...pos[index],
      fill: lerpColor(theme.primary, theme.secondary, t),
      display: displayLabel(item, { value: showsValue }),
    }
  })
}

function renderDefs(theme: MdArtTheme): string {
  return `<defs>
    <marker id="${ARROW_ID}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L7,3 L0,6 Z" fill="${theme.primary}"/>
    </marker>
  </defs>`
}

function bodyTexts(item: MdArtItem): string[] {
  return item.children.length > 0
    ? item.children.slice(0, 2).map(child => child.label)
    : (item.value ? [item.value] : [])
}

function renderShell(node: BlockNode, layout: BlockLayout, theme: MdArtTheme): string {
  const x = node.x
  const y = node.y
  const boxW = layout.boxW
  return `<rect x="${x}" y="${y}" width="${boxW}" height="${BOX_H}" rx="5" fill="${theme.surface}" stroke="${node.fill}" stroke-opacity="0.55" stroke-width="1">${itemTitleTag(node.item)}</rect>` +
    `<path d="M ${x + 5} ${y} L ${x + boxW - 5} ${y} Q ${x + boxW} ${y} ${x + boxW} ${y + 5} L ${x + boxW} ${y + HEADER_H} L ${x} ${y + HEADER_H} L ${x} ${y + 5} Q ${x} ${y} ${x + 5} ${y} Z" fill="${node.fill}"/>`
}

function renderHeader(node: BlockNode, layout: BlockLayout): string {
  const fit = fitTextToWidthShared([node.display.display], layout.boxW - 8, { maxSize: 10, minSize: 7, maxLines: 1 })
  const { fontSize, results: [{ lines, truncated }] } = fit
  const tip = truncated ? `<title>${escapeXml(node.display.display)}</title>` : ''
  return aWrap(`<text x="${node.x + layout.boxW / 2}" y="${node.y + HEADER_H - 5}" text-anchor="middle" font-size="${fontSize}" fill="#ffffff" ${FONT_SANS_ATTR} font-weight="600">${tip}${escapeXml(lines[0])}</text>`, node.display.url)
}

function renderBody(node: BlockNode, layout: BlockLayout, theme: MdArtTheme): string {
  const texts = bodyTexts(node.item)
  if (texts.length === 0) return ''
  const fit = fitTextToWidthShared(texts, layout.boxW - 12, {
    maxSize: 9,
    minSize: 6.5,
    maxLines: 2,
    boxH: BOX_H - HEADER_H - 4,
  })
  const bodyMidY = node.y + HEADER_H + (BOX_H - HEADER_H) / 2
  const bodyLineCount = fit.results.reduce((sum, result) => sum + result.lines.length, 0)
  const firstBaselineY = bodyMidY - (bodyLineCount * fit.lineHeight) / 2 + fit.fontSize * 0.75
  let lineOffset = 0
  let content = ''
  fit.results.forEach(({ lines, truncated }, textIndex) => {
    const tip = truncated ? `<title>${escapeXml(texts[textIndex])}</title>` : ''
    const spans = lines
      .map((line, lineIndex) => `<tspan x="${node.x + 6}" dy="${lineIndex === 0 ? 0 : fit.lineHeight.toFixed(1)}">${escapeXml(line)}</tspan>`)
      .join('')
    content += `${tip}<text x="${node.x + 6}" y="${(firstBaselineY + lineOffset * fit.lineHeight).toFixed(1)}" font-size="${fit.fontSize}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${spans}</text>`
    lineOffset += lines.length
  })
  return content
}

function renderNode(node: BlockNode, layout: BlockLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const content = renderShell(node, layout, theme) + renderHeader(node, layout) + renderBody(node, layout, theme)
  return wrapItem(content, node.index, animate, instrument)
}

function renderArrow(from: BlockNode, to: BlockNode, layout: BlockLayout, theme: MdArtTheme, animate: boolean): string {
  let arrow: string
  if (from.row === to.row) {
    let x1: number
    let x2: number
    const y = from.y + BOX_H / 2
    if (from.x < to.x) {
      x1 = from.x + layout.boxW + 2
      x2 = to.x - 6
    } else {
      x1 = from.x - 2
      x2 = to.x + layout.boxW + 6
    }
    arrow = `<line x1="${x1.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${theme.primary}" stroke-width="1.5" marker-end="url(#${ARROW_ID})"/>`
  } else {
    const colCenter = from.x + layout.boxW / 2
    const y1 = from.row === 0 ? from.y + BOX_H + 2 : from.y - 2
    const y2 = from.row === 0 ? to.y - 6 : to.y + BOX_H + 6
    arrow = `<line x1="${colCenter.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${colCenter.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${theme.primary}" stroke-width="1.5" marker-end="url(#${ARROW_ID})"/>`
  }
  const arrIndex = from.index === layout.n - 1 ? layout.n : from.index + 1
  return animate ? `<g class="mdart-arr-n${arrIndex}">${arrow}</g>` : arrow
}

function renderSvg(layout: BlockLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  const animate = shouldAnimate(spec)
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${layout.height}" fill="${theme.bg}" rx="8"/>
    ${animate ? seqSpotlightCSS(layout.n, spec, { trailingArrowSlot: true }) : ''}
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  if (spec.items.length % 2 !== 0) return renderCircleCycle(spec, theme)

  const layout = resolveLayout(spec)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const nodes = placeNodes(spec, layout, theme)
  const parts = [
    spec.title ? titleEl(W, spec.title, theme) : '',
    renderDefs(theme),
    ...nodes.map(node => renderNode(node, layout, theme, animate, instrument)),
    ...nodes.map((node, index) => renderArrow(node, nodes[(index + 1) % layout.n], layout, theme, animate)),
  ].filter(Boolean)

  return renderSvg(layout, spec, theme, parts)
}
