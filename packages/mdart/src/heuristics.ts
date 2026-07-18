/**
 * Post-render heuristic checks for MdArt SVG output.
 *
 * All checks operate on the raw SVG string — no DOM parser or browser runtime
 * required. For per-item checks (`SVG_ITEM_NO_TITLE`), the SVG must have been
 * rendered with `instrument: true` so that `data-item-index` attributes are
 * present on item groups.
 *
 * Usage:
 * ```ts
 * import { configureMdArt } from 'mdart'
 * import { renderMdArtDetailed } from 'mdart'
 * import { checkSvg } from 'mdart'
 *
 * configureMdArt({ instrument: true, animate: false })
 * const { svg } = renderMdArtDetailed(source, type)
 * const issues = checkSvg(svg)
 * ```
 */

// ── Public types ──────────────────────────────────────────────────────────────

/** Codes for every post-render heuristic check. */
export type SvgIssueCode =
  /** SVG is missing a `viewBox` attribute — will not scale correctly. */
  | 'SVG_NO_VIEWBOX'
  /** SVG contains no visible shape or text elements — empty render. */
  | 'SVG_EMPTY_CONTENT'
  /** A coordinate attribute contains `NaN` or `Infinity` — corrupted geometry. */
  | 'SVG_NAN_COORD'
  /** A visual attribute (fill, stroke, …) has the literal value `"undefined"`. */
  | 'SVG_UNDEFINED_ATTR'
  /**
   * A `<g data-item-index="N">` group has no `<title>` child — violates the
   * No-Silent-Drops principle. Only checked when instrumentation is active.
   */
  | 'SVG_ITEM_NO_TITLE'
  /** An element coordinate falls meaningfully outside the declared `viewBox`. */
  | 'SVG_OVERFLOW'
  /** A debug text box extends beyond its paired debug shape container. */
  | 'SVG_TEXT_BOX_ESCAPES_SHAPE'
  /** A layout text budget is suspiciously small compared to its shape container. */
  | 'SVG_TEXT_BOX_UNDERFILLS_SHAPE'

export type SvgIssueLevel = 'error' | 'warning'

export interface SvgIssue {
  code: SvgIssueCode
  level: SvgIssueLevel
  message: string
  /**
   * Zero-based item index when the issue is per-item.
   * Absent for whole-diagram findings.
   */
  itemIndex?: number
}

export interface CheckOptions {
  /**
   * Checks to skip entirely. Default: all checks run.
   *
   * @example
   * // Skip the per-item title check (e.g. when rendering without instrument:true)
   * checkSvg(svg, { skip: ['SVG_ITEM_NO_TITLE'] })
   */
  skip?: SvgIssueCode[]

  /**
   * Only return issues at or above this severity. Default: `'warning'` (all issues).
   * Pass `'error'` to suppress warnings.
   */
  minLevel?: SvgIssueLevel
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Run all post-render heuristic checks on an SVG string and return a sorted
 * list of issues (errors first).
 *
 * For per-item checks the SVG should be rendered with `instrument: true`;
 * if no `data-item-index` attributes are found `SVG_ITEM_NO_TITLE` is silently
 * skipped (not flagged as a problem).
 */
export function checkSvg(svg: string, options?: CheckOptions): SvgIssue[] {
  const skip = new Set<SvgIssueCode>(options?.skip ?? [])
  const minLevel = options?.minLevel ?? 'warning'

  const all: SvgIssue[] = []

  if (!skip.has('SVG_NO_VIEWBOX'))     all.push(..._checkViewBox(svg))
  if (!skip.has('SVG_EMPTY_CONTENT'))  all.push(..._checkEmptyContent(svg))
  if (!skip.has('SVG_NAN_COORD'))      all.push(..._checkNanCoord(svg))
  if (!skip.has('SVG_UNDEFINED_ATTR')) all.push(..._checkUndefinedAttr(svg))
  if (!skip.has('SVG_ITEM_NO_TITLE'))  all.push(..._checkItemTitles(svg))
  if (!skip.has('SVG_OVERFLOW'))       all.push(..._checkOverflow(svg))
  if (!skip.has('SVG_TEXT_BOX_ESCAPES_SHAPE') || !skip.has('SVG_TEXT_BOX_UNDERFILLS_SHAPE')) {
    all.push(..._checkTextShapeBounds(svg, skip))
  }

  const filtered = minLevel === 'error'
    ? all.filter(i => i.level === 'error')
    : all

  // errors first, then warnings; stable within each group
  return filtered.sort((a, b) =>
    a.level === b.level ? 0 : a.level === 'error' ? -1 : 1,
  )
}

// ── Individual checks ─────────────────────────────────────────────────────────

function _checkViewBox(svg: string): SvgIssue[] {
  if (svg.includes('viewBox="')) return []
  return [{
    code: 'SVG_NO_VIEWBOX',
    level: 'error',
    message: 'SVG is missing a viewBox attribute — the diagram will not scale correctly',
  }]
}

/** Shape and text element tags that signal visible content. */
const CONTENT_TAG_RE = /<(text|rect|circle|ellipse|path|polygon|polyline)\b/

function _checkEmptyContent(svg: string): SvgIssue[] {
  if (CONTENT_TAG_RE.test(svg)) return []
  return [{
    code: 'SVG_EMPTY_CONTENT',
    level: 'error',
    message: 'SVG contains no visible elements — the renderer produced an empty output',
  }]
}

/**
 * Checks coordinate and dimension attributes for `NaN` or `Infinity` values.
 * Only looks inside attribute values (`attr="…"`) to avoid false positives from
 * label text that happens to contain the word "NaN".
 */
const NUMERIC_ATTRS = ['x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry',
  'x1', 'y1', 'x2', 'y2', 'dx', 'dy', 'font-size', 'stroke-width', 'opacity']
const NAN_COORD_RE = new RegExp(
  `(?:${NUMERIC_ATTRS.join('|')})="[^"]*(?:NaN|Infinity)[^"]*"`,
)

function _checkNanCoord(svg: string): SvgIssue[] {
  const m = svg.match(NAN_COORD_RE)
  if (!m) return []
  return [{
    code: 'SVG_NAN_COORD',
    level: 'error',
    message: `Coordinate attribute contains an invalid value: ${m[0].slice(0, 60)}`,
  }]
}

/**
 * Checks visual presentation attributes for the literal string `"undefined"`,
 * which indicates a renderer accessed a missing theme property.
 */
const VISUAL_ATTRS = ['fill', 'stroke', 'color', 'stop-color', 'flood-color']
const UNDEF_ATTR_RE = new RegExp(
  `(?:${VISUAL_ATTRS.join('|')})="undefined"`,
)

function _checkUndefinedAttr(svg: string): SvgIssue[] {
  const m = svg.match(UNDEF_ATTR_RE)
  if (!m) return []
  return [{
    code: 'SVG_UNDEFINED_ATTR',
    level: 'error',
    message: `Visual attribute has literal value "undefined": ${m[0]} — a theme key is missing`,
  }]
}

/**
 * For each `<g data-item-index="N">` group, checks that a `<title>` element
 * appears within the section of SVG attributed to that group.
 *
 * The section heuristic: the content attributed to item N runs from the
 * `data-item-index="N"` attribute up to the next `data-item-index` attribute
 * (or end-of-SVG). This works correctly when item groups are siblings (the
 * common case across all MdArt renderers).
 *
 * Silently skipped when no `data-item-index` attributes are found (i.e. the
 * SVG was not rendered with `instrument: true`).
 */
function _checkItemTitles(svg: string): SvgIssue[] {
  // Locate all data-item-index positions in document order
  const groupPat = /data-item-index="(\d+)"/g
  const groups: Array<{ index: number; pos: number }> = []
  let m: RegExpExecArray | null
  while ((m = groupPat.exec(svg)) !== null) {
    groups.push({ index: parseInt(m[1], 10), pos: m.index })
  }

  if (groups.length === 0) return []   // instrumentation not active — skip silently

  const issues: SvgIssue[] = []
  for (let i = 0; i < groups.length; i++) {
    const start = groups[i].pos
    const end   = i + 1 < groups.length ? groups[i + 1].pos : svg.length
    const section = svg.slice(start, end)

    if (!section.includes('<title>') && !section.includes('<title ')) {
      issues.push({
        code: 'SVG_ITEM_NO_TITLE',
        level: 'warning',
        message: `Item ${groups[i].index} has no <title> element — tooltip data is missing (No-Silent-Drops violation)`,
        itemIndex: groups[i].index,
      })
    }
  }
  return issues
}

/**
 * Checks whether element position attributes (x, y, cx, cy, x1, y1, x2, y2)
 * fall significantly outside the declared `viewBox` bounds.
 *
 * A tolerance of ±20px is allowed to accommodate intentional small overhangs
 * (anti-aliasing margins, border strokes, arrowhead tips). Content inside
 * `<defs>` and `<style>` blocks is excluded — those coordinates live in
 * local coordinate spaces that are not comparable to the viewBox.
 *
 * Only the FIRST overflow found is reported. The SVG need not be re-checked
 * for every violating element; one finding is enough to warrant investigation.
 */
const OVERFLOW_TOLERANCE = 20

function _checkOverflow(svg: string): SvgIssue[] {
  const vbMatch = svg.match(/viewBox="([^"]+)"/)
  if (!vbMatch) return []

  const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number)
  if (parts.length < 4 || parts.some(v => isNaN(v))) return []
  const [minX, minY, vbW, vbH] = parts
  const maxX = minX + vbW
  const maxY = minY + vbH

  // Remove <defs>…</defs> and <style>…</style> — coordinates there are local
  const content = svg
    .replace(/<defs>[\s\S]*?<\/defs>/g, '')
    .replace(/<style>[\s\S]*?<\/style>/g, '')

  const X_ATTRS = ['x', 'cx', 'x1', 'x2'] as const
  const Y_ATTRS = ['y', 'cy', 'y1', 'y2'] as const

  for (const attr of X_ATTRS) {
    // Match space-prefixed attribute to avoid partial matches (e.g. "rx" matching "x")
    const pat = new RegExp(` ${attr}="(-?[\\d.]+)"`, 'g')
    let mt: RegExpExecArray | null
    while ((mt = pat.exec(content)) !== null) {
      const val = parseFloat(mt[1])
      if (val < minX - OVERFLOW_TOLERANCE || val > maxX + OVERFLOW_TOLERANCE) {
        return [{
          code: 'SVG_OVERFLOW',
          level: 'warning',
          message: `Element ${attr}="${val}" is outside viewBox x-range [${minX}, ${maxX}] (tolerance ±${OVERFLOW_TOLERANCE}px)`,
        }]
      }
    }
  }

  for (const attr of Y_ATTRS) {
    const pat = new RegExp(` ${attr}="(-?[\\d.]+)"`, 'g')
    let mt: RegExpExecArray | null
    while ((mt = pat.exec(content)) !== null) {
      const val = parseFloat(mt[1])
      if (val < minY - OVERFLOW_TOLERANCE || val > maxY + OVERFLOW_TOLERANCE) {
        return [{
          code: 'SVG_OVERFLOW',
          level: 'warning',
          message: `Element ${attr}="${val}" is outside viewBox y-range [${minY}, ${maxY}] (tolerance ±${OVERFLOW_TOLERANCE}px)`,
        }]
      }
    }
  }

  return []
}

// ── Text/shape debug bounds ──────────────────────────────────────────────────

interface DebugRect {
  x: number
  y: number
  w: number
  h: number
  label: string
  pairId?: string
}

const TEXT_ESCAPE_TOLERANCE = 2
const TEXT_UNDERFILL_AREA_RATIO = 0.34
const TEXT_UNDERFILL_WIDTH_RATIO = 0.62
const TEXT_UNDERFILL_HEIGHT_RATIO = 0.62

function _checkTextShapeBounds(svg: string, skip: Set<SvgIssueCode>): SvgIssue[] {
  const shapes = parseDebugRects(svg, 'shape-bounds')
  if (shapes.length === 0) return []

  const textRects = parseDebugRects(svg, 'text-bounds')
  if (textRects.length === 0) return []

  const issues: SvgIssue[] = []
  for (const text of textRects) {
    const shape = findEnclosingShape(text, shapes)
    if (!shape) continue

    if (!skip.has('SVG_TEXT_BOX_ESCAPES_SHAPE') && escapesShape(text, shape, TEXT_ESCAPE_TOLERANCE)) {
      issues.push({
        code: 'SVG_TEXT_BOX_ESCAPES_SHAPE',
        level: 'error',
        message: `Text box "${text.label}" extends outside shape "${shape.label}"`,
      })
    }

    if (!skip.has('SVG_TEXT_BOX_UNDERFILLS_SHAPE') && text.label !== 'text-element' && underfillsShape(text, shape)) {
      const areaRatio = (text.w * text.h) / (shape.w * shape.h)
      issues.push({
        code: 'SVG_TEXT_BOX_UNDERFILLS_SHAPE',
        level: 'warning',
        message: `Text budget "${text.label}" uses only ${(areaRatio * 100).toFixed(0)}% of shape "${shape.label}"`,
      })
    }
  }

  return issues
}

function parseDebugRects(svg: string, debugKind: 'text-bounds' | 'shape-bounds'): DebugRect[] {
  const rects: DebugRect[] = []
  const rectRe = /<rect\b[^>]*(?:\/>|>[\s\S]*?<\/rect>)/g
  for (const match of svg.matchAll(rectRe)) {
    const rect = match[0]
    if (!rect.includes(`data-mdart-debug="${debugKind}"`)) continue
    const x = numberAttr(rect, 'x')
    const y = numberAttr(rect, 'y')
    const w = numberAttr(rect, 'width')
    const h = numberAttr(rect, 'height')
    if (x === null || y === null || w === null || h === null || w <= 0 || h <= 0) continue
    rects.push({
      x,
      y,
      w,
      h,
      label: stringAttr(rect, 'data-mdart-debug-label') ?? debugKind,
      pairId: stringAttr(rect, 'data-mdart-debug-pair') ?? undefined,
    })
  }
  return rects
}

function findEnclosingShape(text: DebugRect, shapes: DebugRect[]): DebugRect | null {
  if (text.pairId) {
    return shapes.find(shape => shape.pairId === text.pairId) ?? null
  }
  if (text.label === 'text-element') return null

  const cx = text.x + text.w / 2
  const cy = text.y + text.h / 2
  let best: DebugRect | null = null
  let bestArea = Number.POSITIVE_INFINITY

  for (const shape of shapes) {
    if (cx < shape.x || cx > shape.x + shape.w || cy < shape.y || cy > shape.y + shape.h) continue
    const area = shape.w * shape.h
    if (area < bestArea) {
      best = shape
      bestArea = area
    }
  }
  return best
}

function escapesShape(text: DebugRect, shape: DebugRect, tol: number): boolean {
  return text.x < shape.x - tol ||
    text.y < shape.y - tol ||
    text.x + text.w > shape.x + shape.w + tol ||
    text.y + text.h > shape.y + shape.h + tol
}

function underfillsShape(text: DebugRect, shape: DebugRect): boolean {
  const widthRatio = text.w / shape.w
  const heightRatio = text.h / shape.h
  const areaRatio = (text.w * text.h) / (shape.w * shape.h)
  return areaRatio < TEXT_UNDERFILL_AREA_RATIO &&
    widthRatio < TEXT_UNDERFILL_WIDTH_RATIO &&
    heightRatio < TEXT_UNDERFILL_HEIGHT_RATIO
}

function numberAttr(attrs: string, name: string): number | null {
  const raw = stringAttr(attrs, name)
  if (raw === null) return null
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : null
}

function stringAttr(attrs: string, name: string): string | null {
  const escaped = escapeRegExp(name)
  const quoted = attrs.match(new RegExp(`\\b${escaped}=(["'])(.*?)\\1`))
  if (quoted) return quoted[2]
  const unquoted = attrs.match(new RegExp(`\\b${escaped}=([^\\s>]+)`))
  return unquoted?.[1] ?? null
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
