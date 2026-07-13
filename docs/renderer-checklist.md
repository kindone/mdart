# MdArt Renderer Implementation Checklist

> Living document — every renderer in `packages/mdart/src/layouts/` should pass this checklist before merge. Items marked **(must)** block the build; **(should)** are strong defaults; **(consider)** are case-by-case.

---

## 0. Before you start

- **(must)** Decide: does this fit an existing family, or is it a new family?
  - New type in existing family → one file in `layouts/<family>/<type>.ts` + one import + one entry in `renderer.ts`'s map
  - New family → new dir, new `<family>/shared.ts` if needed, new family entry in skill `§1` decision rule
- **(must)** Confirm there isn't already a renderer that would handle this with different front-matter. Don't fork — extend.
- **(should)** Sketch the diagram on paper / sandbox HTML before opening the file. Iterating in code is 10× slower than iterating in a sandbox.
- **(consider)** Pick the closest existing renderer as a starting template; copy and prune.

---

## 1. Parser & spec affordances

Parser changes affect **all** renderers — be conservative. Most new renderers should need zero parser changes.

- **(must)** No silent drops at the parser layer. If the syntax accepts a key, the spec must surface it (typed field, attr, or `raw`).
- **(must)** New top-level front-matter keys go through `parser.ts` and are typed in the `MdArtSpec` interface. Don't stuff things into `attrs`.
- **(must)** Boolean front-matter accepts `true|false|yes|no|on|off` via `asBool()`. Don't roll your own truthy check.
- **(should)** Multi-line keys (e.g. `ref-y:`, `shade-x:`) push into an array; document repeatability in `docs/syntax.md`.
- **(should)** Aliases for ergonomic alternatives (`label-x` ↔ `x-label`, `lw` ↔ `line-width`) — pick a canonical name and accept the rest.
- **(should)** Soft syntax exchangeability: a `-` child and a `→` child should both be queryable from `item.children` and `item.flowChildren`. The renderer chooses which list to walk.
- **(must)** Front-matter ends at the first body-char line, **not** at a blank line. Users group keys with whitespace.
- **(must)** YAML-strict colon split: paren-, quote-, digit-, whitespace-aware. `\:` is the literal-colon escape.
- **(consider)** Typed `value` via colon: `Label: 75`, `Label: 75%`, `Label: Q3`. Numeric mode auto-detected; freeform stored as string.

---

## 2. Visibility — the **No Silent Drops** principle

Every datum the user wrote must be **visible somewhere** in the output.

- **(must)** Every shape that represents an item embeds `<title>` with the full `Label: value [attrs]` summary. Use `itemTitleTag(item)` from `shared.ts`. **Never** `<title>${escapeXml(label)}</title>` directly.
- **(must)** Truncated labels render with a trailing `…` cue so the user knows there's more in the tooltip. Use `displayLabel(item, maxChars)`.
- **(must)** A renderer that doesn't yet support a parsed feature (children, value, attrs) must **not** drop them silently. Either:
  1. Render them inline (preferred), or
  2. Surface them in the tooltip via `itemSummary()`, or
  3. Add a TODO and a visible "+N more" indicator
- **(must)** If a label can wrap, use `wrapLabel(label, perLine, maxLines)` from `layouts/shared.ts`. Don't truncate mid-word.
- **(should)** Front-matter `title:` always renders if present.
- **(should)** Empty/zero-item specs render a small "empty" placeholder, not a blank SVG.
- **(should)** Validate the spec before drawing — if it's malformed (e.g. comparison without rows), render a visible error message in the SVG, not nothing.
- **(consider)** A "+N more" hint when the renderer caps visible items (e.g. radial with >12 spokes).

---

## 3. Theme & color

- **(must)** Zero hardcoded hex in renderer files. Every color comes from `theme.*`:
  - `bg`, `surface`, `border`, `text`, `textMuted`
  - `accent`, `secondary`
  - `danger`, `warning`
  - `palette: string[]` for series cycling
- **(must)** Per-fence overrides merge **after** category default and global config. Priority: category default → global → plugin → per-fence.
- **(should)** When mixing categorical colors, cycle `theme.palette` deterministically by index.
- **(should)** Status colors map to semantic theme keys: `[done]` → `accent`, `[blocked]` → `danger`, `[at-risk]` → `warning`.
- **(consider)** If you need a new semantic color, add it to `MdArtTheme` and **all** named themes — don't introduce a one-off.

---

## 4. Layout & geometry

- **(must)** Width is computed from content (longest wrapped label + padding), not hardcoded.
- **(must)** Z-order: shaded regions → grid/lines → shapes → labels → arrowheads. Build the SVG string in this order.
- **(must)** Arrowheads via `<marker>` with `orient="auto"`. Never L-shaped polylines.
- **(must)** Endpoint clearance — when a line lands on a shape, terminate at the shape edge, not the centroid. Use the per-endpoint angular clearance pattern from `circular-process.ts`:
  ```
  margin = (BOX_W/2·|sin θ| + BOX_H/2·|cos θ|) / R + ε
  ```
- **(must)** Reserve space for marker depth in the line endpoint computation (otherwise the head overshoots the target).
- **(should)** Numeric values rendered with `formatNum()` — locale-aware, no JS `toLocaleString` (non-deterministic across runtimes).
- **(should)** Mobile-friendly: minimum readable font ≥ 10px; minimum tap target ≥ 24px equivalent.
- **(consider)** Dynamic padding for leaf-only diagrams (see `tree`).

---

## 5. Syntax affordances every renderer should accept

When a renderer claims a type, it must gracefully handle each of these forms — by rendering them, surfacing them in tooltips, or both:

| Form | Example | Expectation |
|---|---|---|
| Plain item | `- Step 1` | Renders shape with label |
| Typed value | `- Step 1: 75%` | Value shown next to or inside label |
| Attributes | `- Step 1 [done]` | Attribute drives visual variant; tooltip lists all attrs |
| Combined | `- Step 1: 75% [done]` | All three visible |
| Containment children | `- Parent` then `  - Child` | Children rendered nested (or split per family rules) |
| Flow children | `- Source` then `  → Target` | Flow rendered as edge |
| Mixed | both `-` and `→` children | Both surfaced |
| `->` alias | `A -> B -> C` | Normalized to `→` at parse time |
| `*` bullet | `* Step 1` | Treated identically to `- Step 1` |
| Empty body | front-matter only | Empty placeholder, not crash |
| 1 item | `- Solo` | Renders sensibly (don't divide by zero) |
| Many items | 50+ | Either renders, or shows "split this fence" hint |

**(must)** Attribute slot is `[bracketed, comma, list]` — multiple attrs allowed; order doesn't matter; whitespace tolerated.

**(should)** Negative space (blank lines between items) is ignored — they don't become items, but they don't terminate the body either.

---

## 6. Sizing & overflow rules (label density)

- **(must)** Per-node-kind length budgets enforced in skill / agent guidance, not in the renderer (renderer is permissive). But the renderer **must** wrap or truncate gracefully — never overflow a shape.
- **(should)** Wrap, don't shrink — uniform font size beats variable.
- **(should)** Document the recommended budget for the renderer in its `examples/types/<type>.mdart` file (1–3 words for process steps, ≤6 words for SWOT cells, etc.).
- **(consider)** If wrapping would exceed `maxLines`, render the truncated form with `…` and put the full label in `<title>`.

---

## 7. Tests

Add to `packages/mdart/src/`. The test suite runs in CI; no exceptions.

- **(must)** Parser test: front-matter keys, value, attrs, children all populate the spec correctly.
- **(must)** Render test: SVG contains expected key strings (shape tag, label text, theme color).
- **(must)** Tooltip test: every visible shape has a `<title>` with the full label/value/attrs (regression-protect the no-silent-drops principle).
- **(should)** Theme test: rendering with `theme: dark` produces dark theme colors; per-fence override beats global.
- **(should)** Empty + single-item edge cases.
- **(should)** Truncation: long label produces `…` cue + full text in title.
- **(consider)** Snapshot test for the SVG (sparingly — they break on every layout tweak).

Run: `npm test --workspace=packages/mdart` from `~/mdart`. All tests must pass before commit.

---

## 8. Documentation

- **(must)** Add a fence to `apps/playground/examples/types/<type>.mdart` with a representative diagram.
- **(must)** Add an entry to `docs/gallery.md` (auto-regenerated by `npm run gen-gallery`).
- **(must)** Add to `apps/playground/demo.html` `families.<family>` array + `<optgroup>` so the lab dropdown surfaces it.
- **(should)** Update `docs/syntax.md` if the type introduces new syntax.
- **(should)** Update `packages/mdart/skills/mdart/SKILL.md` if there's a new decision rule (when to pick this type over an existing one).
- **(should)** Re-sync into steward: `cd ~/claude-steward && npm run sync:mdart` (or manually copy `dist/` + `src/` into `node_modules/mdart/`).
- **(consider)** README example if the type is generally useful (not every renderer needs README real estate).

---

## 9. Anti-patterns to refuse

These have all bitten us — guard against them in review.

| Anti-pattern | Symptom | Fix |
|---|---|---|
| Hardcoded `#hex` | Theme overrides ignored | Use `theme.*` |
| `<title>${label}</title>` | Tooltip misses value/attrs | Use `itemTitleTag(item)` |
| L-shaped arrow polylines | Doesn't rotate, looks wrong at angles | `<marker orient="auto">` |
| Lines drawn after shapes | Edges visible on top of nodes | Reorder z |
| Center-to-center edges | Arrowhead vanishes inside the target shape | Endpoint clearance |
| Truncated label, no `…` | User can't tell content was cut | `displayLabel()` |
| Silent feature drop | Children/value/attrs parsed but not shown anywhere | Inline render or tooltip |
| Width hardcoded | Long labels overflow | Compute from content |
| Two layouts share renderer | Distinct types fall through to same default | Dedicated file per type |
| Font < 10px | Unreadable on mobile | Minimum 10px |
| Random/non-deterministic positions | Snapshot tests flap | Seeded layout or pure geometry |
| `* item` treated as milestone | Wrong semantics outside gantt | `*` is a generic bullet; milestones use `[wkN*]` |
| Blank line ends front-matter | Later keys land in legend | Allow blanks; terminate on body char |

---

## 10. Definition of Done

A new renderer is mergeable when:

- [ ] Parser changes (if any) are typed and tested
- [ ] No hardcoded colors — only `theme.*`
- [ ] Tooltips on every visible item via `itemTitleTag()`
- [ ] Wrapped labels via `wrapLabel()`; truncations show `…`
- [ ] All syntax forms in §5 handled gracefully
- [ ] Z-order, arrowheads, endpoint clearance correct
- [ ] Tests added; full suite passes
- [ ] Example in `examples/types/`, gallery entry, demo dropdown
- [ ] `docs/syntax.md` and SKILL.md updated if user-facing
- [ ] Steward synced; client + server rebuilt
- [ ] Hard-refresh in browser confirms new type renders end-to-end

---

## Appendix: shared helpers cheat-sheet

From `layouts/shared.ts`:

```ts
displayLabel(item, maxChars)      // truncated with … cue
itemSummary(item)                 // "Label: value [attrs]" string
itemTitleTag(item)                // <title>...</title> ready to inject
tt(color, label, item?)           // multi-purpose tooltip-text helper
wrapLabel(label, perLine, maxLines)
formatNum(n)                      // deterministic locale-free
escapeXml(s)
```

From `layouts/<family>/shared.ts`:

family-specific geometry (see e.g. `hierarchy/shared.ts` for tree layout).
