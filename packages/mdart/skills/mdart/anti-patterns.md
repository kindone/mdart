# MdArt anti-patterns

Real failure modes seen when LLMs generate MdArt. Organised by **mechanism of mistake**, not by type — patterns transfer across the catalog.

Each entry: short trigger you can self-check against, then the fix.

---

## 1. Defaulting to generic types

The most frequent failure. When uncertain, the model picks the broadest possible type. Almost always there's a more semantic option.

- **`process` for unordered items.** `process` implies sequential order with arrows. A list of features, principles, or qualities is not a process. → `bullet-list`, `block-list`, or `card-list`.
- **`bullet-list` for comparisons.** If two or more items share parallel attributes (speed, cost, scale), the structure is `comparison` or `matrix-nxm`. The columns are the whole point.
- **`tree` for ordered processes.** Trees show containment, not flow. If steps proceed in order, use `process` (or `decision-tree` if branching).
- **`mind-map` for organised data.** `mind-map` connotes free-form ideation. If the structure is well-defined, use `tree` or `hierarchy-list`.
- **`bullet-list` for status reports.** If items have a state (todo/doing/done) → `checklist` or `kanban`.

---

## 2. Picking by keyword match

The user's vocabulary is a hint, not a directive. Match the *data structure*, not the words.

- **"timeline"** can mean three different things:
  - Chronological log of events → `timeline` or `timeline-list`
  - Project tasks with dates → `gantt-lite`
  - Future-facing plan → `roadmap`
- **"tree"** can mean:
  - Conceptual taxonomy → `tree`
  - Reporting line → `org-chart`
  - Branching choice → `decision-tree`
  - Web pages → `sitemap`
  - Tournament → `bracket`
  - Text outline → `hierarchy-list`
- **"list"** is almost never `bullet-list`:
  - With status → `checklist`
  - With progress numbers → `progress-list`
  - With icons/emoji → `icon-list`
  - Equal-weight cards → `card-list`
  - Numbered steps → `numbered-list`
- **"process"** can mean:
  - Equal-weight steps → `process`
  - Narrowing → `funnel`
  - Parallel actors → `swimlane`
  - With dates → `timeline-h` or `roadmap`
  - With phases → `phase-process`

---

## 3. Wrong family

Easy to confuse families when types overlap visually.

- **`pyramid` ≠ hierarchy.** Pyramid is about quantitative stacking (Maslow's hierarchy of needs, food pyramid). For org / parent-child structure, use the hierarchy family.
- **`cycle` ≠ recurring task.** Cycle implies the *output* feeds back into the *input*. A weekly stand-up that just repeats is `process`, not `cycle`. Reserve `cycle` for true feedback loops.
- **`network` ≠ ad-hoc tree.** If the structure is strictly hierarchical, use `tree` or `org-chart`. Reserve `network` for true graphs with multiple connections per node.
- **`comparison` for 2 items only.** Use `pros-cons` (advantages/disadvantages) or `opposing-arrows` (forces) — both more visually direct than a 2-column comparison table.
- **`class` for any data shape.** `class` is OOP-specific (members with visibility). For DB schemas → `entity`. For records with fields → `entity` or `card-list`.

---

## 4. Item count mismatches

Some types have implicit count constraints. Violating them produces awkward output.

- **Comparison with 1 column** is just a definition list — use `bullet-list`.
- **Funnel with 2 stages** is just two boxes — use `process` with two items.
- **Venn with 5+ sets** doesn't fit `venn-4`. Switch to `cluster` or `concentric`.
- **Process with 12+ steps** overflows the canvas. Use `snake-process` or `bending-process` (which auto-wrap).
- **Pyramid with 1 tier** is just a triangle — use `bullet-list`.
- **SWOT with only positive items** — use `bullet-list` or `pros-cons`. SWOT's value is the four-quadrant tension.
- **Matrix-nxm with 1 row** is a definition list — use `bullet-list`.

---

## 5. Ignoring richer metaphors

When the user uses metaphor language, lean into the corresponding type.

- **"funnel"**, **"conversion"**, **"drop-off"** → `funnel`, not `process`.
- **"swim lanes"**, **"parallel teams"**, **"by department"** → `swimlane`.
- **"4 quadrants"**, **"2x2"**, **"impact vs effort"** → `matrix-2x2`.
- **"architecture"**, **"layers"**, **"UI → API → DB"** → `layered-arch`, not `process`.
- **"state"**, **"transitions"**, **"when X happens"** → `state-machine`, not `process`.
- **"database schema"**, **"tables"**, **"foreign key"** → `entity`, not `class`.
- **"sequence diagram"**, **"actors", **"message flow"** → `sequence`.
- **"radar"**, **"profile"**, **"strengths chart"** → `radar`.
- **"sankey"**, **"flow volumes"** → `sankey`.
- **"stand-up"**, **"sprint board"**, **"in progress"** → `kanban` or `sprint-board`.

---

## 6. Syntax-level traps that lose information

Even a good type pick can produce a bad diagram if syntax is sloppy.

- **`-` children in `sequence` / `state-machine` / `network`.** These three types treat children as edges/messages. Soft exchangeability means `- Target` parses but reads as containment to a human editor. Always use `→ Target: message`.
- **Headings other than the canonical words in `swot` / `pros-cons`.** Headers are matched as exact words (case-insensitive): `Strengths` / `Weaknesses` / `Opportunities` / `Threats`, `Pros` / `Cons` (singular/plural variants OK). For domain-specific labels, use the explicit attr: `- Internal positives [strengths]`.
- **Inconsistent indent within one fence.** Pick one of 2-space, 4-space, or 1-tab and stay with it; the parser auto-detects the unit but cannot reconcile a mix.
- **Using `process` when arrow-chain shorthand fits.** `A → B → C` (one line) is cleaner than `- A` / `- B` / `- C`. Prefer it for short flat sequences.
- **Forgetting `→ Target` flow children when the type expects edges.** In `sankey`, edges are `→ Target (value)` flow children of the source. In `network` mesh mode, edges go in an explicit `edges:` section.
- **Numeric values without `key: value`.** For statistical types, `- Item: 75` is required — `- Item 75` won't parse the value. Same for `progress-list` percentages.
- **Front-matter values containing colons or arrows.** `direction: A → B` is a key-value (single item with arrow in value), not a chain. The parser handles it, but humans editing the source can find it confusing — prefer separating into multiple fields if possible.

---

## 7. When in doubt

If the choice still feels arbitrary after walking the decision tree:

1. State internally what the diagram is *for*: storytelling, comparison, planning, reference, persuasion.
2. Re-check §1 in `SKILL.md` — the family default for that intent is usually the correct answer.
3. If the default would discard information the user explicitly provided (numbers, dates, edges, parallel lanes, status), escalate to the specialised type that preserves it.
4. **Never pick a type just because its name appears in the user's prompt** — match the *structure* of the data, not the vocabulary.
5. If the data is genuinely shapeless and there's no semantic differentiator, `bullet-list` (for nouns) or `process` (for verbs) is fine. The mistake is escalating *too eagerly* to those when something better fits.
