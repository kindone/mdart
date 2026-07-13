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

// ── Source builders ────────────────────────────────────────────────────────────

const STAGE_NAMES = ['Parse', 'Validate', 'Transform', 'Render', 'Emit', 'Persist', 'Audit', 'Notify']
const ACTOR_NAMES = ['Client', 'Server', 'DB', 'Cache', 'Worker', 'Gateway', 'Auth', 'Queue']
const STATE_NAMES = ['Idle', 'Running', 'Paused', 'Stopped', 'Failed', 'Done', 'Pending', 'Active']
const NODE_NAMES  = ['API', 'DB', 'Cache', 'Worker', 'Gateway', 'Auth', 'Queue', 'Proxy']

/** Build a pipeline source with n stages. */
function buildPipelineSrc(n: number, offset: number): string {
  const stages = Array.from({ length: n }, (_, i) =>
    `- ${STAGE_NAMES[(offset + i) % STAGE_NAMES.length]}`
  ).join('\n')
  return `type: pipeline\n${stages}`
}

/**
 * Build a sequence source with n actors and one message between each adjacent pair.
 * Source syntax:  top-level items = actors, children = `-> Target: message`
 */
function buildSequenceSrc(n: number, offset: number): string {
  const actors = Array.from({ length: n }, (_, i) => ACTOR_NAMES[(offset + i) % ACTOR_NAMES.length])
  const lines: string[] = []
  for (let i = 0; i < actors.length; i++) {
    lines.push(`- ${actors[i]}`)
    // Each actor sends a message to the next (wrap around for last)
    const target = actors[(i + 1) % actors.length]
    lines.push(`  -> ${target}: msg${i}`)
  }
  return `type: sequence\n${lines.join('\n')}`
}

/**
 * Build a state-machine source with n states and one transition each.
 */
function buildStateMachineSrc(n: number, offset: number): string {
  const states = Array.from({ length: n }, (_, i) => STATE_NAMES[(offset + i) % STATE_NAMES.length])
  const lines: string[] = []
  for (let i = 0; i < states.length; i++) {
    lines.push(`- ${states[i]}`)
    const target = states[(i + 1) % states.length]
    lines.push(`  -> ${target}: event${i}`)
  }
  return `type: state-machine\n${lines.join('\n')}`
}

/**
 * Build a network source with n nodes (first node has edges to the rest).
 */
function buildNetworkSrc(n: number, offset: number): string {
  const nodes = Array.from({ length: n }, (_, i) => NODE_NAMES[(offset + i) % NODE_NAMES.length])
  const lines: string[] = []
  // First node has directed edges to all others
  lines.push(`- ${nodes[0]}`)
  for (let i = 1; i < nodes.length; i++) {
    lines.push(`  -> ${nodes[i]}`)
  }
  // Remaining nodes as standalone items
  for (let i = 1; i < nodes.length; i++) {
    lines.push(`- ${nodes[i]}`)
  }
  return `type: network\n${lines.join('\n')}`
}

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
      (n: number, offset: number) => {
        const svg = renderMdArt(buildPipelineSrc(n, offset))
        const hasScope = !!scopeOf(svg)
        const hasKeyframes = !!svg.match(/@keyframes mdart-s[a-z0-9]+-mdart-enter/)
        const hasN0 = svg.includes('class="mdart-n0"')
        return hasScope && hasKeyframes && hasN0
      },
      Gen.inRange(1, 5),
      Gen.inRange(0, STAGE_NAMES.length - 1),
    )
  })

  it('∀ n≥2 stages: connector path groups present at mdart-n1..mdart-n{n-1}', { timeout: 20000 }, () => {
    forAll(
      (n: number, offset: number) => {
        const svg = renderMdArt(buildPipelineSrc(n, offset))
        // For n stages: mdart-n1 through mdart-n{n-1} should each contain a <path
        // (connector) immediately followed by a <rect (stage box).
        // Check that the second stage group contains both a path and a rect.
        return svg.match(/<g class="mdart-n1">[\s\S]*?<path[\s\S]*?<rect/) !== null
      },
      Gen.inRange(2, 5),
      Gen.inRange(0, STAGE_NAMES.length - 1),
    )
  })

  it('∀ n stages: no crash, valid viewBox, no NaN', { timeout: 20000 }, () => {
    forAll(
      (n: number, offset: number) => {
        try {
          const svg = renderMdArt(buildPipelineSrc(n, offset))
          return svg.includes('<svg') && svg.includes('viewBox=')
            && !svg.includes('="NaN"') && !svg.includes('="Infinity"')
        } catch { return false }
      },
      Gen.inRange(1, 6),
      Gen.inRange(0, STAGE_NAMES.length - 1),
    )
  })

  it('∀ n≥3 stages: n node groups are present', { timeout: 20000 }, () => {
    forAll(
      (n: number, offset: number) => {
        const svg = renderMdArt(buildPipelineSrc(n, offset))
        const classes = nodeGroupClasses(svg)
        // All n stages should have a group class
        return Array.from({ length: n }, (_, i) => `mdart-n${i}`)
          .every(cls => classes.includes(cls))
      },
      Gen.inRange(3, 5),
      Gen.inRange(0, STAGE_NAMES.length - 1),
    )
  })

})

// ── Sequence ──────────────────────────────────────────────────────────────────

describe('sequence: actor groups + arrow marker', () => {

  it('∀ n≥2 actors: mdart-n0 present, url(#sq-a) marker present', { timeout: 20000 }, () => {
    forAll(
      (n: number, offset: number) => {
        const svg = renderMdArt(buildSequenceSrc(n, offset))
        return svg.includes('class="mdart-n0"')
          && svg.includes('marker-end="url(#sq-a)"')
      },
      Gen.inRange(2, 4),
      Gen.inRange(0, ACTOR_NAMES.length - 1),
    )
  })

  it('∀ n≥2 actors: at least n animation groups present', { timeout: 20000 }, () => {
    forAll(
      (n: number, offset: number) => {
        const svg = renderMdArt(buildSequenceSrc(n, offset))
        const classes = nodeGroupClasses(svg)
        // Each actor gets at least one group; must have groups 0..n-1
        return Array.from({ length: n }, (_, i) => `mdart-n${i}`)
          .every(cls => classes.includes(cls))
      },
      Gen.inRange(2, 4),
      Gen.inRange(0, ACTOR_NAMES.length - 1),
    )
  })

  it('∀ sequence: no crash, valid viewBox', { timeout: 20000 }, () => {
    forAll(
      (n: number, offset: number) => {
        try {
          const svg = renderMdArt(buildSequenceSrc(n, offset))
          return svg.includes('<svg') && svg.includes('viewBox=')
        } catch { return false }
      },
      Gen.inRange(2, 5),
      Gen.inRange(0, ACTOR_NAMES.length - 1),
    )
  })

})

// ── State-machine ─────────────────────────────────────────────────────────────

describe('state-machine: scoped keyframes + transition marker', () => {

  it('∀ n≥2 states: scoped keyframes, mdart-n0 + mdart-n1, url(#sm-a) present', { timeout: 20000 }, () => {
    forAll(
      (n: number, offset: number) => {
        const svg = renderMdArt(buildStateMachineSrc(n, offset))
        const hasScope = !!svg.match(/@keyframes mdart-s[a-z0-9]+-mdart-enter/)
        const hasN0 = svg.includes('class="mdart-n0"')
        const hasN1 = svg.includes('class="mdart-n1"')
        const hasMarker = svg.includes('marker-end="url(#sm-a)"')
        return hasScope && hasN0 && hasN1 && hasMarker
      },
      Gen.inRange(2, 4),
      Gen.inRange(0, STATE_NAMES.length - 1),
    )
  })

  it('∀ n states: node groups mdart-n0..n{n-1} are present', { timeout: 20000 }, () => {
    forAll(
      (n: number, offset: number) => {
        const svg = renderMdArt(buildStateMachineSrc(n, offset))
        const classes = nodeGroupClasses(svg)
        return Array.from({ length: n }, (_, i) => `mdart-n${i}`)
          .every(cls => classes.includes(cls))
      },
      Gen.inRange(2, 4),
      Gen.inRange(0, STATE_NAMES.length - 1),
    )
  })

  it('∀ state-machine: no crash, valid viewBox, no NaN', { timeout: 20000 }, () => {
    forAll(
      (n: number, offset: number) => {
        try {
          const svg = renderMdArt(buildStateMachineSrc(n, offset))
          return svg.includes('<svg') && svg.includes('viewBox=')
            && !svg.includes('="NaN"') && !svg.includes('="Infinity"')
        } catch { return false }
      },
      Gen.inRange(2, 5),
      Gen.inRange(0, STATE_NAMES.length - 1),
    )
  })

})

// ── Network ───────────────────────────────────────────────────────────────────

describe('network: arrow marker defs + node groups + connector lines', () => {

  it('∀ n≥2 nodes with edges: id="net-arr" defined, mdart-n1 + mdart-n2 present', { timeout: 20000 }, () => {
    forAll(
      (n: number, offset: number) => {
        const svg = renderMdArt(buildNetworkSrc(n, offset))
        return svg.includes('id="net-arr"')
          && svg.includes('class="mdart-n1"')
          && svg.includes('class="mdart-n2"')
      },
      Gen.inRange(3, 5),   // n≥3 so we reliably have n1 and n2
      Gen.inRange(0, NODE_NAMES.length - 1),
    )
  })

  it('∀ n≥2 nodes: connector lines reference url(#net-arr)', { timeout: 20000 }, () => {
    forAll(
      (n: number, offset: number) => {
        const svg = renderMdArt(buildNetworkSrc(n, offset))
        return svg.includes('marker-end="url(#net-arr)"')
      },
      Gen.inRange(2, 5),
      Gen.inRange(0, NODE_NAMES.length - 1),
    )
  })

  it('∀ n≥2 nodes: connector group contains both <line and url(#net-arr)', { timeout: 20000 }, () => {
    forAll(
      (n: number, offset: number) => {
        const svg = renderMdArt(buildNetworkSrc(n, offset))
        // A connector group should contain a line element with the net-arr marker
        return svg.match(/<g class="mdart-n\d+"><line[\s\S]*?marker-end="url\(#net-arr\)"/) !== null
      },
      Gen.inRange(2, 5),
      Gen.inRange(0, NODE_NAMES.length - 1),
    )
  })

  it('∀ network: no crash, valid viewBox, no NaN', { timeout: 20000 }, () => {
    forAll(
      (n: number, offset: number) => {
        try {
          const svg = renderMdArt(buildNetworkSrc(n, offset))
          return svg.includes('<svg') && svg.includes('viewBox=')
            && !svg.includes('="NaN"') && !svg.includes('="Infinity"')
        } catch { return false }
      },
      Gen.inRange(1, 6),
      Gen.inRange(0, NODE_NAMES.length - 1),
    )
  })

})

// ── All four types: cross-type invariants ─────────────────────────────────────

describe('all technical types: cross-type invariants', () => {

  it('all four technical types: @keyframes always scoped (no bare mdart-enter)', { timeout: 20000 }, () => {
    const srcs = [
      buildPipelineSrc(3, 0),
      buildSequenceSrc(2, 0),
      buildStateMachineSrc(2, 0),
      buildNetworkSrc(3, 0),
    ]
    for (const src of srcs) {
      const svg = renderMdArt(src)
      // Bare unscoped keyframe would start "@keyframes mdart-enter " (no scope prefix)
      if (svg.includes('@keyframes mdart-enter ') || svg.match(/@keyframes mdart-enter[^-]/)) {
        throw new Error(`unscoped @keyframes mdart-enter found in: ${src.split('\n')[0]}`)
      }
    }
  })

  it('all four technical types: scope tokens are per-source (different sources → different scopes)', { timeout: 20000 }, () => {
    forAll(
      (n: number, offset: number) => {
        const svgPipeline = renderMdArt(buildPipelineSrc(n, offset))
        const svgNetwork  = renderMdArt(buildNetworkSrc(n + 1, offset))
        const s1 = scopeOf(svgPipeline)
        const s2 = scopeOf(svgNetwork)
        // Both must have scopes; different sources → different scopes
        return !!s1 && !!s2 && s1 !== s2
      },
      Gen.inRange(2, 4),
      Gen.inRange(0, NODE_NAMES.length - 1),
    )
  })

  it('∀ pipeline with 1–5 stages: mdart-n0 class always appears', { timeout: 20000 }, () => {
    forAll(
      (n: number, offset: number) => {
        const svg = renderMdArt(buildPipelineSrc(n, offset))
        return svg.includes('class="mdart-n0"')
      },
      Gen.inRange(1, 5),
      Gen.inRange(0, STAGE_NAMES.length - 1),
    )
  })

  it('∀ state-machine with 2–4 states: no transform:scale (fade-in, not pulse)', { timeout: 20000 }, () => {
    forAll(
      (n: number, offset: number) => {
        const svg = renderMdArt(buildStateMachineSrc(n, offset))
        // Technical types use fade-in (opacity) not scale-pulse
        return !svg.includes('transform:scale')
      },
      Gen.inRange(2, 4),
      Gen.inRange(0, STATE_NAMES.length - 1),
    )
  })

})
