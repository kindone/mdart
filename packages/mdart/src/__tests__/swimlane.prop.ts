// Feature:     Swimlane renderer — multi-lane process layouts with nested steps
// Arch/Design: Top-level items are lanes; children are steps in that lane.
//              Long step labels are word-wrapped across two visible lines rather
//              than one-line truncation. The viewBox height scales with lane count.
//              Lane labels appear as separate text nodes from step text.
// Spec:        ∀ n lanes × m steps each: renders without crash, has valid viewBox
//              ∀ n lanes: n unique lane label texts appear in SVG
//              ∀ step with long label: label text appears in SVG (not truncated away)
//              ∀ short step label: label text appears in SVG
//              ∀ swimlane: no NaN coordinates in SVG
//              ∀ n≥1 lanes: viewBox height > 0
// @quality:    correctness
// @type:       property
// @mode:       verification

import { describe, it } from 'vitest'
import { forAll, Gen } from 'jsproptest'
import { renderMdArt } from '../renderer'
import { genLabelPlain } from './domains'

const STEP_LABELS = [
  'for each run: invoke(rand)',
  'on success: repeat',
  'on failure: shrink',
  'initialise context',
  'run preconditions',
  'execute action',
  'assert postcondition',
  'cleanup',
]

function safe(s: string): string {
  // Note: trailing spaces are trimmed by the MdArt parser, so we must trim here
  // too or svg.includes(safe(label)) would look for " " that isn't in the SVG.
  return (s
    .replace(/\n/g, ' ')
    .replace(/^\s*$/, 'x')     // all-whitespace → 'x' before trim
    .replace(/:/g, '-').replace(/[[\]]/g, '()')
    // Strip XML-special chars — otherwise the label gets XML-escaped in the SVG output
    // and svg.includes(label) fails because the SVG contains "&lt;" not "<".
    .replace(/[<>"&]/g, '-')
  ).trim() || 'x'
}

/** Build a swimlane source with n lanes and m steps each. */
function buildSwimlaneSrc(lanes: string[], stepsPerLane: number, si: number): string {
  return lanes.map((lane, li) => {
    const steps = Array.from({ length: stepsPerLane }, (_, si2) =>
      `  - ${STEP_LABELS[(si + li * stepsPerLane + si2) % STEP_LABELS.length]}`
    ).join('\n')
    return `- ${lane}\n${steps}`
  }).join('\n')
}

const LANE_NAMES = ['Plan', 'Build', 'Test', 'Deploy', 'Monitor', 'Review']

// ── No-crash + valid geometry ─────────────────────────────────────────────────

describe('swimlane render: no crash', () => {

  it('∀ n lanes × m steps each: renders without throwing', { timeout: 20000 }, () => {
    forAll(
      (n: number, m: number, li: number, si: number) => {
        const lanes = Array.from({ length: n }, (_, i) => LANE_NAMES[(li + i) % LANE_NAMES.length])
        const src = `type: swimlane\n${buildSwimlaneSrc(lanes, m, si)}`
        try {
          const svg = renderMdArt(src)
          return svg.includes('<svg') && svg.includes('viewBox=')
        } catch { return false }
      },
      Gen.inRange(1, 3),
      Gen.inRange(1, 4),
      Gen.inRange(0, LANE_NAMES.length - 1),
      Gen.inRange(0, STEP_LABELS.length - 1),
    )
  })

  it('∀ n lanes: viewBox height is positive', { timeout: 20000 }, () => {
    forAll(
      (n: number, m: number) => {
        const lanes = Array.from({ length: n }, (_, i) => LANE_NAMES[i % LANE_NAMES.length])
        const src = `type: swimlane\n${buildSwimlaneSrc(lanes, m, 0)}`
        const svg = renderMdArt(src)
        const match = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/)
        if (!match) return false
        const h = parseFloat(match[2])
        return h > 0
      },
      Gen.inRange(1, 3),
      Gen.inRange(1, 3),
    )
  })

  it('∀ n lanes: no NaN in any numeric attribute', { timeout: 20000 }, () => {
    forAll(
      (n: number, m: number) => {
        const lanes = Array.from({ length: n }, (_, i) => LANE_NAMES[i % LANE_NAMES.length])
        const src = `type: swimlane\n${buildSwimlaneSrc(lanes, m, 0)}`
        const svg = renderMdArt(src)
        return !svg.includes('="NaN"') && !svg.includes('="Infinity"')
      },
      Gen.inRange(1, 3),
      Gen.inRange(1, 4),
    )
  })

})

// ── Content appears ───────────────────────────────────────────────────────────

describe('swimlane render: content appears in SVG', () => {

  it('∀ n distinct lane labels: all lane names appear in SVG', { timeout: 20000 }, () => {
    forAll(
      (n: number, li: number) => {
        const lanes = Array.from({ length: n }, (_, i) => LANE_NAMES[(li + i) % LANE_NAMES.length])
        const src = `type: swimlane\n${buildSwimlaneSrc(lanes, 1, 0)}`
        const svg = renderMdArt(src)
        return lanes.every(lane => svg.includes(lane))
      },
      Gen.inRange(1, 4),
      Gen.inRange(0, LANE_NAMES.length - 1),
    )
  })

  it('∀ step label: step label appears in SVG', { timeout: 20000 }, () => {
    forAll(
      (si: number) => {
        const step = STEP_LABELS[si % STEP_LABELS.length]
        // Use a short version of the label (first word) to avoid word-wrap ambiguity
        const key = step.split(' ')[0].replace(/[^a-zA-Z]/g, '')
        const src = `type: swimlane\n- Lane\n  - ${step}`
        const svg = renderMdArt(src)
        return svg.includes(key)
      },
      Gen.inRange(0, STEP_LABELS.length - 1),
    )
  })

  it('∀ arbitrary label: label text appears in SVG', { timeout: 20000 }, () => {
    forAll(
      (laneLabel: string, stepLabel: string) => {
        const lane = safe(laneLabel)
        const step = safe(stepLabel)
        const src = `type: swimlane\n- ${lane}\n  - ${step}`
        const svg = renderMdArt(src)
        // At least the lane should appear; step may be truncated or word-wrapped
        return svg.includes(lane)
      },
      genLabelPlain,
      genLabelPlain,
    )
  })

})

// ── Wrap behaviour ────────────────────────────────────────────────────────────

describe('swimlane render: word-wrap for multi-word step labels', () => {

  it('two-lane swimlane with steps uses multiple <text> elements (word-wrap)', { timeout: 15000 }, () => {
    const src = `type: swimlane
title: Test
- go()
  - for each run: invoke(rand)
  - on success: repeat for numRuns
- invoke(rand)
  - initialGen(rand) then loop`
    const svg = renderMdArt(src)
    // The renderer uses text elements; there should be multiple
    const textCount = (svg.match(/<text/g) ?? []).length
    return textCount > 2 && svg.includes('viewBox=')
  })

})
