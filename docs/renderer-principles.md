# Renderer Implementation Principles

> Abstract checklist for anyone building a renderer that turns **structured text input** into a **visual artifact** (SVG, canvas, DOM, terminal output, …). Codebase-agnostic. Use it to design new renderer families, audit existing ones, or anchor code review.

---

## I. The five principles

1. **Visibility** — every datum the user wrote must be visible somewhere in the output.
2. **Affordance completeness** — every syntactic form the parser accepts must be handled gracefully by every renderer that claims it.
3. **Theme over style** — no hardcoded presentation. Style flows through a theme contract.
4. **Determinism** — same input + same theme = byte-identical output.
5. **Conservation** — parser changes are global; renderer changes are local. Resist promoting renderer concerns into the parser.

Everything below is a consequence of these five.

---

## II. Visibility — the No Silent Drops principle

> If the user typed it, the output must show it. If the renderer can't show it inline, surface it adjacent.

- **Hover/inspect surface** — every shape that represents an input item exposes the *full* item: label, value, modifiers, child count. Truncation is a visual choice, never a data loss.
- **Truncation cue** — when a label is shortened to fit, an explicit visual indicator (`…`, fade, "+N more") tells the user there is hidden content.
- **Parsed-but-unrendered features** — if a renderer doesn't yet support a feature its parser accepts, it must:
  1. fall back to inline render, or
  2. expose via tooltip / sidecar, or
  3. show an explicit "unsupported here" indicator.
  Never silently drop.
- **Empty state** — zero-item input renders a placeholder, not a blank canvas.
- **Malformed state** — a spec that fails internal validation renders a visible error, not nothing.

**Rationale.** Silent drops train users not to trust the renderer. Once trust breaks, every output requires manual verification, and the tool's value collapses.

---

## III. Affordance completeness

A renderer "claims" an input shape (a type, a layout, a mode). Claiming it implies handling **every** syntactic form the input language allows for that shape — even forms the renderer doesn't visually distinguish.

Map out the input language as a matrix:

| Input form | Minimum behavior |
|---|---|
| Bare item | Renders |
| Item with typed value | Value visible (inline or surfaced) |
| Item with modifiers/attributes | Modifiers either drive a visual variant OR are surfaced |
| Combined (value + modifiers) | All present |
| Containment children | Either rendered nested, or split rules documented |
| Flow children (edges) | Either rendered as edges, or surfaced |
| Mixed children | Both surfaced |
| Aliased syntax | Normalized at parse, transparent to renderer |
| Empty body | Empty placeholder |
| Single item | Renders without divide-by-zero / single-element bugs |
| Many items | Renders, OR explicit overflow rule (split, paginate, "+N") |

Build this matrix once per renderer family. A renderer is incomplete if it leaves a cell unaddressed.

---

## IV. Theme over style

- **No hardcoded color, font, or border** in the renderer. All visual properties resolve through a theme contract.
- **Semantic theme keys**, not literal ones: `accent`, `danger`, `warning`, `surface`, `textMuted` — never `red`, `#ef4444`, `light-gray`.
- **Override priority** is documented and consistent: typically *category default → global → consumer override → per-input override*. Each layer can only refine, never silently win.
- **Adding a semantic** is a global act — when you need a new role (`success`, `info`, `secondary`), it lands in the theme contract and **every** named theme provides it. No one-off colors.
- **Categorical palettes** (for series, segments, lanes) cycle deterministically by index — same item index → same palette slot, every render.

---

## V. Determinism

- No `Math.random`, no wall-clock time, no locale-dependent number formatting in the render path.
- No environment-dependent layout (don't read viewport size at render time — accept it as input).
- Sort orders are stable; tie-breakers are explicit.
- IDs in the output (e.g. SVG `<marker id>`, gradient IDs) are derived from input, not from a counter, so identical inputs collide-merge cleanly when embedded together.

**Rationale.** Determinism unlocks snapshot testing, cacheability, and visual diffing in code review.

---

## VI. Conservation: parser vs renderer

- **Parser concerns**: tokenization, normalization (alias resolution), structural typing, validation of the *grammar*. The parser is shared by all renderers — every change is global.
- **Renderer concerns**: geometry, ordering, color application, text wrapping, overflow handling, validation of the *spec for this layout*.
- **Default to renderer-side.** When in doubt, do it in the renderer. Parser changes ripple; renderer changes don't.
- **Promote to parser only when**:
  - The transformation is shared by every renderer (alias normalization),
  - It is structurally costly to do per-renderer (front-matter typing),
  - Or it represents the input language's grammar, not a presentation choice.

---

## VII. Geometry primitives (for visual renderers)

Even abstract renderers tend to share these:

- **Z-order discipline** — fixed paint order: backgrounds → grids/guides → shapes → labels → decorations (arrowheads, halos). Build the output in this order.
- **Endpoint clearance** — when a connector lands on a shape, terminate at the shape's edge, not its centroid. The clearance is a function of shape geometry and edge angle. Document the formula once per shape kind.
- **Decoration depth** — arrowheads, end caps, and connectors have nonzero size. Subtract their depth from the line endpoint, otherwise they overshoot.
- **Direction-aware decorations** — markers that depend on direction (arrowheads) must rotate with the line. Avoid pre-baked direction-specific glyphs.
- **Content-driven sizing** — width and height are computed from content (longest wrapped label + padding), not hardcoded.
- **Wrap, don't shrink** — uniform font size beats variable. Wrapping is the answer to "label too long," shrinking is rarely the answer.
- **Minimum legibility budget** — a documented floor for font size and tap-target dimensions.

---

## VIII. Input language affordances (for parsers)

- **Whitespace tolerance** — blank lines inside structured sections don't terminate the section. Termination is content-driven (first body-character line, first non-key line), not whitespace-driven.
- **Strict separators** — when a separator (e.g. `:`) is overloaded, define a precise rule (paren-aware, quote-aware, escape-aware). Document it; test the boundary cases.
- **Aliases** — accept multiple spellings, normalize to one canonical form at parse time. The canonical form is what every renderer sees.
- **Repeatable keys** — if a key can appear multiple times, declare it a list in the spec. Don't last-write-wins.
- **Soft exchangeability** — if two surface syntaxes have the same semantics in some contexts (e.g. containment vs. flow children), make both available downstream and let the renderer pick.

---

## IX. Test coverage shape

Every renderer ships with at minimum:

- **Parser-side**: front-matter keys land on the spec; aliases collapse; modifiers parse; edge cases (empty, single item, malformed).
- **Render-side**: output contains expected structural markers (shape type, label text, theme color).
- **Visibility regression**: every visible item exposes the full datum (the no-silent-drops contract).
- **Theme regression**: switching theme changes colors; per-input override beats global.
- **Truncation regression**: long input produces both the truncated visible form *and* the full datum on inspect.

Snapshot tests are tempting — use sparingly. They flap on every layout tweak, train reviewers to rubber-stamp diffs, and obscure the real assertion.

---

## X. Documentation chain

A renderer is not done when the code compiles. It is done when:

- A representative input example exists in the example corpus.
- An entry exists in the public gallery.
- The interactive playground/demo surfaces it (dropdown, search, family grouping).
- The user-facing syntax doc covers any new keys or syntax.
- The agent-facing guide (skill/prompt) covers when to choose this renderer over alternatives.
- Downstream consumers are notified or auto-synced.

If any of these is missing, the renderer is **invisible** — even if the code is perfect.

---

## XI. Anti-patterns (the regression catalog)

Each of these has bitten real renderers; guard against them in review.

| Anti-pattern | Symptom | Fix principle |
|---|---|---|
| Hardcoded literal styling | Theme overrides ignored | Theme over style |
| Tooltip shows only label | Value/modifiers invisible | Visibility |
| Pre-baked directional glyphs | Wrong orientation on rotated edges | Direction-aware decoration |
| Lines painted on top of shapes | Edges occlude nodes | Z-order discipline |
| Centroid endpoints | Arrowheads vanish inside shapes | Endpoint clearance |
| Truncation without cue | User can't tell content was cut | Truncation cue |
| Parsed-but-not-rendered field | Silent feature loss | Affordance completeness |
| Hardcoded width | Long labels overflow | Content-driven sizing |
| Two semantic types share a renderer | Distinct intents render identically | Each claim is a contract |
| Font under legibility floor | Unreadable | Minimum legibility budget |
| Random / time-based output | Snapshots flap, caches miss | Determinism |
| Whitespace terminates structure | Grouping by blank lines breaks | Content-driven termination |
| New literal color in one renderer | Theme contract drift | Promote to semantic globally |
| Last-write-wins on repeatable key | Earlier values silently lost | Repeatable keys are lists |

---

## XII. Definition of Done

A renderer is mergeable when:

- [ ] Every input form in §III is handled (rendered or surfaced)
- [ ] Visibility contract holds — no silent drops, truncation always cued
- [ ] No literal styling — all visual properties from theme
- [ ] Output is deterministic for fixed input + theme
- [ ] Geometry primitives (z-order, endpoint clearance, decoration depth) correct
- [ ] Parser unchanged, or change is global and tested across all renderers
- [ ] Tests cover parse, render, visibility regression, theme regression, truncation regression
- [ ] Example, gallery entry, playground entry, syntax doc, agent guide all updated
- [ ] Downstream consumers synced

---

**Status:** abstract layer. Codebase-specific concrete checklists (file paths, helper names, build commands) live alongside the code they govern. When a principle here changes, concrete checklists must follow.
