import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, truncate, wrapLabel, aWrap, lerpColor, renderEmpty, itemTitleTag, ellipsisIfDropped, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 600
const MARGIN_TOP_WITH_TITLE = 34
const MARGIN_TOP_NO_TITLE = 12
const MARGIN_BOTTOM = 16
const MAX_HEIGHT = 340
const MAX_W = W - 40
const MIN_W = 44

interface PyramidLayout {
  n: number
  inverted: boolean
  marginTop: number
  layerH: number
  height: number
}

interface PyramidLayer {
  item: MdArtItem
  index: number
  animIndex: number
  y: number
  topW: number
  bottomW: number
  midW: number
  fill: string
}

function resolveLayout(spec: MdArtSpec): PyramidLayout {
  const n = spec.items.length
  const marginTop = spec.title ? MARGIN_TOP_WITH_TITLE : MARGIN_TOP_NO_TITLE
  const layerH = Math.min(62, Math.max(28, (MAX_HEIGHT - marginTop - MARGIN_BOTTOM) / n))
  return {
    n,
    inverted: spec.type === 'inverted-pyramid' || spec.type === 'inverted',
    marginTop,
    layerH,
    height: marginTop + n * layerH + MARGIN_BOTTOM,
  }
}

function layerWidths(index: number, layout: PyramidLayout): { topW: number, bottomW: number } {
  if (layout.inverted) {
    return {
      topW: MIN_W + ((layout.n - index) / layout.n) * (MAX_W - MIN_W),
      bottomW: MIN_W + ((layout.n - index - 1) / layout.n) * (MAX_W - MIN_W),
    }
  }
  return {
    topW: MIN_W + (index / layout.n) * (MAX_W - MIN_W),
    bottomW: MIN_W + ((index + 1) / layout.n) * (MAX_W - MIN_W),
  }
}

function placeLayers(spec: MdArtSpec, layout: PyramidLayout, theme: MdArtTheme): PyramidLayer[] {
  return spec.items.map((item, index) => {
    const { topW, bottomW } = layerWidths(index, layout)
    const narrowT = layout.inverted ? 1 - index / Math.max(layout.n - 1, 1) : index / Math.max(layout.n - 1, 1)
    return {
      item,
      index,
      animIndex: layout.inverted ? index : layout.n - 1 - index,
      y: layout.marginTop + index * layout.layerH,
      topW,
      bottomW,
      midW: (topW + bottomW) / 2,
      fill: lerpColor(theme.primary, theme.muted, narrowT * 0.7),
    }
  })
}

function fontSizeFor(midW: number): number {
  return midW > 140 ? 12 : midW > 80 ? 11 : midW > 50 ? 9 : 8
}

function renderShape(layer: PyramidLayer, layout: PyramidLayout, theme: MdArtTheme): string {
  const cx = W / 2
  const topLeft = cx - layer.topW / 2
  const topRight = cx + layer.topW / 2
  const bottomLeft = cx - layer.bottomW / 2
  const bottomRight = cx + layer.bottomW / 2
  return `<polygon points="${topLeft.toFixed(1)},${layer.y.toFixed(1)} ${topRight.toFixed(1)},${layer.y.toFixed(1)} ${bottomRight.toFixed(1)},${(layer.y + layout.layerH).toFixed(1)} ${bottomLeft.toFixed(1)},${(layer.y + layout.layerH).toFixed(1)}" fill="${layer.fill}" stroke="${theme.bg}" stroke-width="2">${itemTitleTag(layer.item)}</polygon>`
}

function renderMainText(layer: PyramidLayer, layout: PyramidLayout, theme: MdArtTheme): string {
  const fontSize = fontSizeFor(layer.midW)
  const maxChars = Math.max(4, Math.floor(layer.midW / 7))
  const maxLines = layout.layerH >= 32 ? 3 : 1
  const baseLabel = layer.item.value ? `${layer.item.label} · ${layer.item.value}` : layer.item.label
  const labelText = ellipsisIfDropped(baseLabel, layer.item, { value: true })
  const wrapped = wrapLabel(labelText, maxChars, maxLines)
  const lineH = fontSize + 2
  const firstY = layer.y + layout.layerH / 2 - ((wrapped.lines.length - 1) * lineH) / 2 + fontSize * 0.3
  const tip = wrapped.truncated ? `<title>${escapeXml(baseLabel)}</title>` : ''
  const tspans = wrapped.lines
    .map((line, lineIndex) => `<tspan x="${(W / 2).toFixed(1)}" dy="${lineIndex === 0 ? 0 : lineH}">${escapeXml(line)}</tspan>`)
    .join('')
  return aWrap(`<text x="${(W / 2).toFixed(1)}" y="${firstY.toFixed(1)}" text-anchor="middle" font-size="${fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR}>${tip}${tspans}</text>`, wrapped.url)
}

function renderSideText(layer: PyramidLayer, layout: PyramidLayout, theme: MdArtTheme): string {
  if (layer.midW >= 60 || !layer.item.label) return ''
  const fontSize = fontSizeFor(layer.midW)
  const sideX = W / 2 + Math.max(layer.topW, layer.bottomW) / 2 + 8
  const sideY = layer.y + layout.layerH / 2 + fontSize * 0.3
  const sideText = layer.item.value ? `${layer.item.label} · ${layer.item.value}` : layer.item.label
  const truncated = truncate(sideText, 24)
  const tip = truncated !== sideText ? `<title>${escapeXml(sideText)}</title>` : ''
  return `<text x="${sideX.toFixed(1)}" y="${sideY.toFixed(1)}" font-size="10" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tip}${escapeXml(truncated)}</text>`
}

function renderLayer(layer: PyramidLayer, layout: PyramidLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  return wrapItem(renderShape(layer, layout, theme) + renderMainText(layer, layout, theme) + renderSideText(layer, layout, theme), layer.animIndex, animate, instrument)
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  if (!spec.title) return ''
  return `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(spec.title)}</text>`
}

function renderSvg(layout: PyramidLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  const animate = shouldAnimate(spec)
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${animate ? seqSpotlightCSS(layout.n, spec, { scale: false }) : ''}
  ${renderTitle(spec, theme)}
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)

  const layout = resolveLayout(spec)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layers = placeLayers(spec, layout, theme)
  const parts = layers.map(layer => renderLayer(layer, layout, theme, animate, instrument))

  return renderSvg(layout, spec, theme, parts)
}
