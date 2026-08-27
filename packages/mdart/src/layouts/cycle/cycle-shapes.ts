// Consolidated `type: cycle` dispatcher — Phase 2 of the type/shape
// consolidation plan.
//
// Unlike `list`/`process`, `type: cycle` (bare) is a pre-existing type —
// its omitted-shape behavior must stay backward-compatible with existing
// content, so it resolves to `default` (the plain ring), same policy as
// `type: process`. `segmented` is the *recommended* shape for new content
// (see docs/mdart.md, mdartPrompt.ts) because it places labels outside the
// ring in a fixed-size box with a leader line — its text budget doesn't
// shrink as item count grows, unlike `default`/`donut` where node/wedge
// size (and therefore text room) is divided among N items — but that
// recommendation lives in documentation, not in the omitted-shape default,
// specifically to avoid silently changing what existing `type: cycle`
// content renders.
//
// `gear-cycle`, `block-cycle`, and `loop` are deliberately NOT part of this
// dispatcher:
//   - gear-cycle has 4 hard-coded layouts selected by item count, sharing
//     none of the ring-angle math the other 5 use.
//   - block-cycle requires an even item count and silently swaps to plain
//     `cycle` otherwise — a real topology (2-row zigzag), not a reskin, and
//     the odd-count fallback has no clean "shrink to fit" equivalent.
//   - loop renders as a linear row, not a ring, at all.

import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { FONT_SANS_ATTR } from '../shared'
import { render as renderDefault } from './cycle'
import { render as renderDonut } from './donut-cycle'
import { render as renderSegmented } from './segmented-cycle'
import { render as renderOrbit } from './nondirectional-cycle'
import { render as renderMesh } from './multidirectional-cycle'
import { render as renderSpiral } from './spiral'

type ShapeRenderer = (spec: MdArtSpec, theme: MdArtTheme) => string

const SHAPE_RENDERERS: Record<string, ShapeRenderer> = {
  default: renderDefault,
  donut: renderDonut,
  segmented: renderSegmented,
  orbit: renderOrbit,
  mesh: renderMesh,
  spiral: renderSpiral,
}

/** All valid `shape:` values for `type: cycle`. Kept in sync with validator.ts. */
export const CYCLE_SHAPES: ReadonlySet<string> = new Set(Object.keys(SHAPE_RENDERERS))

const DEFAULT_SHAPE = 'default'

function renderUnknownShape(spec: MdArtSpec, theme: MdArtTheme): string {
  const W = 360
  const H = 80
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8" stroke="${theme.border}" stroke-width="1"/>
    <text x="${W / 2}" y="34" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>cycle (${spec.items.length} items)</text>
    <text x="${W / 2}" y="52" text-anchor="middle" font-size="10" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>unknown shape "${spec.shape}"</text>
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const shape = spec.shape?.toLowerCase()
  if (shape && !SHAPE_RENDERERS[shape]) return renderUnknownShape(spec, theme)
  const fn = SHAPE_RENDERERS[shape ?? DEFAULT_SHAPE] ?? renderDefault
  return fn(spec, theme)
}
