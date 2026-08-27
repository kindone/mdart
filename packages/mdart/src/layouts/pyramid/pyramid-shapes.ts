// Consolidated `type: pyramid` dispatcher — Phase 3 of the type/shape
// consolidation plan.
//
// `type: pyramid` (bare) predates this consolidation, so omitted `shape:`
// stays `default` (the plain, non-inverted stack) for backward
// compatibility, same policy as `type: cycle`. Unlike `cycle`, there's no
// separate "recommended" shape here — all 4 wedge shapes divide a fixed
// total height among N layers identically; none scales better with item
// count or label length than the others, so `default` doubles as both the
// backward-compatible default and the reasonable recommendation.
//
// `pyramid-list` is deliberately NOT part of this dispatcher — checked by
// both code-skeleton *and* content-affordance (see Type Consolidation
// Plan): it's a content-packed horizontal bar-list (badge + label + value
// + multi-line description, row height grows with content) vs. the 4
// wedge shapes, which are all typography-forward (short label+value,
// fixed total height, cramped at high N). Different intent, not just a
// different picture. Cross-listing it as an alias under both `pyramid`
// and `list` is a captured future-work idea, not implemented here.

import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { FONT_SANS_ATTR } from '../shared'
import { render as renderPyramid } from './pyramid'
import { render as renderSegmented } from './segmented-pyramid'
import { render as renderDiamond } from './diamond-pyramid'

type ShapeRenderer = (spec: MdArtSpec, theme: MdArtTheme) => string

const SHAPE_RENDERERS: Record<string, ShapeRenderer> = {
  default: renderPyramid,
  inverted: renderPyramid,
  segmented: renderSegmented,
  diamond: renderDiamond,
}

/** All valid `shape:` values for `type: pyramid`. Kept in sync with validator.ts. */
export const PYRAMID_SHAPES: ReadonlySet<string> = new Set(Object.keys(SHAPE_RENDERERS))

const DEFAULT_SHAPE = 'default'

function renderUnknownShape(spec: MdArtSpec, theme: MdArtTheme): string {
  const W = 360
  const H = 80
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8" stroke="${theme.border}" stroke-width="1"/>
    <text x="${W / 2}" y="34" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>pyramid (${spec.items.length} items)</text>
    <text x="${W / 2}" y="52" text-anchor="middle" font-size="10" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>unknown shape "${spec.shape}"</text>
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const shape = spec.shape?.toLowerCase()
  if (shape && !SHAPE_RENDERERS[shape]) return renderUnknownShape(spec, theme)
  const fn = SHAPE_RENDERERS[shape ?? DEFAULT_SHAPE] ?? renderPyramid
  return fn(spec, theme)
}
