import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const MIN_W = 500
const PER_ITEM_W = 100
const W_PAD_EXTRA = 80
const H = 160
const LINE_Y = 90
const DOT_R = 8
const PAD = 50
const TITLE_Y = 16
const LABEL_GAP = 4
const TICK_LEN = 18

interface TimelineLayout {
  n: number
  width: number
  spacing: number
  labelBoxW: number
}

interface TimelineNode {
  item: MdArtItem
  index: number
  x: number
  fill: string
  above: boolean
  display: ReturnType<typeof displayLabel>
}

function resolveLayout(spec: MdArtSpec): TimelineLayout {
  const n = spec.items.length
  const width = Math.max(MIN_W, n * PER_ITEM_W + W_PAD_EXTRA)
  const spacing = (width - PAD * 2) / (n - 1 || 1)
  return { n, width, spacing, labelBoxW: Math.max(30, spacing - 10) }
}

function placeNodes(spec: MdArtSpec, layout: TimelineLayout, theme: MdArtTheme): TimelineNode[] {
  return spec.items.map((item, index) => {
    const t = layout.n > 1 ? index / (layout.n - 1) : 0.5
    return {
      item,
      index,
      x: layout.n === 1 ? layout.width / 2 : PAD + index * layout.spacing,
      fill: lerpColor(theme.secondary, theme.primary, t),
      above: index % 2 === 0,
      display: displayLabel(item, { value: !!item.value }),
    }
  })
}

function renderTitle(spec: MdArtSpec, layout: TimelineLayout, theme: MdArtTheme): string {
  if (!spec.title) return ''
  return `<text x="${layout.width / 2}" y="${TITLE_Y}" text-anchor="middle" font-size="12" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${escapeXml(spec.title)}</text>`
}

function renderSpine(layout: TimelineLayout, theme: MdArtTheme): string {
  return `<line x1="${PAD}" y1="${LINE_Y}" x2="${layout.width - PAD}" y2="${LINE_Y}" stroke="${theme.border}" stroke-width="3" />`
}

function fitNode(node: TimelineNode, layout: TimelineLayout) {
  const labelFit = fitTextToWidthShared([node.display.display], layout.labelBoxW, {
    maxSize: 10,
    minSize: 6.5,
    maxLines: 2,
  })
  const valueFit = node.item.value
    ? fitTextToWidthShared([node.item.value], layout.labelBoxW, { maxSize: 9, minSize: 6, maxLines: 1 })
    : null
  return { labelFit, valueFit }
}

function labelStartY(node: TimelineNode, labelLines: string[], labelLH: number, labelFS: number, valueFS: number, valueLineCount: number, valueLH: number, lineEndY: number): number {
  if (!node.above) return lineEndY + LABEL_GAP + labelFS * 0.8
  const lastDescent = (valueLineCount > 0 ? valueFS : labelFS) * 0.2
  const lastBaselineFromFirst = valueLineCount > 0
    ? labelLines.length * labelLH + (valueLineCount - 1) * valueLH
    : (labelLines.length - 1) * labelLH
  return lineEndY - LABEL_GAP - lastBaselineFromFirst - lastDescent
}

function renderDotAndTick(node: TimelineNode, theme: MdArtTheme): string {
  const tickEnd = node.above ? LINE_Y - TICK_LEN : LINE_Y + TICK_LEN
  return `<circle cx="${node.x}" cy="${LINE_Y}" r="${DOT_R}" fill="${node.fill}" >${itemTitleTag(node.item)}</circle>` +
    `<circle cx="${node.x}" cy="${LINE_Y}" r="${DOT_R - 3}" fill="${theme.bg}" />` +
    `<line x1="${node.x}" y1="${LINE_Y}" x2="${node.x}" y2="${tickEnd}" stroke="${node.fill}" stroke-width="1.5" stroke-dasharray="3,2" />`
}

function renderLabelAndValue(node: TimelineNode, layout: TimelineLayout, theme: MdArtTheme): string {
  const { labelFit, valueFit } = fitNode(node, layout)
  const { lines, truncated } = labelFit.results[0]
  const valueLines = valueFit?.results[0].lines ?? []
  const valueTruncated = valueFit?.results[0].truncated ?? false
  const valueFS = valueFit?.fontSize ?? 9
  const valueLH = valueFS * 1.3
  const lineEndY = node.above ? LINE_Y - TICK_LEN : LINE_Y + TICK_LEN
  const labelY = labelStartY(node, lines, labelFit.lineHeight, labelFit.fontSize, valueFS, valueLines.length, valueLH, lineEndY)
  const labelTip = truncated ? `<title>${escapeXml(node.display.display)}</title>` : ''
  const valueTip = valueTruncated ? `<title>${escapeXml(node.item.value!)}</title>` : ''
  let content = labelTip
  lines.forEach((line, lineIndex) => {
    const y = labelY + lineIndex * labelFit.lineHeight
    content += `<text x="${node.x}" y="${y.toFixed(1)}" text-anchor="middle" font-size="${labelFit.fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(line)}</text>`
  })
  if (valueFit) {
    content += `${valueTip}<text x="${node.x}" y="${(labelY + lines.length * labelFit.lineHeight).toFixed(1)}" text-anchor="middle" font-size="${valueFS}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${escapeXml(valueFit.results[0].lines[0])}</text>`
  }
  return aWrap(content, node.display.url)
}

function renderNode(node: TimelineNode, layout: TimelineLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const nodeSvg = renderDotAndTick(node, theme) + renderLabelAndValue(node, layout, theme)
  return wrapItem(nodeSvg, node.index, animate, instrument)
}

function renderSvg(layout: TimelineLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  const animate = shouldAnimate(spec)
  return `<svg viewBox="0 0 ${layout.width} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${layout.width}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${animate ? seqSpotlightCSS(layout.n, spec) : ''}
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
    renderSpine(layout, theme),
    renderTitle(spec, layout, theme),
    ...nodes.map(node => renderNode(node, layout, theme, animate, instrument)),
  ].filter(Boolean)

  return renderSvg(layout, spec, theme, parts)
}
