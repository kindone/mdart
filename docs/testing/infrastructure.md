# MdArt Test Infrastructure — Architecture and Design Decisions

A record of the architectural decisions for the MdArt visual test system, grounded in analysis of the current codebase. Intended as the reference document before and during implementation.

**Implementation status:** The validator (`validateMdArt`) and the `renderMdArtDetailed` integration are implemented in `packages/mdart/src/`. The post-render heuristic checks, SVG annotation pass, and LLM evaluation suite are planned but not yet written.

---

## Current Pipeline (Established by Code Analysis)

```
raw string → parseMdArt() → MdArtSpec → layoutRenderer(spec, theme) → SVG string → scopeSvgAnimation() → final SVG
```

Key facts:

- **No intermediate layout tree.** Each layout renderer goes directly from `MdArtSpec` to SVG string via string concatenation. There is no layout phase between parsing and emission where hooks can be injected cleanly.
- **Both phases are fully silent by default.** `parseMdArt` swallows all errors and returns `{ type: 'process', items: [] }`. `renderMdArt` catches exceptions and calls `renderError()`. `renderMdArtDetailed` surfaces issues via the `issues` array and optional `onIssue` callback.
- **`data-*` attributes are absent for identification.** Only `tab-list.ts` uses `data-*` attributes (for its own JS tab interactivity). No renderer emits anything like `data-item-index`.
- **Per-item grouping is animation-gated.** 92 of 105 renderers emit `<g class="mdart-n{i}">` wrappers per item — but only when `animate: true`. When animation is off, those wrappers are not emitted and the SVG has no per-item containers.
- **13 renderers have no animation grouping at all.** Types including `gauge`, `waffle`, `sankey`, several venn variants, `balance`, and others do not use the `mdart-n{i}` pattern regardless of animation state.

---

## Test Pipeline

The test system adds four new steps around the existing pipeline:

```
raw string
  → validateMdArt(spec)        [DONE] pre-render structural checks
  → parseMdArt() → MdArtSpec
  → layoutRenderer → SVG string
  → checkSvg(svg)              [PLANNED] post-render heuristic checks
  → annotateSvg(svg, issues)   [PLANNED] diagnostic overlay on failure
  → evaluateVisually(image)    [PLANNED] LLM visual evaluation
```

---

## Decision 1: Validator as a Separate Exported Function ✓ Implemented

`parseMdArt` stays forgiving. It is used in live preview where partial and in-progress input is normal, and returning something renderable is always preferable to throwing.

The validator is a separate exported function that receives the already-parsed spec:

```ts
validateMdArt(spec: MdArtSpec, options?: ValidationOptions): ValidationIssue[]
```

This allows the test harness, CLI, and IDE tooling to call it independently. It is not embedded in `parseMdArt` or `renderMdArt`, though `renderMdArtDetailed` invokes it internally when a `validate` mode is set in config.

See `packages/mdart/src/validator.ts` for the implementation.

---

## Decision 2: Three Severity Levels ✓ Implemented

Each `ValidationIssue` carries a `level` field:

- **`error`** — the input is structurally broken and will produce incorrect or meaningless output. The renderer should not be called. Example: `venn` with fewer than 2 items.
- **`warning`** — the input is technically valid but likely to render poorly. The renderer should run but the caller is informed. Example: `cycle` with 14 items, a hierarchy type with depth exceeding 5.

In `renderMdArtDetailed`, validation is controlled via config:

```ts
renderMdArtDetailed(raw, hintType, {
  validate: 'silent' | 'warning' | 'error',
  onIssue: (issue: ValidationIssue) => void,
})
```

- `silent` — no validation runs; `issues` array is always empty.
- `warning` — (default) issues are collected and fired through `onIssue`; rendering always proceeds.
- `error` — error-level issues abort rendering and return an error SVG; warnings pass through.

The test harness runs in `error` mode. The CLI default is `warning`. The live preview uses `silent`.

---

## Decision 3: Heuristic Checks Split into Two Phases

Because there is no intermediate layout tree, heuristic assertions must operate on either the parsed data structure or the final SVG string.

**Phase 1 — Pre-render, operating on MdArtSpec:** ✓ Implemented via `validateMdArt`

Checks that can be evaluated from the parsed structure alone, before any rendering cost is paid:

- Node count against the type's recommended range
- Required structural elements (matching keys in `comparison`, minimum item count for relational types)
- Attribute value validity (known theme names, valid direction values)
- Type-specific semantic constraints

Error-level findings here can abort rendering entirely.

**Phase 2 — Post-render, operating on SVG string (via JSDOM or similar):** Planned

Checks that require knowing what the renderer actually produced:

- Text bounding box containment within parent shape bounds
- WCAG contrast ratio for text-on-background colour pairs
- ViewBox vs. actual content bounds (overflow detection)
- Connector paths intersecting unrelated nodes
- Symmetry and centroid balance for symmetric diagram types

This phase is slower and requires DOM parsing of the SVG string. It runs after a successful render.

---

## Decision 4: Per-Item Hooks — Immediate Path and Planned Path

**Immediate (zero code changes):** Force `animate: true` in test renders. This causes 92 renderers to emit `<g class="mdart-n{i}">` wrappers per item. The test harness queries by `.mdart-n0`, `.mdart-n1`, etc. via JSDOM. Animation speed is set to a very high value so frames complete instantly and do not affect layout measurements.

**Planned (coordinated renderer change):** Add `instrument: boolean` to `MdArtConfig`. When true, every item group emits `data-item-index="N"` regardless of animation state. The change is one additional attribute in the existing animate ternary in each renderer:

```ts
// Before:
animate ? `<g class="mdart-n${i}">${nodeStr}</g>` : nodeStr

// After:
(animate || instrument)
  ? `<g${animate ? ` class="mdart-n${i}"` : ''}${instrument ? ` data-item-index="${i}"` : ''}>${nodeStr}</g>`
  : nodeStr
```

This pattern is repeated across 92 renderers and the shared `renderNodes()` utility in `shared.ts`. It can be applied in a single coordinated PR. Once in place, the test harness sets `instrument: true` and has stable, animation-independent item hooks.

**Exception — 13 renderers without grouping:** Types including `gauge`, `waffle`, `sankey`, venn variants, `balance`, and others do not use per-item grouping. For these types, only whole-diagram assertions apply. Per-item annotation is out of scope until their renderers add grouping.

---

## Decision 5: Visual Annotation is a Post-Render SVG Pass

Since there is no layout tree, diagnostic annotations are added as a post-processing pass on the SVG string. `annotateSvg(svg, issues)` injects overlay elements — warning badges, red outlines — keyed to items via `data-item-index`.

This keeps all layout renderers untouched for annotation. The root `<svg>` element already receives `data-mdart-scope` from `scopeSvgAnimation`. The annotation pass appends a diagnostic overlay group after the existing content.

The annotated diagnostic SVG is used in two ways:

1. Saved as a test artifact when a heuristic check fails, for visual debugging without reproducing the case manually.
2. Sent to the LLM evaluation layer as input, with heuristic flags pre-marked. This gives the model better grounding and reduces false positives.

---

## Decision 6: LLM Evaluation Runs on a Stable Curated Set

LLM evaluation is not run inside the jsproptest property loop. It is slow, costs money, and is non-deterministic. It runs as a separate suite against a curated set of representative diagrams — one or a few per diagram type — committed to the repository as fixtures.

When jsproptest finds a minimal failing case that passes all heuristic checks, it can be manually promoted to the curated set for LLM evaluation.

The LLM receives the rendered screenshot (or annotated diagnostic SVG) with a structured prompt containing binary questions per visual criterion — one criterion per API call to avoid context bleeding. Multiple runs are averaged for borderline results.

---

## Decision 7: Generator Scope

One generator per grammar shape, not per diagram type. Types that share the same valid input structure share a generator parameterised by type. Types with structurally distinct grammars have their own generator.

The validator from Decision 1 is the contract that generators must satisfy. A meta-property asserts that all generated inputs pass pre-render validation with no error-level issues — this tests the generators themselves, not just the renderer.
