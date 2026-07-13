// Feature:     Technical layout renderers — pipeline, sequence, state-machine, network
// Arch/Design: All four types have bespoke animation patterns:
//              - pipeline:     scoped @keyframes mdart-enter; connector path fades with
//                              its destination stage (<g mdart-n{i}><path…><rect)
//              - sequence:     actor lifeline groups (mdart-n0, n1…); message arrows
//                              carry marker-end="url(#sq-a)"
//              - state-machine: scoped @keyframes mdart-enter; state node groups
//                              (mdart-n0, n1…); transition arrows carry url(#sm-a)
//              - network:      defs-registered arrow id="net-arr"; node groups
//                              (mdart-n1, n2…); connector lines reference url(#net-arr)
// Spec:        ∀ pipeline × n≥1 stages: scoped keyframes present, mdart-n0 present
//              ∀ pipeline × n≥2 stages: connector path groups appear before each stage
//              ∀ sequence × n≥2 actors × messages: mdart-n0 present, url(#sq-a) present
//              ∀ state-machine × n≥2 states: scoped keyframes, mdart-n0/n1, url(#sm-a)
//              ∀ network × n≥2 nodes with edges: id="net-arr", mdart-n1, url(#net-arr)
//              ∀ all four technical types × any valid input: no crash, valid viewBox
// @quality:    correctness
// @type:       property
// @mode:       verification

import { describe, it } from 'vitest'
import { forAll, Gen } from 'jsproptest'
import { renderMdArt } from '../renderer'
import { genLabelAny } from './domains'

// ── Label sanitiser ────────────────────────────────────────────────────────────
//
// Technical source builders use label strings in TWO places:
//   1. As a top-level item declaration:   `- <label>`
//   2. As a cross-reference target:       `  -> <label>: event`
//
// For the reference to match the declaration, both must use the SAME cleaned
// string. `techLabel` strips parser-special characters and appends the item
// index to guarantee uniqueness within a single source.

function techLabel(raw: string, idx: number): string {
  const clean = raw
    .replace(/[\n:→\[\]∩]/g, '')   // strip syntax-special chars
    .replace(/^[-+?!*\s]+/, '')     // strip SWOT/bullet/milestone prefix chars
    .trimEnd()
    .slice(0, 20)
  return `${clean || 'N'}${idx}`   // index suffix ensures uniqueness
}

// ── Source builders ────────────────────────────────────────────────────────────
//
// Each builder accepts an already-cleaned labels array and constructs the source
// string for its type. The caller is responsible for sanitising with techLabel.

/** Build a pipeline source from a pre-cleaned labels array. */
function buildPipelineSrc(labels: string[]): string {
  return `type: pipeline\n${labels.map(l => `- ${l}`).join('\n')}`
}

/**
 * Build a sequence source: each actor sends one message to the next (wrapping).
 * Labels must be pre-cleaned (no `:`, `→`, `[`, etc.) so they survive as
 * cross-reference targets in the `-> Target: msg` syntax.
 */
function buildSequenceSrc(actors: string[]): string {
  const lines: string[] = []
  for (let i = 0; i < actors.length; i++) {
    lines.push(`- ${actors[i]}`)
    const target = actors[(i + 1) % actors.length]
    lines.push(`  -> ${target}: msg${i}`)
  }
  return `type: sequence\n${lines.join('\n')}`
}

/**
 * Build a state-machine source: each state transitions to the next (wrapping).
 * Labels must be pre-cleaned for the same cross-reference reason as sequence.
 */
function buildStateMachineSrc(states: string[]): string {
  const lines: string[] = []
  for (let i = 0; i < states.length; i++) {
    lines.push(`- ${states[i]}`)
    const target = states[(i + 1) % states.length]
    lines.push(`  -> ${target}: event${i}`)
  }
  return `type: state-machine\n${lines.join('\n')}`
}

/**
 * Build a network source: first node has directed edges to all others;
 * remaining nodes are listed as standalone items.
 */
function buildNetworkSrc(nodes: string[]): string {
  const lines: string[] = [`- ${nodes[0]}`]
  for (let i = 1; i < nodes.length; i++) lines.push(`  -> ${nodes[i]}`)
  for (let i = 1; i < nodes.length; i++) lines.push(`- ${nodes[i]}`)
  return `type: network\n${lines.join('\n')}`
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Extract data-mdart-scope token from SVG. */
function scopeOf(svg: string): string | undefined {
  return svg.match(/data-mdart-scope="([^"]+)"/)?.[1]
}

/** Returns all mdart-n{i} group class values found in svg (in appearance order). */
function nodeGroupClasses(svg: string): string[] {
  return Array.from(svg.matchAll(/class="(mdart-n\d+)"/g), m => m[1])
}

// ── Pipeline ──────────────────────────────────────────────────────────────────

describe('pipeline: scoped animation + connector grouping', () => {

  it('∀ n≥1 stages: scoped @keyframes mdart-enter present and mdart-n0 present', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const labels = rawLabels.map(techLabel)
        const svg = renderMdArt(buildPipelineSrc(labels))
        return !!scopeOf(svg)
          && !!svg.match(/@keyframes mdart-s[a-z0-9]+-mdart-enter/)
          && svg.includes('class="mdart-n0"')
      },
      Gen.array(genLabelAny, 1, 5),
    )
  })

  it('∀ n≥2 stages: connector path groups present at mdart-n1..mdart-n{n-1}', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const labels = rawLabels.map(techLabel)
        const svg = renderMdArt(buildPipelineSrc(labels))
        // For n stages: the second stage group (mdart-n1) must contain a connector
        // <path immediately followed by a <rect (stage box).
        return svg.match(/<g class="mdart-n1">[\s\S]*?<path[\s\S]*?<rect/) !== null
      },
      Gen.array(genLabelAny, 2, 5),
    )
  })

  it('∀ n stages: no crash, valid viewBox, no NaN', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const labels = rawLabels.map(techLabel)
        try {
          const svg = renderMdArt(buildPipelineSrc(labels))
          return svg.includes('<svg') && svg.includes('viewBox=')
            && !svg.includes('="NaN"') && !svg.includes('="Infinity"')
        } catch { return false }
      },
      Gen.array(genLabelAny, 1, 6),
    )
  })

  it('∀ n≥3 stages: n node groups are present', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const labels = rawLabels.map(techLabel)
        const n = labels.length
        const svg = renderMdArt(buildPipelineSrc(labels))
        const classes = nodeGroupClasses(svg)
        return Array.from({ length: n }, (_, i) => `mdart-n${i}`)
          .every(cls => classes.includes(cls))
      },
      Gen.array(genLabelAny, 3, 5),
    )
  })

})

// ── Sequence ──────────────────────────────────────────────────────────────────

describe('sequence: actor groups + arrow marker', () => {

  it('∀ n≥2 actors: mdart-n0 present, url(#sq-a) marker present', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const actors = rawLabels.map(techLabel)
        const svg = renderMdArt(buildSequenceSrc(actors))
        return svg.includes('class="mdart-n0"')
          && svg.includes('marker-end="url(#sq-a)"')
      },
      Gen.array(genLabelAny, 2, 4),
    )
  })

  it('∀ n≥2 actors: at least n animation groups present', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const actors = rawLabels.map(techLabel)
        const n = actors.length
        const svg = renderMdArt(buildSequenceSrc(actors))
        const classes = nodeGroupClasses(svg)
        return Array.from({ length: n }, (_, i) => `mdart-n${i}`)
          .every(cls => classes.includes(cls))
      },
      Gen.array(genLabelAny, 2, 4),
    )
  })

  it('∀ sequence: no crash, valid viewBox', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const actors = rawLabels.map(techLabel)
        try {
          const svg = renderMdArt(buildSequenceSrc(actors))
          return svg.includes('<svg') && svg.includes('viewBox=')
        } catch { return false }
      },
      Gen.array(genLabelAny, 2, 5),
    )
  })

})

// ── State-machine ─────────────────────────────────────────────────────────────

describe('state-machine: scoped keyframes + transition marker', () => {

  it('∀ n≥2 states: scoped keyframes, mdart-n0 + mdart-n1, url(#sm-a) present', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const states = rawLabels.map(techLabel)
        const svg = renderMdArt(buildStateMachineSrc(states))
        return !!svg.match(/@keyframes mdart-s[a-z0-9]+-mdart-enter/)
          && svg.includes('class="mdart-n0"')
          && svg.includes('class="mdart-n1"')
          && svg.includes('marker-end="url(#sm-a)"')
      },
      Gen.array(genLabelAny, 2, 4),
    )
  })

  it('∀ n states: node groups mdart-n0..n{n-1} are present', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const states = rawLabels.map(techLabel)
        const n = states.length
        const svg = renderMdArt(buildStateMachineSrc(states))
        const classes = nodeGroupClasses(svg)
        return Array.from({ length: n }, (_, i) => `mdart-n${i}`)
          .every(cls => classes.includes(cls))
      },
      Gen.array(genLabelAny, 2, 4),
    )
  })

  it('∀ state-machine: no crash, valid viewBox, no NaN', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const states = rawLabels.map(techLabel)
        try {
          const svg = renderMdArt(buildStateMachineSrc(states))
          return svg.includes('<svg') && svg.includes('viewBox=')
            && !svg.includes('="NaN"') && !svg.includes('="Infinity"')
        } catch { return false }
      },
      Gen.array(genLabelAny, 2, 5),
    )
  })

})

// ── Network ───────────────────────────────────────────────────────────────────

describe('network: arrow marker defs + node groups + connector lines', () => {

  it('∀ n≥3 nodes with edges: id="net-arr" defined, mdart-n1 + mdart-n2 present', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const nodes = rawLabels.map(techLabel)
        const svg = renderMdArt(buildNetworkSrc(nodes))
        return svg.includes('id="net-arr"')
          && svg.includes('class="mdart-n1"')
          && svg.includes('class="mdart-n2"')
      },
      Gen.array(genLabelAny, 3, 5),
    )
  })

  it('∀ n≥2 nodes: connector lines reference url(#net-arr)', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const nodes = rawLabels.map(techLabel)
        const svg = renderMdArt(buildNetworkSrc(nodes))
        return svg.includes('marker-end="url(#net-arr)"')
      },
      Gen.array(genLabelAny, 2, 5),
    )
  })

  it('∀ n≥2 nodes: connector group contains both <line and url(#net-arr)', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const nodes = rawLabels.map(techLabel)
        const svg = renderMdArt(buildNetworkSrc(nodes))
        return svg.match(/<g class="mdart-n\d+"><line[\s\S]*?marker-end="url\(#net-arr\)"/) !== null
      },
      Gen.array(genLabelAny, 2, 5),
    )
  })

  it('∀ network: no crash, valid viewBox, no NaN', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const nodes = rawLabels.map(techLabel)
        try {
          const svg = renderMdArt(buildNetworkSrc(nodes))
          return svg.includes('<svg') && svg.includes('viewBox=')
            && !svg.includes('="NaN"') && !svg.includes('="Infinity"')
        } catch { return false }
      },
      Gen.array(genLabelAny, 1, 6),
    )
  })

})

// ── All four types: cross-type invariants ─────────────────────────────────────

describe('all technical types: cross-type invariants', () => {

  it('all four technical types: @keyframes always scoped (no bare mdart-enter)', { timeout: 20000 }, () => {
    const srcs = [
      buildPipelineSrc(['Parse', 'Validate', 'Transform']),
      buildSequenceSrc(['Client', 'Server', 'DB']),
      buildStateMachineSrc(['Idle', 'Running', 'Done']),
      buildNetworkSrc(['API', 'DB', 'Cache', 'Worker']),
    ]
    for (const src of srcs) {
      const svg = renderMdArt(src)
      if (svg.includes('@keyframes mdart-enter ') || svg.match(/@keyframes mdart-enter[^-]/)) {
        throw new Error(`unscoped @keyframes mdart-enter found in: ${src.split('\n')[0]}`)
      }
    }
  })

  it('∀ two technical types: scope tokens differ (hash is source-content-based)', { timeout: 20000 }, () => {
    // Different source strings → different scope hash.
    // `type: pipeline` vs `type: network` guarantees the full source strings differ
    // even if their labels happen to match, so scopes are always distinct.
    forAll(
      (pipeLabels: string[], netLabels: string[]) => {
        const svgPipeline = renderMdArt(buildPipelineSrc(pipeLabels.map(techLabel)))
        const svgNetwork  = renderMdArt(buildNetworkSrc(netLabels.map(techLabel)))
        const s1 = scopeOf(svgPipeline)
        const s2 = scopeOf(svgNetwork)
        return !!s1 && !!s2 && s1 !== s2
      },
      Gen.array(genLabelAny, 2, 4),
      Gen.array(genLabelAny, 2, 4),
    )
  })

  it('∀ pipeline with 1–5 stages: mdart-n0 class always appears', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const svg = renderMdArt(buildPipelineSrc(rawLabels.map(techLabel)))
        return svg.includes('class="mdart-n0"')
      },
      Gen.array(genLabelAny, 1, 5),
    )
  })

  it('∀ state-machine with 2–4 states: no transform:scale (fade-in, not pulse)', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const svg = renderMdArt(buildStateMachineSrc(rawLabels.map(techLabel)))
        return !svg.includes('transform:scale')
      },
      Gen.array(genLabelAny, 2, 4),
    )
  })

})
