# Meta-prompt: regenerate the MdArt skill

This is a Claude prompt. Run it from the mdart repo root with:

```bash
claude -p "$(cat skills/regen-skill.md)"
```

Or paste it into a Claude session. The prompt is self-contained and ends with the expected outputs.

---

## Goal

Update `skills/mdart/SKILL.md` and `skills/mdart/anti-patterns.md` so they accurately reflect the current state of the mdart codebase. Preserve hand-curated prose; only edit content where the underlying data has changed.

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
| `skills/mdart/SKILL.md` | Yes | Frontmatter, intro, §1 family cheat sheet, §2 decision tree, brief anti-pattern reminders, footer |
| `skills/mdart/anti-patterns.md` | On demand | Full §5: 7 categories of failure modes |

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

### Step 2 — Diff against current SKILL.md

Read the current `skills/mdart/SKILL.md`. Extract type names mentioned in §1 and §2. Compute:
- **New types** — present in `layouts/` but not in current SKILL.md.
- **Removed types** — mentioned in current SKILL.md but no longer in `layouts/`.
- **Unchanged types** — in both. Do not touch their references unless renaming a sibling forces a §1 row rewrite.

### Step 3 — Classify new types

For each new type:

1. Read `layouts/<family>/<type>.ts`. Note: what does it render? What syntax does it expect (item.label/value/children/flowChildren/attrs)? What makes it visually or semantically distinct from other types in the family?
2. Read its canonical example.
3. Decide:
   - Which §1 row does it belong to? (Same family, slot it into the "escalate when …" list.)
   - Does it match an existing rule in §2, or does it warrant a new sub-bullet under one of the 10 numbered rules?
   - Does it suggest a new anti-pattern (item-count limit, easy confusion with sibling, metaphor trap)?
4. **Default behaviour**: extend existing rules rather than adding new top-level rules. Only add a numbered §2 rule if a genuinely new *intent bucket* emerged (rare).

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

In `SKILL.md`, replace the trailing `<sub>` line with:

```
<sub>Skill version: derived from mdart v<VERSION> (<YYYY-MM-DD>). Regenerate via `skills/regen-skill.md` when mdart layouts/ changes.</sub>
```

Use the `version` field from `packages/mdart/package.json` and today's date.

## Constraints

1. **Do not invent types.** Only list types found in `layouts/<family>/*.ts` and confirmed in `renderer.ts`.
2. **Preserve curated prose.** §2 numbered-rule wording, §5 mechanism descriptions, and the family cheat-sheet column headers stay the same unless data changes force an edit.
3. **Family-first ordering.** §1 always lists families in the same order: process, list, cycle, matrix, hierarchy, pyramid, relationship, statistical, planning, technical.
4. **Total `SKILL.md` length ≤ 250 lines.** If new content pushes past, push detail into `anti-patterns.md` or a new sibling file.
5. **Validate counts.** Number of distinct types in §1 cheat sheet (excluding the Aliases subsection) plus the alias count must equal `find packages/mdart/src/layouts/ -name '*.ts' ! -name 'shared.ts' ! -name '*.test.ts' ! -name 'index.ts' | wc -l`. The cheat-sheet intro line "**N type names**, of which **M are distinct renderers**" must use the verified counts.

## Output

After editing the two skill files, instruct the user to run `npm run install:skill` (or include it as the final step if running unattended) so the updated content is copied to all configured destination directories.

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
- §<N>.<sub>: <one-line description of what changed and why>
…

Aliases (pure delegation, no spec.type branch):
- <alias> ≡ <host>
…

Validation:
- Total type names: <N> (matches layouts/ count: <yes|no>)
- Distinct renderers: <M> (= total - alias count: <yes|no>)
- SKILL.md line count: <N> (≤250: <yes|no>)
- All §1 escalation triggers reference live types: <yes|no>
- Alias subsection in SKILL.md matches detected aliases: <yes|no>
```

If the validation row says "no" anywhere, do not consider the regeneration complete — fix the discrepancy first.

## What NOT to do

- Don't rewrite §2 from scratch. The 10 intent-buckets are stable across mdart versions.
- Don't reorder anti-pattern categories in `anti-patterns.md`. The 7 mechanisms are stable.
- Don't change the skill `description:` frontmatter unless a major new diagram class appeared (e.g. an entirely new family). The description controls when the harness loads the skill.
- Don't add explanatory prose for unchanged types — the existing wording was tuned.
- Don't include SVG examples or rendered output. The skill is text-only reference.
