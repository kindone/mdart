// Consolidated `type: process` dispatcher — Phase 1 of the type/shape
// consolidation plan. Picks a shape-specific renderer keyed by `spec.shape`.
//
// Fallback policy (locked in during planning):
//   - shape: omitted  -> delegate to the plain `process` renderer, which
//     already auto-switches horizontal/vertical layout based on item count.
//     No new auto-shape-selection logic is introduced beyond that existing
//     behavior — inventing a principled chevron-vs-arrow-vs-circle choice
//     from item count alone would be a bigger, riskier design surface than
//     this consolidation warrants.
//   - shape: explicit -> always honored, never silently swapped for a
//     different shape. arrow/chevron previously fell back to plain `process`
//     boxes above an item-count threshold; that fallback has been removed
//     from arrow-process.ts/chevron-process.ts in favor of shrinking to fit
//     (same degrade-by-shrinking approach circle-process already used).
//
// `funnel` is deliberately NOT part of this dispatcher — it has real
// computed behavior (numeric metric parsing, conversion-rate math), not a
// visual reskin, and stays a standalone type.

import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { FONT_SANS_ATTR } from '../shared'
import { render as renderProcess } from './process'
import { render as renderChevron } from './chevron-process'
import { render as renderArrow } from './arrow-process'
import { render as renderCircle } from './circle-process'
import { render as renderRing } from './circular-process'
import { render as renderBending } from './bending-process'
import { renderStaircase } from '../shared'

type ShapeRenderer = (spec: MdArtSpec, theme: MdArtTheme) => string

const SHAPE_RENDERERS: Record<string, ShapeRenderer> = {
  process: renderProcess,
  chevron: renderChevron,
  arrow: renderArrow,
  circle: renderCircle,
  ring: renderRing,
  bending: renderBending,
  'step-up': (spec, theme) => renderStaircase(spec, theme, true),
  'step-down': (spec, theme) => renderStaircase(spec, theme, false),
}

/** All valid `shape:` values for `type: process`. Kept in sync with validator.ts. */
export const PROCESS_SHAPES: ReadonlySet<string> = new Set(Object.keys(SHAPE_RENDERERS))

function renderUnknownShape(spec: MdArtSpec, theme: MdArtTheme): string {
  const W = 360
  const H = 80
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8" stroke="${theme.border}" stroke-width="1"/>
    <text x="${W / 2}" y="34" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>process (${spec.items.length} items)</text>
    <text x="${W / 2}" y="52" text-anchor="middle" font-size="10" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>unknown shape "${spec.shape}"</text>
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const shape = spec.shape?.toLowerCase()
  if (!shape) return renderProcess(spec, theme)
  if (!SHAPE_RENDERERS[shape]) return renderUnknownShape(spec, theme)
  return SHAPE_RENDERERS[shape](spec, theme)
}
