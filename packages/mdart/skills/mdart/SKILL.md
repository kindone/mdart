---
name: mdart
description: Generate MdArt diagrams from structured intent — pick the right diagram type from 101+ layouts (process, list, hierarchy, comparison, cycle, matrix, pyramid, relationship, statistical, planning, technical) and produce valid syntax. Use when the user asks for a diagram, chart, flowchart, mind map, comparison, org chart, timeline, kanban board, swot analysis, sequence diagram, state machine, gantt, funnel, sankey, treemap, or any visual representation of structured information. Also use when generating ```mdart fenced blocks. Prefer mermaid only for complex conditional flow charts.
---

# MdArt diagram generation

Produce MdArt fenced code blocks that pick the *right* diagram type for the user's intent. Optimise for **selection judgment**, not just syntactically valid output. Defaulting to `process` or `bullet-list` for everything is the most common failure.

**Fence form:**
````
```mdart <type>
- Item
```
````
Or with front-matter:
````
```mdart
type: <type>
title: <optional>
theme: <optional named theme>
- Item
```
````

For full grammar: see `packages/mdart/docs/syntax.md` in the mdart repo.

For deep anti-pattern catalog: read `anti-patterns.md` in this skill directory before committing to a non-default type.

---

## §1 — Family cheat sheet

Ten families. **101 type names**, of which **97 are distinct renderers** — 4 are pure aliases kept for backward compatibility (see "Aliases" at the bottom of this section). **Pick the family first**; escalate from the default to a specialised type only when a trigger is met.

| Family | Default | Escalate when … |
|---|---|---|
| **Process** (sequential) | `process` | dates → `timeline-h` · narrowing → `funnel` · parallel actors → `swimlane` · phases → `phase-process` · long sequence wraps → `snake-process` · returns to start → `cycle` · branches by condition → `decision-tree` |
| **List** (no order) | `bullet-list` | with status checkbox → `checklist` · with progress % → `progress-list` · equal-weight cards → `card-list` · paired pros/cons → `two-column-list` · with emoji → `icon-list` · numbered → `numbered-list` |
| **Cycle** (recurring) | `cycle` | mechanical metaphor → `gear-cycle` · expanding spiral → `spiral` · no inherent direction → `nondirectional-cycle` · single feedback loop → `loop` |
| **Matrix** (compare/classify) | `comparison` | exactly 2 things, +/- → `pros-cons` · 2 axes → `matrix-2x2` · market share → `bcg` · growth strategy → `ansoff` · 4 SWOT quadrants → `swot` · N×M grid → `matrix-nxm` |
| **Hierarchy** (parent → child) | `tree` | reporting line → `org-chart` (vertical) or `h-org-chart` (horizontal) · ideation → `mind-map` · branching choice → `decision-tree` · web pages → `sitemap` · tournament → `bracket` · text outline → `hierarchy-list` |
| **Pyramid** (stacked tiers) | `pyramid` | inverted → `inverted-pyramid` · with body text → `pyramid-list` · diamond → `diamond-pyramid` · separated bands → `segmented-pyramid` |
| **Relationship** (sets, overlap, balance) | `venn` | 3 circles → `venn-3` · 4 circles → `venn-4` · concentric rings → `concentric` · weighted scale → `balance` · opposing forces → `opposing-arrows` · many↔one → `converging` / `diverging` · interconnected mesh → `web` · grouped buckets → `cluster` |
| **Statistical** (data viz) | `progress-list` | composite KPI → `bullet-chart` · multi-metric → `scorecard` · area=quantity → `treemap` · flows with volumes → `sankey` · share of 100 → `waffle` · single dial → `gauge` · multi-axis profile → `radar` · 2-D matrix of values → `heatmap` |
| **Planning** (project/time) | `gantt-lite` | full board → `kanban` · sprint → `sprint-board` · pure schedule → `gantt` · milestone list → `milestone` · work breakdown → `wbs` · chronological log → `timeline` |
| **Technical** (system) | `network` | tiered system → `layered-arch` · DB schema → `entity` · message flow → `sequence` · state transitions → `state-machine` · OOP class → `class` · build/CI stages → `pipeline` |

### Aliases

Four type names render identically to a canonical host (the alias just gives a more semantically suggestive name). Either form works — prefer the alias when it better signals intent to a human reader.

| Alias | Canonical | When to prefer the alias |
|---|---|---|
| `bracket-tree` | `bracket` | when the data is a tree-of-matches rather than a single bracket |
| `gantt-lite` | `gantt` | when input uses `[wk1-wk3]` shorthand instead of explicit dates |
| `snake-process` | `bending-process` | when the metaphor is "snaking back and forth" |
| `counterbalance` | `balance` | when the two sides actively oppose rather than just weigh against each other |

A second class of types **share renderer code** but produce visually distinct output via `spec.type` branching or parameters. These are not aliases — they're real choices:

- `venn-3` / `venn-4` (auto-routed inside `venn` by item count)
- `tree` vs `org-chart` (different vertical spacing)
- `inverted-pyramid` vs `pyramid` (inversion)
- `step-up` vs `step-down` (direction)

---

## §2 — Selection decision tree

Apply rules **in order**. The first match wins.

### 1. Quantitative data attached?
If the user supplies numbers paired with labels (counts, %, $, scores, durations):
- Simple bars → `progress-list` or `bullet-chart`
- Composite KPI with target line → `bullet-chart`
- Many KPIs together → `scorecard`
- Sizes form a treemap → `treemap`
- Flows between nodes with volumes → `sankey`
- Single value on a dial → `gauge`
- Multi-axis profile (skill spider) → `radar`
- 2-D matrix of values → `heatmap`
- Share of a whole, ≤100 cells → `waffle`

**Do not** use `bullet-list` or `process` for quantitative data — the statistical family makes the numbers visible.

### 2. Comparison of 2+ named things?
If the user says "compare", "vs", "differences between", "tradeoffs":
- 2 items, additive vs subtractive view → `pros-cons`
- 2+ items, multiple attributes → `comparison`
- 2 axes (impact × effort, importance × urgency) → `matrix-2x2`
- Market share quadrant (stars/cash cows) → `bcg`
- Growth strategy quadrant → `ansoff`
- N×M grid (skills × people, features × tiers) → `matrix-nxm`
- 4 SWOT categories → `swot`

**Do not** dump comparison data into `bullet-list` — the side-by-side structure is the whole point.

### 3. Edges / arrows between named entities?
If items reference each other ("A sends to B", "X depends on Y"):
- Tree topology (one root, branches) → `tree` or `org-chart`
- Branching choice → `decision-tree`
- General graph / mesh → `network` (use `nodes:` / `edges:` sections)
- Time-ordered messages between actors → `sequence`
- States and transitions → `state-machine`
- Build/CI stages with dependencies → `pipeline`
- Single feedback loop → `loop`
- Many → one or one → many → `converging` / `diverging`

**Do not** flatten an edge graph into `bullet-list`. The arrows carry meaning.

### 4. Temporal axis with dates / weeks / phases?
- Project tasks with start/end → `gantt` or `gantt-lite`
- Milestones only → `milestone`
- Chronological log of past events → `timeline` or `timeline-list`
- Roadmap of future work → `roadmap`
- Phases without precise dates → `phase-process`
- Horizontal timeline of items → `timeline-h`
- Vertical timeline → `timeline-v`

**Do not** use bare `process` when dates are provided.

### 5. Hierarchy / containment?
- Reporting / org structure → `org-chart` or `h-org-chart`
- Conceptual taxonomy → `tree`
- Brainstorm spreading from a centre → `mind-map`
- Site/IA structure → `sitemap`
- Plain indented outline → `hierarchy-list`
- Project work breakdown → `wbs`
- Tournament → `bracket`

**Do not** use `pyramid` for hierarchy — pyramid is a quantitative metaphor (foundation supports apex).

### 6. Sequential steps with order?
- Equal-weight steps → `process`
- Each step narrows / filters → `funnel`
- Steps are explicit phases → `phase-process`
- 7+ steps that need to wrap → `snake-process` or `bending-process`
- Steps escalate or decline → `step-up` / `step-down`
- Branching on condition → `decision-tree` or `state-machine`
- Steps run in parallel lanes → `swimlane`
- Returns to start → `cycle` (or `loop` for feedback)

### 7. Containment / set overlap?
- 2–4 overlapping sets → `venn`, `venn-3`, `venn-4`
- Nested rings (broader → narrower scope) → `concentric`
- Concentric rings centred on a goal → `target`
- Spokes around a hub → `radial`
- Grouped buckets without overlap → `cluster`

### 8. Balance / opposition?
- Two-sided weighing → `balance`
- Two opposing weighted forces → `counterbalance`
- Two forces meeting in the middle → `opposing-arrows`

### 9. Quantitative tiers (foundation → apex)?
- Largest at base → `pyramid`
- Largest at top → `inverted-pyramid`
- With body text per layer → `pyramid-list`
- Diamond shape (peak in middle) → `diamond-pyramid`
- Stratified blocks → `segmented-pyramid`

### 10. Default fallback
- Flat list of nouns → `bullet-list`
- Flat list of verbs/actions → `process`
- Items with status → `checklist`

If your pick feels generic, walk back up rules 1–5 to check for a domain-specific type that preserves more of the user's information.

---

## §3 — Node text density: keep labels short, split big diagrams

MdArt nodes are **fixed-size shapes**, not paragraphs. Long labels overflow,
get truncated, force tiny fonts, or wrap awkwardly. The diagram becomes
unreadable long before the data becomes complete.

**Rule of thumb per node:**

| Node kind | Target | Hard ceiling |
|---|---|---|
| Process step / cycle phase / pyramid tier | 1–3 words | ~24 chars |
| Tree / org-chart / mind-map node | 1–4 words | ~28 chars |
| SWOT / pros-cons / matrix-2x2 cell | short phrase, ≤ ~6 words | ~50 chars |
| `card-list` / `pyramid-list` body | 1 short sentence | ~80 chars |
| `kanban` / `sprint-board` card | task title only, no description | ~40 chars |
| Sequence / state-machine label | verb phrase or event name | ~24 chars |
| Comparison / matrix-nxm cell | a value, not a sentence | ~30 chars |

**Compression techniques** (apply before emitting the fence):

- Drop articles (a/an/the) and filler verbs (is, are, has, can).
- Use noun phrases over full sentences: "User auth" not "The user authenticates with the system".
- Replace clauses with abbreviations where unambiguous: "Q3 launch" not "Launch in the third quarter".
- Move detail into the front-matter `title:` or a paragraph **outside** the fence — never cram it inside a node.
- For values: prefer `Name: 75%` over `Name (currently at 75%)`.
- Domain jargon is fine if the audience knows it (`PR review`, `OAuth`, `CDN`).

**When to split into multiple diagrams:**

A single diagram should convey **one idea**. Split when any of these hold:

- More than ~12 leaf nodes in a flat layout (process, list, cycle, comparison).
- More than ~20 nodes in a hierarchy / network / mind-map.
- Two or more clearly distinct concepts the user mentioned (e.g. "show our
  architecture and our deploy pipeline" → two fences, not one).
- Different appropriate types for different sub-parts (e.g. high-level
  `process` + per-step `swimlane` detail).
- A node would need a child diagram of its own to explain it — make that the
  second fence.

When splitting, give each fence a clear `title:` so the relationship between
them is explicit ("Architecture · overview" + "Architecture · auth flow").
Prefer 2–3 focused diagrams over one overstuffed one.

If after splitting and compressing the labels still don't fit, the right
answer is often **prose plus a small diagram**, not a bigger diagram.

---

## Quick anti-pattern reminders

Before emitting a diagram, sanity-check:

- **Picking by keyword match** — if the user said "timeline", that doesn't mean `timeline` (could be `timeline-list`, `gantt-lite`, or `roadmap`). Match data structure, not vocabulary.
- **Defaulting to generic types** — `process` for unordered items, `bullet-list` for comparisons, `tree` for processes are the top three failures.
- **Wrong family** — `pyramid` ≠ hierarchy; `cycle` ≠ recurring task; `network` ≠ hierarchy.
- **Verbose node labels** — sentences inside shapes overflow or shrink the font. Compress to noun phrases (§3).
- **Single overstuffed diagram** — if you'd need >12 flat nodes or >20 tree nodes, split into multiple fences (§3).
- **Syntax traps** — in `sequence` / `state-machine` / `network`, always use `→ Target: message`, never `- Target` (parses as edge but reads as containment). SWOT/pros-cons headings must be exact words (`Strengths`, `Pros`, etc.) or use the explicit `[strengths]` / `[pros]` attr.

For the full anti-pattern catalog with 7 categories of failure modes, **read `anti-patterns.md` in this skill directory**.

---

## Generation checklist

Before emitting a `mdart` fence:

1. Walk §2 top-to-bottom. First match wins.
2. Cross-check §1 — does the family default fit?
3. Apply §3 — are any labels too long? Is the diagram too dense to read? Compress or split.
4. Skim `anti-patterns.md` — am I about to make a known mistake?
5. Choose `theme:` only if the user requested a specific look. Otherwise omit.
6. Add `title:` only when it adds context the labels alone don't carry.

---

<sub>Skill version: derived from mdart v0.2.1 (2026-05-02). Regenerate via `scripts/regen-skill.md` in the mdart repo when its `layouts/` changes; consumers re-fetch via their own sync script.</sub>
