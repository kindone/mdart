# MdArt — Reference

Markdown code-fence syntax that renders structured text into SVG diagrams.
Triggered by ` ```mdart ` fences in chat; also a dedicated artifact type in supporting tools.

**111 registered type names across 11 families** (10 of which are `shape:`
values under one consolidated `type: list` — see "Consolidated types" below).
Always declare the type — either inline
(` ```mdart process `) or in front matter (`type: process`). Do not emit a bare
` ```mdart ` fence: a standalone first line like `layered-arch` is parsed as
diagram *content*, not as the layout type.

---

## Type Catalog

### Family Cheat Sheet

Pick the **family** first; escalate to a specialist type only when a trigger is met.

| Family | Default | Escalate when… |
|---|---|---|
| **Process** (sequential) | `type: process` (default box layout) | dates → `timeline-h` · long event text → `timeline-v` / `timeline-list` · narrowing → `funnel` · parallel actors → `swimlane` · phases → `phase-process` · long sequence wraps → `shape: bending` · returns to start → `cycle` · branches → `decision-tree` |
| **List** (ordered / unordered facts) | `type: list` (`shape: bullet`, the default) | ordered with long text → `shape: circle` / `icon` · status checkbox → `checklist` · progress % → `progress-list` · equal-weight cards (max 4) → `card-deck` · pros/cons pair → `shape: two-column` · emoji → `shape: icon` · numbered → `shape: numbered` |
| **Cycle** (recurring) | `type: cycle` (`shape: segmented` recommended; omit for `default` ring) | mechanical metaphor → `gear-cycle` · expanding spiral → `shape: spiral` · no direction → `shape: orbit` · single feedback loop → `loop` |
| **Matrix** (compare / classify) | `comparison` | markdown table / generic fallback → `table` · 2 things +/- → `pros-cons` · 2 axes → `matrix-2x2` · market share → `bcg` · growth strategy → `ansoff` · 4 SWOT quadrants → `swot` · N×M grid → `matrix-nxm` |
| **Hierarchy** (parent → child) | `tree` | reporting line → `org-chart` / `h-org-chart` · ideation → `mind-map` · branching choice → `decision-tree` · web pages → `sitemap` · tournament → `bracket` · text outline → `hierarchy-list` |
| **Pyramid** (stacked tiers) | `type: pyramid` (default stack) | inverted → `shape: inverted` · body text per layer → `pyramid-list` · diamond → `shape: diamond` · separated bands → `shape: segmented` |
| **Relationship** (sets, overlap, balance) | `venn` | 3 circles → `venn-3` · 4 circles → `venn-4` · concentric rings → `concentric` · weighted scale → `balance` · opposing forces → `opposing-arrows` · many↔one → `converging` / `diverging` · mesh → `web` · grouped buckets → `cluster` |
| **Statistical** (data viz) | `progress-list` | composite KPI → `bullet-chart` · multi-metric → `scorecard` · area=quantity → `treemap` · flows with volumes → `sankey` · share of 100 → `waffle` · single dial → `gauge` · multi-axis → `radar` · 2-D value matrix → `heatmap` |
| **Planning** (project / time) | `gantt-lite` | full board → `kanban` · sprint → `sprint-board` · pure schedule → `gantt` · milestones only → `milestone` · work breakdown → `wbs` · chronological log → `timeline` |
| **Technical** (system) | `network` | tiered system → `layered-arch` · DB schema → `entity` · message flow → `sequence` · state transitions → `state-machine` · top-down flowchart with branches/loops → `flowchart` · OOP class → `class` · build/CI stages → `pipeline` |
| **Plot** (x-y data) | `line-chart` | discrete points → `scatter` · filled area → `area-chart` · grouped / stacked bars → `bar-chart` |

### Aliases

Four names render identically to a canonical host. Prefer the alias when it better signals intent.

| Alias | Canonical | When to prefer the alias |
|---|---|---|
| `bracket-tree` | `bracket` | data is a tree-of-matches, not a single bracket |
| `gantt-lite` | `gantt` | input uses `[wk1-wk3]` shorthand instead of explicit dates |
| `snake-process` | `bending-process` | metaphor is "snaking back and forth" |
| `counterbalance` | `balance` | two sides actively oppose rather than weigh |

### Renamed types

These three were renamed for clarity (old name matched the `X-list` pattern
of `type: list` shapes, which misled users into guessing `type: list, shape:
card`/`zigzag`/`tab`). Old names still work — kept as permanent aliases —
but new content should prefer the canonical name.

| Old name (still works) | Canonical name | Why renamed |
|---|---|---|
| `card-list` | `card-deck` | hard-capped at 4 items (drops the rest) — "deck" sets that expectation, "list" contradicts it |
| `zigzag-list` | `zigzag-timeline` | names the actual topology (alternating spine), not a leftover `-list` suffix |
| `tab-list` | `tabs` | interactive single-panel-visible widget, not a static list at all |

### Consolidated types

**`type: list` absorbs 10 formerly-separate list types as `shape:` values** —
they're pure visual reskins of the same item schema (`- Label: value [attrs]`
+ indented children), so they share one renderer:

```
type: list
shape: bullet | numbered | circle | icon | chevron | ribbon | trapezoid | two-column | block | hexagon
```

Omit `shape:` to default to `bullet`. The old flat names (`bullet-list`,
`circle-list`, `chevron-list`, `ribbon-list`, `trapezoid-list`,
`two-column-list`, `block-list`, `hexagon-list`, `numbered-list`,
`icon-list`) still work as permanent aliases — `type: circle-list` renders
identically to `type: list, shape: circle`. An unrecognized `shape:` value
is a hard validation error (`STRUCT_INVALID_ATTRIBUTE_VALUE`), never a
silent fallback.

`checklist`, `card-deck`, `zigzag-timeline`, and `tabs` remain separate,
standalone types — each has either a different item schema (checklist's
done-state) or different topology (deck/spine/tabbed-panel) from the
`type: list` shape family, not just a different visual skin.

**`type: process` absorbs 8 formerly-separate process types as `shape:`
values** — same reskin logic:

```
type: process
shape: default | chevron | arrow | circle | ring | bending | step-up | step-down
```

`shape: default` (or omitting `shape:` — same thing) is the box layout (auto-switches horizontal/vertical
by item count, same as before). An **explicit** `shape:` is always honored
and never silently swapped for a different one — `arrow`/`chevron` used to
fall back to plain boxes above 6–8 items; now they shrink to fit instead,
matching how `circle`/`ring`/`bending` already behaved. The old flat names
(`chevron-process`, `arrow-process`, `circle-process` → `shape: circle`,
`circular-process` → `shape: ring`, `bending-process`/`snake-process` →
`shape: bending`, `step-up`, `step-down`) still work as permanent aliases.

`funnel` stays a standalone type — it computes conversion percentages
between steps from numeric `value:`/child data, real behavior rather than a
visual reskin.

**`type: cycle` absorbs 5 formerly-separate cycle types as `shape:`
values:**

```
type: cycle
shape: default | donut | segmented | orbit | mesh | spiral
```

`type: cycle` predates this consolidation, so omitting `shape:` stays
backward-compatible with existing content — it resolves to `default` (the
plain ring), not to the recommendation below. **For new diagrams, prefer
`shape: segmented`** — its labels sit outside the ring in a fixed-size box
with a leader line, so text room per item doesn't shrink as item count
grows, unlike `default`/`donut` where label space is divided among N items.
Old flat names (`donut-cycle`, `segmented-cycle`, `nondirectional-cycle` →
`shape: orbit`, `multidirectional-cycle` → `shape: mesh`, `spiral`) still
work as permanent aliases.

`gear-cycle`, `block-cycle`, and `loop` stay standalone — `gear-cycle` has
4 hard-coded layouts selected by item count sharing none of the other
types' ring-angle math; `block-cycle` requires an even item count and has
no clean degrade path for odd counts; `loop` renders as a linear row, not a
ring, at all.

**`type: pyramid` absorbs 4 formerly-separate pyramid types as `shape:`
values:**

```
type: pyramid
shape: default | inverted | segmented | diamond
```

`type: pyramid` predates this consolidation, so omitting `shape:` stays
backward-compatible — it resolves to `default` (the plain, non-inverted
stack). Unlike `cycle`, there's no separate recommended shape here: all 4
wedge shapes divide a fixed total height among N layers identically, none
scales better with item count than the others. Old flat names
(`inverted-pyramid` → `shape: inverted`, `segmented-pyramid`,
`diamond-pyramid`) still work as permanent aliases.

`pyramid-list` stays standalone — checked by both code-skeleton *and*
content-affordance: it's a content-packed horizontal bar-list (badge +
label + value + multi-line description, row height grows with content),
not a typography-forward wedge shape like the other 4 (short label+value,
fixed total height, cramped at high N). Different intent, not just a
different picture. Cross-listing it as an alias under both `pyramid` and
`list` (same renderer, dual registry entry) is a captured future-work idea
— see the Type Consolidation Plan.

### Complete Type Listing

| Family | Types |
|---|---|
| **Process** (9 standalone + `process` w/ 8 shapes) | `type: process` (shapes: `default`, `chevron`, `arrow`, `circle`, `ring`, `bending`, `step-up`, `step-down`), plus standalone `funnel`, `roadmap`, `waterfall`, `equation`, `segmented-bar`, `phase-process`, `timeline-h`, `timeline-v`, `swimlane` |
| **List** (5 standalone + `list` w/ 10 shapes) | `type: list` (shapes: `bullet`, `numbered`, `circle`, `icon`, `chevron`, `ribbon`, `trapezoid`, `two-column`, `block`, `hexagon`), plus standalone `checklist`, `timeline-list`, `card-deck`, `zigzag-timeline`, `tabs` |
| **Cycle** (3 standalone + `cycle` w/ 6 shapes) | `type: cycle` (shapes: `default`, `donut`, `segmented`, `orbit`, `mesh`, `spiral`), plus standalone `gear-cycle`, `block-cycle`, `loop` |
| **Matrix** (8) | `swot`, `pros-cons`, `comparison`, `matrix-2x2`, `bcg`, `ansoff`, `matrix-nxm`, `table` |
| **Hierarchy** (10) | `org-chart`, `tree`, `h-org-chart`, `hierarchy-list`, `radial-tree`, `decision-tree`, `sitemap`, `bracket`, `bracket-tree`, `mind-map` |
| **Pyramid** (1 standalone + `pyramid` w/ 4 shapes) | `type: pyramid` (shapes: `default`, `inverted`, `segmented`, `diamond`), plus standalone `pyramid-list` |
| **Relationship** (14) | `venn`, `venn-3`, `venn-4`, `concentric`, `balance`, `counterbalance`, `opposing-arrows`, `web`, `cluster`, `target`, `radial`, `converging`, `diverging`, `plus` |
| **Statistical** (9) | `progress-list`, `bullet-chart`, `scorecard`, `treemap`, `sankey`, `waffle`, `gauge`, `radar`, `heatmap` |
| **Planning** (7) | `kanban`, `gantt`, `gantt-lite`, `sprint-board`, `timeline`, `milestone`, `wbs` |
| **Technical** (8) | `layered-arch`, `entity`, `network`, `pipeline`, `sequence`, `state-machine`, `flowchart`, `class` |
| **Plot** (4) | `line-chart`, `scatter`, `area-chart`, `bar-chart` |

---

## Selection Guide

Walk these rules **in order — first match wins**.

### 1. Quantitative data (numbers paired with labels)?

- Series of values along a shared axis (time, sample, category) → **Plot family** (see §Plot below)
- One bar per label, no axis → `progress-list` or `bullet-chart`
- Composite KPI with a target line → `bullet-chart`
- Many KPIs together → `scorecard`
- Area = quantity → `treemap`
- Flows between nodes with volumes → `sankey`
- Single dial value → `gauge`
- Multi-axis profile (skill spider) → `radar`
- 2-D matrix of values → `heatmap`
- Share of a whole, ≤100 cells → `waffle`

**Do not** use `bullet-list` or `process` for quantitative data.

### 2. X-Y plot (series across a shared axis)?

- Connected line (time series, trend) → `line-chart`
- Discrete points, no line (irregular x, two-metric correlation) → `scatter`
- Filled below line (area emphasis) → `area-chart`
- Categorical comparison with bars → `bar-chart` (add `stack: true` for stacked)

**Do not** use `progress-list` for a multi-point series — it's one bar per row, not a sequence.

### 3. Comparison of 2+ named things?

- Single item, additive vs subtractive → `pros-cons`
- 2+ items, multiple attributes → `comparison`
- 2 axes (impact × effort) → `matrix-2x2`
- Market share quadrant → `bcg`
- Growth strategy quadrant → `ansoff`
- N×M grid (skills × people) → `matrix-nxm`
- Tabular data / markdown pipe table → `table`
- 4 SWOT categories → `swot`

**Do not** dump comparison data into `bullet-list`.

### 4. Edges / arrows between named entities?

- Tree topology → `tree` or `org-chart`
- Branching choice → `decision-tree`
- General graph / mesh → `network`
- Time-ordered messages between actors → `sequence`
- States and transitions → `state-machine`
- Top-down process flow with conditions and backward edges (loops) → `flowchart`
- Build / CI stages → `pipeline`
- Single feedback loop → `loop`
- Many → one or one → many → `converging` / `diverging`

### 5. Temporal axis with dates / weeks / phases?

- Tasks with start/end → `gantt` or `gantt-lite`
- Milestones only → `milestone`
- Chronological log → `timeline` or `timeline-list`
- Long event descriptions → `timeline-v` or `timeline-list`
- Future roadmap → `roadmap`
- Phases without dates → `phase-process`

**Do not** use `process` when dates are provided.

### 6. Hierarchy / containment?

- Org / reporting → `org-chart` (vertical) or `h-org-chart` (horizontal)
- Conceptual taxonomy → `tree`
- Ideation from a centre → `mind-map`
- Site / IA structure → `sitemap`
- Plain indented outline → `hierarchy-list`
- Work breakdown → `wbs`
- Tournament → `bracket`

**Do not** use `pyramid` for hierarchy — pyramid is a quantitative metaphor.

### 7. Sequential steps with order?

- Equal-weight steps → `process`
- Ordered facts with long text → `circle-list` or `icon-list`
- Each step narrows → `funnel`
- Explicit phases → `phase-process`
- 7+ steps that wrap → `snake-process`
- Steps escalate / decline → `step-up` / `step-down`
- Branches on condition → `decision-tree`, `state-machine`, or `flowchart` (top-down, with backward edges)
- Parallel lanes → `swimlane`
- Returns to start → `cycle` (or `loop` for feedback)

### 8. Containment / set overlap?

- 2–4 overlapping sets → `venn`, `venn-3`, `venn-4`
- Nested rings (outer → inner) → `concentric`
- Target / bullseye rings (inner → outer) → `target`
- Spokes around a hub → `radial`
- Grouped buckets without overlap → `cluster`

### 9. Balance / opposition?

- Two-sided weighing → `balance`
- Two opposing weighted forces → `counterbalance`
- Two forces meeting in the middle → `opposing-arrows`

### 10. Quantitative tiers (foundation → apex)?

- Largest at base → `pyramid`
- Largest at top → `inverted-pyramid`
- Body text per layer → `pyramid-list`
- Diamond (peak in middle) → `diamond-pyramid`
- Stratified blocks → `segmented-pyramid`

### Default fallback

- Flat list of nouns → `bullet-list`
- Flat list of verbs / actions → `process`
- Items with status → `checklist`

If the pick feels generic, walk back up rules 1–6 to check for a domain-specific type.

---

## Plot Family — Data Shape & Syntax

The plot family has its own data shape: **series of numbers**, not just labels.

### Series form

Each top-level `- Label: …` is one series. Values are comma-separated:

```mdart line-chart
title: Quarterly revenue
x: Q1, Q2, Q3, Q4

- Revenue: 12, 18, 24, 32
- Cost:    9, 11, 14, 17
```

**Numeric `(x, y)` pairs** for irregular x-spacing:
```
- Team A: (1.2, 22), (2.5, 18), (3.7, 26)
```

**Gaps** — empty between commas, `null`, `na`, or `-` all break the line:
```
- Sensor A: 12, 14, , null, 18, na, 19
```

### Front-matter keys (chart-wide)

| Key | Example | Effect |
|---|---|---|
| `x:` / `x-axis:` | `x: Q1, Q2, Q3, Q4` | x-axis tick labels |
| `x-label:` | `x-label: Time (s)` | x-axis title |
| `y-label:` | `y-label: Voltage (V)` | y-axis title |
| `smooth:` | `smooth: true` | Catmull-Rom curves (line / area) |
| `points:` | `points: false` | hide markers |
| `line-width:` | `line-width: 4` | default stroke width |
| `stack:` | `stack: true` | stacked bars (bar-chart only) |
| `grid:` | `grid: false` | hide gridlines |
| `ticks:` | `ticks: false` | hide tick labels |
| `shade-y:` | `shade-y: 100..300 [warning]` | horizontal band (repeatable) |
| `shade-x:` | `shade-x: Mar..Apr [campaign]` | vertical band (repeatable) |
| `ref-y:` | `ref-y: 250 [SLA]` | horizontal reference line (repeatable) |
| `ref-x:` | `ref-x: 25m [deploy]` | vertical reference line (repeatable) |

### Per-series attributes (in `[brackets]` after the label)

| Attribute | Effect |
|---|---|
| `dashed` / `dotted` | stroke pattern |
| `thin` / `thick` / `bold` / `heavy` / `extra` | width tier |
| `width=N` | explicit stroke width |
| `smooth` / `straight` | override chart-level smoothing |
| `points` / `nopoints` | force markers on / off |

```mdart line-chart
- Actual [bold]:              12, 18, 24, 32
- Forecast [dashed, smooth]:  11, 17, 23, 30
- Last year [dotted, thin]:   10, 14, 19, 25
```

**Plot is NOT for:** a single KPI → `gauge` / `bullet-chart`; one number per row → `progress-list`; categorical breakdown of a whole → `waffle` / `treemap`; flow volumes → `sankey`.

---

## Authoring Rules

### Label text density

MdArt nodes are **fixed-size shapes**, not paragraphs. Long labels overflow, truncate, or force tiny fonts.

| Node kind | Target | Hard ceiling |
|---|---|---|
| Process step / cycle phase | 1–3 words | ~24 chars |
| Pyramid tier (narrow) | 1–2 words | ~14 chars |
| Pyramid tier (wide) | 1–4 words | ~32 chars |
| Tree / org-chart / mind-map node | 1–4 words | ~28 chars |
| SWOT / pros-cons / matrix-2x2 cell | short phrase | ~50 chars |
| `card-deck` / `pyramid-list` body | 1 short sentence | ~80 chars |
| `kanban` / `sprint-board` card | task title only | ~40 chars |
| Sequence / state-machine label | verb phrase or event name | ~24 chars |
| Comparison / matrix / table cell | a value, not a sentence | ~30 chars |
| Vertical timeline (`timeline-v`, `timeline-list`) | date + short phrase | ~80 chars |

**Compression:** drop articles and filler verbs; noun phrases over sentences; move detail into `title:` or a paragraph outside the fence; prefer `Name: 75%` over `Name (currently at 75%)`.

**Pyramid width varies by position.** Shortest labels at the narrowest band:
- `pyramid`: narrowest = first (top), widest = last (bottom)
- `inverted-pyramid`: narrowest = last (bottom), widest = first (top)
- `diamond-pyramid`: narrowest = first and last; widest = middle

**Split when:**
- More than ~12 leaf nodes in a flat layout
- More than ~20 nodes in a hierarchy / network / mind-map
- Two clearly distinct concepts → two fences, each with a clear `title:`

### Orientation — prefer rows over columns

Horizontal canvas space is bounded; vertical space scrolls. **Put the longer axis as rows.**

- `comparison`: default (TB) puts items as rows, attributes as columns — correct for most cases. Add `direction: LR` only when **attributes > items** (e.g. 3 products × 12 features → LR gives 12 rows × 3 columns).
- `matrix-nxm`, `table`, `heatmap`: top-level items = rows, children = columns. Always put the more-numerous axis as top-level.
- `kanban`, `sprint-board`, `sequence`, `class`: top-level items become **columns** by design — cap count and split rather than adding more columns. In `sequence`, use `- --- Label` (no children) as a divider row rather than a new actor column.
- `org-chart` vs `h-org-chart`: vertical (many levels) vs horizontal (many siblings).

### Typed values — use `:` not `-` or `—`

When a node carries a label *and* a value (number, type, status, target), the parser splits on the **first unprotected `:`**:

- `Cache: 5ms` → `{ label: "Cache", value: "5ms" }` ✓
- `Cache - 5ms` → `{ label: "Cache - 5ms", value: undefined }` ✗

**Types where `key: value` is structural:**

| Family | Types | What `value` becomes |
|---|---|---|
| Statistical | `progress-list`, `bullet-chart`, `gauge`, `radar`, `waffle`, `scorecard` | numeric magnitude (bar fill, dial angle) |
| Statistical | `sankey` | flow volume on `→ Target: 42` |
| Statistical | `heatmap` | cell colour intensity |
| Matrix | `comparison`, `matrix-nxm`, `table` | cell content |
| Technical | `entity` | field type — `name: text [PK]` |
| Technical | `sequence` | message text on `→ Target: message`; `[+]`/`[-]` for activation bars; `- --- Label` for dividers |
| Technical | `state-machine` | event label on `→ NextState: event` |
| Technical | `flowchart` | edge label on `→ Target: label` |
| List | `type: list, shape: two-column`, `card-deck`, `timeline-list` | right-side / sub-text value |
| Planning | `gantt-lite`, `milestone`, `timeline` | dates, week ranges |

**When the parser splits and when it doesn't:**

A `:` triggers the split **only when all** of the following hold:
1. Followed by whitespace or end-of-line (so `3:30pm` and `aspect:value` don't split)
2. Not flanked by digits on both sides (`3:30`, `16:9` are safe)
3. Not inside `()`, `[]`, `{}`, or `"…"` (parentheticals and quoted speech keep their colons)
4. Not preceded by `\` (`\:` is an explicit escape)
5. Not the leading `:` of a URL scheme (`://`)

Avoid the ambiguous case `Note: do this later` (splits) by rewording (`Note — …`) or escaping (`Note\: …`).

---

## Syntax Reference

### Fence forms

**Inline type:**
```
```mdart process
- Step 1
- Step 2
```
```

**Front-matter type:**
```
```mdart
type: swot
title: Product Launch

+ Strong brand
- High CAC
? Asia-Pacific expansion
! Low-cost competitor
```
```

### Syntax tiers

| Tier | Extra beyond plain list | Example |
|---|---|---|
| **1 — Pure list** | none | `- Item` flat or indented |
| **2 — Inline annotations** | `key: value` · `[attr]` | `- Task [wk1–wk3]`, `- id: uuid [PK]` |
| **3 — Prefixed bullets** | prefix char encodes quadrant | `+ strength`, `- weakness`, `? opportunity`, `! threat` |
| **4 — Flow children** | `→` prefix = flows to / connects to | `→ Destination (value)` as child |
| **5 — Intersection peers** | `∩` in item name → overlap zone | `- A ∩ B` as top-level item |

**True graphs** (multiple parents, mesh topology) use `nodes:` / `edges:` sections:

```mdart network
nodes:
  - App Server 1
  - App Server 2
  - Database
edges:
  - App Server 1 → Database
  - App Server 2 → Database
```

### Semantic rules (parser contract)

- `- Child` under `- Parent` → **containment**
- `→ Target` under `- Source` → **directed edge**
- `- A ∩ B` as top-level peer → **intersection**
- `key: value` on an item → **typed field**
- `[attr]` inline → **tag / modifier**
- Prefix chars (`+`, `-`, `?`, `!`) on SWOT items → **quadrant assignment**

### Per-type syntax reference

| Type(s) | Syntax form | Example |
|---|---|---|
| `process`, `cycle` | Flat or arrow-chain | `- Step 1` or `A → B → C` |
| `layered-arch` | Top-level layers + immediate component children | `- API` / `  - Auth` / `- Data` / `  - SQLite` |
| `org-chart`, `mind-map`, `tree` | Deep indented tree | Recursive `- / - ` |
| `swot` | Prefix chars or 4-group headings | `+ Strong brand` / `- High costs` |
| `pros-cons` | Pros vs Cons | `- Pros` / `  - item` / `- Cons` / `  - item` |
| `comparison` | Top-level = options; indented `- key: value` = rows | `- Plan A` / `  - Storage: 100 GB` |
| `table` | Top-level = rows; indented `- key: value` = cells | `- Row 1` / `  - Col A: val` |
| `kanban`, `sprint-board` | Column headings + card items | `- To Do` / `  - Task [5 pts]` |
| `gantt-lite` | Items with range annotation | `- Design [wk1–wk3]`, `* Launch [wk6]` for milestone |
| `entity` | Items with typed fields | `- users` / `  - id: uuid [PK]` / `  - user_id: uuid [FK→orders]` |
| `sankey` | Items with `→` flow children | `- Product A` / `  → N. America (25%)` |
| `network` (graph) | `nodes:` / `edges:` sections | see above |
| `venn` | Groups + `∩` intersection peer | `- Engineering` / `- Product` / `- Engineering ∩ Product` |
| `matrix-2x2`, `bcg`, `ansoff` | 4-group headings | `- Stars` / `  - Product A (large)` |
| `sequence` | Actors + `→ Target: message` children; `[+]`/`[-]` or `[activate]`/`[deactivate]` for activation bars; `- --- Label` items for dividers | `- Client` / `  → Server: POST /login [+]` / `- --- Phase 2` |
| `state-machine` | States + `→ NextState: event` children | `- Idle` / `  → Running: start` |
| `flowchart` | Nodes + `→ Target: label` children; `[start]` / `[end]` / `[decision]` attrs | `- Login [decision]` / `  → Dashboard: ok` / `  → Login: failed` |

### Global options (front-matter)

| Key | Values | Default |
|---|---|---|
| `type` | any layout name (required if not inline) | — |
| `theme` | category default, `amber`, `rose`, `mono-light` | category default |
| `title` | string | none |
| `direction` | `LR` \| `TB` | layout-dependent |
| `animate` | `true` \| `false` | `true` |

---

## Anti-patterns

For the full failure-mode catalog see `anti-patterns.md` in the skill directory
(`skills/mdart/anti-patterns.md` in the mdart package, or wherever the consumer installed the skill).

Quick checklist before emitting a fence:

- **Keyword match trap** — if the user said "timeline", don't default to `timeline` — match the *data structure*, not the word. Could be `timeline-list`, `gantt-lite`, or `roadmap`.
- **Generic default** — `process` for unordered items, `bullet-list` for comparisons, `tree` for processes are the top three failures.
- **Wrong family** — `pyramid` ≠ hierarchy; `cycle` ≠ recurring task; `network` ≠ tree.
- **Verbose node labels** — sentences inside shapes overflow. Compress to noun phrases.
- **Overstuffed diagram** — if you'd need >12 flat nodes or >20 tree nodes, split into multiple fences.
- **Wrong orientation** — `comparison` with many attributes and no `direction: LR`; `matrix-nxm` with shorter axis as parents; `kanban` / `sequence` with too many columns.
- **Dashes instead of `:`** — `Item - description` and `Item — description` parse as one big label. Only `:` splits into `{label, value}` for bar fills, badges, columns, messages.
- **Syntax traps** — in `sequence` / `state-machine` / `network`, use `→ Target: message`, never `- Target`. SWOT/pros-cons headings must be exact words or use the `[strengths]` / `[pros]` attr.

---

## Generation Checklist

1. Walk the **Selection Guide** above — first match wins.
2. Cross-check the **Family Cheat Sheet** — does the family default fit, or should you escalate?
3. Apply **label text density** rules — compress labels, split if >12 flat / >20 hierarchy nodes.
4. Apply **orientation** rules — longer axis as rows; `comparison` default is TB; add `direction: LR` only if attributes > items.
5. Apply **typed values** — wherever a node carries a number, type, status, or target, use `:` not `-` / `—`.
6. Check the **anti-patterns** quick list above (or the full catalog in `anti-patterns.md`).
7. Choose `theme:` only if the user requested a specific look. Otherwise omit.
8. Add `title:` only when it adds context the labels alone don't carry.
