import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, parseLink, aWrap, itemTitleTag, ellipsisIfDropped, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

export const PYRAMID_BAND_W = 600
export const PYRAMID_BAND_CX = PYRAMID_BAND_W / 2

export interface BandLayout {
  n: number
  titleH: number
  layerH: number
  height: number
  gap: number
}

export interface BandNode {
  item: MdArtItem
  index: number
  y: number
  topW: number
  bottomW: number
  fill: string
  stroke: string
}

export function renderBandTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  if (!spec.title) return ''
  return `<text x="${PYRAMID_BAND_CX}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(spec.title)}</text>`
}

export function renderBandShape(node: BandNode, layout: BandLayout, theme: MdArtTheme, strokeWidth = 2, opacitySuffix = ''): string {
  const topLeft = PYRAMID_BAND_CX - node.topW / 2
  const topRight = PYRAMID_BAND_CX + node.topW / 2
  const bottomLeft = PYRAMID_BAND_CX - node.bottomW / 2
  const bottomRight = PYRAMID_BAND_CX + node.bottomW / 2
  return `<polygon points="${topLeft.toFixed(1)},${node.y.toFixed(1)} ${topRight.toFixed(1)},${node.y.toFixed(1)} ${bottomRight.toFixed(1)},${(node.y + layout.layerH).toFixed(1)} ${bottomLeft.toFixed(1)},${(node.y + layout.layerH).toFixed(1)}" fill="${node.fill}${opacitySuffix}" stroke="${node.stroke || theme.bg}" stroke-width="${strokeWidth}" stroke-linejoin="round">${itemTitleTag(node.item)}</polygon>`
}

export function renderBandLabel(node: BandNode, layout: BandLayout, theme: MdArtTheme): string {
  const midW = (node.topW + node.bottomW) / 2
  const textY = node.y + layout.layerH / 2 + 4
  const fontSize = midW > 130 ? 12 : midW > 80 ? 11 : 10
  const maxChars = Math.max(4, Math.floor(midW / 7))
  const { display, url } = parseLink(node.item.label)
  const baseWithValue = node.item.value ? `${display} · ${node.item.value}` : display
  const labelWithValue = ellipsisIfDropped(baseWithValue, node.item, { value: true })
  const main = aWrap(`<text x="${PYRAMID_BAND_CX.toFixed(1)}" y="${textY.toFixed(1)}" text-anchor="middle" font-size="${fontSize}" font-weight="600" fill="${theme.bg}" ${FONT_SANS_ATTR}>${tt(labelWithValue, maxChars)}</text>`, url)
  if (midW >= 70) return main
  const sideX = PYRAMID_BAND_CX + Math.max(node.topW, node.bottomW) / 2 + 8
  return main + aWrap(`<text x="${sideX.toFixed(1)}" y="${textY.toFixed(1)}" font-size="10" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tt(labelWithValue, 24)}</text>`, url)
}

export function renderBandSvg(spec: MdArtSpec, theme: MdArtTheme, layout: BandLayout, nodes: BandNode[], renderNodeExtra?: (node: BandNode, theme: MdArtTheme) => string): string {
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts = [
    ...(animate ? [seqSpotlightCSS(layout.n, spec, { scale: false })] : []),
    renderBandTitle(spec, theme),
    ...nodes.map(node => wrapItem(renderBandShape(node, layout, theme, node.stroke ? 1.8 : 2, node.stroke ? 'cc' : '') + (renderNodeExtra?.(node, theme) ?? '') + renderBandLabel(node, layout, theme), node.index, animate, instrument)),
  ].filter(Boolean)
  return `<svg viewBox="0 0 ${PYRAMID_BAND_W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${parts.join('\n  ')}
</svg>`
}
