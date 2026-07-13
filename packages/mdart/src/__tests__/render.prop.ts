// Feature:     MdArt rendering stability — all 95+ layout types
// Arch/Design: renderMdArt is pure (except global config); every layout renderer
//              receives a parsed MdArtSpec and must emit well-formed SVG for any
//              item list. The post-render checkSvg heuristics give us structural
//              signals without a DOM parser.
// Spec:        ¬∃ (type ∈ KNOWN_TYPES, items[]): renderMdArt(source, type) throws
//              ∀ (type, items): svg has viewBox, no NaN coords, no undefined attrs
//              ∀ source: renderMdArt(source, type) is deterministic (same in → same out)
//              ∀ labels containing <>&"': no raw entity leakage into the SVG markup
//              ∀ (type, items) with instrument:true: checkSvg reports no geometry errors
// @quality:    reliability
// @type:       property
// @mode:       verification

import { describe, it, afterEach } from 'vitest'
import { forAll, Gen } from 'jsproptest'
import { renderMdArt, KNOWN_TYPES } from '../index.ts'
import { checkSvg } from '../heuristics.ts'
import { configureMdArt, resetMdArtConfig } from '../config.ts'
import { genLabelCJK, genLabelEmoji, genLabelLong } from './domains'

// ── Helpers ───────────────────────────────────────────────────────────────────

const ALL_TYPES = [...KNOWN_TYPES]

/**
 * Build a source string with N flat items. Each label is prefixed `- ` so
 * that the parser treats it as a top-level item. Newlines within a label are
 * normalised to spaces to avoid accidentally creating child items.
 */
function flatSource(labels: string[]): string {
  if (labels.length === 0) return ''
  return labels
    .map(l => `- ${l.replace(/\n/g, ' ').trim() || 'x'}`)
    .join('\n')
}

/**
 * The geometry-error codes we track as hard failures.
 * SVG_EMPTY_CONTENT is excluded: some types legitimately produce an empty
 * render when given generic flat items (e.g. gantt without [wkN-wkM] markers).
 * SVG_OVERFLOW and SVG_ITEM_NO_TITLE are warnings; we only care about errors.
 */
const GEOMETRY_ERROR_SKIP = [
  'SVG_EMPTY_CONTENT',
  'SVG_ITEM_NO_TITLE',
  'SVG_OVERFLOW',
] as const

afterEach(() => resetMdArtConfig())

// ── Deterministic exhaustive scan ─────────────────────────────────────────────
//
// Quick, 100% type-coverage pass with fixed inputs. Catches any type that
// crashes on boundary inputs or that emits structurally broken SVG. This runs
// fast (<0.5 s) and complements the random exploration below.

describe('all KNOWN_TYPES — exhaustive scan', () => {

  it('every type renders without throwing for 0 items', () => {
    const crashes: string[] = []
    for (const type of ALL_TYPES) {
      try { renderMdArt('', type) }
      catch (e: unknown) { crashes.push(`${type}: ${(e as Error).message?.slice(0, 120) ?? e}`) }
    }
    if (crashes.length) throw new Error(`${crashes.length} type(s) crashed on empty source:\n${crashes.join('\n')}`)
  })

  it('every type renders without throwing for 1 item', () => {
    const crashes: string[] = []
    for (const type of ALL_TYPES) {
      try { renderMdArt('- Alpha', type) }
      catch (e: unknown) { crashes.push(`${type}: ${(e as Error).message?.slice(0, 120) ?? e}`) }
    }
    if (crashes.length) throw new Error(`${crashes.length} type(s) crashed on 1 item:\n${crashes.join('\n')}`)
  })

  it('every type renders without throwing for 3 flat items', () => {
    const crashes: string[] = []
    for (const type of ALL_TYPES) {
      try { renderMdArt('- Alpha\n- Beta\n- Gamma', type) }
      catch (e: unknown) { crashes.push(`${type}: ${(e as Error).message?.slice(0, 120) ?? e}`) }
    }
    if (crashes.length) throw new Error(`${crashes.length} type(s) crashed on 3 items:\n${crashes.join('\n')}`)
  })

  it('every type emits viewBox + no NaN/undefined for 3 flat items', () => {
    const bad: string[] = []
    for (const type of ALL_TYPES) {
      try {
        const svg = renderMdArt('- Alpha\n- Beta\n- Gamma', type)
        const issues = checkSvg(svg, { skip: [...GEOMETRY_ERROR_SKIP], minLevel: 'error' })
        if (issues.length) {
          bad.push(`${type}: ${issues.map(i => i.code).join(', ')}`)
        }
      } catch (e: unknown) {
        bad.push(`${type}: threw — ${(e as Error).message?.slice(0, 80) ?? e}`)
      }
    }
    if (bad.length) throw new Error(`${bad.length} type(s) produced geometry errors:\n${bad.join('\n')}`)
  })

  it('every type handles XML-dangerous labels without crashing', () => {
    const source = '- <Foo> & "Bar"\n- </evil>\n- A\'s & B\'s'
    const crashes: string[] = []
    for (const type of ALL_TYPES) {
      try { renderMdArt(source, type) }
      catch (e: unknown) { crashes.push(`${type}: ${(e as Error).message?.slice(0, 120) ?? e}`) }
    }
    if (crashes.length) throw new Error(`${crashes.length} type(s) crashed on XML-dangerous labels:\n${crashes.join('\n')}`)
  })

})

// ── Property: ¬∃ (type, items) → renderMdArt throws ─────────────────────────

describe('¬∃ (type, items): renderMdArt throws', () => {

  it('random type × 0–12 printable-ASCII items (up to 50 chars each)', { timeout: 30000 }, () => {
    forAll(
      (typeIdx: number, labels: string[]) => {
        const type = ALL_TYPES[typeIdx]
        const source = flatSource(labels)
        try {
          renderMdArt(source, type)
          return true
        } catch {
          return false
        }
      },
      Gen.inRange(0, ALL_TYPES.length - 1),
      Gen.array(Gen.printableAsciiString(1, 50), 0, 12),
    )
  })

  it('random type × Unicode labels (stress-tests text measurement)', { timeout: 30000 }, () => {
    forAll(
      (typeIdx: number, labels: string[]) => {
        const type = ALL_TYPES[typeIdx]
        const source = flatSource(labels)
        try {
          renderMdArt(source, type)
          return true
        } catch {
          return false
        }
      },
      Gen.inRange(0, ALL_TYPES.length - 1),
      Gen.array(Gen.unicodeString(1, 40), 0, 8),
    )
  })

  it('random type × CJK labels (tests double-width char measurement)', { timeout: 30000 }, () => {
    forAll(
      (typeIdx: number, n: number, label: string) => {
        const type = ALL_TYPES[typeIdx]
        const source = Array.from({ length: n }, (_, i) => `- ${label} ${i}`).join('\n')
        try {
          renderMdArt(source, type)
          return true
        } catch {
          return false
        }
      },
      Gen.inRange(0, ALL_TYPES.length - 1),
      Gen.inRange(1, 6),
      genLabelCJK,
    )
  })

  it('random type × emoji labels (tests multi-codepoint width estimation)', { timeout: 30000 }, () => {
    forAll(
      (typeIdx: number, n: number, label: string) => {
        const type = ALL_TYPES[typeIdx]
        const source = Array.from({ length: n }, (_, i) => `- ${label} ${i}`).join('\n')
        try {
          renderMdArt(source, type)
          return true
        } catch {
          return false
        }
      },
      Gen.inRange(0, ALL_TYPES.length - 1),
      Gen.inRange(1, 6),
      genLabelEmoji,
    )
  })

  it('random type × long labels (30–80 chars, triggers text-wrap and overflow guards)', { timeout: 30000 }, () => {
    forAll(
      (typeIdx: number, n: number, label: string) => {
        const type = ALL_TYPES[typeIdx]
        const source = Array.from({ length: n }, (_, i) => `- ${label} item${i}`).join('\n')
        try {
          renderMdArt(source, type)
          return true
        } catch {
          return false
        }
      },
      Gen.inRange(0, ALL_TYPES.length - 1),
      Gen.inRange(1, 6),
      genLabelLong,
    )
  })

  it('process family with large item counts (tests layout wrap / overflow guards)', { timeout: 20000 }, () => {
    const PROCESS_TYPES = ALL_TYPES.filter(t =>
      ['process', 'chevron-process', 'arrow-process', 'circular-process',
       'funnel', 'roadmap', 'waterfall', 'snake-process', 'step-up', 'step-down',
       'circle-process', 'bending-process', 'segmented-bar', 'phase-process'].includes(t)
    )
    forAll(
      (typeIdx: number, n: number, label: string) => {
        const type = PROCESS_TYPES[typeIdx % PROCESS_TYPES.length]
        const source = Array.from({ length: n }, (_, i) => `- ${label} ${i}`).join('\n')
        try {
          renderMdArt(source, type)
          return true
        } catch {
          return false
        }
      },
      Gen.inRange(0, PROCESS_TYPES.length - 1),
      Gen.inRange(0, 20),
      Gen.printableAsciiString(1, 40),
    )
  })

})

// ── Property: ∀ (type, items): valid SVG geometry ────────────────────────────
//
// Check that every render is free of the hard-error geometry codes:
//   • SVG_NO_VIEWBOX  — missing viewBox (won't scale)
//   • SVG_NAN_COORD   — NaN/Infinity in a coordinate attr (corrupted layout)
//   • SVG_UNDEFINED_ATTR — fill/stroke="undefined" (missing theme key)

describe('∀ (type, items): no geometry errors in rendered SVG', () => {

  it('random type × 0–12 printable-ASCII items (up to 50 chars)', { timeout: 30000 }, () => {
    forAll(
      (typeIdx: number, labels: string[]) => {
        const type = ALL_TYPES[typeIdx]
        const source = flatSource(labels)
        try {
          const svg = renderMdArt(source, type)
          const issues = checkSvg(svg, { skip: [...GEOMETRY_ERROR_SKIP], minLevel: 'error' })
          return issues.length === 0
        } catch {
          return false   // crash = failure
        }
      },
      Gen.inRange(0, ALL_TYPES.length - 1),
      Gen.array(Gen.printableAsciiString(1, 50), 0, 12),
    )
  })

  it('hierarchy types with nested children and long labels', { timeout: 20000 }, () => {
    // Hierarchy types (org-chart, tree, mind-map, …) have meaningful renders
    // with 2-level nesting. Generate a parent + 2 children per parent.
    // Labels up to 40 chars to exercise word-wrap in hierarchy boxes.
    const HIER_TYPES = ALL_TYPES.filter(t =>
      ['org-chart', 'tree', 'h-org-chart', 'hierarchy-list', 'radial-tree',
       'decision-tree', 'sitemap', 'bracket', 'bracket-tree', 'mind-map',
       'kanban', 'sprint-board', 'wbs', 'swimlane'].includes(t)
    )
    forAll(
      (typeIdx: number, parents: string[], child: string) => {
        const type = HIER_TYPES[typeIdx % HIER_TYPES.length]
        const lines: string[] = []
        for (const p of parents.slice(0, 4)) {
          lines.push(`- ${p.replace(/\n/g, ' ').trim() || 'Parent'}`)
          lines.push(`  - ${child.replace(/\n/g, ' ').trim() || 'Child'} A`)
          lines.push(`  - ${child.replace(/\n/g, ' ').trim() || 'Child'} B`)
        }
        const source = lines.join('\n')
        try {
          const svg = renderMdArt(source, type)
          const issues = checkSvg(svg, { skip: [...GEOMETRY_ERROR_SKIP], minLevel: 'error' })
          return issues.length === 0
        } catch {
          return false
        }
      },
      Gen.inRange(0, HIER_TYPES.length - 1),
      Gen.array(Gen.printableAsciiString(1, 40), 1, 4),
      Gen.printableAsciiString(1, 40),
    )
  })

})

// ── Property: ∀ source → deterministic output ─────────────────────────────────
//
// renderMdArt must be a pure function of (source, type) given the same global
// config. Two calls with identical args must return the identical SVG string.

describe('∀ (type, source): renderMdArt is deterministic', () => {

  it('same source rendered twice returns identical SVG', { timeout: 20000 }, () => {
    forAll(
      (typeIdx: number, labels: string[]) => {
        const type = ALL_TYPES[typeIdx]
        const source = flatSource(labels)
        try {
          const svg1 = renderMdArt(source, type)
          const svg2 = renderMdArt(source, type)
          return svg1 === svg2
        } catch {
          return false
        }
      },
      Gen.inRange(0, ALL_TYPES.length - 1),
      Gen.array(Gen.printableAsciiString(1, 50), 0, 8),
    )
  })

})

// ── Property: ∀ XML-dangerous labels → no entity leakage ──────────────────────
//
// Labels containing <, >, & must be escaped before insertion into the SVG
// element tree. Unescaped content would inject rogue SVG child elements or
// break the document. We check the two most dangerous patterns:
//   1. Raw `<tag>` appearing in SVG text content (XSS-style injection)
//   2. Structure errors flagged by checkSvg (NaN/undefined from broken attrs)

describe('∀ XML-dangerous labels: no raw entity leakage into SVG markup', () => {

  it('label "<script>" does not appear verbatim in SVG output', { timeout: 20000 }, () => {
    forAll(
      (typeIdx: number, n: number) => {
        const type = ALL_TYPES[typeIdx]
        const count = Math.max(1, (n % 5) + 1)
        const evilLabel = '<script>alert("xss")</script>'
        const source = Array.from({ length: count }, (_, i) => `- ${evilLabel} ${i}`).join('\n')
        try {
          const svg = renderMdArt(source, type)
          // If properly escaped, the raw <script> tag must not appear as a child element
          return !svg.includes('<script>') && !svg.includes('</script>')
        } catch {
          return false
        }
      },
      Gen.inRange(0, ALL_TYPES.length - 1),
      Gen.inRange(0, 4),
    )
  })

  it('labels with & produce no undefined or NaN geometry', { timeout: 20000 }, () => {
    forAll(
      (typeIdx: number, label: string) => {
        const type = ALL_TYPES[typeIdx]
        const source = `- ${label.replace(/\n/g, ' ')} & more\n- second`
        try {
          const svg = renderMdArt(source, type)
          const issues = checkSvg(svg, { skip: [...GEOMETRY_ERROR_SKIP], minLevel: 'error' })
          return issues.length === 0
        } catch {
          return false
        }
      },
      Gen.inRange(0, ALL_TYPES.length - 1),
      Gen.printableAsciiString(1, 50),
    )
  })

})

// ── Property: ∀ (type, items) with instrument:true → no geometry errors ───────
//
// With instrument:true, every renderer that supports item grouping emits
// data-item-index attributes. The render must still be structurally clean:
// the extra attributes must not corrupt coordinates or introduce undefined values.

describe('∀ (type, items) with instrument:true: no geometry errors', () => {

  it('random type × 1–8 items with instrumentation enabled (labels up to 50 chars)', { timeout: 30000 }, () => {
    forAll(
      (typeIdx: number, labels: string[]) => {
        configureMdArt({ instrument: true, animate: false })
        const type = ALL_TYPES[typeIdx]
        const source = flatSource(labels.length > 0 ? labels : ['Item'])
        try {
          const svg = renderMdArt(source, type)
          const issues = checkSvg(svg, { skip: [...GEOMETRY_ERROR_SKIP], minLevel: 'error' })
          return issues.length === 0
        } catch {
          return false
        } finally {
          resetMdArtConfig()
        }
      },
      Gen.inRange(0, ALL_TYPES.length - 1),
      Gen.array(Gen.printableAsciiString(1, 50), 1, 8),
    )
  })

})
