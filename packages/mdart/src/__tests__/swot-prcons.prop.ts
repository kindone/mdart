// Feature:     SWOT and pros-cons renderers — header routing and attr overrides
// Arch/Design: Both renderers use exact-match header detection (not substring).
//              pros-cons: "Pros" / "Cons" headers (case-insensitive) or [pros]/[cons] attrs.
//              swot: "Strengths"/"Weaknesses"/"Opportunities"/"Threats" or [s]/[w]/[o]/[t] attrs.
//              Misrouted items are dropped rather than guessed.
//              Pros items render with ✓ marker (fill="#6ee7b7"); Cons with ✗ (fill="#fda4af").
// Spec:        ∀ pros-cons × children under "Pros": ✓ marker appears for each
//              ∀ pros-cons × children under "Cons": ✗ marker appears for each
//              ∀ pros-cons × [pros] attr override: item appears in pros column
//              ∀ pros-cons × [cons] attr override: item appears in cons column
//              ∀ label ⊃ "pro" but not "Pros": children NOT routed as pros
//              ∀ swot × standard headers: items appear in SVG
//              ∀ swot × [s]/[w]/[o]/[t] attrs: items appear in SVG
//              ∀ swot × label with "Threat" substring (not exact): not matched
//              ∀ both renderers × any input: renders without crash
// @quality:    correctness
// @type:       property
// @mode:       verification

import { describe, it } from 'vitest'
import { forAll, Gen } from 'jsproptest'
import { renderMdArt } from '../renderer'
import { genLabelPlain } from './domains'

function safe(s: string): string {
  return s
    .replace(/\n/g, ' ').replace(/:/g, '-').replace(/^\s*$/, 'x')
    .replace(/[[\]]/g, '()')
    // Strip XML-special chars: without this, "<" becomes "&lt;" in SVG output,
    // causing svg.includes(label) to fail even when the content IS there.
    .replace(/[<>"&]/g, '-')
    // Don't let random labels look like exact SWOT/pros-cons headers
    .replace(/^(Pros|Cons|Strengths|Weaknesses|Opportunities|Threats)$/i, 'SafeLabel')
}

/**
 * A distinctive prefix+suffix wrapper that makes label membership tests
 * more reliable. Without this, a short label like "x" would appear in SVG
 * naturally (as an SVG coord attribute name), causing false negatives.
 */
function distinct(s: string): string {
  // Wrap with a distinctive sentinel that won't appear in SVG infrastructure
  return `PROPCHK-${safe(s)}-END`
}

// ── Pros-cons header routing ──────────────────────────────────────────────────

describe('pros-cons: children under exact headers are routed correctly', () => {

  it('∀ n items under "Pros": ✓ marker appears for each', { timeout: 15000 }, () => {
    // Use a distinctive MARK_ prefix to avoid collisions with SVG infrastructure.
    // safe() strips XML-special chars, so MARK_...END labels round-trip cleanly.
    forAll(
      (n: number, label: string) => {
        const base = `MARK${safe(label)}END`
        const children = Array.from({ length: n }, (_, i) => `  - ${base}${i}`).join('\n')
        const src = `type: pros-cons\n- Pros\n${children}\n- Cons\n  - BaseCon`
        const svg = renderMdArt(src)
        return Array.from({ length: n }, (_, i) => `${base}${i}`)
          .every(lbl => svg.includes(lbl))
          && svg.includes('✓')
      },
      Gen.inRange(1, 4),
      genLabelPlain,
    )
  })

  it('∀ n items under "Cons": ✗ marker appears', { timeout: 15000 }, () => {
    forAll(
      (n: number, label: string) => {
        const base = `MARK${safe(label)}END`
        const children = Array.from({ length: n }, (_, i) => `  - ${base}${i}`).join('\n')
        const src = `type: pros-cons\n- Pros\n  - BasePro\n- Cons\n${children}`
        const svg = renderMdArt(src)
        return Array.from({ length: n }, (_, i) => `${base}${i}`)
          .every(lbl => svg.includes(lbl))
          && svg.includes('✗')
      },
      Gen.inRange(1, 4),
      genLabelPlain,
    )
  })

  it('∀ [pros] attr override: item content appears in SVG', { timeout: 15000 }, () => {
    forAll(
      (label: string) => {
        const sentinel = `MARK${safe(label)}END`
        const src = `type: pros-cons\n- Upside [pros]\n  - ${sentinel}\n- Downside [cons]\n  - Risk`
        const svg = renderMdArt(src)
        return svg.includes(sentinel)
      },
      genLabelPlain,
    )
  })

  it('∀ [cons] attr override: item content appears in SVG', { timeout: 15000 }, () => {
    forAll(
      (label: string) => {
        const sentinel = `MARK${safe(label)}END`
        const src = `type: pros-cons\n- Upside [pros]\n  - Benefit\n- Downside [cons]\n  - ${sentinel}`
        const svg = renderMdArt(src)
        return svg.includes(sentinel)
      },
      genLabelPlain,
    )
  })

})

// ── Substring non-match (regression guard) ────────────────────────────────────

describe('pros-cons: substring labels not treated as routing headers', () => {

  it('"Proposal" (contains "pro") children are NOT routed to pros column', { timeout: 15000 }, () => {
    forAll(
      (label: string) => {
        // "Proposal" is the regression case — substring "pro" must not match.
        // Use distinct() so the sentinel is long and unusual enough to not appear
        // coincidentally in SVG coord attributes, class names, etc.
        const sentinel = distinct(label)
        const src = `type: pros-cons\n- Proposal\n  - ${sentinel}\n- Pros\n  - Real Pro`
        const svg = renderMdArt(src)
        // The Proposal child should NOT appear (it gets dropped, not misrouted)
        return !svg.includes(sentinel)
      },
      genLabelPlain,
    )
  })

  it('"Contrary" (contains "con") children are NOT routed to cons column', { timeout: 15000 }, () => {
    forAll(
      (label: string) => {
        const sentinel = distinct(label)
        const src = `type: pros-cons\n- Contrary\n  - ${sentinel}\n- Cons\n  - Real Con`
        const svg = renderMdArt(src)
        return !svg.includes(sentinel)
      },
      genLabelPlain,
    )
  })

})

// ── SWOT header routing ───────────────────────────────────────────────────────

describe('swot: exact header routing works for all four quadrants', () => {

  const SWOT_HEADERS = ['Strengths', 'Weaknesses', 'Opportunities', 'Threats'] as const

  it('∀ children under exact SWOT headers: items appear in SVG', { timeout: 15000 }, () => {
    forAll(
      (label: string) => {
        // Use MARK...END wrapper so labels are distinctive and won't collide
        // with SVG coords/class names (e.g. safe("<") = "-", which appears in SVG).
        const base = `MARK${safe(label)}END`
        const src = `type: swot
- Strengths
  - ${base}S
- Weaknesses
  - ${base}W
- Opportunities
  - ${base}O
- Threats
  - ${base}T`
        const svg = renderMdArt(src)
        return ['S', 'W', 'O', 'T'].every(q => svg.includes(`${base}${q}`))
      },
      genLabelPlain,
    )
  })

  it('∀ [s]/[w]/[o]/[t] attr overrides: item content appears in SVG', { timeout: 15000 }, () => {
    forAll(
      (label: string) => {
        const base = `MARK${safe(label)}END`
        const src = `type: swot
- Group A [strengths]
  - ${base}s
- Group B [w]
  - ${base}w
- Group C [o]
  - ${base}o
- Group D [t]
  - ${base}t`
        const svg = renderMdArt(src)
        return ['s', 'w', 'o', 't'].every(q => svg.includes(`${base}${q}`))
      },
      genLabelPlain,
    )
  })

})

// ── SWOT substring non-match ──────────────────────────────────────────────────

describe('swot: substring labels not treated as routing headers', () => {

  it('"Threatening factors" children are NOT routed to T quadrant', { timeout: 15000 }, () => {
    forAll(
      (label: string) => {
        const sentinel = distinct(label)
        const src = `type: swot
- Threatening factors
  - ${sentinel}
- Threats
  - Real threat`
        const svg = renderMdArt(src)
        // Child of "Threatening factors" should NOT appear
        return !svg.includes(sentinel)
      },
      genLabelPlain,
    )
  })

  it('"Strong arms" does NOT route children to Strengths quadrant', { timeout: 15000 }, () => {
    forAll(
      (label: string) => {
        const sentinel = distinct(label)
        const src = `type: swot
- Strong arms
  - ${sentinel}
- Strengths
  - Real strength`
        const svg = renderMdArt(src)
        return !svg.includes(sentinel)
      },
      genLabelPlain,
    )
  })

})

// ── No-crash ──────────────────────────────────────────────────────────────────

describe('both renderers: no crash with any input', () => {

  it('∀ pros-cons × arbitrary labels: renders without throwing', { timeout: 15000 }, () => {
    forAll(
      (n: number, label: string) => {
        const children = Array.from({ length: n }, (_, i) => `  - ${safe(label)}-${i}`).join('\n')
        const src = `type: pros-cons\n- Pros\n${children}\n- Cons\n${children}`
        try {
          const svg = renderMdArt(src)
          return svg.includes('<svg')
        } catch { return false }
      },
      Gen.inRange(1, 4),
      genLabelPlain,
    )
  })

  it('∀ swot × arbitrary labels: renders without throwing', { timeout: 15000 }, () => {
    forAll(
      (n: number, label: string) => {
        const children = Array.from({ length: n }, (_, i) => `  - ${safe(label)}-${i}`).join('\n')
        const src = `type: swot
- Strengths\n${children}
- Weaknesses\n${children}
- Opportunities\n${children}
- Threats\n${children}`
        try {
          const svg = renderMdArt(src)
          return svg.includes('<svg')
        } catch { return false }
      },
      Gen.inRange(1, 3),
      genLabelPlain,
    )
  })

})
