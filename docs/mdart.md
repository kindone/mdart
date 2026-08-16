# MdArt — Reference

Markdown code-fence syntax that renders structured text into SVG diagrams.
Triggered by ` ```mdart ` fences in chat; also a dedicated artifact type in supporting tools.

**106 layout types across 11 families.** Always declare the type — either inline
(` ```mdart process `) or in front matter (`type: process`). Do not emit a bare
` ```mdart ` fence: a standalone first line like `layered-arch` is parsed as
diagram *content*, not as the layout type.

---

## Type Catalog

### Family Cheat Sheet

Pick the **family** first; escalate to a specialist type only when a trigger is met.

| Family | Default | Escalate when… |
|---|---|---|
| **Process** (sequential) | `process` | dates → `timeline-h` · long event text → `timeline-v` / `timeline-list` · narrowing → `funnel` · parallel actors → `swimlane` · phases → `phase-process` · long sequence wraps → `snake-process` · returns to start → `cycle` · branches → `decision-tree` |
| **List** (ordered / unordered facts) | `bullet-list` | ordered with long text → `circle-list` / `icon-list` · status checkbox → `checklist` · progress % → `progress-list` · equal-weight cards → `card-list` · pros/cons pair → `two-column-list` · emoji → `icon-list` · numbered → `numbered-list` |
| **Cycle** (recurring) | `cycle` | mechanical metaphor → `gear-cycle` · expanding spiral → `spiral` · no direction → `nondirectional-cycle` · single feedback loop → `loop` |
| **Matrix** (compare / classify) | `comparison` | markdown table / generic fallback → `table` · 2 things +/- → `pros-cons` · 2 axes → `matrix-2x2` · market share → `bcg` · growth strategy → `ansoff` · 4 SWOT quadrants → `swot` · N×M grid → `matrix-nxm` |
| **Hierarchy** (parent → child) | `tree` | reporting line → `org-chart` / `h-org-chart` · ideation → `mind-map` · branching choice → `decision-tree` · web pages → `sitemap` · tournament → `bracket` · text outline → `hierarchy-list` |
| **Pyramid** (stacked tiers) | `pyramid` | inverted → `inverted-pyramid` · body text per layer → `pyramid-list` · diamond → `diamond-pyramid` · separated bands → `segmented-pyramid` |
| **Relationship** (sets, overlap, balance) | `venn` | 3 circles → `venn-3` · 4 circles → `venn-4` · concentric rings → `concentric` · weighted scale → `balance` · opposing forces → `opposing-arrows` · many↔one → `converging` / `diverging` · mesh → `web` · grouped buckets → `cluster` |
| **Statistical** (data viz) | `progress-list` | composite KPI → `bullet-chart` · multi-metric → `scorecard` · area=quantity → `treemap` · flows with volumes → `sankey` · share of 100 → `waffle` · single dial → `gauge` · multi-axis → `radar` · 2-D value matrix → `heatmap` |
| **Planning** (project / time) | `gantt-lite` | full board → `kanban` · sprint → `sprint-board` · pure schedule → `gantt` · milestones only → `milestone` · work breakdown → `wbs` · chronological log → `timeline` |
| **Technical** (system) | `network` | tiered system → `layered-arch` · DB schema → `entity` · message flow → `sequence` · state transitions → `state-machine` · OOP class → `class` · build/CI stages → `pipeline` |
| **Plot** (x-y data) | `line-chart` | discrete points → `scatter` · filled area → `area-chart` · grouped / stacked bars → `bar-chart` |

### Aliases

Four names render identically to a canonical host. Prefer the alias when it better signals intent.

| Alias | Canonical | When to prefer the alias |
|---|---|---|
| `bracket-tree` | `bracket` | data is a tree-of-matches, not a single bracket |
| `gantt-lite` | `gantt` | input uses `[wk1-wk3]` shorthand instead of explicit dates |
| `snake-process` | `bending-process` | metaphor is "snaking back and forth" |
| `counterbalance` | `balance` | two sides actively oppose rather than weigh |

### Complete Type Listing

| Family | Types |
|---|---|
| **Process** (18) | `process`, `chevron-process`, `arrow-process`, `circular-process`, `funnel`, `roadmap`, `waterfall`, `snake-process`, `step-up`, `step-down`, `circle-process`, `equation`, `bending-process`, `segmented-bar`, `phase-process`, `timeline-h`, `timeline-v`, `swimlane` |
| **List** (15) | `bullet-list`, `numbered-list`, `checklist`, `two-column-list`, `timeline-list`, `block-list`, `chevron-list`, `card-list`, `zigzag-list`, `ribbon-list`, `hexagon-list`, `trapezoid-list`, `tab-list`, `circle-list`, `icon-list` |
| **Cycle** (9) | `cycle`, `donut-cycle`, `gear-cycle`, `spiral`, `block-cycle`, `segmented-cycle`, `nondirectional-cycle`, `multidirectional-cycle`, `loop` |
| **Matrix** (8) | `swot`, `pros-cons`, `comparison`, `matrix-2x2`, `bcg`, `ansoff`, `matrix-nxm`, `table` |
| **Hierarchy** (10) | `org-chart`, `tree`, `h-org-chart`, `hierarchy-list`, `radial-tree`, `decision-tree`, `sitemap`, `bracket`, `bracket-tree`, `mind-map` |
| **Pyramid** (5) | `pyramid`, `inverted-pyramid`, `pyramid-list`, `segmented-pyramid`, `diamond-pyramid` |
| **Relationship** (14) | `venn`, `venn-3`, `venn-4`, `concentric`, `balance`, `counterbalance`, `opposing-arrows`, `web`, `cluster`, `target`, `radial`, `converging`, `diverging`, `plus` |
| **Statistical** (9) | `progress-list`, `bullet-chart`, `scorecard`, `treemap`, `sankey`, `waffle`, `gauge`, `radar`, `heatmap` |
| **Planning** (7) | `kanban`, `gantt`, `gantt-lite`, `sprint-board`, `timeline`, `milestone`, `wbs` |
| **Technical** (7) | `layered-arch`, `entity`, `network`, `pipeline`, `sequence`, `state-machine`, `class` |
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
- Branches on condition → `decision-tree` or `state-machine`
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
| `card-list` / `pyramid-list` body | 1 short sentence | ~80 chars |
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
- `kanban`, `sprint-board`, `sequence`, `class`: top-level items become **columns** by design — cap count and split rather than adding more columns.
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
| Technical | `sequence` | message text on `→ Target: message` |
| Technical | `state-machine` | event label on `→ NextState: event` |
| List | `two-column-list`, `card-list`, `timeline-list` | right-side / sub-text value |
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
| `sequence` | Actors + `→ Target: message` children | `- Browser` / `  → API: GET /users` |
| `state-machine` | States + `→ NextState: event` children | `- Idle` / `  → Running: start` |

**`network` layout notes:** nodes are arranged in a ring. Edges are quadratic Bézier curves bowed outward from the ring centre by default; bidi pairs bow to opposite sides for visual separation. Use `edges: straight` for simpler topologies.

### Global options (front-matter)

| Key | Values | Default |
|---|---|---|
| `type` | any layout name (required if not inline) | — |
| `theme` | category default, `amber`, `rose`, `mono-light` | category default |
| `title` | string | none |
| `direction` | `LR` \| `TB` | layout-dependent |
| `animate` | `true` \| `false` | `true` |
| `edges` | `curved` \| `straight` | `curved` (network only) |

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
