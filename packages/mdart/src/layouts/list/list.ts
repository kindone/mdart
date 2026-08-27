// Consolidated `type: list` dispatcher — Phase 0a of the type/shape
// consolidation plan. Picks a shape-specific renderer keyed by `spec.shape`,
// defaulting to `bullet` when omitted. Old flat type names (`bullet-list`,
// `circle-list`, etc.) are registered in renderer.ts as hard aliases that
// force `shape` before delegating here, so they share this exact code path
// rather than a frozen duplicate — see the Type Consolidation Plan for the
// reconciliation decisions (uniform children/value support, uniform row
// dividers, uniform multi-line wrap, uniform row-major grid ordering) baked
// into the individual shape renderers below.

import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { FONT_SANS_ATTR } from '../shared'
import { render as renderBullet } from './bullet-list'
import { render as renderNumbered } from './numbered-list'
import { render as renderCircle } from './circle-list'
import { render as renderIcon } from './icon-list'
import { render as renderChevron } from './chevron-list'
import { render as renderRibbon } from './ribbon-list'
import { render as renderTrapezoid } from './trapezoid-list'
import { render as renderTwoColumn } from './two-column-list'
import { render as renderBlock } from './block-list'
import { render as renderHexagon } from './hexagon-list'

type ShapeRenderer = (spec: MdArtSpec, theme: MdArtTheme) => string

const SHAPE_RENDERERS: Record<string, ShapeRenderer> = {
  bullet: renderBullet,
  numbered: renderNumbered,
  circle: renderCircle,
  icon: renderIcon,
  chevron: renderChevron,
  ribbon: renderRibbon,
  trapezoid: renderTrapezoid,
  'two-column': renderTwoColumn,
  block: renderBlock,
  hexagon: renderHexagon,
}

/** All valid `shape:` values for `type: list`. Kept in sync with validator.ts. */
export const LIST_SHAPES: ReadonlySet<string> = new Set(Object.keys(SHAPE_RENDERERS))

const DEFAULT_SHAPE = 'bullet'

function renderUnknownShape(spec: MdArtSpec, theme: MdArtTheme): string {
  const W = 360
  const H = 80
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8" stroke="${theme.border}" stroke-width="1"/>
    <text x="${W / 2}" y="34" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>list (${spec.items.length} items)</text>
    <text x="${W / 2}" y="52" text-anchor="middle" font-size="10" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>unknown shape "${spec.shape}"</text>
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const shape = spec.shape?.toLowerCase()
  if (shape && !SHAPE_RENDERERS[shape]) return renderUnknownShape(spec, theme)
  const fn = SHAPE_RENDERERS[shape ?? DEFAULT_SHAPE] ?? renderBullet
  return fn(spec, theme)
}
