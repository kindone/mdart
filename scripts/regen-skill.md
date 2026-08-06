# Meta-prompt: regenerate the MdArt skill

This is a Claude prompt. The recommended invocation is the npm script (run from the mdart repo root):

```bash
npm run regen:skill
```

That expands to `claude --permission-mode acceptEdits "$(cat scripts/regen-skill.md)"` — opens an interactive Claude session pre-loaded with this meta-prompt and pre-authorised to edit files. You can review each edit as Claude works.

Alternatively, paste the contents below into any Claude session. The prompt is self-contained and ends with the expected outputs.

---

## Goal

Update `packages/mdart/skills/mdart/SKILL.md` and `packages/mdart/skills/mdart/anti-patterns.md` so they accurately reflect the current state of the mdart codebase. Preserve hand-curated prose; only edit content where the underlying data has changed.

## Sources of truth

Read these files **before** editing the skill. Trust them over the existing skill's claims:

| Source | What it tells you |
|---|---|
| `packages/mdart/src/layouts/<family>/*.ts` | Authoritative type list. One file = one type. Excludes `shared.ts`. |
| `packages/mdart/src/parser.ts` | Current syntax: prefixes, attrs, front-matter keys, special chars. |
| `packages/mdart/src/renderer.ts` | Type → renderer map. Confirms which types are actually wired up. |
| `packages/mdart/examples/types/<type>.mdart` | Canonical example for each type. |
| `apps/playground/examples/types/<type>.mdart` | Same set, used by the Lab. Use whichever exists. |
| `docs/syntax.md` | Formal grammar reference, mirrors parser.ts. |
| `packages/mdart/package.json` | Current mdart version (for the footer). |

## Files to update

| Path | Always-loaded? | Contents |
|---|---|---|
| `packages/mdart/docs/mdart.md` | By consumers as the cross-agent reference | Complete type catalog (family cheat sheet + aliases + full listing), 10-rule selection guide, plot syntax, authoring rules, syntax reference, anti-patterns checklist, generation checklist |
| `packages/mdart/skills/mdart/SKILL.md` | Yes (Claude/agent skill) | Frontmatter, fence-form intro, pointer to `docs/mdart.md`, quick generation checklist, quick anti-pattern reminders, footer |
| `packages/mdart/skills/mdart/anti-patterns.md` | On demand | Full failure-mode catalog (7 categories) |

**Important:** `SKILL.md` is a **thin behavioral wrapper** (≤80 lines). All type catalog, selection guide, and authoring-rule content lives in `docs/mdart.md`. When new types are added or selection logic changes, update `docs/mdart.md` first; `SKILL.md` only needs updating if the generation checklist or quick anti-pattern reminders become stale.

## Process

### Step 1 — Enumerate current types and classify aliases

```bash
ls packages/mdart/src/layouts/*/  # or use the Glob tool
```

Build a `{family: [type, ...]}` map. Exclude `shared.ts`, any `*.test.ts`, and `index.ts`. Cross-check against `renderer.ts`'s import map — types must appear in both to be live.

Then for each layout file, classify it as one of:

| Class | Detection | Treatment in skill |
|---|---|---|
| **Distinct** | File contains a non-trivial `render()` implementation (>15 lines of SVG/markup logic). | List in §1 cheat sheet under its family with normal escalation triggers. |
| **Pure alias** | File body is `export { render } from './X'` OR a one-liner that calls another renderer with no extra parameters AND that target renderer does NOT branch on `spec.type` for this name. | List in the "Aliases" subsection at the end of §1 with its canonical host. Don't give it its own escalation trigger. |
| **Co-renderer variant** | File delegates to another renderer or shared utility, BUT either (a) the host branches on `spec.type` and produces visually different output, or (b) it passes a distinguishing parameter (e.g. `step-up` passes `true` to `renderStaircase`). | List in §1 normally — these are real choices, not aliases. |

Alias detection algorithm:
1. Read the layout file. Is it `< 10` lines and a pure delegation?
2. If yes, find the host (the imported renderer or shared util).
3. Read the host. Does it `grep spec.type` and branch on the name of *this* file?
4. If no branch and no parameter difference → **pure alias**. If branch or parameter → **co-renderer variant**.

As of mdart v0.2.x, the known pure aliases are:
- `bracket-tree` ≡ `bracket`
- `gantt-lite` ≡ `gantt`
- `snake-process` ≡ `bending-process`
- `counterbalance` ≡ `balance`

If the regenerator finds a different alias set, update the SKILL.md alias table accordingly.

### Step 2 — Diff against current docs/mdart.md

Read the current `packages/mdart/docs/mdart.md`. Extract type names mentioned in the Family Cheat Sheet and Complete Type Listing. Compute:
- **New types** — present in `layouts/` but not in current `docs/mdart.md`.
- **Removed types** — mentioned in current `docs/mdart.md` but no longer in `layouts/`.
- **Unchanged types** — in both. Do not touch their references unless renaming a sibling forces a row rewrite.

### Step 3 — Classify new types

For each new type:

1. Read `layouts/<family>/<type>.ts`. Note: what does it render? What syntax does it expect (item.label/value/children/flowChildren/attrs)? What makes it visually or semantically distinct from other types in the family?
2. Read its canonical example.
3. Decide:
   - Which Family Cheat Sheet row does it belong to? (Same family, slot it into the "Escalate when…" list.)
   - Does it match an existing Selection Guide rule, or warrant a new sub-bullet under one of the 10 rules?
   - Does it suggest a new anti-pattern (item-count limit, easy confusion with sibling, metaphor trap)?
4. **Default behaviour**: extend existing rules rather than adding new top-level rules. Only add a numbered Selection Guide rule if a genuinely new *intent bucket* emerged (rare).

### Step 4 — Strip removed types

For each removed type, delete its mention from §1 and §2. If removing leaves an empty rule, delete the rule.

### Step 5 — Sanity-check syntax claims

The current SKILL.md and anti-patterns.md make claims about:
- `→` / `->` aliasing
- Soft syntax exchangeability between `-` and `→`
- SWOT / pros-cons header word matching
- Indent unit auto-detection
- `key: value` requirement for statistical numeric types
- `[attr]` modifier syntax

Re-read `parser.ts` and the relevant renderer files. If any claim is now stale, update — but only the specific claim, not surrounding prose.

### Step 6 — Update version footer

In `SKILL.md` and `docs/mdart.md`, update the version footer to:

```
*Version: derived from mdart v<VERSION> · `docs/mdart.md` is the canonical cross-agent reference · regenerate via `scripts/regen-skill.md`.*
```

Use the `version` field from `packages/mdart/package.json`.

## Constraints

1. **Do not invent types.** Only list types found in `layouts/<family>/*.ts` and confirmed in `renderer.ts`.
2. **Preserve curated prose.** Selection Guide numbered-rule wording, anti-pattern mechanism descriptions, and the family cheat-sheet column headers stay the same unless data changes force an edit.
3. **Family-first ordering.** The Family Cheat Sheet and Complete Type Listing always list families in the same order: process, list, cycle, matrix, hierarchy, pyramid, relationship, statistical, planning, technical, plot.
4. **`SKILL.md` length ≤ 80 lines.** It is a thin behavioral wrapper — no type catalog, no selection rules, no plot syntax. All reference content goes in `docs/mdart.md`.
5. **`docs/mdart.md` is the content document.** Update it when types are added/removed or selection logic changes.
6. **Validate counts.** Number of distinct types in the Complete Type Listing (excluding the Aliases section) plus the alias count must equal `find packages/mdart/src/layouts/ -name '*.ts' ! -name 'shared.ts' ! -name '*.test.ts' ! -name 'index.ts' | wc -l`. The intro line "**N layout types across M families**" must use the verified counts.

## Output

After editing the files, instruct the user that consumers (steward, learn-crdt, etc.) will pick up the changes the next time they run their own `sync:mdart`-style script. The skill and docs are bundled into the mdart npm package via the `files` field, so re-installing mdart brings the new files into `node_modules/mdart/`. The consumer's sync script then copies:
- `node_modules/mdart/docs/mdart.md` → `docs/mdart.md` (comprehensive reference)
- `node_modules/mdart/skills/mdart/anti-patterns.md` → `.claude/skills/mdart/anti-patterns.md`

Consumers that maintain their own thin `SKILL.md` (like steward) do **not** have their `SKILL.md` overwritten — the sync script only copies `anti-patterns.md` and `docs/mdart.md`.

Then print a summary in this exact format:

```
## Regeneration summary

Generated against mdart v<VERSION> on <DATE>.

Added types (N):
- <family>/<type>: <one-line classification rationale>
…

Removed types (N):
- <family>/<type>
…

Prose edits:
- <file> → <section>: <one-line description of what changed and why>
…

Aliases (pure delegation, no spec.type branch):
- <alias> ≡ <host>
…

Validation:
- Total type names: <N> (matches layouts/ count: <yes|no>)
- Distinct renderers: <M> (= total - alias count: <yes|no>)
- SKILL.md line count: <N> (≤80: <yes|no>)
- docs/mdart.md line count: <N>
- All Family Cheat Sheet escalation triggers reference live types: <yes|no>
- Alias section in docs/mdart.md matches detected aliases: <yes|no>
```

If the validation row says "no" anywhere, do not consider the regeneration complete — fix the discrepancy first.

## What NOT to do

- Don't rewrite the Selection Guide from scratch. The 10 intent-buckets are stable across mdart versions.
- Don't reorder anti-pattern categories in `anti-patterns.md`. The 7 mechanisms are stable.
- Don't add type catalog content to `SKILL.md` — it belongs in `docs/mdart.md`. SKILL.md is a thin wrapper only.
- Don't change the skill `description:` frontmatter unless a major new diagram class appeared (e.g. an entirely new family). The description controls when the harness loads the skill.
- Don't add explanatory prose for unchanged types — the existing wording was tuned.
- Don't include SVG examples or rendered output. The files are text-only reference.
