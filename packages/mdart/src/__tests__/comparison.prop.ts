// Feature:     Comparison renderer — multi-option table layout
// Arch/Design: Each top-level item is an "option" (column); children are rows.
//              Keyed children (label: value) share row headers across options.
//              Unkeyed children are positionally aligned.
//              The renderer MUST NOT output an "Invalid comparison diagram" error string.
// Spec:        ∀ comparison × N options: option labels appear in SVG
//              ∀ comparison × shared row keys: row key labels appear in SVG
//              ∀ comparison × N options × M rows each: no crash, valid viewBox
//              ∀ comparison × any input: "Invalid comparison diagram" never appears
//              ∀ comparison × 2 options with same row keys: both option labels in SVG
// @quality:    correctness
// @type:       property
// @mode:       verification

import { describe, it } from 'vitest'
import { forAll, Gen } from 'jsproptest'
import { renderMdArt } from '../renderer'
import { genLabelPlain } from './domains'

const ROW_KEYS = ['Speed', 'Cost', 'Quality', 'Support', 'Scale', 'Latency', 'License']
const OPTION_NAMES = ['Option A', 'Option B', 'Option C', 'Choice X', 'Choice Y']
const CELL_VALUES = ['High', 'Low', 'Fast', 'Slow', 'Yes', 'No', 'Free', 'Paid']

function safe(s: string): string {
  return s.replace(/\n/g, ' ').replace(/:/g, '-').replace(/^\s*$/, 'x').replace(/[[\]]/g, '()')
}

/** Build a comparison source with N options and M shared keyed rows. */
function buildComparisonSrc(numOpts: number, numRows: number, oi: number, ki: number): string {
  const opts = Array.from({ length: numOpts }, (_, o) =>
    OPTION_NAMES[(oi + o) % OPTION_NAMES.length]
  )
  const keys = Array.from({ length: numRows }, (_, r) => ROW_KEYS[(ki + r) % ROW_KEYS.length])
  return opts.map((opt, o) => {
    const rows = keys.map((k, r) => `  - ${k}: ${CELL_VALUES[(o + r) % CELL_VALUES.length]}`).join('\n')
    return `- ${opt}\n${rows}`
  }).join('\n')
}

// ── Option labels appear ──────────────────────────────────────────────────────

describe('comparison: option labels appear in SVG', () => {

  it('∀ 2 options: both option labels appear in SVG', { timeout: 15000 }, () => {
    forAll(
      (oi: number, ki: number) => {
        const src = buildComparisonSrc(2, 2, oi, ki)
        const opt0 = OPTION_NAMES[oi % OPTION_NAMES.length]
        const opt1 = OPTION_NAMES[(oi + 1) % OPTION_NAMES.length]
        const svg = renderMdArt(src, 'comparison')
        return svg.includes(opt0) && svg.includes(opt1)
      },
      Gen.inRange(0, OPTION_NAMES.length - 1),
      Gen.inRange(0, ROW_KEYS.length - 1),
    )
  })

  it('∀ 1-4 options: all option labels appear in SVG', { timeout: 15000 }, () => {
    forAll(
      (numOpts: number, oi: number) => {
        const src = buildComparisonSrc(numOpts, 2, oi, 0)
        const opts = Array.from({ length: numOpts }, (_, o) => OPTION_NAMES[(oi + o) % OPTION_NAMES.length])
        const svg = renderMdArt(src, 'comparison')
        return opts.every(opt => svg.includes(opt))
      },
      Gen.inRange(1, 4),
      Gen.inRange(0, OPTION_NAMES.length - 1),
    )
  })

})

// ── Shared row keys appear ────────────────────────────────────────────────────

describe('comparison: shared row keys appear in SVG', () => {

  it('∀ 2 options × shared row keys: row keys appear in SVG', { timeout: 15000 }, () => {
    forAll(
      (numRows: number, ki: number) => {
        const src = buildComparisonSrc(2, numRows, 0, ki)
        const keys = Array.from({ length: numRows }, (_, r) => ROW_KEYS[(ki + r) % ROW_KEYS.length])
        const svg = renderMdArt(src, 'comparison')
        return keys.every(k => svg.includes(k))
      },
      Gen.inRange(1, 4),
      Gen.inRange(0, ROW_KEYS.length - 1),
    )
  })

})

// ── No "Invalid" error message ────────────────────────────────────────────────

describe('comparison: no Invalid error message for any input', () => {

  it('∀ n options × m rows: "Invalid comparison diagram" never appears', { timeout: 20000 }, () => {
    forAll(
      (numOpts: number, numRows: number, oi: number, ki: number) => {
        const src = buildComparisonSrc(numOpts, numRows, oi, ki)
        const svg = renderMdArt(src, 'comparison')
        return !svg.includes('Invalid comparison diagram')
      },
      Gen.inRange(1, 3),
      Gen.inRange(1, 4),
      Gen.inRange(0, OPTION_NAMES.length - 1),
      Gen.inRange(0, ROW_KEYS.length - 1),
    )
  })

  it('∀ arbitrary labels: "Invalid comparison diagram" never appears', { timeout: 15000 }, () => {
    forAll(
      (n: number, label: string) => {
        // Unkeyed children (positional alignment)
        const opts = Array.from({ length: n }, (_, i) => {
          const children = ['Detail A', 'Detail B'].map(c => `  - ${c} ${i}`).join('\n')
          return `- ${safe(label)}-${i}\n${children}`
        }).join('\n')
        const svg = renderMdArt(opts, 'comparison')
        return !svg.includes('Invalid comparison diagram')
      },
      Gen.inRange(1, 3),
      genLabelPlain,
    )
  })

})

// ── No-crash + geometry ───────────────────────────────────────────────────────

describe('comparison: no crash with any valid input', () => {

  it('∀ n options × m shared rows: renders without throwing, has viewBox', { timeout: 20000 }, () => {
    forAll(
      (numOpts: number, numRows: number, oi: number, ki: number) => {
        const src = buildComparisonSrc(numOpts, numRows, oi, ki)
        try {
          const svg = renderMdArt(src, 'comparison')
          return svg.includes('<svg') && svg.includes('viewBox=')
        } catch { return false }
      },
      Gen.inRange(1, 3),
      Gen.inRange(1, 4),
      Gen.inRange(0, OPTION_NAMES.length - 1),
      Gen.inRange(0, ROW_KEYS.length - 1),
    )
  })

})
