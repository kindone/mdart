// Feature:     List renderers that display key:value pairs — zigzag-list, step-up, step-down
// Note:        zigzag-list now renders via `type: history, shape: alternating`
//              (Phase 4 of the type/shape consolidation plan) — kept as the
//              type string in these tests since it's still a valid alias.
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

import { describe, expect, it } from 'vitest'
import { forAll, Gen, Property } from 'jsproptest'
import { renderMdArt } from '../renderer'
import { genLabelPlain, genLabelAny, compactLabel } from './domains'

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

// ── Markup structure: tspan wrapping and rect height ─────────────────────────

describe('KV list renderers: markup structure', () => {

  it('zigzag-list: KV labels use <tspan> wrappers (not bare <text>)', () => {
    // zigzag-list sends labels through the shared fitted-block helper. Labels
    // and values are rendered in separate text nodes so each gets its own
    // line budget.
    // Pinned with specific examples and verified across all key/value combos.
    const prop = new Property((ki: number, vi: number) => {
      const k = KEYS[ki % KEYS.length]
      const v = VALUES[vi % VALUES.length]
      const svg = renderMdArt(`type: zigzag-list\n- ${k}: ${v}\n- Other: 50%`)
      return svg.includes(`>${k}</tspan>`)           // label wrapped in tspan
        && svg.match(new RegExp(`<text[^>]*>(?:(?!</text>)[\\s\\S])*${v}(?:(?!</text>)[\\s\\S])*</text>`)) !== null  // value in text
    })
    prop.example(0, 0)   // Revenue: 42M  — original example case
    prop.example(1, 1)   // Retention: 91%
    prop.forAll(Gen.inRange(0, KEYS.length - 1), Gen.inRange(0, VALUES.length - 1))
  })

  it('zigzag-list: long values can use two value lines', () => {
    const svg = renderMdArt(`
type: zigzag-list
- Intake: Customer readiness assessment requires manual verification
- Build: 50%
`, 'zigzag-list')

    expect(svg).toContain('Customer readiness')
    expect(svg).toContain('manual')
    expect(svg).not.toContain('Customer readiness assessment requires manual verification…')
  })

  // zigzag-list now renders via `type: history, shape: alternating`
  // (Phase 4 of the type/shape consolidation plan — zigzag-list/
  // zigzag-timeline/timeline-list merged into `history`, backward
  // compatibility deliberately deprioritized for this merge). The new
  // renderer wraps long values across up to 5 lines instead of truncating
  // at 2-3 with an ellipsis, so these two tests now assert the fuller
  // (more capable) behavior rather than pinning the old truncation cutoff.

  it('zigzag-list: long values wrap in full rather than truncating', () => {
    const svg = renderMdArt(`
type: zigzag-list
- Prevention: Capacity test added to release checklist with new tenant-volume fixture
`, 'zigzag-list')

    expect(svg).toContain('Capacity test added to release')
    expect(svg).toContain('fixture')
  })

  it('zigzag-list: very long values still render their full text', () => {
    const svg = renderMdArt(`
type: zigzag-list
- Containment: Feature flag disabled secondary enrichment path sdfasfd asd fasdf asdf sadfasdf asdfasdf asdfasdf ㄴㅁㅇㄹㅁㄴㅇㄹ
`, 'zigzag-list')

    expect(svg).toContain('Feature flag disabled secondary')
    expect(svg).toContain('sdfasfd asd fasdf asdf')
  })

  it.each(['step-up', 'step-down'] as const)('%s: KV blocks use 56px rect height', (type) => {
    // step-up and step-down use a fixed-height staircase block. 56px is the
    // layout constant; if it changes, visual alignment breaks — pin it here.
    const prop = new Property((ki: number, vi: number) => {
      const k = KEYS[ki % KEYS.length]
      const v = VALUES[vi % VALUES.length]
      const svg = renderMdArt(`type: ${type}\n- ${k}: ${v}\n- Other: 50%`)
      return /<rect[^>]*height="56"/.test(svg)
    })
    prop.example(0, 0)   // Revenue: 42M
    prop.example(1, 1)   // Retention: 91%
    prop.forAll(Gen.inRange(0, KEYS.length - 1), Gen.inRange(0, VALUES.length - 1))
  })

})

// ── KV fidelity across the full label domain ──────────────────────────────────
//
// The tests above use a fixed word pool (`KEYS`/`VALUES`). These tests cover
// the same "both key and value appear in SVG" property with the FULL weighted
// genLabelAny domain so edge-case subdomains (XML chars, CJK, emoji, very short)
// are exercised at their proper proportions.
//
// `compactLabel(raw, idx)` strips to alnum-only so the result appears verbatim
// in SVG text nodes without XML-escaping — makes `svg.includes(label)` reliable.
//
// Extended type list adds `two-column-list` and `ribbon-list` which are similarly
// structured KV renderers not yet covered by the fixed-pool tests.

const KV_TYPES_FULL = [
  'zigzag-list',
  'step-up',
  'step-down',
  'two-column-list',
  'ribbon-list',
] as const

describe('KV fidelity: both key AND value appear in SVG (full genLabelAny domain)', () => {

  it.each(KV_TYPES_FULL)(
    '%s: ∀ (rawKey, rawVal): compact key AND value both appear in SVG',
    { timeout: 20000 },
    (type) => {
      forAll(
        (rawKey: string, rawVal: string) => {
          const key = compactLabel(rawKey, 0)
          const val = compactLabel(rawVal, 1)
          // Second item gives the renderer enough to construct the full layout
          const src = `type: ${type}\n- ${key}: ${val}\n- Anchor2: Padding3`
          try {
            const svg = renderMdArt(src)
            return svg.includes(key) && svg.includes(val)
          } catch { return false }
        },
        genLabelAny,
        genLabelAny,
      )
    },
  )

  it.each(KV_TYPES_FULL)(
    '%s: ∀ n KV items (1–4): all compact keys AND values appear in SVG',
    { timeout: 20000 },
    (type) => {
      forAll(
        (rawLabels: string[]) => {
          // Use even indices for keys, odd for values — ensures every key+val pair
          // produces distinct compact strings (no prefix-collision risk with 1-digit idx)
          const pairs = rawLabels.map((r, i) => ({
            key: compactLabel(r, i * 2),
            val: compactLabel(r, i * 2 + 1),
          }))
          const src = `type: ${type}\n${pairs.map(p => `- ${p.key}: ${p.val}`).join('\n')}`
          try {
            const svg = renderMdArt(src)
            return pairs.every(p => svg.includes(p.key) && svg.includes(p.val))
          } catch { return false }
        },
        Gen.array(genLabelAny, 1, 4),
      )
    },
  )

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
