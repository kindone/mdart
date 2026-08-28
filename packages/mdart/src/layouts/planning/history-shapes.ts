// Consolidated `type: history` dispatcher — Phase 4 of the type/shape
// consolidation plan.
//
// Folds three previously-separate "purely chronological, no status"
// renderers into one type, split by an affordance framework established
// during planning:
//   - progress/planning aspect (done/active/past states)  -> `roadmap`
//   - neutral, general-purpose chronological display        -> `timeline`
//   - purely chronological, detail-rich, no status           -> `history`
// (`roadmap` and `timeline` intentionally SWAPPED names from what they
// used to render — see renderer.ts process/planning family comments.)
//
// shape: default     -> single-column vertical list (was `timeline-v`):
//                        dot + tag + main text + multi-line detail, row
//                        height grows with content. Most versatile of the
//                        three (no alternating-position constraint), and
//                        this type is brand new (didn't exist before this
//                        consolidation), so versatility wins the default
//                        the same way it did for `list`/`process`.
// shape: alternating -> vertical spine with items alternating left/right
//                        (was `timeline-list` / `zigzag-list` /
//                        `zigzag-timeline`). `timeline-list`'s renderer
//                        was picked as the canonical implementation over
//                        zigzag's — richer per-item content (bordered
//                        card, label + caption + attrs) vs. zigzag's
//                        plainer box (label + single secondary value).
//                        Backward compatibility was explicitly
//                        deprioritized for this merge, so old
//                        zigzag-timeline/zigzag-list/timeline-list content
//                        re-renders with the richer card style rather than
//                        its original box style.

import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { FONT_SANS_ATTR } from '../shared'
import { render as renderDefault } from '../process/timeline-v'
import { render as renderAlternating } from '../list/timeline-list'

type ShapeRenderer = (spec: MdArtSpec, theme: MdArtTheme) => string

const SHAPE_RENDERERS: Record<string, ShapeRenderer> = {
  default: renderDefault,
  alternating: renderAlternating,
}

/** All valid `shape:` values for `type: history`. Kept in sync with validator.ts. */
export const HISTORY_SHAPES: ReadonlySet<string> = new Set(Object.keys(SHAPE_RENDERERS))

const DEFAULT_SHAPE = 'default'

function renderUnknownShape(spec: MdArtSpec, theme: MdArtTheme): string {
  const W = 360
  const H = 80
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8" stroke="${theme.border}" stroke-width="1"/>
    <text x="${W / 2}" y="34" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>history (${spec.items.length} items)</text>
    <text x="${W / 2}" y="52" text-anchor="middle" font-size="10" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>unknown shape "${spec.shape}"</text>
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const shape = spec.shape?.toLowerCase()
  if (shape && !SHAPE_RENDERERS[shape]) return renderUnknownShape(spec, theme)
  const fn = SHAPE_RENDERERS[shape ?? DEFAULT_SHAPE] ?? renderDefault
  return fn(spec, theme)
}
