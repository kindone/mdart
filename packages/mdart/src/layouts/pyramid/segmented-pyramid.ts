import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, renderEmpty } from '../shared'
import { PYRAMID_BAND_CX, PYRAMID_BAND_W, type BandLayout, type BandNode, renderBandSvg } from './band-shared'

const GAP = 6
const MAX_W = PYRAMID_BAND_W - 40
const MIN_W = 40

function resolveLayout(spec: MdArtSpec): BandLayout {
  const n = spec.items.length
  const layerH = Math.min(58, Math.max(30, (320 - GAP * (n - 1)) / n))
  const titleH = spec.title ? 34 : 12
  return { n, titleH, layerH, gap: GAP, height: titleH + n * layerH + (n - 1) * GAP + 20 }
}

function placeNodes(spec: MdArtSpec, layout: BandLayout, theme: MdArtTheme): BandNode[] {
  return spec.items.map((item, index) => {
    const t = layout.n > 1 ? index / (layout.n - 1) : 1
    return {
      item,
      index,
      y: layout.titleH + index * (layout.layerH + layout.gap),
      topW: MIN_W + t * (MAX_W - MIN_W) * 0.88,
      bottomW: MIN_W + ((index + 1) / layout.n) * (MAX_W - MIN_W),
      fill: lerpColor(theme.primary, theme.secondary, t * 0.7),
      stroke: lerpColor(theme.primary, theme.accent, t * 0.5),
    }
  })
}

function renderHighlight(node: BandNode, theme: MdArtTheme): string {
  const topLeft = PYRAMID_BAND_CX - node.topW / 2
  const topRight = PYRAMID_BAND_CX + node.topW / 2
  return `<line x1="${(topLeft + 2).toFixed(1)}" y1="${(node.y + 1).toFixed(1)}" x2="${(topRight - 2).toFixed(1)}" y2="${(node.y + 1).toFixed(1)}" stroke="${theme.bg}55" stroke-width="1.5"/>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const layout = resolveLayout(spec)
  const nodes = placeNodes(spec, layout, theme)
  return renderBandSvg(spec, theme, layout, nodes, renderHighlight)
}
