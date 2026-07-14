import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { renderEmpty, aWrap, itemTitleTag, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, svgWrap } from '../shared'
import { relationshipItemLabel, renderRelationshipBoxText } from './shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  // Preferred: hub as parent, spokes as children  (- Hub\n  - Spoke1\n  - Spoke2).
  // Fallback:  flat list where last item is hub and the rest are spokes (legacy).
  const target  = items[0].children.length > 0 ? items[0]
    : items.length > 1 ? items[items.length - 1]
    : { label: spec.title ?? 'Result', children: [] as typeof items[0]['children'], attrs: [] as string[], flowChildren: [] as typeof items[0]['flowChildren'], value: undefined as string | undefined }
  const sources = items[0].children.length > 0 ? items[0].children
    : items.length > 1 ? items.slice(0, -1) : items
  const n = sources.length
  const W = 520, TITLE_H = spec.title ? 28 : 8
  const ROW_H = Math.max(54, Math.min(74, 340 / n))
  const H = Math.max(200, n * ROW_H + TITLE_H + 40)
  const cy = TITLE_H + (H - TITLE_H) / 2
  const SRC_X = 10, TGT_X = W - 130
  const parts: string[] = []
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  parts.push(`<defs><marker id="arr-c" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0 L7,4 L0,8 Z" fill="${theme.accent}cc"/></marker></defs>`)
  const tBH = Math.min(84, Math.max(44, n * 18 + 24))
  const { url: tgtUrl } = relationshipItemLabel(target)
  const targetUnit: string[] = []
  targetUnit.push(`<rect x="${TGT_X}" y="${(cy - tBH / 2).toFixed(1)}" width="116" height="${tBH}" rx="6" fill="${theme.accent}28" stroke="${theme.accent}" stroke-width="1.5">${itemTitleTag(target)}</rect>`)
  targetUnit.push(aWrap(renderRelationshipBoxText(TGT_X + 58, cy - tBH / 2, 116, tBH, target, theme, '700'), tgtUrl))
  parts.push(wrapItem(targetUnit.join(''), 0, animate, instrument))
  sources.forEach((item, i) => {
    const sy = n === 1 ? cy : TITLE_H + 20 + i * (H - TITLE_H - 40) / (n - 1)
    const { url: srcUrl } = relationshipItemLabel(item)
    const unit: string[] = []
    const srcH = 42
    unit.push(`<rect x="${SRC_X}" y="${(sy - srcH / 2).toFixed(1)}" width="112" height="${srcH}" rx="5" fill="${theme.surface}" stroke="${theme.primary}66" stroke-width="1.2">${itemTitleTag(item)}</rect>`)
    unit.push(aWrap(renderRelationshipBoxText(SRC_X + 56, sy - srcH / 2, 112, srcH, item, theme), srcUrl))
    const x1 = SRC_X + 112, x2 = TGT_X - 4
    const mid = (x1 + x2) / 2
    unit.push(`<path d="M${x1},${sy.toFixed(1)} C${mid},${sy.toFixed(1)} ${mid},${cy.toFixed(1)} ${x2},${cy.toFixed(1)}" fill="none" stroke="${theme.primary}66" stroke-width="1.5" marker-end="url(#arr-c)"/>`)
    parts.push(wrapItem(unit.join(''), i + 1, animate, instrument))
  })
  if (animate) parts.unshift(seqSpotlightCSS(n + 1, spec, { scale: false }))
  return svgWrap(W, H, theme, spec.title, parts)
}
