import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, titleEl, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const BASE_W = 560
const TURN_EXT = 32
const W = BASE_W + TURN_EXT * 2
const SIDE_PAD = 16
const BOX_GAP = 6
const BOX_H_WITH_VALUE = 60
const BOX_H_NO_VALUE = 44
const ROW_GAP = 24
const TITLE_H_WITH_TITLE = 28
const TITLE_H_NO_TITLE = 8
const ROW_TOP_GAP = 4
const BOTTOM_PAD = 8
const ARROW_ID = 'bp-r'

interface BendingLayout {
  n: number
  cols: number
  rows: number
  boxW: number
  boxH: number
  titleH: number
  height: number
}

interface BendingNode {
  item: MdArtItem
  index: number
  row: number
  x: number
  y: number
  fill: string
  isLast: boolean
  display: ReturnType<typeof displayLabel>
}

function resolveLayout(spec: MdArtSpec): BendingLayout {
  const n = spec.items.length
  const cols = Math.ceil(Math.sqrt(n * 1.5))
  const rows = Math.ceil(n / cols)
  const anyValue = spec.items.some(item => !!item.value)
  const boxW = (BASE_W - SIDE_PAD) / cols - BOX_GAP
  const boxH = anyValue ? BOX_H_WITH_VALUE : BOX_H_NO_VALUE
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  return {
    n,
    cols,
    rows,
    boxW,
    boxH,
    titleH,
    height: titleH + rows * (boxH + ROW_GAP) + BOTTOM_PAD,
  }
}

function placeNodes(spec: MdArtSpec, layout: BendingLayout, theme: MdArtTheme): BendingNode[] {
  return spec.items.map((item, index) => {
    const row = Math.floor(index / layout.cols)
    const col = row % 2 === 0 ? index % layout.cols : layout.cols - 1 - (index % layout.cols)
    const t = layout.n > 1 ? index / (layout.n - 1) : 0
    return {
      item,
      index,
      row,
      x: TURN_EXT + 8 + col * (layout.boxW + BOX_GAP),
      y: layout.titleH + ROW_TOP_GAP + row * (layout.boxH + ROW_GAP),
      fill: lerpColor(theme.primary, theme.secondary, t),
      isLast: index === layout.n - 1,
      display: displayLabel(item, { value: !!item.value }),
    }
  })
}

function renderDefs(theme: MdArtTheme): string {
  return `<defs>
    <marker id="${ARROW_ID}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><polygon points="0,0 8,4 0,8" fill="${theme.accent}"/></marker>
  </defs>`
}

function fitNodeText(node: BendingNode, layout: BendingLayout) {
  const labelFit = fitTextToWidthShared([node.display.display], layout.boxW - 8, {
    maxSize: 10,
    minSize: 6.5,
    maxLines: node.item.value ? 2 : 3,
    boxH: node.item.value ? 34 : layout.boxH - 8,
  })
  const valueFit = node.item.value
    ? fitTextToWidthShared([node.item.value], layout.boxW - 8, { maxSize: 9.5, minSize: 6, maxLines: 3, boxH: 30 })
    : null
  return { labelFit, valueFit }
}

function renderShape(node: BendingNode, layout: BendingLayout, theme: MdArtTheme): string {
  const stroke = node.isLast ? theme.accent : node.fill
  return `<rect x="${node.x.toFixed(1)}" y="${node.y.toFixed(1)}" width="${layout.boxW.toFixed(1)}" height="${layout.boxH}" rx="5" fill="${stroke}33" stroke="${stroke}" stroke-width="1.2">${itemTitleTag(node.item)}</rect>`
}

function renderLabelOnly(node: BendingNode, layout: BendingLayout, theme: MdArtTheme, labelFit: ReturnType<typeof fitTextToWidthShared>): string {
  const { lines, truncated } = labelFit.results[0]
  const labelTip = truncated ? `<title>${escapeXml(node.display.display)}</title>` : ''
  const startY = node.y + layout.boxH / 2 - ((lines.length - 1) * labelFit.lineHeight) / 2 + labelFit.lineHeight * 0.35
  const spans = lines
    .map((line, lineIndex) => `<tspan x="${(node.x + layout.boxW / 2).toFixed(1)}" dy="${lineIndex === 0 ? 0 : labelFit.lineHeight.toFixed(1)}">${escapeXml(line)}</tspan>`)
    .join('')
  return aWrap(`${labelTip}<text x="${(node.x + layout.boxW / 2).toFixed(1)}" y="${startY.toFixed(1)}" text-anchor="middle" font-size="${labelFit.fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${spans}</text>`, node.display.url)
}

function renderLabelValue(node: BendingNode, layout: BendingLayout, theme: MdArtTheme, labelFit: ReturnType<typeof fitTextToWidthShared>, valueFit: ReturnType<typeof fitTextToWidthShared>): string {
  const { lines: labelLines, truncated: labelTruncated } = labelFit.results[0]
  const { lines: valueLines, truncated: valueTruncated } = valueFit.results[0]
  const labelTip = labelTruncated ? `<title>${escapeXml(node.display.display)}</title>` : ''
  const valueTip = valueTruncated ? `<title>${escapeXml(node.item.value!)}</title>` : ''
  const valueLH = valueFit.lineHeight
  const totalTextH = labelLines.length * labelFit.lineHeight + 2 + valueLines.length * valueLH
  const labelStartY = node.y + layout.boxH / 2 - totalTextH / 2 + labelFit.lineHeight * 0.8
  const labelSpans = labelLines
    .map((line, lineIndex) => `<tspan x="${(node.x + layout.boxW / 2).toFixed(1)}" dy="${lineIndex === 0 ? 0 : labelFit.lineHeight.toFixed(1)}">${escapeXml(line)}</tspan>`)
    .join('')
  const valueStartY = labelStartY + (labelLines.length - 1) * labelFit.lineHeight + valueLH + 2
  const valueSpans = valueLines
    .map((line, lineIndex) => `<tspan x="${(node.x + layout.boxW / 2).toFixed(1)}" dy="${lineIndex === 0 ? 0 : valueLH.toFixed(1)}">${escapeXml(line)}</tspan>`)
    .join('')

  return aWrap(`${labelTip}<text x="${(node.x + layout.boxW / 2).toFixed(1)}" y="${labelStartY.toFixed(1)}" text-anchor="middle" font-size="${labelFit.fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${labelSpans}</text>`, node.display.url) +
    `${valueTip}<text x="${(node.x + layout.boxW / 2).toFixed(1)}" y="${valueStartY.toFixed(1)}" text-anchor="middle" font-size="${valueFit.fontSize}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${valueSpans}</text>`
}

function renderText(node: BendingNode, layout: BendingLayout, theme: MdArtTheme): string {
  const { labelFit, valueFit } = fitNodeText(node, layout)
  if (!valueFit) return renderLabelOnly(node, layout, theme, labelFit)
  return renderLabelValue(node, layout, theme, labelFit, valueFit)
}

function renderNode(node: BendingNode, layout: BendingLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  return wrapItem(renderShape(node, layout, theme) + renderText(node, layout, theme), node.index, animate, instrument)
}

function renderSameRowConnector(node: BendingNode, next: BendingNode, layout: BendingLayout, theme: MdArtTheme): string {
  const goRight = node.row % 2 === 0
  const x1 = goRight ? node.x + layout.boxW + 1 : node.x - 1
  const x2 = goRight ? next.x - 1 : next.x + layout.boxW + 1
  return `<line x1="${x1.toFixed(1)}" y1="${(node.y + layout.boxH / 2).toFixed(1)}" x2="${x2.toFixed(1)}" y2="${(node.y + layout.boxH / 2).toFixed(1)}" stroke="${theme.accent}99" stroke-width="1.5" marker-end="url(#${ARROW_ID})"/>`
}

function renderTurnConnector(node: BendingNode, next: BendingNode, layout: BendingLayout, theme: MdArtTheme): string {
  const goRight = node.row % 2 === 0
  const xPivot = node.x + (goRight ? layout.boxW : 0)
  const yMid1 = node.y + layout.boxH / 2
  const yMid2 = next.y + layout.boxH / 2
  const ext = Math.round(TURN_EXT * 0.5)
  const r = Math.round(ROW_GAP / 3)
  const d = goRight ? 1 : -1
  const sw = goRight ? 1 : 0
  const xA = xPivot + d * ext
  const xB = xPivot + d * (ext + r)
  const path = [
    `M${xPivot},${yMid1.toFixed(1)}`,
    `H${xA}`,
    `A${r},${r} 0 0,${sw} ${xB},${(yMid1 + r).toFixed(1)}`,
    `V${(yMid2 - r).toFixed(1)}`,
    `A${r},${r} 0 0,${sw} ${xA},${yMid2.toFixed(1)}`,
    `H${xPivot}`,
  ].join(' ')
  return `<path d="${path}" fill="none" stroke="${theme.accent}88" stroke-width="2" marker-end="url(#${ARROW_ID})"/>`
}

function renderConnector(node: BendingNode, next: BendingNode, layout: BendingLayout, theme: MdArtTheme, animate: boolean): string {
  const sameRow = node.row === next.row
  const connector = sameRow
    ? renderSameRowConnector(node, next, layout, theme)
    : renderTurnConnector(node, next, layout, theme)
  return animate ? `<g class="mdart-arr-n${node.index + 1}">${connector}</g>` : connector
}

function renderSvg(layout: BendingLayout, theme: MdArtTheme, parts: string[]): string {
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
  const nodes = placeNodes(spec, layout, theme)
  const parts = [
    ...(animate ? [seqSpotlightCSS(layout.n, spec)] : []),
    spec.title ? titleEl(W, spec.title, theme) : '',
    renderDefs(theme),
  ]

  nodes.forEach((node, index) => {
    parts.push(renderNode(node, layout, theme, animate, instrument))
    const next = nodes[index + 1]
    if (next) parts.push(renderConnector(node, next, layout, theme, animate))
  })

  return renderSvg(layout, theme, parts.filter(Boolean))
}
