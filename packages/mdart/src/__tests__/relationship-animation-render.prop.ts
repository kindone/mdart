// Feature:     Relationship layout renderers — radial, converging, venn, plus
// Arch/Design: Each relationship renderer has a distinct animation contract:
//              - radial:     scoped @keyframes mdart-enter; hub group + spoke groups
//                            (mdart-n0 = hub, mdart-n1..n{k} = spokes); no mdart-loop
//              - converging: hub and source groups (mdart-n0 = hub, mdart-n1..n{k});
//                            incoming connector arrows carry marker-end="url(#arr-c)"
//              - venn:       scoped @keyframes mdart-enter; circle groups
//                            (mdart-n0 = left, mdart-n1 = right, mdart-n2 = label);
//                            no mdart-loop (brightness spotlight doesn't apply)
//              - plus:       five box groups (mdart-n0 = centre, n1–n4 = arms);
//                            each arm group contains a connector <line> before the <rect>
// Spec:        ∀ radial × n spokes: scoped keyframes, mdart-n0 present, no mdart-loop
//              ∀ radial × n spokes: mdart-n{1..n} present (spoke groups)
//              ∀ converging × k sources: mdart-n0 present, url(#arr-c) marker present
//              ∀ venn × 2-item source: scoped keyframes, mdart-n0/n1/n2 present
//              ∀ plus × 5 arms: mdart-n1..n4 groups each contain <line before <rect
//              ∀ all four types × any valid input: no crash, valid viewBox
// @quality:    correctness
// @type:       property
// @mode:       verification

import { describe, it } from 'vitest'
import { forAll, Gen } from 'jsproptest'
import { renderMdArt } from '../renderer'
import { genLabelAny } from './domains'

// ── Label sanitiser ────────────────────────────────────────────────────────────
//
// Strips characters that have special meaning in the MdArt parser:
//   ∩  — venn intersection marker (clashes with the hardcoded `∩` in buildVennSrc)
//   :  — KV split (avoids accidental label:value parse)
//   →  — flow arrow
//   []/newline — attribute and line-break syntax
//
// Appends an index to ensure uniqueness within a source so the duplicate-sibling
// validation code never rejects any generated input as a false positive.

function relLabel(raw: string, idx: number): string {
  const clean = raw
    .replace(/[\n:→\[\]∩]/g, '')
    .replace(/^[-+?!*\s]+/, '')
    .trimEnd()
    .slice(0, 20)
  return `${clean || 'L'}${idx}`
}

// ── Source builders ────────────────────────────────────────────────────────────

/** Build a radial source: first item = hub, rest = spokes. */
function buildRadialSrc(labels: string[]): string {
  const items = labels.map(l => `- ${l}`).join('\n')
  return `type: radial\ntitle: Hub\n${items}`
}

/**
 * Build a converging source: first item = central concept (top-level);
 * remaining items = sources (indented children).
 */
function buildConvergingSrc(labels: string[]): string {
  const [outcome, ...inputs] = labels
  const children = inputs.map(l => `  - ${l}`).join('\n')
  return `type: converging\n- ${outcome}\n${children}`
}

/** Build a 2-circle venn source with a synthetic intersection item. */
function buildVennSrc(labelA: string, labelB: string): string {
  return `type: venn\n- ${labelA}\n- ${labelB}\n- ${labelA} ∩ ${labelB}: Overlap`
}

/** Build a plus source: 5 items (centre + 4 arms). */
function buildPlusSrc(labels: string[]): string {
  // plus always expects exactly 5 items; if fewer are provided, pad with fallbacks
  const padded = Array.from({ length: 5 }, (_, i) => labels[i] ?? `Arm${i}`)
  return `type: plus\n${padded.map(l => `- ${l}`).join('\n')}`
}

/** Extract all mdart-n{i} class values from SVG (in order). */
function nodeGroupClasses(svg: string): string[] {
  return Array.from(svg.matchAll(/class="(mdart-n\d+)"/g), m => m[1])
}

// ── Radial ────────────────────────────────────────────────────────────────────

describe('radial: scoped animation + hub-and-spoke groups', () => {

  it('∀ n≥2 items: scoped @keyframes present, mdart-n0 present, no mdart-loop', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const labels = rawLabels.map(relLabel)
        const svg = renderMdArt(buildRadialSrc(labels))
        return !!svg.match(/@keyframes mdart-s[a-z0-9]+-mdart-enter/)
          && svg.includes('class="mdart-n0"')
          && !svg.includes('mdart-loop')
      },
      Gen.array(genLabelAny, 2, 5),
    )
  })

  it('∀ n items: spoke groups mdart-n1..mdart-n{n-1} are present', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const labels = rawLabels.map(relLabel)
        const n = labels.length
        const svg = renderMdArt(buildRadialSrc(labels))
        const classes = nodeGroupClasses(svg)
        // n items: hub = mdart-n0, spokes = mdart-n1..mdart-n{n-1}
        return Array.from({ length: n - 1 }, (_, i) => `mdart-n${i + 1}`)
          .every(cls => classes.includes(cls))
      },
      Gen.array(genLabelAny, 2, 5),
    )
  })

  it('∀ radial: no crash, valid viewBox, no NaN', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const labels = rawLabels.map(relLabel)
        try {
          const svg = renderMdArt(buildRadialSrc(labels))
          return svg.includes('<svg') && svg.includes('viewBox=')
            && !svg.includes('="NaN"') && !svg.includes('="Infinity"')
        } catch { return false }
      },
      Gen.array(genLabelAny, 1, 6),
    )
  })

})

// ── Converging ────────────────────────────────────────────────────────────────

describe('converging: hub group + incoming arrow marker', () => {

  it('∀ k≥1 source items: mdart-n0 present, url(#arr-c) connector marker present', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const labels = rawLabels.map(relLabel)
        const svg = renderMdArt(buildConvergingSrc(labels))
        return svg.includes('class="mdart-n0"')
          && svg.includes('marker-end="url(#arr-c)"')
      },
      Gen.array(genLabelAny, 2, 5),   // ≥2: one outcome + ≥1 source
    )
  })

  it('∀ k sources: source groups mdart-n1..mdart-n{k} present', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const labels = rawLabels.map(relLabel)
        const k = labels.length - 1   // first label is the outcome
        const svg = renderMdArt(buildConvergingSrc(labels))
        const classes = nodeGroupClasses(svg)
        return Array.from({ length: k }, (_, i) => `mdart-n${i + 1}`)
          .every(cls => classes.includes(cls))
      },
      Gen.array(genLabelAny, 3, 5),   // ≥3: one outcome + ≥2 sources to have n1+n2
    )
  })

  it('∀ converging: no crash, valid viewBox', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const labels = rawLabels.map(relLabel)
        try {
          const svg = renderMdArt(buildConvergingSrc(labels))
          return svg.includes('<svg') && svg.includes('viewBox=')
        } catch { return false }
      },
      Gen.array(genLabelAny, 2, 6),
    )
  })

})

// ── Venn ──────────────────────────────────────────────────────────────────────

describe('venn: scoped animation + circle groups, no mdart-loop', () => {

  it('∀ (labelA, labelB): scoped keyframes, mdart-n0/n1/n2 present, no mdart-loop', { timeout: 15000 }, () => {
    forAll(
      (rawA: string, rawB: string) => {
        const a = relLabel(rawA, 0)
        const b = relLabel(rawB, 1)
        const svg = renderMdArt(buildVennSrc(a, b))
        return !!svg.match(/@keyframes mdart-s[a-z0-9]+-mdart-enter/)
          && svg.includes('class="mdart-n0"')
          && svg.includes('class="mdart-n1"')
          && svg.includes('class="mdart-n2"')
          && !svg.includes('mdart-loop')
      },
      genLabelAny,
      genLabelAny,
    )
  })

  it('∀ venn: no NaN coords, valid viewBox', { timeout: 15000 }, () => {
    forAll(
      (rawA: string, rawB: string) => {
        const a = relLabel(rawA, 0)
        const b = relLabel(rawB, 1)
        try {
          const svg = renderMdArt(buildVennSrc(a, b))
          return svg.includes('viewBox=')
            && !svg.includes('="NaN"') && !svg.includes('="Infinity"')
        } catch { return false }
      },
      genLabelAny,
      genLabelAny,
    )
  })

  it('∀ venn (A,B) ≠ (A,B)′: two different inputs → different scope tokens', { timeout: 15000 }, () => {
    // Scope is hash-based on the full source string. Two distinct (a, b) pairs
    // produce different sources → different scopes.
    forAll(
      (rawA1: string, rawB1: string, rawA2: string, rawB2: string) => {
        const a1 = relLabel(rawA1, 0); const b1 = relLabel(rawB1, 1)
        const a2 = relLabel(rawA2, 2); const b2 = relLabel(rawB2, 3)
        const src1 = buildVennSrc(a1, b1)
        const src2 = buildVennSrc(a2, b2)
        if (src1 === src2) return true   // same source → same scope, skip
        const sA = renderMdArt(src1).match(/data-mdart-scope="([^"]+)"/)?.[1]
        const sB = renderMdArt(src2).match(/data-mdart-scope="([^"]+)"/)?.[1]
        return !!sA && !!sB && sA !== sB
      },
      genLabelAny, genLabelAny,
      genLabelAny, genLabelAny,
    )
  })

})

// ── Plus ──────────────────────────────────────────────────────────────────────

describe('plus: arm connector groups contain <line before <rect', () => {

  it('∀ 5-item plus: mdart-n1..n4 each contain a <line and a <rect (arm layout)', { timeout: 15000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const labels = rawLabels.map(relLabel)
        const svg = renderMdArt(buildPlusSrc(labels))
        return svg.match(/<g class="mdart-n1"><line[\s\S]*?<rect/) !== null
          && svg.match(/<g class="mdart-n2"><line[\s\S]*?<rect/) !== null
          && svg.match(/<g class="mdart-n3"><line[\s\S]*?<rect/) !== null
          && svg.match(/<g class="mdart-n4"><line[\s\S]*?<rect/) !== null
      },
      Gen.array(genLabelAny, 5, 5),   // plus is always 5-item (centre + 4 arms)
    )
  })

  it('∀ plus: mdart-n0 present (centre box), no transform:scale', { timeout: 15000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const labels = rawLabels.map(relLabel)
        const svg = renderMdArt(buildPlusSrc(labels))
        return svg.includes('class="mdart-n0"')
          && !svg.includes('transform:scale')
      },
      Gen.array(genLabelAny, 5, 5),
    )
  })

  it('∀ plus: no crash, valid viewBox, no NaN', { timeout: 15000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const labels = rawLabels.map(relLabel)
        try {
          const svg = renderMdArt(buildPlusSrc(labels))
          return svg.includes('<svg') && svg.includes('viewBox=')
            && !svg.includes('="NaN"') && !svg.includes('="Infinity"')
        } catch { return false }
      },
      Gen.array(genLabelAny, 5, 5),
    )
  })

})

// ── Cross-type invariants ─────────────────────────────────────────────────────

describe('all relationship types: cross-type animation invariants', () => {

  it('all four relationship types: @keyframes always scoped (no bare mdart-enter)', { timeout: 15000 }, () => {
    const srcs = [
      buildRadialSrc(['Hub', 'Alpha', 'Beta', 'Gamma']),
      buildConvergingSrc(['Outcome', 'InputA', 'InputB']),
      buildVennSrc('Left', 'Right'),
      buildPlusSrc(['Centre', 'North', 'East', 'South', 'West']),
    ]
    for (const src of srcs) {
      const svg = renderMdArt(src)
      if (svg.includes('@keyframes mdart-enter ') || svg.match(/@keyframes mdart-enter[^-]/)) {
        throw new Error(`unscoped @keyframes mdart-enter found in: ${src.split('\n')[0]}`)
      }
    }
  })

  it('∀ radial/converging: mdart-bright-loop present (brightness spotlight, not cycle-loop)', { timeout: 15000 }, () => {
    // radial and converging use the brightness-spotlight animation (mdart-bright-loop),
    // same as zigzag-list/ribbon-list. They do NOT use mdart-loop (cycle-closing arrow).
    forAll(
      (rawRadial: string[], rawConverging: string[]) => {
        const radialLabels     = rawRadial.map(relLabel)
        const convergingLabels = rawConverging.map(relLabel)
        const svgR = renderMdArt(buildRadialSrc(radialLabels))
        const svgC = renderMdArt(buildConvergingSrc(convergingLabels))
        return svgR.includes('mdart-bright-loop') && !svgR.includes('class="mdart-loop"')
          && svgC.includes('mdart-bright-loop') && !svgC.includes('class="mdart-loop"')
      },
      Gen.array(genLabelAny, 2, 4),
      Gen.array(genLabelAny, 2, 4),
    )
  })

})
