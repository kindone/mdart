// Feature:     checklist renderer — [done] item styling
// Arch/Design: checklist uses italic + fill-opacity to visually distinguish
//              completed items; strikethrough is never used (accessibility).
//              The [done] attribute is extracted by the parser before render.
// Spec:        ∀ item [done]: fill-opacity="0.62" appears in SVG
//              ∀ item [done]: font-style="italic" appears in SVG
//              ∀ item [done]: line-through never appears
//              ∀ item without [done]: fill-opacity="0.62" does NOT appear
//              ∀ checklist × any labels: no crash, valid viewBox
// @quality:    correctness
// @type:       property
// @mode:       verification

import { describe, it } from 'vitest'
import { forAll, Gen } from 'jsproptest'
import { renderMdArt } from '../renderer'
import { genLabelPlain } from './domains'

/** Strip characters that interfere with the [done] attribute parse. */
function safe(s: string): string {
  return s
    .replace(/\[/g, '(').replace(/\]/g, ')')
    .replace(/\n/g, ' ').replace(/^\s*$/, 'x')
    .replace(/:/g, '-')
}

// ── [done] styling invariants ─────────────────────────────────────────────────

describe('checklist [done] items', () => {

  it('∀ label × [done]: fill-opacity="0.62" appears in SVG', { timeout: 15000 }, () => {
    forAll(
      (label: string) => {
        const src = `type: checklist\n- ${safe(label)} [done]\n- Open`
        const svg = renderMdArt(src)
        return svg.includes('fill-opacity="0.62"')
      },
      genLabelPlain,
    )
  })

  it('∀ label × [done]: font-style="italic" appears in SVG', { timeout: 15000 }, () => {
    forAll(
      (label: string) => {
        const src = `type: checklist\n- ${safe(label)} [done]\n- Open`
        const svg = renderMdArt(src)
        return svg.includes('font-style="italic"')
      },
      genLabelPlain,
    )
  })

  it('line-through never appears in checklist SVG (policy: italic+faded, not strikethrough)', { timeout: 15000 }, () => {
    forAll(
      (n: number, label: string) => {
        // Mix of done and open items
        const items = Array.from({ length: n }, (_, i) =>
          `- ${safe(label)}-${i}${i % 2 === 0 ? ' [done]' : ''}`
        ).join('\n')
        const src = `type: checklist\n${items}`
        const svg = renderMdArt(src)
        return !svg.includes('line-through')
      },
      Gen.inRange(1, 6),
      genLabelPlain,
    )
  })

})

// ── No [done]: no done-styles ─────────────────────────────────────────────────

describe('checklist items without [done]', () => {

  it('∀ labels without [done]: fill-opacity="0.62" does not appear', { timeout: 15000 }, () => {
    forAll(
      (n: number, label: string) => {
        const items = Array.from({ length: n }, (_, i) => `- ${safe(label)}-${i}`).join('\n')
        const src = `type: checklist\n${items}`
        const svg = renderMdArt(src)
        return !svg.includes('fill-opacity="0.62"')
      },
      Gen.inRange(1, 5),
      genLabelPlain,
    )
  })

})

// ── No-crash / geometry ───────────────────────────────────────────────────────

describe('checklist render: no crash and valid geometry', () => {

  it('∀ n items (mix of done/open): renders without throwing', { timeout: 20000 }, () => {
    forAll(
      (n: number, label: string) => {
        const items = Array.from({ length: n }, (_, i) =>
          `- ${safe(label)}-${i}${i % 3 === 0 ? ' [done]' : ''}`
        ).join('\n')
        const src = `type: checklist\n${items}`
        try {
          const svg = renderMdArt(src)
          return svg.includes('<svg') && svg.includes('viewBox=')
        } catch { return false }
      },
      Gen.inRange(1, 8),
      genLabelPlain,
    )
  })

})
