// Feature:     MdArt validator — structural and content issue detection
// Arch/Design: validateMdArt maps a parsed spec to a list of ValidationIssue.
//              The key structural property is monotonicity: wider filters return
//              supersets. Domain coverage: known types pass type checks; unknown
//              types always fail; item-count boundaries trigger at the right n.
// Spec:        ¬∃ spec: validateMdArt throws
//              ∀ KNOWN_TYPES: STRUCT_UNKNOWN_TYPE never fires
//              ∀ unknown type: STRUCT_UNKNOWN_TYPE always fires (alone)
//              ∀ spec: |warning+errors| ≥ |errors| (minLevel monotonicity)
//              ∀ errors: every error also appears in warnings result (subset)
//              ∀ cycle × n<2: STRUCT_INSUFFICIENT_ITEMS fires
//              ∀ cycle × n≥2: STRUCT_INSUFFICIENT_ITEMS does not fire
//              ∀ cycle × n>8: LAYOUT_NODE_COUNT_EXCEEDS_RANGE fires
//              ∀ cycle × n≤8: LAYOUT_NODE_COUNT_EXCEEDS_RANGE does not fire
//              ∀ radar × numeric values: CONTENT_NUMERIC_VALUE_EXPECTED does not fire
//              ∀ radar × non-numeric values: CONTENT_NUMERIC_VALUE_EXPECTED fires
//              ∀ N duplicate sibling labels: CONTENT_DUPLICATE_SIBLING_LABELS fires
//              ∀ all-distinct labels: CONTENT_DUPLICATE_SIBLING_LABELS does not fire
// @quality:    correctness
// @type:       property
// @mode:       verification

import { describe, it } from 'vitest'
import { forAll, Gen } from 'jsproptest'
import { parseMdArt } from '../parser'
import { validateMdArt } from '../validator'
import { KNOWN_TYPES } from '../index.ts'
import {
  genLabelPlain,
  buildFlatSource,
  buildUniqueLabels,
  buildDupeLabels,
} from './domains'

// safe/cleanLabel is defined locally (not exported from domains).
// `&&` is an alias for `∩` (intersection marker) in MdArt; items with `&&`
// get `isIntersection=true` and are EXCLUDED from the validator's item count.
// We must strip `&&` from labels to keep item counts meaningful.
function cleanLabel(s: string): string {
  return s
    .replace(/:/g, '-').replace(/→/g, '-').replace(/\[/g, '(').replace(/]/g, ')')
    .replace(/\\/g, '')
    .replace(/∩/g, 'x').replace(/&&/g, 'xx')   // intersection markers → plain chars
    .replace(/\n/g, ' ')
    .replace(/^\s*$/, 'x')
}

const ALL_TYPES = [...KNOWN_TYPES]

/** Parse then validate a raw string with the given hint type. */
function validate(raw: string, type: string) {
  return validateMdArt(parseMdArt(raw, type))
}

function codes(raw: string, type: string) {
  return validate(raw, type).map(i => i.code)
}

// ── ¬∃ crash ─────────────────────────────────────────────────────────────────

describe('¬∃ spec: validateMdArt throws', () => {

  it('arbitrary source × any KNOWN_TYPE never throws', { timeout: 20000 }, () => {
    forAll(
      (typeIdx: number, labels: string[]) => {
        const type = ALL_TYPES[typeIdx]
        const src = buildFlatSource(labels.map(cleanLabel))
        try {
          validateMdArt(parseMdArt(src, type))
          return true
        } catch { return false }
      },
      Gen.inRange(0, ALL_TYPES.length - 1),
      Gen.array(genLabelPlain, 0, 8),
    )
  })

  it('completely arbitrary source × arbitrary type string never throws', { timeout: 15000 }, () => {
    forAll(
      (src: string, type: string) => {
        try {
          validateMdArt(parseMdArt(src, type))
          return true
        } catch { return false }
      },
      Gen.printableAsciiString(0, 60),
      Gen.printableAsciiString(1, 20),
    )
  })

})

// ── STRUCT_UNKNOWN_TYPE ───────────────────────────────────────────────────────

describe('STRUCT_UNKNOWN_TYPE', () => {

  it('∀ KNOWN_TYPES: STRUCT_UNKNOWN_TYPE never fires', { timeout: 20000 }, () => {
    forAll(
      (typeIdx: number, labels: string[]) => {
        const type = ALL_TYPES[typeIdx]
        const c = codes(buildFlatSource(labels.map(cleanLabel)), type)
        return !c.includes('STRUCT_UNKNOWN_TYPE')
      },
      Gen.inRange(0, ALL_TYPES.length - 1),
      Gen.array(genLabelPlain, 1, 4),
    )
  })

  it('∀ unknown type strings: STRUCT_UNKNOWN_TYPE is the only issue', { timeout: 15000 }, () => {
    const KNOWN = KNOWN_TYPES
    forAll(
      (type: string) => {
        if (KNOWN.has(type)) return true   // skip — accidentally valid
        const issues = validate('- Item A', type)
        return issues.every(i => i.code === 'STRUCT_UNKNOWN_TYPE')
      },
      Gen.printableAsciiString(1, 20),
    )
  })

})

// ── minLevel monotonicity ─────────────────────────────────────────────────────

describe('∀ spec: minLevel monotonicity — warning results ⊇ error results', () => {

  it('|minLevel:warning| ≥ |minLevel:error| for any input', { timeout: 20000 }, () => {
    forAll(
      (typeIdx: number, labels: string[]) => {
        const type = ALL_TYPES[typeIdx]
        const spec = parseMdArt(buildFlatSource(labels.map(cleanLabel)), type)
        const allIssues  = validateMdArt(spec)
        const errorsOnly = validateMdArt(spec, { minLevel: 'error' })
        return allIssues.length >= errorsOnly.length
      },
      Gen.inRange(0, ALL_TYPES.length - 1),
      Gen.array(genLabelPlain, 0, 6),
    )
  })

  it('every error-level issue in minLevel:error also appears in the full result', { timeout: 20000 }, () => {
    forAll(
      (typeIdx: number, n: number, label: string) => {
        const type = ALL_TYPES[typeIdx]
        const labels = Array.from({ length: n }, (_, i) => `${cleanLabel(label)}-${i}`)
        const spec = parseMdArt(buildFlatSource(labels), type)
        const allIssues  = validateMdArt(spec)
        const errorsOnly = validateMdArt(spec, { minLevel: 'error' })
        const allCodes = new Set(allIssues.map(i => i.code))
        return errorsOnly.every(i => allCodes.has(i.code))
      },
      Gen.inRange(0, ALL_TYPES.length - 1),
      Gen.inRange(0, 8),
      genLabelPlain,
    )
  })

})

// ── STRUCT_INSUFFICIENT_ITEMS ─────────────────────────────────────────────────

describe('STRUCT_INSUFFICIENT_ITEMS', () => {

  it('∀ cycle × n<2 items: fires', { timeout: 15000 }, () => {
    forAll(
      (n: number) => {
        const src = n === 0 ? '' : '- Lone Step'
        return codes(src, 'cycle').includes('STRUCT_INSUFFICIENT_ITEMS')
      },
      Gen.inRange(0, 1),
    )
  })

  it('∀ cycle × n≥2 items: does not fire', { timeout: 15000 }, () => {
    forAll(
      (n: number, label: string) => {
        const labels = Array.from({ length: n }, (_, i) => `${cleanLabel(label)}-${i}`)
        return !codes(buildFlatSource(labels), 'cycle').includes('STRUCT_INSUFFICIENT_ITEMS')
      },
      Gen.inRange(2, 8),
      genLabelPlain,
    )
  })

  it('∀ venn-3 × n≠3 items: fires', { timeout: 15000 }, () => {
    forAll(
      (n: number, label: string) => {
        if (n === 3) return true   // skip exact-match case
        const labels = Array.from({ length: n }, (_, i) => `${cleanLabel(label)}-${i}`)
        return codes(buildFlatSource(labels), 'venn-3').includes('STRUCT_INSUFFICIENT_ITEMS')
      },
      Gen.inRange(0, 6),
      genLabelPlain,
    )
  })

  it('∀ process × n≥1 items: never fires', { timeout: 15000 }, () => {
    forAll(
      (n: number, label: string) => {
        const labels = Array.from({ length: n }, (_, i) => `${cleanLabel(label)}-${i}`)
        return !codes(buildFlatSource(labels), 'process').includes('STRUCT_INSUFFICIENT_ITEMS')
      },
      Gen.inRange(1, 8),
      genLabelPlain,
    )
  })

})

// ── LAYOUT_NODE_COUNT_EXCEEDS_RANGE ──────────────────────────────────────────

describe('LAYOUT_NODE_COUNT_EXCEEDS_RANGE', () => {

  it('∀ cycle × n>8 items: fires', { timeout: 15000 }, () => {
    forAll(
      (n: number, label: string) => {
        const labels = Array.from({ length: n }, (_, i) => `${cleanLabel(label)}-${i}`)
        return codes(buildFlatSource(labels), 'cycle').includes('LAYOUT_NODE_COUNT_EXCEEDS_RANGE')
      },
      Gen.inRange(9, 15),
      genLabelPlain,
    )
  })

  it('∀ cycle × 2≤n≤8 items: does not fire', { timeout: 15000 }, () => {
    forAll(
      (n: number, label: string) => {
        const labels = Array.from({ length: n }, (_, i) => `${cleanLabel(label)}-${i}`)
        return !codes(buildFlatSource(labels), 'cycle').includes('LAYOUT_NODE_COUNT_EXCEEDS_RANGE')
      },
      Gen.inRange(2, 8),
      genLabelPlain,
    )
  })

})

// ── CONTENT_NUMERIC_VALUE_EXPECTED ────────────────────────────────────────────

describe('CONTENT_NUMERIC_VALUE_EXPECTED', () => {

  it('∀ radar × 3 items with numeric values: does not fire', { timeout: 15000 }, () => {
    forAll(
      (a: number, b: number, c: number) => {
        const src = `- Speed: ${a}\n- Power: ${b}\n- Range: ${c}`
        return !codes(src, 'radar').includes('CONTENT_NUMERIC_VALUE_EXPECTED')
      },
      Gen.inRange(0, 100),
      Gen.inRange(0, 100),
      Gen.inRange(0, 100),
    )
  })

  it('∀ radar × item with non-numeric value: fires', { timeout: 15000 }, () => {
    // Domain: words that are guaranteed non-numeric. We use a fixed list so we
    // never accidentally pick a string that parseFloat() silently reads as a number
    // (e.g. "0P" → parseFloat("0P") === 0 in JavaScript — valid number!).
    const NON_NUMERIC = ['fast', 'slow', 'high', 'low', 'moderate', 'none', 'full', 'half']
    forAll(
      (wi: number) => {
        const v = NON_NUMERIC[wi % NON_NUMERIC.length]
        const src = `- Speed: ${v}\n- Power: 75\n- Range: 80`
        return codes(src, 'radar').includes('CONTENT_NUMERIC_VALUE_EXPECTED')
      },
      Gen.inRange(0, NON_NUMERIC.length - 1),
    )
  })

})

// ── CONTENT_DUPLICATE_SIBLING_LABELS ─────────────────────────────────────────

describe('CONTENT_DUPLICATE_SIBLING_LABELS', () => {

  it('∀ n≥2 items with duplicate first two labels: fires', { timeout: 15000 }, () => {
    forAll(
      (n: number, label: string) => {
        const labels = buildDupeLabels(n, cleanLabel(label))
        return codes(buildFlatSource(labels), 'process').includes('CONTENT_DUPLICATE_SIBLING_LABELS')
      },
      Gen.inRange(2, 6),
      genLabelPlain,
    )
  })

  it('∀ all-distinct labels: does not fire', { timeout: 15000 }, () => {
    forAll(
      (n: number, label: string) => {
        const labels = buildUniqueLabels(n, cleanLabel(label))
        return !codes(buildFlatSource(labels), 'process').includes('CONTENT_DUPLICATE_SIBLING_LABELS')
      },
      Gen.inRange(1, 8),
      genLabelPlain,
    )
  })

})

// ── CONTENT_VERY_LONG_LABEL ───────────────────────────────────────────────────

describe('CONTENT_VERY_LONG_LABEL', () => {

  it('∀ cycle × label > 25 chars: fires for at least one item', { timeout: 15000 }, () => {
    forAll(
      (label: string) => {
        // Pad the cleaned label to exactly 30 chars, guaranteeing it exceeds the
        // cycle threshold of 25.  cleanLabel(" ") → "x" (1 char); padEnd(30,'X')
        // makes it 30 chars.  (Old approach: concat + slice(0,30) only guaranteed
        // base+10 chars, which for a 1-char base is 11 — still below threshold.)
        const l = cleanLabel(label).padEnd(30, 'X')
        const src = `- ${l}\n- Short`
        return codes(src, 'cycle').includes('CONTENT_VERY_LONG_LABEL')
      },
      genLabelPlain,
    )
  })

  it('∀ cycle × label ≤ 25 chars: does not fire', { timeout: 15000 }, () => {
    forAll(
      (label: string) => {
        const l = cleanLabel(label).slice(0, 25)
        if (!l) return true
        const src = `- ${l}\n- Short`
        return !codes(src, 'cycle').includes('CONTENT_VERY_LONG_LABEL')
      },
      genLabelPlain,
    )
  })

})
