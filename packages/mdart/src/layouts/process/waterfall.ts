import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import {
  escapeXml,
  lerpColor,
  titleEl,
  renderEmpty,
  aWrap,
  itemTitleTag,
  displayLabel,
  shouldAnimate,
  seqSpotlightCSS,
  fitTextToWidthShared,
  type FitTextResult,
  wrapItem,
  shouldInstrument,
  FONT_SANS_ATTR,
} from '../shared'

const BOX_H = 40
const STEP_Y = 24
const BOX_GAP = 8
const TITLE_H_WITH_TITLE = 28
const TITLE_H_NO_TITLE = 8
const BASE_W = 560
const H_PAD = 40
const TOP_GAP = 14
const BOTTOM_PAD = 36
const BOX_W_MAX = 110
const BOX_W_AVAILABLE = 520
const CONNECTOR_KNEE = 4
const PAD_V = 3
const VALUE_FS_MAX = 9
const VALUE_FS_MIN = 6
const LABEL_FS_MAX = 10.5
const LABEL_FS_MIN = 6.5

interface WaterfallLayout {
  n: number
  titleH: number
  width: number
  height: number
  boxW: number
  stepX: number
  startX: number
  startY: number
  usableTextH: number
}

interface WaterfallNode {
  item: MdArtItem
  index: number
  x: number
  y: number
  fill: string
  label: ReturnType<typeof displayLabel>
}

interface StepTextFit {
  labelFS: number
  labelLH: number
  labelLines: string[]
  labelTruncated: boolean
  valueFS: number
  valueLH: number
  valueFit: FitTextResult | null
}

function titleHeight(spec: MdArtSpec): number {
  return spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
}

function resolveLayout(spec: MdArtSpec): WaterfallLayout {
  const n = spec.items.length
  const boxW = Math.min(BOX_W_MAX, Math.floor((BOX_W_AVAILABLE - (n - 1) * BOX_GAP) / Math.max(n, 1)))
  const stepX = boxW + BOX_GAP
  const totalH = STEP_Y * (n - 1) + BOX_H
  const diagW = (n - 1) * stepX + boxW + H_PAD
  const width = Math.max(BASE_W, diagW)
  const titleH = titleHeight(spec)
  return {
    n,
    titleH,
    width,
    height: totalH + titleH + BOTTOM_PAD,
    boxW,
    stepX,
    startX: (width - (stepX * (n - 1) + boxW)) / 2,
    startY: titleH + TOP_GAP,
    usableTextH: BOX_H - PAD_V * 2,
  }
}

function placeNodes(spec: MdArtSpec, layout: WaterfallLayout, theme: MdArtTheme): WaterfallNode[] {
  return spec.items.map((item, index) => {
    const t = spec.items.length > 1 ? index / (spec.items.length - 1) : 0
    return {
      item,
      index,
      x: layout.startX + index * layout.stepX,
      y: layout.startY + index * STEP_Y,
      fill: lerpColor(theme.primary, theme.secondary, t),
      label: displayLabel(item, { value: !!item.value }),
    }
  })
}

function renderTitle(spec: MdArtSpec, layout: WaterfallLayout, theme: MdArtTheme): string {
  return spec.title ? titleEl(layout.width, spec.title, theme) : ''
}

function fitStepText(node: WaterfallNode, layout: WaterfallLayout): StepTextFit {
  const textW = layout.boxW - 10
  if (!node.item.value) {
    const labelFit = fitTextToWidthShared([node.label.display], textW, {
      maxSize: LABEL_FS_MAX,
      minSize: LABEL_FS_MIN,
      maxLines: 3,
      boxH: layout.usableTextH,
    })
    return {
      labelFS: labelFit.fontSize,
      labelLH: labelFit.lineHeight,
      labelLines: labelFit.results[0].lines,
      labelTruncated: labelFit.results[0].truncated,
      valueFS: VALUE_FS_MAX,
      valueLH: VALUE_FS_MAX * 1.3,
      valueFit: null,
    }
  }

  const natural = fitTextToWidthShared([node.item.value], textW, {
    maxSize: VALUE_FS_MAX,
    minSize: VALUE_FS_MIN,
    maxLines: 1,
  })
  let bestValue = natural
  let bestLabel = fitTextToWidthShared([node.label.display], textW, {
    maxSize: LABEL_FS_MAX,
    minSize: LABEL_FS_MIN,
    maxLines: 2,
    boxH: Math.max(10, layout.usableTextH - natural.lineHeight - 4),
  })

  for (let valueFS = natural.fontSize; valueFS >= VALUE_FS_MIN; valueFS--) {
    const candidateValue = fitTextToWidthShared([node.item.value], textW, {
      maxSize: valueFS,
      minSize: valueFS,
      maxLines: 1,
    })
    const candidateLabel = fitTextToWidthShared([node.label.display], textW, {
      maxSize: LABEL_FS_MAX,
      minSize: LABEL_FS_MIN,
      maxLines: 2,
      boxH: Math.max(10, layout.usableTextH - candidateValue.lineHeight - 4),
    })
    bestValue = candidateValue
    bestLabel = candidateLabel
    if (!candidateLabel.results[0].truncated) break
  }

  return {
    labelFS: bestLabel.fontSize,
    labelLH: bestLabel.lineHeight,
    labelLines: bestLabel.results[0].lines,
    labelTruncated: bestLabel.results[0].truncated,
    valueFS: bestValue.fontSize,
    valueLH: bestValue.lineHeight,
    valueFit: bestValue.results[0],
  }
}

function renderConnector(node: WaterfallNode, next: WaterfallNode, layout: WaterfallLayout, animate: boolean): string {
  const x1 = node.x + layout.boxW
  const y1 = node.y + BOX_H / 2
  const x2 = next.x
  const y2 = next.y + BOX_H / 2
  const connector =
    `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${(x1 + CONNECTOR_KNEE).toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${node.fill}99" stroke-width="1.5"/>` +
    `<line x1="${(x1 + CONNECTOR_KNEE).toFixed(1)}" y1="${y1.toFixed(1)}" x2="${(x1 + CONNECTOR_KNEE).toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${node.fill}55" stroke-width="1.5" stroke-dasharray="3,3"/>` +
    `<line x1="${(x1 + CONNECTOR_KNEE).toFixed(1)}" y1="${y2.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${node.fill}99" stroke-width="1.5"/>`
  return animate ? `<g class="mdart-arr-n${node.index + 1}">${connector}</g>` : connector
}

function renderConnectors(nodes: WaterfallNode[], layout: WaterfallLayout, animate: boolean): string[] {
  return nodes.slice(0, -1).map((node, index) => renderConnector(node, nodes[index + 1], layout, animate))
}

function renderNodeShape(node: WaterfallNode, layout: WaterfallLayout): string {
  return `<rect x="${node.x.toFixed(1)}" y="${node.y.toFixed(1)}" width="${layout.boxW}" height="${BOX_H}" rx="5" fill="${node.fill}33" stroke="${node.fill}" stroke-width="1.5">${itemTitleTag(node.item)}</rect>`
}

function renderNodeText(node: WaterfallNode, layout: WaterfallLayout, fit: StepTextFit, theme: MdArtTheme): string {
  const cx = node.x + layout.boxW / 2
  const cy = node.y + BOX_H / 2
  const blockH = fit.labelLines.length * fit.labelLH + (fit.valueFit ? fit.valueLH + 3 : 0)
  const labelTip = fit.labelTruncated ? `<title>${escapeXml(node.label.display)}</title>` : ''
  let content = labelTip

  fit.labelLines.forEach((line, lineIndex) => {
    const y = cy - blockH / 2 + lineIndex * fit.labelLH + fit.labelLH * 0.8
    content += `<text x="${cx.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="${fit.labelFS}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(line)}</text>`
  })

  if (fit.valueFit) {
    const y = cy - blockH / 2 + fit.labelLines.length * fit.labelLH + fit.valueLH * 0.8
    const valueTip = fit.valueFit.truncated ? `<title>${escapeXml(node.item.value!)}</title>` : ''
    content += `${valueTip}<text x="${cx.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="${fit.valueFS}" fill="${theme.text}" opacity="0.7" ${FONT_SANS_ATTR}>${escapeXml(fit.valueFit.lines[0])}</text>`
  }

  return aWrap(content, node.label.url)
}

function renderNode(node: WaterfallNode, layout: WaterfallLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  return wrapItem(renderNodeShape(node, layout) + renderNodeText(node, layout, fitStepText(node, layout), theme), node.index, animate, instrument)
}

function renderSvg(layout: WaterfallLayout, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${layout.width} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${layout.width}" height="${layout.height}" fill="${theme.bg}" rx="8"/>
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
    renderTitle(spec, layout, theme),
    ...renderConnectors(nodes, layout, animate),
    ...nodes.map(node => renderNode(node, layout, theme, animate, instrument)),
  ].filter(Boolean)

  return renderSvg(layout, theme, parts)
}
