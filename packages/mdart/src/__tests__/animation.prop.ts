// Feature:     Animation — scoped keyframes, per-type CSS animation patterns
// Arch/Design: Every SVG gets a unique scope token (data-mdart-scope="<id>").
//              All CSS keyframe names are prefixed with this scope so multiple
//              diagrams on the same page don't interfere.  Different type families
//              have distinct animation contracts:
//              - process family: scale-pulse (mdart-enter with transform:scale)
//              - list/zigzag/ribbon: brightness-spotlight (no scale, mdart-bright-loop)
//              - cycle family: closing arrow fades after the last node (mdart-arr-n{n})
//              - hierarchy/pyramid/statistical: fade-in sequence (no scale pulse)
// Spec:        ∀ two different type renders: data-mdart-scope tokens are distinct
//              ∀ any type with animation: @keyframes never appears unscoped
//              ∀ process family: mdart-n0 class appears
//              ∀ zigzag-list/ribbon-list: no transform:scale, mdart-bright-loop present
//              ∀ cycle family × n items: mdart-arr-n{n} appears (closing arrow after last)
//              ∀ hierarchy types: no transform:scale, mdart-n0 present
//              ∀ pyramid types: no transform:scale, mdart-n0 present
//              ∀ statistical types: no transform:scale, mdart-n0 present
// @quality:    correctness
// @type:       property
// @mode:       verification

import { describe, it } from 'vitest'
import { forAll, Gen } from 'jsproptest'
import { renderMdArt } from '../renderer'

const LABELS_3 = '- A\n- B\n- C'
const LABELS_4 = '- A\n- B\n- C\n- D'

function arrowGroupClasses(svg: string): string[] {
  return Array.from(svg.matchAll(/<g class="(mdart-arr-n\d+)"/g), m => m[1])
}

// ── Scope isolation ───────────────────────────────────────────────────────────

describe('animation scope isolation', () => {

  it('∀ two renders with different source content: scope tokens are distinct', { timeout: 15000 }, () => {
    // Scope tokens are hash-based (deterministic): same source → same scope (by design,
    // so the same embedded diagram on a page doesn't get conflicting CSS).
    // Two DIFFERENT sources must produce different scopes so their CSS doesn't collide.
    const TYPES = ['process', 'cycle', 'bullet-list', 'org-chart']
    forAll(
      (typeIdx: number, n: number) => {
        const type = TYPES[typeIdx % TYPES.length]
        // Generate two clearly different sources (different item counts / labels)
        const srcA = Array.from({ length: n },     (_, i) => `- ItemA${i}`).join('\n')
        const srcB = Array.from({ length: n + 1 }, (_, i) => `- ItemB${i}`).join('\n')
        const svgA = renderMdArt(`type: ${type}\n${srcA}`)
        const svgB = renderMdArt(`type: ${type}\n${srcB}`)
        const scopeA = svgA.match(/data-mdart-scope="([^"]+)"/)?.[1]
        const scopeB = svgB.match(/data-mdart-scope="([^"]+)"/)?.[1]
        return !!scopeA && !!scopeB && scopeA !== scopeB
      },
      Gen.inRange(0, TYPES.length - 1),
      Gen.inRange(1, 4),
    )
  })

  it('∀ type with CSS: @keyframes always scoped (no bare @keyframes mdart-enter)', { timeout: 20000 }, () => {
    const TYPES = ['process', 'cycle', 'bullet-list', 'org-chart', 'pyramid', 'radar', 'zigzag-list']
    forAll(
      (typeIdx: number) => {
        const type = TYPES[typeIdx % TYPES.length]
        const svg = renderMdArt(`type: ${type}\n${LABELS_3}`)
        // Bare unscoped keyframe would be "@keyframes mdart-enter"
        return !svg.includes('@keyframes mdart-enter ')
          && !svg.match(/@keyframes mdart-enter[^-]/)
      },
      Gen.inRange(0, TYPES.length - 1),
    )
  })

  it('two process diagrams with different sources reference their own scoped classes', () => {
    // Different sources → different scopes (hash-based but source-content-dependent)
    const svgA = renderMdArt(`type: process\n${LABELS_3}`)
    const svgB = renderMdArt(`type: process\n- X\n- Y`)
    const scopeA = svgA.match(/data-mdart-scope="([^"]+)"/)?.[1]!
    const scopeB = svgB.match(/data-mdart-scope="([^"]+)"/)?.[1]!
    // Both scopes must exist and be different
    if (!scopeA || !scopeB) throw new Error('missing scope token')
    if (scopeA === scopeB) throw new Error('scopes must differ for different sources')
    // Each SVG must reference only its own scope in the CSS selectors
    if (!svgA.includes(`[data-mdart-scope="${scopeA}"] .mdart-n0`))
      throw new Error('svgA missing its own scope CSS')
    if (!svgB.includes(`[data-mdart-scope="${scopeB}"] .mdart-n0`))
      throw new Error('svgB missing its own scope CSS')
  })

})

// ── Process family: scale-pulse ───────────────────────────────────────────────

describe('process family animation', () => {

  const PROCESS_TYPES = ['process', 'chevron-process', 'arrow-process', 'waterfall', 'bending-process']

  it('∀ process-family types: mdart-n0 class present, scoped keyframes present', { timeout: 20000 }, () => {
    forAll(
      (typeIdx: number) => {
        const type = PROCESS_TYPES[typeIdx % PROCESS_TYPES.length]
        const svg = renderMdArt(`type: ${type}\n${LABELS_3}`)
        return svg.includes('class="mdart-n0"')
          && !!svg.match(/@keyframes mdart-s[a-z0-9]+-mdart-enter/)
      },
      Gen.inRange(0, PROCESS_TYPES.length - 1),
    )
  })

  it('∀ arrow-process/waterfall/bending-process: connectors fade with destination node', { timeout: 20000 }, () => {
    const CONN_TYPES = ['arrow-process', 'waterfall', 'bending-process']
    forAll(
      (typeIdx: number) => {
        const type = CONN_TYPES[typeIdx % CONN_TYPES.length]
        const svg = renderMdArt(`type: ${type}\n${LABELS_3}`)
        const classes = arrowGroupClasses(svg)
        // For 3-item chain: connectors at index 1 and 2 (before nodes 1 and 2)
        return classes.includes('mdart-arr-n1') && classes.includes('mdart-arr-n2')
      },
      Gen.inRange(0, CONN_TYPES.length - 1),
    )
  })

})

// ── List family: brightness-spotlight, no scale ───────────────────────────────

describe('zigzag-list / ribbon-list: brightness animation, no scale', () => {

  it.each(['zigzag-list', 'ribbon-list'])('%s has mdart-bright-loop and no transform:scale', (type) => {
    forAll(
      (n: number) => {
        const labels = Array.from({ length: n }, (_, i) => `- Item ${i}`).join('\n')
        const svg = renderMdArt(`type: ${type}\n${labels}`)
        return !svg.includes('transform:scale')
          && svg.includes('mdart-bright-loop')
      },
      Gen.inRange(2, 5),
    )
  })

})

// ── Cycle family: closing arrow after last node ───────────────────────────────

describe('cycle family: closing arrow fades after last node', () => {

  const CYCLE_TYPES = ['cycle', 'block-cycle', 'circular-process', 'loop']

  it('∀ cycle-family types × 3 items: mdart-arr-n3 appears (closing arrow after node 2)', { timeout: 20000 }, () => {
    forAll(
      (typeIdx: number) => {
        const type = CYCLE_TYPES[typeIdx % CYCLE_TYPES.length]
        const svg = renderMdArt(`type: ${type}\n${LABELS_3}`)
        const classes = arrowGroupClasses(svg)
        // Closing arrow appears AFTER the last node (index 3 for 3 items)
        return !classes.includes('mdart-arr-n0')  // no connector before first node
          && classes.includes('mdart-arr-n3')       // closing arrow after last
      },
      Gen.inRange(0, CYCLE_TYPES.length - 1),
    )
  })

  it('∀ cycle × n items: mdart-arr-n{n} is the closing arrow index', { timeout: 15000 }, () => {
    forAll(
      (n: number) => {
        const labels = Array.from({ length: n }, (_, i) => `- Step ${i}`).join('\n')
        const svg = renderMdArt(`type: cycle\n${labels}`)
        const classes = arrowGroupClasses(svg)
        return classes.includes(`mdart-arr-n${n}`)   // closing arrow at position n
      },
      Gen.inRange(2, 6),
    )
  })

})

// ── Hierarchy family: fade-in, no scale-pulse ─────────────────────────────────

describe('hierarchy layout animation: fade-in sequence, no scale', () => {

  const HIERARCHY_TYPES = ['org-chart', 'tree', 'h-org-chart', 'hierarchy-list', 'radial-tree']

  it('∀ hierarchy types: mdart-n0 present, no transform:scale', { timeout: 20000 }, () => {
    forAll(
      (typeIdx: number) => {
        const type = HIERARCHY_TYPES[typeIdx % HIERARCHY_TYPES.length]
        const svg = renderMdArt(`type: ${type}\n- Root\n  - A\n  - B`)
        return svg.includes('class="mdart-n0"')
          && !svg.includes('transform:scale')
      },
      Gen.inRange(0, HIERARCHY_TYPES.length - 1),
    )
  })

})

// ── Pyramid family: fade-in, no scale-pulse ───────────────────────────────────

describe('pyramid layout animation: fade-in sequence, no scale', () => {

  const PYRAMID_TYPES = ['pyramid', 'inverted-pyramid', 'pyramid-list', 'segmented-pyramid', 'diamond-pyramid']

  it('∀ pyramid types: mdart-n0, mdart-n1, mdart-n2 present, no transform:scale', { timeout: 20000 }, () => {
    forAll(
      (typeIdx: number) => {
        const type = PYRAMID_TYPES[typeIdx % PYRAMID_TYPES.length]
        const src = `type: ${type}\n- Strategy: 10%\n- Execution: 30%\n- Operations: 60%`
        const svg = renderMdArt(src)
        return svg.includes('class="mdart-n0"')
          && svg.includes('class="mdart-n1"')
          && svg.includes('class="mdart-n2"')
          && !svg.includes('transform:scale')
      },
      Gen.inRange(0, PYRAMID_TYPES.length - 1),
    )
  })

})

// ── Statistical family: fade-in, no scale-pulse ───────────────────────────────

describe('statistical layout animation: fade-in, no scale', () => {

  const STAT_TYPES = ['progress-list', 'bullet-chart', 'scorecard', 'treemap', 'gauge', 'waffle']
  const STAT_SRC   = '- Alpha: 75\n- Beta: 45\n- Gamma: 20'

  it('∀ statistical types: mdart-n0, mdart-n1 present, no transform:scale', { timeout: 20000 }, () => {
    forAll(
      (typeIdx: number) => {
        const type = STAT_TYPES[typeIdx % STAT_TYPES.length]
        const svg = renderMdArt(`type: ${type}\n${STAT_SRC}`)
        return svg.includes('class="mdart-n0"')
          && svg.includes('class="mdart-n1"')
          && !svg.includes('transform:scale')
      },
      Gen.inRange(0, STAT_TYPES.length - 1),
    )
  })

  it('∀ progress-list / bullet-chart: bar-grow animation present', { timeout: 15000 }, () => {
    forAll(
      (typeIdx: number) => {
        const type = ['progress-list', 'bullet-chart'][typeIdx % 2]
        const svg = renderMdArt(`type: ${type}\n- Alpha: 75\n- Beta: 45`)
        return !!svg.match(/@keyframes mdart-s[a-z0-9]+-mdart-bar-grow/)
          && svg.includes('class="mdart-bar-grow"')
      },
      Gen.inRange(0, 1),
    )
  })

})

// ── matrix / planning families ────────────────────────────────────────────────

describe('matrix and planning layout animation: fade-in, no scale', () => {

  it('∀ matrix types: mdart-n0 present, no transform:scale', { timeout: 15000 }, () => {
    const MATRIX_TYPES = ['swot', 'pros-cons', 'matrix-2x2', 'bcg', 'ansoff']
    forAll(
      (typeIdx: number) => {
        const type = MATRIX_TYPES[typeIdx % MATRIX_TYPES.length]
        // Use generic items for matrix types (not type-specific content)
        const src = `type: ${type}\n- Alpha\n- Beta\n- Gamma\n- Delta`
        const svg = renderMdArt(src)
        return svg.includes('class="mdart-n0"') && !svg.includes('transform:scale')
      },
      Gen.inRange(0, 4),
    )
  })

  it('∀ planning types: mdart-n0 present, no transform:scale', { timeout: 15000 }, () => {
    const PLANNING_TYPES = ['kanban', 'timeline', 'milestone']
    forAll(
      (typeIdx: number) => {
        const type = PLANNING_TYPES[typeIdx % PLANNING_TYPES.length]
        const src = `type: ${type}\n- Step A\n- Step B`
        const svg = renderMdArt(src)
        return svg.includes('class="mdart-n0"') && !svg.includes('transform:scale')
      },
      Gen.inRange(0, 2),
    )
  })

})
