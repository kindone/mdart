// Feature:     List renderers that display key:value pairs — zigzag-list, step-up, step-down
// Arch/Design: These renderers render each item's label as the "key" and value
//              as the associated metric. Both must appear as legible text in the SVG.
//              staircase types (step-up/step-down) additionally use fixed-height rect blocks.
// Spec:        ∀ zigzag-list × KV items: label and value text appear in SVG
//              ∀ step-up × KV items: label and value text appear in SVG
//              ∀ step-down × KV items: label and value text appear in SVG
//              ∀ n items: renders without crash, produces valid viewBox SVG
//              ∀ multiple KV items: all labels appear in SVG
// @quality:    correctness
// @type:       property
// @mode:       verification

import { describe, it } from 'vitest'
import { forAll, Gen } from 'jsproptest'
import { renderMdArt } from '../renderer'
import { genLabelPlain } from './domains'

/** Fixed word pairs to use as key:value — avoids characters that disrupt KV splitting. */
const KEYS   = ['Revenue', 'Retention', 'Growth', 'Margin', 'Uptime', 'Speed', 'Cost', 'Score']
const VALUES = ['42M', '91%', '18x', '63%', '99.9%', '120ms', '12K', '87']

function safeLabel(s: string): string {
  return s.replace(/:/g, '-').replace(/\n/g, ' ').replace(/^\s*$/, 'x')
}

const KV_TYPES = ['zigzag-list', 'step-up', 'step-down'] as const

// ── KV labels and values appear in SVG ───────────────────────────────────────

describe('KV list renderers: label and value appear in SVG', () => {

  it.each(KV_TYPES)('%s: ∀ n KV items — all labels appear in SVG', (type) => {
    forAll(
      (n: number, ki: number) => {
        const k = KEYS[ki % KEYS.length]
        const v = VALUES[ki % VALUES.length]
        const items = Array.from({ length: n }, (_, i) => `- ${k}${i}: ${v}`).join('\n')
        const src = `type: ${type}\n${items}`
        const svg = renderMdArt(src)
        // All labels should appear (rendered as tspan or text content)
        return Array.from({ length: n }, (_, i) => `${k}${i}`)
          .every(label => svg.includes(label))
      },
      Gen.inRange(1, 4),
      Gen.inRange(0, KEYS.length - 1),
    )
  })

  it.each(KV_TYPES)('%s: ∀ fixed KV item — value appears in SVG', (type) => {
    forAll(
      (ki: number, vi: number) => {
        const k = KEYS[ki % KEYS.length]
        const v = VALUES[vi % VALUES.length]
        const src = `type: ${type}\n- ${k}: ${v}\n- Other: 50%`
        const svg = renderMdArt(src)
        return svg.includes(v)
      },
      Gen.inRange(0, KEYS.length - 1),
      Gen.inRange(0, VALUES.length - 1),
    )
  })

})

// ── No-crash + geometry ───────────────────────────────────────────────────────

describe('KV list renderers: no crash with arbitrary labels', () => {

  it.each(KV_TYPES)('%s: ∀ n items — renders without throwing', (type) => {
    forAll(
      (n: number, label: string) => {
        const labels = Array.from({ length: n }, (_, i) => `${safeLabel(label)}-${i}`)
        const src = `type: ${type}\n${labels.map(l => `- ${l}`).join('\n')}`
        try {
          const svg = renderMdArt(src)
          return svg.includes('<svg') && svg.includes('viewBox=')
        } catch { return false }
      },
      Gen.inRange(1, 6),
      genLabelPlain,
    )
  })

  it.each(KV_TYPES)('%s: ∀ n KV items — renders without throwing', (type) => {
    forAll(
      (n: number, ki: number) => {
        const k = KEYS[ki % KEYS.length]
        const v = VALUES[ki % VALUES.length]
        const items = Array.from({ length: n }, (_, i) => `- ${k}${i}: ${v}`).join('\n')
        const src = `type: ${type}\n${items}`
        try {
          const svg = renderMdArt(src)
          return svg.includes('<svg') && svg.includes('viewBox=')
        } catch { return false }
      },
      Gen.inRange(1, 5),
      Gen.inRange(0, KEYS.length - 1),
    )
  })

})
