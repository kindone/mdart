// Feature:     Renderer output fidelity — label text presence and model-based group count
// Arch/Design: parseMdArt (parser) and renderMdArt (renderer) are separate subsystems.
//              This file tests two cross-subsystem properties:
//
//              1. LABEL FIDELITY (observability across the full pipeline):
//                 raw input → parser → renderer → SVG text nodes must contain the
//                 item's label text. `compactLabel(raw, idx)` (from domains.ts)
//                 produces alnum-only strings that survive SVG text insertion verbatim —
//                 no XML escaping needed, so `svg.includes(label)` is a reliable check.
//
//              2. MODEL-BASED (parser output predicts renderer structure):
//                 For flat layout types (process, bullet-list, cycle), each parsed item
//                 gets exactly one `<g class="mdart-n{i}">` animated group in the SVG.
//                 So spec.items.length (parser model) must equal countNodeGroups(svg)
//                 (renderer output). This bridges the two subsystems without needing
//                 to know the exact SVG structure.
//
// Spec:        ∀ compact labels → process: each label text appears in SVG
//              ∀ compact labels → bullet-list: each label text appears in SVG
//              ∀ compact labels → cycle: each label text appears in SVG
//              ∀ n flat items → process: spec.items.length === mdart-n group count
//              ∀ n flat items → bullet-list: spec.items.length === mdart-n group count
// @quality:    observability, model-based
// @type:       property
// @mode:       verification

import { describe, it } from 'vitest'
import { forAll, Gen } from 'jsproptest'
import { parseMdArt } from '../parser'
import { renderMdArt } from '../renderer'
import { genLabelAny, compactLabel } from './domains'

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Count the number of distinct mdart-n{i} animated item groups in the SVG.
 *
 * Uses the `<g class="mdart-n{i}"` opening-tag pattern (same as metamorphic.prop.ts
 * MR-6 countGroups) to avoid counting cross-references or data attributes that
 * also mention group indices but are not group-open elements.
 *
 * A Set de-duplicates in case the same class appears on nested elements (rare,
 * but `class="mdart-n0 mdart-n1"` would inflate a naïve `.match()?.length` count).
 */
function countNodeGroups(svg: string): number {
  const seen = new Set(
    Array.from(svg.matchAll(/<g class="mdart-n(\d+)"/g), m => m[1])
  )
  return seen.size
}

// ── SVG label fidelity ────────────────────────────────────────────────────────
//
// For each flat layout type, every item's label must appear verbatim as a
// substring of the rendered SVG string. This verifies the full pipeline:
//   raw label → parser (item.label) → renderer (SVG <text> node)
//
// `compactLabel` strips everything except [a-zA-Z0-9], guaranteeing the label
// string survives SVG text insertion without XML-escape transformation. The
// index suffix (always present) also ensures no two items share the same label.

describe('SVG label fidelity: each item label text appears verbatim in SVG', () => {

  it('∀ compact labels → process: every label appears in SVG', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const labels = rawLabels.map(compactLabel)   // alnum-only + index suffix
        const src = `type: process\n${labels.map(l => `- ${l}`).join('\n')}`
        try {
          const svg = renderMdArt(src)
          return labels.every(l => svg.includes(l))
        } catch { return false }
      },
      Gen.array(genLabelAny, 1, 5),
    )
  })

  it('∀ compact labels → bullet-list: every label appears in SVG', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const labels = rawLabels.map(compactLabel)
        const src = `type: bullet-list\n${labels.map(l => `- ${l}`).join('\n')}`
        try {
          const svg = renderMdArt(src)
          return labels.every(l => svg.includes(l))
        } catch { return false }
      },
      Gen.array(genLabelAny, 1, 6),
    )
  })

  it('∀ compact labels → cycle: every label appears in SVG', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const labels = rawLabels.map(compactLabel)
        const src = `type: cycle\n${labels.map(l => `- ${l}`).join('\n')}`
        try {
          const svg = renderMdArt(src)
          return labels.every(l => svg.includes(l))
        } catch { return false }
      },
      Gen.array(genLabelAny, 2, 5),
    )
  })

  // card-list CONTRACT: maximum 4 items (2×2 grid layout).
  // Items beyond 4 are silently dropped by the renderer; this is the current
  // documented contract. Future work: allow vertical growth to lift the cap.

  it('∀ 1–4 compact labels → card-list: every label appears in SVG', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const labels = rawLabels.map(compactLabel)
        const src = `type: card-list\n${labels.map(l => `- ${l}`).join('\n')}`
        try {
          const svg = renderMdArt(src)
          return labels.every(l => svg.includes(l))
        } catch { return false }
      },
      Gen.array(genLabelAny, 1, 4),    // ≤ 4: within the 2×2 grid contract
    )
  })

  it('card-list contract: items beyond 4 are silently truncated (not an error)', { timeout: 15000 }, () => {
    // The renderer is allowed to drop items 5+ silently; it must NOT crash.
    // The first 4 items must still appear. This test pins the truncation contract
    // so a future "lift the cap" change is immediately visible.
    forAll(
      (rawLabels: string[]) => {
        const labels = rawLabels.map(compactLabel)
        const src = `type: card-list\n${labels.map(l => `- ${l}`).join('\n')}`
        try {
          const svg = renderMdArt(src)
          // Renderer must not crash, and first 4 labels must appear
          const first4 = labels.slice(0, 4)
          return svg.includes('<svg') && first4.every(l => svg.includes(l))
        } catch { return false }
      },
      Gen.array(genLabelAny, 5, 8),    // > 4: exercises the truncation path
    )
  })

  it('∀ compact labels → org-chart: every label appears in SVG', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const labels = rawLabels.map(compactLabel)
        // org-chart: first item = root, rest = children at depth 1
        const [root, ...children] = labels
        const body = [`- ${root}`, ...children.map(l => `  - ${l}`)].join('\n')
        const src = `type: org-chart\n${body}`
        try {
          const svg = renderMdArt(src)
          return labels.every(l => svg.includes(l))
        } catch { return false }
      },
      Gen.array(genLabelAny, 2, 5),
    )
  })

})

// ── Model-based: parser item count predicts renderer group count ──────────────
//
// This is the key cross-subsystem property: parseMdArt returns spec.items.length
// as its model of the diagram structure, and renderMdArt emits exactly that many
// `<g class="mdart-n{i}">` animated groups. A discrepancy would indicate:
//   • the parser counted items that the renderer ignores (off-by-one, filter bug)
//   • the renderer created extra groups not corresponding to parser items (layout bug)
//
// We use flat layout types where the 1-to-1 item↔group mapping is clearly defined
// and compactLabel for uniqueness (prevents duplicate-label deduplication).

describe('model-based: spec.items.length predicts mdart-n group count in SVG', () => {

  it('∀ n flat items → process: parser count === renderer group count', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const labels = rawLabels.map(compactLabel)
        const src = `type: process\n${labels.map(l => `- ${l}`).join('\n')}`
        const spec = parseMdArt(src)
        const svg = renderMdArt(src)
        return spec.items.length === countNodeGroups(svg)
      },
      Gen.array(genLabelAny, 1, 6),
    )
  })

  it('∀ n flat items → bullet-list: parser count === renderer group count', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const labels = rawLabels.map(compactLabel)
        const src = `type: bullet-list\n${labels.map(l => `- ${l}`).join('\n')}`
        const spec = parseMdArt(src)
        const svg = renderMdArt(src)
        return spec.items.length === countNodeGroups(svg)
      },
      Gen.array(genLabelAny, 1, 6),
    )
  })

  it('∀ n flat items → cycle: parser count === renderer group count', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        const labels = rawLabels.map(compactLabel)
        const src = `type: cycle\n${labels.map(l => `- ${l}`).join('\n')}`
        const spec = parseMdArt(src)
        const svg = renderMdArt(src)
        return spec.items.length === countNodeGroups(svg)
      },
      Gen.array(genLabelAny, 2, 6),
    )
  })

  it('∀ n flat items: parseMdArt item count is stable (second parse === first parse)', { timeout: 15000 }, () => {
    // Consistency check: parseMdArt is a pure function — calling it twice on the
    // same source must return the same item count. (This verifies no internal
    // mutable state in the parser, complementing the renderer statefulness tests.)
    forAll(
      (rawLabels: string[]) => {
        const labels = rawLabels.map(compactLabel)
        const src = `type: bullet-list\n${labels.map(l => `- ${l}`).join('\n')}`
        const count1 = parseMdArt(src).items.length
        const count2 = parseMdArt(src).items.length
        return count1 === count2
      },
      Gen.array(genLabelAny, 1, 8),
    )
  })

})
