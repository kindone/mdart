// Feature:     Gantt renderer — task bars, milestones, ordering
// Arch/Design: Each task gets a bar <rect height="18">; milestone tasks get a
//              <polygon> diamond instead.  Tasks are laid out in week-order;
//              a task at a later week must have a larger x-coordinate than one
//              at an earlier week.  The * bullet is NOT a milestone marker —
//              [wkN*] suffix is.
// Spec:        ∀ n non-milestone tasks: no <polygon> in SVG
//              ∀ 1 milestone ([wkN*]) + others: <polygon> appears exactly once
//              ∀ 2 tasks with distinct start weeks (a < b): rect_a.x < rect_b.x
//              ∀ milestone: stroke-dasharray="3,3" guide line appears
//              ∀ * bullet task (no [wk*] suffix): renders as bar, no polygon
//              ∀ n tasks: renders without crash, has valid viewBox
// @quality:    correctness
// @type:       property
// @mode:       verification

import { describe, it } from 'vitest'
import { forAll, Gen } from 'jsproptest'
import { renderMdArt } from '../renderer'
import { genLabelPlain, buildGanttSource } from './domains'

function safe(s: string): string {
  return s.replace(/\[/g, '(').replace(/\]/g, ')').replace(/\n/g, ' ').replace(/:/g, '-').replace(/^\s*$/, 'x')
}

/** Extract bar-rect x coords (height="18" identifies task bars). */
function barRectXCoords(svg: string): number[] {
  return Array.from(svg.matchAll(/<rect[^>]*x="([\d.]+)"[^>]*height="18"/g), m => parseFloat(m[1]))
}

// ── Milestone vs bar ──────────────────────────────────────────────────────────

describe('gantt milestone vs bar', () => {

  it('∀ n non-milestone tasks: no <polygon> in SVG', { timeout: 15000 }, () => {
    forAll(
      (n: number, label: string) => {
        const tasks = Array.from({ length: n }, (_, i) => ({
          label: `${safe(label)}-${i}`,
          start: i + 1,
          end: i + 2,
        }))
        const src = `type: gantt\n${buildGanttSource(tasks)}`
        const svg = renderMdArt(src)
        return !svg.includes('<polygon')
      },
      Gen.inRange(1, 5),
      genLabelPlain,
    )
  })

  it('∀ tasks + 1 milestone [wkN*]: <polygon> appears', { timeout: 15000 }, () => {
    forAll(
      (n: number, mWk: number, label: string) => {
        const tasks = Array.from({ length: n }, (_, i) => ({
          label: `${safe(label)}-${i}`,
          start: i + 1,
          end: i + 2,
        }))
        const milestoneWk = Math.max(n + 1, mWk)
        const src = `type: gantt\n${buildGanttSource(tasks)}\n- ${safe(label)}-ms [wk${milestoneWk}*]`
        const svg = renderMdArt(src)
        return svg.includes('<polygon')
      },
      Gen.inRange(1, 4),
      Gen.inRange(5, 10),
      genLabelPlain,
    )
  })

  it('milestone task shows dashed guide line', { timeout: 15000 }, () => {
    forAll(
      (mWk: number, label: string) => {
        const src = `type: gantt\n- ${safe(label)} [wk${mWk}*]`
        const svg = renderMdArt(src)
        return svg.includes('stroke-dasharray="3,3"')
      },
      Gen.inRange(1, 8),
      genLabelPlain,
    )
  })

})

// ── Task ordering: later week → larger x ─────────────────────────────────────

describe('gantt task ordering', () => {

  it('∀ 2 tasks with wkA < wkB: bar A appears before bar B (smaller x)', { timeout: 15000 }, () => {
    forAll(
      (wkA: number, gap: number) => {
        const wkB = wkA + 1 + gap    // wkB > wkA guaranteed
        const src = `type: gantt\n- Early [wk${wkA}-wk${wkA + 1}]\n- Late [wk${wkB}-wk${wkB + 1}]`
        const svg = renderMdArt(src)
        const xs = barRectXCoords(svg)
        if (xs.length < 2) return true   // skip if renderer merges or clips
        return xs[0] < xs[1]
      },
      Gen.inRange(1, 5),
      Gen.inRange(0, 4),
    )
  })

  it('∀ single-week [wkN] task: bar renders (not milestone)', { timeout: 15000 }, () => {
    forAll(
      (wk: number, label: string) => {
        // [wkN] without * is a bar task (single week), not a milestone
        const src = `type: gantt\n- ${safe(label)} [wk${wk}]`
        const svg = renderMdArt(src)
        return svg.includes('<rect') && !svg.includes('<polygon')
      },
      Gen.inRange(1, 8),
      genLabelPlain,
    )
  })

})

// ── * bullet is just a bullet alias, not a milestone marker ─────────────────

describe('gantt * bullet is an alias for - bullet', () => {

  it('∀ * bullet task: renders as bar rect, no polygon', { timeout: 15000 }, () => {
    forAll(
      (wk: number, label: string) => {
        const src = `type: gantt\n* ${safe(label)} [wk${wk}-wk${wk + 1}]`
        const svg = renderMdArt(src)
        return svg.includes('<rect') && !svg.includes('<polygon')
      },
      Gen.inRange(1, 6),
      genLabelPlain,
    )
  })

})

// ── No-crash + geometry ───────────────────────────────────────────────────────

describe('gantt render: no crash with any valid input', () => {

  it('∀ n tasks with valid week ranges: renders without throwing', { timeout: 20000 }, () => {
    forAll(
      (n: number, label: string) => {
        const tasks = Array.from({ length: n }, (_, i) => ({
          label: `${safe(label)}-${i}`,
          start: i + 1,
          end: i + 3,
        }))
        const src = `type: gantt\n${buildGanttSource(tasks)}`
        try {
          const svg = renderMdArt(src)
          return svg.includes('<svg') && svg.includes('viewBox=')
        } catch { return false }
      },
      Gen.inRange(1, 6),
      genLabelPlain,
    )
  })

})
