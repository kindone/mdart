import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 500
const STEP_H = 60
const PAD = 20
const TITLE_H = 30
const MAX_W = 440
const MIN_W = 130
const BAND_TEXT_PAD = 16
const BAND_BOX_H = STEP_H - 12
const PERCENT_X = W - 8

type Metric = { num: number | null; raw: string | null }

interface FunnelLayout {
  n: number
  titleH: number
  height: number
}

interface FunnelNode {
  item: MdArtItem
  index: number
  t: number
  x: number
  y: number
  w: number
  nextX: number
  nextW: number
  bandW: number
  fill: string
  metric: Metric
  display: ReturnType<typeof displayLabel>
}

/** Parse a strictly-numeric string (allowing commas, underscores, whitespace). */
function parseNum(s: string): number | null {
  const m = s.replace(/[,_\s]/g, '').match(/^-?\d+(\.\d+)?$/)
  return m ? parseFloat(m[0]) : null
}

/** Prefer `item.value` as the metric, falling back to the first numeric child. */
function deriveMetric(item: MdArtItem): Metric {
  if (item.value) return { num: parseNum(item.value), raw: item.value }
  if (item.children[0]) {
    const n = parseNum(item.children[0].label)
    if (n !== null) return { num: n, raw: item.children[0].label }
  }
  return { num: null, raw: null }
}

function fmtNum(n: number): string {
  return Math.abs(n) >= 1000
    ? n.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : n.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

function bandWidth(t: number): number {
  return MAX_W - (MAX_W - MIN_W) * t
}

function resolveLayout(spec: MdArtSpec): FunnelLayout {
  const n = spec.items.length
  const titleH = spec.title ? TITLE_H : 0
  return { n, titleH, height: titleH + PAD + n * STEP_H + PAD }
}

function placeNodes(spec: MdArtSpec, layout: FunnelLayout, theme: MdArtTheme): FunnelNode[] {
  const metrics = spec.items.map(deriveMetric)
  return spec.items.map((item, index) => {
    const t = index / (layout.n - 1 || 1)
    const w = bandWidth(t)
    const nextT = index < layout.n - 1 ? (index + 1) / (layout.n - 1 || 1) : t
    const nextW = bandWidth(nextT)
    return {
      item,
      index,
      t,
      x: (W - w) / 2,
      y: layout.titleH + PAD + index * STEP_H,
      w,
      nextX: (W - nextW) / 2,
      nextW,
      bandW: Math.max(20, Math.min(w, nextW) - BAND_TEXT_PAD),
      fill: lerpColor(theme.primary, theme.secondary, t),
      metric: metrics[index],
      display: displayLabel(item, { value: metrics[index].raw !== null }),
    }
  })
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  if (!spec.title) return ''
  return `<text x="${W / 2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(spec.title)}</text>`
}

function renderBand(node: FunnelNode): string {
  const points = `${node.x},${node.y} ${node.x + node.w},${node.y} ${node.nextX + node.nextW},${node.y + STEP_H} ${node.nextX},${node.y + STEP_H}`
  return `<polygon points="${points}" fill="${node.fill}28" stroke="${node.fill}" stroke-width="1.5">${itemTitleTag(node.item)}</polygon>`
}

function renderMetricBlock(node: FunnelNode, theme: MdArtTheme): string {
  const bandCx = W / 2
  const bandCy = node.y + STEP_H / 2
  const metricTextFull = node.metric.num !== null ? fmtNum(node.metric.num) : node.metric.raw!
  const metricFit = fitTextToWidthShared([metricTextFull], node.bandW, { maxSize: 19, minSize: 10, maxLines: 1 })
  const { lines: metricLines, truncated: metricTruncated } = metricFit.results[0]
  const reservedBoxH = Math.max(10, BAND_BOX_H - metricFit.lineHeight - 4)
  const captionText = node.display.display.toUpperCase()
  const captionFit = fitTextToWidthShared([captionText], node.bandW, {
    maxSize: 10,
    minSize: 6.5,
    maxLines: 2,
    boxH: reservedBoxH,
  })
  const { lines: captionLines, truncated: captionTruncated } = captionFit.results[0]
  const captionTip = captionTruncated ? `<title>${escapeXml(captionText)}</title>` : ''
  const metricTip = metricTruncated ? `<title>${escapeXml(metricTextFull)}</title>` : ''
  const totalH = captionLines.length * captionFit.lineHeight + metricFit.lineHeight + 4
  let content = captionTip
  captionLines.forEach((line, lineIndex) => {
    const ty = bandCy - totalH / 2 + lineIndex * captionFit.lineHeight + captionFit.lineHeight * 0.8
    content += `<text x="${bandCx}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="${captionFit.fontSize}" fill="${theme.text}" fill-opacity="0.85" ${FONT_SANS_ATTR} font-weight="700" letter-spacing="0.08em">${escapeXml(line)}</text>`
  })
  const metricY = bandCy - totalH / 2 + captionLines.length * captionFit.lineHeight + metricFit.lineHeight * 0.8
  content = aWrap(content, node.display.url)
  return content + `${metricTip}<text x="${bandCx}" y="${metricY.toFixed(1)}" text-anchor="middle" font-size="${metricFit.fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="800" letter-spacing="0.02em">${escapeXml(metricLines[0])}</text>`
}

function renderLabelBlock(node: FunnelNode, theme: MdArtTheme): string {
  const bandCx = W / 2
  const bandCy = node.y + STEP_H / 2
  const labelFit = fitTextToWidthShared([node.display.display], node.bandW, {
    maxSize: 13,
    minSize: 6.5,
    maxLines: 2,
    boxH: BAND_BOX_H,
  })
  const { lines, truncated } = labelFit.results[0]
  const tip = truncated ? `<title>${escapeXml(node.display.display)}</title>` : ''
  const totalH = lines.length * labelFit.lineHeight
  let content = tip
  lines.forEach((line, lineIndex) => {
    const ty = bandCy - totalH / 2 + lineIndex * labelFit.lineHeight + labelFit.lineHeight * 0.8
    content += `<text x="${bandCx}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="${labelFit.fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(line)}</text>`
  })
  return aWrap(content, node.display.url)
}

function renderConversion(node: FunnelNode, previous: FunnelNode | undefined, theme: MdArtTheme): string {
  if (!previous || previous.metric.num === null || node.metric.num === null || previous.metric.num <= 0) return ''
  const pct = (node.metric.num / previous.metric.num) * 100
  const pctText = pct >= 10 ? `${Math.round(pct)}%` : `${pct.toFixed(1)}%`
  return `<text x="${PERCENT_X}" y="${(node.y + STEP_H / 2 + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="${theme.accent}" ${FONT_SANS_ATTR} font-weight="700">↓ ${pctText}</text>`
}

function renderNode(node: FunnelNode, previous: FunnelNode | undefined, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const text = node.metric.raw !== null ? renderMetricBlock(node, theme) : renderLabelBlock(node, theme)
  return wrapItem(renderBand(node) + text + renderConversion(node, previous, theme), node.index, animate, instrument)
}

function renderSvg(layout: FunnelLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  const animate = shouldAnimate(spec)
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${layout.height}" fill="${theme.bg}" rx="8"/>
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
    renderTitle(spec, theme),
    ...nodes.map((node, index) => renderNode(node, nodes[index - 1], theme, animate, instrument)),
  ].filter(Boolean)

  return renderSvg(layout, spec, theme, parts)
}
