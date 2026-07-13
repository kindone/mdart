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

// ── Source builders ────────────────────────────────────────────────────────────

const LABELS = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta']

/** Build a radial source: one hub item + n spoke items. */
function buildRadialSrc(n: number, offset: number): string {
  const items = Array.from({ length: n + 1 }, (_, i) =>
    `- ${LABELS[(offset + i) % LABELS.length]}`
  ).join('\n')
  return `type: radial\ntitle: Hub\n${items}`
}

/**
 * Build a converging source: one outcome at top level; k inputs as children.
 * Converging syntax: top-level = central concept; children = inputs.
 */
function buildConvergingSrc(k: number, offset: number): string {
  const outcome = LABELS[offset % LABELS.length]
  const inputs = Array.from({ length: k }, (_, i) =>
    `  - ${LABELS[(offset + i + 1) % LABELS.length]}`
  ).join('\n')
  return `type: converging\n- ${outcome}\n${inputs}`
}

/** Build a venn source: 2 circles + 1 intersection item. */
function buildVennSrc(offset: number): string {
  const a = LABELS[offset % LABELS.length]
  const b = LABELS[(offset + 1) % LABELS.length]
  return `type: venn\n- ${a}\n- ${b}\n- ${a} ∩ ${b}: Overlap`
}

/** Build a plus source: one centre + 4 arm items (exactly 5 items total). */
function buildPlusSrc(offset: number): string {
  const items = Array.from({ length: 5 }, (_, i) =>
    `- ${LABELS[(offset + i) % LABELS.length]}`
  ).join('\n')
  return `type: plus\n${items}`
}

/** Extract all mdart-n{i} class values from SVG (in order). */
function nodeGroupClasses(svg: string): string[] {
  return Array.from(svg.matchAll(/class="(mdart-n\d+)"/g), m => m[1])
}

// ── Radial ────────────────────────────────────────────────────────────────────

describe('radial: scoped animation + hub-and-spoke groups', () => {

  it('∀ n≥2 spokes: scoped @keyframes present, mdart-n0 present, no mdart-loop', { timeout: 20000 }, () => {
    forAll(
      (n: number, offset: number) => {
        const svg = renderMdArt(buildRadialSrc(n, offset))
        return !!svg.match(/@keyframes mdart-s[a-z0-9]+-mdart-enter/)
          && svg.includes('class="mdart-n0"')
          && !svg.includes('mdart-loop')
      },
      Gen.inRange(2, 5),
      Gen.inRange(0, LABELS.length - 1),
    )
  })

  it('∀ n≥2 spokes: spoke groups mdart-n1..mdart-n{n} are present', { timeout: 20000 }, () => {
    forAll(
      (n: number, offset: number) => {
        const svg = renderMdArt(buildRadialSrc(n, offset))
        const classes = nodeGroupClasses(svg)
        // Hub is mdart-n0; spokes are n1..n{n}
        return Array.from({ length: n }, (_, i) => `mdart-n${i + 1}`)
          .every(cls => classes.includes(cls))
      },
      Gen.inRange(2, 5),
      Gen.inRange(0, LABELS.length - 1),
    )
  })

  it('∀ radial: no crash, valid viewBox, no NaN', { timeout: 20000 }, () => {
    forAll(
      (n: number, offset: number) => {
        try {
          const svg = renderMdArt(buildRadialSrc(n, offset))
          return svg.includes('<svg') && svg.includes('viewBox=')
            && !svg.includes('="NaN"') && !svg.includes('="Infinity"')
        } catch { return false }
      },
      Gen.inRange(1, 6),
      Gen.inRange(0, LABELS.length - 1),
    )
  })

})

// ── Converging ────────────────────────────────────────────────────────────────

describe('converging: hub group + incoming arrow marker', () => {

  it('∀ k≥1 sources: mdart-n0 present, url(#arr-c) connector marker present', { timeout: 20000 }, () => {
    forAll(
      (k: number, offset: number) => {
        const svg = renderMdArt(buildConvergingSrc(k, offset))
        return svg.includes('class="mdart-n0"')
          && svg.includes('marker-end="url(#arr-c)"')
      },
      Gen.inRange(1, 4),
      Gen.inRange(0, LABELS.length - 1),
    )
  })

  it('∀ k sources: source groups mdart-n1..mdart-n{k} present', { timeout: 20000 }, () => {
    forAll(
      (k: number, offset: number) => {
        const svg = renderMdArt(buildConvergingSrc(k, offset))
        const classes = nodeGroupClasses(svg)
        return Array.from({ length: k }, (_, i) => `mdart-n${i + 1}`)
          .every(cls => classes.includes(cls))
      },
      Gen.inRange(2, 4),
      Gen.inRange(0, LABELS.length - 1),
    )
  })

  it('∀ converging: no crash, valid viewBox', { timeout: 20000 }, () => {
    forAll(
      (k: number, offset: number) => {
        try {
          const svg = renderMdArt(buildConvergingSrc(k, offset))
          return svg.includes('<svg') && svg.includes('viewBox=')
        } catch { return false }
      },
      Gen.inRange(1, 5),
      Gen.inRange(0, LABELS.length - 1),
    )
  })

})

// ── Venn ──────────────────────────────────────────────────────────────────────

describe('venn: scoped animation + circle groups, no mdart-loop', () => {

  it('∀ offset: scoped keyframes, mdart-n0/n1/n2 present, no mdart-loop', { timeout: 15000 }, () => {
    forAll(
      (offset: number) => {
        const svg = renderMdArt(buildVennSrc(offset))
        return !!svg.match(/@keyframes mdart-s[a-z0-9]+-mdart-enter/)
          && svg.includes('class="mdart-n0"')
          && svg.includes('class="mdart-n1"')
          && svg.includes('class="mdart-n2"')
          && !svg.includes('mdart-loop')
      },
      Gen.inRange(0, LABELS.length - 2),   // -2 ensures offset+1 stays in range
    )
  })

  it('∀ 2-circle venn: no NaN coords, valid viewBox', { timeout: 15000 }, () => {
    forAll(
      (offset: number) => {
        try {
          const svg = renderMdArt(buildVennSrc(offset))
          return svg.includes('viewBox=')
            && !svg.includes('="NaN"') && !svg.includes('="Infinity"')
        } catch { return false }
      },
      Gen.inRange(0, LABELS.length - 2),
    )
  })

  it('∀ venn: two renders with different labels → different scope tokens', { timeout: 15000 }, () => {
    // Scope is hash-based; different label content → different scope
    forAll(
      (i: number, j: number) => {
        if (i === j) return true   // same source → same scope, skip
        const svgA = renderMdArt(buildVennSrc(i % (LABELS.length - 1)))
        const svgB = renderMdArt(buildVennSrc(j % (LABELS.length - 1)))
        const sA = svgA.match(/data-mdart-scope="([^"]+)"/)?.[1]
        const sB = svgB.match(/data-mdart-scope="([^"]+)"/)?.[1]
        return !!sA && !!sB && (i === j ? sA === sB : sA !== sB)
      },
      Gen.inRange(0, LABELS.length - 2),
      Gen.inRange(0, LABELS.length - 2),
    )
  })

})

// ── Plus ──────────────────────────────────────────────────────────────────────

describe('plus: arm connector groups contain <line before <rect', () => {

  it('∀ 5-item plus: mdart-n1..n4 each contain a <line and a <rect (arm layout)', { timeout: 15000 }, () => {
    forAll(
      (offset: number) => {
        const svg = renderMdArt(buildPlusSrc(offset))
        // The plus renderer wraps each arm as: <g class="mdart-n{i}"><line…/><rect…/>
        return svg.match(/<g class="mdart-n1"><line[\s\S]*?<rect/) !== null
          && svg.match(/<g class="mdart-n2"><line[\s\S]*?<rect/) !== null
          && svg.match(/<g class="mdart-n3"><line[\s\S]*?<rect/) !== null
          && svg.match(/<g class="mdart-n4"><line[\s\S]*?<rect/) !== null
      },
      Gen.inRange(0, LABELS.length - 1),
    )
  })

  it('∀ plus: mdart-n0 present (centre box), no transform:scale', { timeout: 15000 }, () => {
    forAll(
      (offset: number) => {
        const svg = renderMdArt(buildPlusSrc(offset))
        return svg.includes('class="mdart-n0"')
          && !svg.includes('transform:scale')
      },
      Gen.inRange(0, LABELS.length - 1),
    )
  })

  it('∀ plus: no crash, valid viewBox, no NaN', { timeout: 15000 }, () => {
    forAll(
      (offset: number) => {
        try {
          const svg = renderMdArt(buildPlusSrc(offset))
          return svg.includes('<svg') && svg.includes('viewBox=')
            && !svg.includes('="NaN"') && !svg.includes('="Infinity"')
        } catch { return false }
      },
      Gen.inRange(0, LABELS.length - 1),
    )
  })

})

// ── Cross-type invariants ─────────────────────────────────────────────────────

describe('all relationship types: cross-type animation invariants', () => {

  it('all four relationship types: @keyframes always scoped (no bare mdart-enter)', { timeout: 15000 }, () => {
    const srcs = [
      buildRadialSrc(3, 0),
      buildConvergingSrc(2, 0),
      buildVennSrc(0),
      buildPlusSrc(0),
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
      (n: number, offset: number) => {
        const svgR = renderMdArt(buildRadialSrc(n, offset))
        const svgC = renderMdArt(buildConvergingSrc(n, offset))
        return svgR.includes('mdart-bright-loop') && !svgR.includes('class="mdart-loop"')
          && svgC.includes('mdart-bright-loop') && !svgC.includes('class="mdart-loop"')
      },
      Gen.inRange(2, 4),
      Gen.inRange(0, LABELS.length - 1),
    )
  })

})
