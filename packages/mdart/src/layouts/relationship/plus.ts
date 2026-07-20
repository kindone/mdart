import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 500
const TITLE_H_WITH_TITLE = 28
const TITLE_H_NO_TITLE = 8
const BODY_H = 400
const ARM = 130
const BOX_W = 106
const BOX_H = 64
const CENTER_R = 30

interface PlusLayout {
  titleH: number
  height: number
  cx: number
  cy: number
}

interface ArmNode {
  item: MdArtItem
  index: number
  x: number
  y: number
  color: string
  connector: string
}

function resolveLayout(spec: MdArtSpec): PlusLayout {
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const height = BODY_H + titleH
  return { titleH, height, cx: W / 2, cy: titleH + BODY_H / 2 }
}

function svg(layout: PlusLayout, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

function armNodes(spec: MdArtSpec, layout: PlusLayout, theme: MdArtTheme): ArmNode[] {
  const positions: Array<[number, number]> = [
    [layout.cx, layout.cy - ARM],
    [layout.cx + ARM, layout.cy],
    [layout.cx, layout.cy + ARM],
    [layout.cx - ARM, layout.cy],
  ]
  const armColor = `${theme.primary}55`
  const connectors = [
    `<line x1="${layout.cx}" y1="${layout.cy - ARM + BOX_H / 2}" x2="${layout.cx}" y2="${layout.cy - CENTER_R}" stroke="${armColor}" stroke-width="12"/>`,
    `<line x1="${layout.cx + CENTER_R}" y1="${layout.cy}" x2="${layout.cx + ARM - BOX_W / 2}" y2="${layout.cy}" stroke="${armColor}" stroke-width="12"/>`,
    `<line x1="${layout.cx}" y1="${layout.cy + CENTER_R}" x2="${layout.cx}" y2="${layout.cy + ARM - BOX_H / 2}" stroke="${armColor}" stroke-width="12"/>`,
    `<line x1="${layout.cx - ARM + BOX_W / 2}" y1="${layout.cy}" x2="${layout.cx - CENTER_R}" y2="${layout.cy}" stroke="${armColor}" stroke-width="12"/>`,
  ]
  const colors = [theme.primary, theme.secondary, theme.accent, theme.primary]
  return spec.items.slice(0, 4).map((item, index) => ({
    item,
    index,
    x: positions[index][0],
    y: positions[index][1],
    color: colors[index],
    connector: connectors[index],
  }))
}

function renderCenter(spec: MdArtSpec, layout: PlusLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const item = spec.items[4]
  const unit: string[] = [
    `<circle cx="${layout.cx}" cy="${layout.cy}" r="${CENTER_R}" fill="${theme.accent}33" stroke="${theme.accent}" stroke-width="1.5"/>`,
  ]
  if (item) {
    const { display, url } = displayLabel(item)
    const { fontSize, lineHeight, results: [{ lines, truncated }] } =
      fitTextToWidthShared([display], CENTER_R * 1.4, { maxSize: 9, minSize: 6, maxLines: 4, boxH: CENTER_R * 1.6 })
    const tip = truncated ? `<title>${escapeXml(display)}</title>` : ''
    const startY = layout.cy - ((lines.length - 1) * lineHeight) / 2 + fontSize * 0.35
    const tspans = lines
      .map((line, lineIndex) => `<tspan x="${layout.cx.toFixed(1)}" dy="${lineIndex === 0 ? 0 : lineHeight.toFixed(1)}">${escapeXml(line)}</tspan>`)
      .join('')
    unit.push(aWrap(`${tip}<text x="${layout.cx.toFixed(1)}" y="${startY.toFixed(1)}" text-anchor="middle" font-size="${fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${itemTitleTag(item)}${tspans}</text>`, url))
  }
  return wrapItem(unit.join(''), 0, animate, instrument)
}

function childLabels(item: MdArtItem): string[] {
  const labels: string[] = []
  if (item.value) labels.push(item.value)
  for (const child of item.children) {
    if (labels.length >= 2) break
    labels.push(child.label)
  }
  return labels
}

function renderArmText(node: ArmNode, theme: MdArtTheme): string {
  const { display, url } = displayLabel(node.item, { value: true })
  const children = childLabels(node.item)
  const hasChildren = children.length > 0
  const labelBoxH = hasChildren ? BOX_H * 0.52 : BOX_H - 10
  const { fontSize: labelSize, lineHeight: labelLineH, results: [{ lines: labelLines, truncated: labelTruncated }] } =
    fitTextToWidthShared([display], BOX_W - 16, { maxSize: 11, minSize: 6, maxLines: 4, boxH: labelBoxH })
  const { fontSize: childSize, lineHeight: childLineH, results: childFits } = hasChildren
    ? fitTextToWidthShared(children, BOX_W - 16, { maxSize: 9, minSize: 6, maxLines: 2 })
    : { fontSize: 8.5, lineHeight: 11.05, results: [] as ReturnType<typeof fitTextToWidthShared>['results'] }

  const childLineCount = childFits.reduce((sum, fit) => sum + fit.lines.length, 0)
  const labelVisualH = (labelLines.length - 1) * labelLineH + labelSize
  const childVisualH = childLineCount > 0 ? (childLineCount - 1) * childLineH + childSize : 0
  const gap = hasChildren ? 4 : 0
  const totalH = labelVisualH + gap + childVisualH
  const labelY = node.y - totalH / 2 + labelSize * 0.75
  const labelTip = labelTruncated ? `<title>${escapeXml(display)}</title>` : ''
  const labelSpans = labelLines
    .map((line, lineIndex) => `<tspan x="${node.x.toFixed(1)}" dy="${lineIndex === 0 ? 0 : labelLineH.toFixed(1)}">${escapeXml(line)}</tspan>`)
    .join('')

  const parts = [
    aWrap(`${labelTip}<text x="${node.x.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" font-size="${labelSize}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${labelSpans}</text>`, url),
  ]
  let childLineOffset = 0
  const firstChildY = node.y - totalH / 2 + labelVisualH + gap + childSize * 0.75
  childFits.forEach(({ lines, truncated }, index) => {
    const tip = truncated ? `<title>${escapeXml(children[index])}</title>` : ''
    const y = firstChildY + childLineOffset * childLineH
    const tspans = lines
      .map((line, lineIndex) => `<tspan x="${node.x.toFixed(1)}" dy="${lineIndex === 0 ? 0 : childLineH.toFixed(1)}">${escapeXml(line)}</tspan>`)
      .join('')
    parts.push(`${tip}<text x="${node.x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="${childSize}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tspans}</text>`)
    childLineOffset += lines.length
  })
  return parts.join('')
}

function renderArm(node: ArmNode, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const unit = [
    node.connector,
    `<rect x="${(node.x - BOX_W / 2).toFixed(1)}" y="${(node.y - BOX_H / 2).toFixed(1)}" width="${BOX_W}" height="${BOX_H}" rx="6" fill="${theme.surface}" stroke="${node.color}88" stroke-width="1.5">${itemTitleTag(node.item)}</rect>`,
    renderArmText(node, theme),
  ]
  return wrapItem(unit.join(''), node.index + 1, animate, instrument)
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const layout = resolveLayout(spec)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const nodes = armNodes(spec, layout, theme)
  const parts = [
    ...(animate ? [seqSpotlightCSS(Math.min(Math.max(spec.items.length, 1), 5), spec, { scale: false })] : []),
    renderCenter(spec, layout, theme, animate, instrument),
    ...nodes.map(node => renderArm(node, theme, animate, instrument)),
  ]
  return svg(layout, theme, spec.title, parts)
}
