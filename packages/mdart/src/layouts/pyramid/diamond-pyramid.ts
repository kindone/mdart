import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, renderEmpty } from '../shared'
import { PYRAMID_BAND_W, type BandLayout, type BandNode, renderBandSvg } from './band-shared'

const MAX_W = PYRAMID_BAND_W - 40
const MIN_W = 36

function diamondWidth(t: number): number {
  return MIN_W + (MAX_W - MIN_W) * (1 - Math.abs(2 * t - 1))
}

function resolveLayout(spec: MdArtSpec): BandLayout {
  const n = spec.items.length
  const titleH = spec.title ? 34 : 12
  const layerH = Math.min(60, Math.max(28, 320 / n))
  return { n, titleH, layerH, gap: 0, height: titleH + n * layerH + 20 }
}

function placeNodes(spec: MdArtSpec, layout: BandLayout, theme: MdArtTheme): BandNode[] {
  return spec.items.map((item, index) => {
    const topT = index / layout.n
    const bottomT = (index + 1) / layout.n
    const midT = (topT + bottomT) / 2
    const midness = 1 - Math.abs(2 * midT - 1)
    return {
      item,
      index,
      y: layout.titleH + index * layout.layerH,
      topW: diamondWidth(topT),
      bottomW: diamondWidth(bottomT),
      fill: lerpColor(theme.muted, theme.primary, 0.3 + midness * 0.7),
      stroke: '',
    }
  })
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)
  const layout = resolveLayout(spec)
  const nodes = placeNodes(spec, layout, theme)
  return renderBandSvg(spec, theme, layout, nodes)
}
