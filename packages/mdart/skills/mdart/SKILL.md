---
name: mdart
description: Generate MdArt diagrams from structured intent — pick the right diagram type from 105+ layouts (process, list, hierarchy, comparison, cycle, matrix, pyramid, relationship, statistical, planning, technical, plot) and produce valid syntax. Use when the user asks for a diagram, chart, flowchart, mind map, comparison, org chart, timeline, kanban board, swot analysis, sequence diagram, state machine, gantt, funnel, sankey, treemap, line chart, scatter plot, bar chart, area chart, or any visual representation of structured information. Also use when generating ```mdart fenced blocks. Prefer mermaid only for complex conditional flow charts.
---

# MdArt diagram generation

Produce MdArt fenced code blocks that pick the *right* diagram type for the user's intent. Optimise for **selection judgment**, not just syntactically valid output. Defaulting to `process` or `bullet-list` for everything is the most common failure.

**Fence form (the type is required):**
````
```mdart <type>
- Item
```
````

Always declare the type either in the fence header or as `type:` front
matter. Do not emit a bare ` ```mdart ` fence without `type:` even though the
renderer has a compatibility fallback.
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

Eleven families. **105 type names**, of which **101 are distinct renderers** — 4 are pure aliases kept for backward compatibility (see "Aliases" at the bottom of this section). **Pick the family first**; escalate from the default to a specialised type only when a trigger is met.

| Family | Default | Escalate when … |
|---|---|---|
| **Process** (sequential) | `process` | dates → `timeline-h` · long event text → `timeline-v` / `timeline-list` · narrowing → `funnel` · parallel actors → `swimlane` · phases → `phase-process` · long sequence wraps → `snake-process` · returns to start → `cycle` · branches by condition → `decision-tree` |
| **List** (ordered or unordered facts) | `bullet-list` | ordered with long text → `circle-list` / `icon-list` · with status checkbox → `checklist` · with progress % → `progress-list` · equal-weight cards → `card-list` · paired pros/cons → `two-column-list` · with emoji → `icon-list` · numbered → `numbered-list` |
| **Cycle** (recurring) | `cycle` | mechanical metaphor → `gear-cycle` · expanding spiral → `spiral` · no inherent direction → `nondirectional-cycle` · single feedback loop → `loop` |
| **Matrix** (compare/classify) | `comparison` | exactly 2 things, +/- → `pros-cons` · 2 axes → `matrix-2x2` · market share → `bcg` · growth strategy → `ansoff` · 4 SWOT quadrants → `swot` · N×M grid → `matrix-nxm` |
| **Hierarchy** (parent → child) | `tree` | reporting line → `org-chart` (vertical) or `h-org-chart` (horizontal) · ideation → `mind-map` · branching choice → `decision-tree` · web pages → `sitemap` · tournament → `bracket` · text outline → `hierarchy-list` |
| **Pyramid** (stacked tiers) | `pyramid` | inverted → `inverted-pyramid` · with body text → `pyramid-list` · diamond → `diamond-pyramid` · separated bands → `segmented-pyramid` |
| **Relationship** (sets, overlap, balance) | `venn` | 3 circles → `venn-3` · 4 circles → `venn-4` · concentric rings → `concentric` · weighted scale → `balance` · opposing forces → `opposing-arrows` · many↔one → `converging` / `diverging` · interconnected mesh → `web` · grouped buckets → `cluster` |
| **Statistical** (data viz) | `progress-list` | composite KPI → `bullet-chart` · multi-metric → `scorecard` · area=quantity → `treemap` · flows with volumes → `sankey` · share of 100 → `waffle` · single dial → `gauge` · multi-axis profile → `radar` · 2-D matrix of values → `heatmap` |
| **Planning** (project/time) | `gantt-lite` | full board → `kanban` · sprint → `sprint-board` · pure schedule → `gantt` · milestone list → `milestone` · work breakdown → `wbs` · chronological log → `timeline` |
| **Technical** (system) | `network` | tiered system → `layered-arch` · DB schema → `entity` · message flow → `sequence` · state transitions → `state-machine` · OOP class → `class` · build/CI stages → `pipeline` |
| **Plot** (x-y data viz) | `line-chart` | discrete points → `scatter` · filled below line → `area-chart` · grouped/stacked categories → `bar-chart` |

For `layered-arch`, each top-level item is a layer band and its immediate
children are component chips. Keep consecutive layers as top-level siblings;
do not encode the layer stack as one deeply nested chain.

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
- Series of values along an x-axis (time, sample, category) → **plot family** — see rule 1a
- Simple bars (one number per item, no x-axis) → `progress-list` or `bullet-chart`
- Composite KPI with target line → `bullet-chart`
- Many KPIs together → `scorecard`
- Sizes form a treemap → `treemap`
- Flows between nodes with volumes → `sankey`
- Single value on a dial → `gauge`
- Multi-axis profile (skill spider) → `radar`
- 2-D matrix of values → `heatmap`
- Share of a whole, ≤100 cells → `waffle`

**Do not** use `bullet-list` or `process` for quantitative data — the statistical family makes the numbers visible.

### 1a. X-Y plot (series of values across an x-axis)?
When the data is one or more **series of numbers indexed along the same axis** — typical for time series, sensor readings, forecasts, A/B comparisons, function curves:
- Connected line → `line-chart`  *(default for any series-over-time)*
- Discrete points, no connecting line → `scatter`  *(also for non-uniform `(x,y)` pairs)*
- Filled below the line, emphasising area → `area-chart`
- Categorical comparison with bars → `bar-chart` *(grouped by default; `stack: true` for stacked)*

Triggers worth memorising:
- "trend over time", "growth", "monthly/quarterly/weekly" → `line-chart`
- "throughput vs cycle time", "two metrics correlated", "irregular x" → `scatter`
- "active users by tier", "stacked over time" → `area-chart`
- "compare A vs B by quarter", "revenue mix by year" → `bar-chart`

**Do not** use `progress-list` for a multi-point series — it's one bar per row, not a sequence. Reach for `line-chart` the moment you have ≥3 values per label.

### 2. Comparison of 2+ named things?
If the user says "compare", "vs", "differences between", "tradeoffs":
- single item, additive vs subtractive view → `pros-cons`
- 2+ items, multiple attributes (e.g. comparing options with pros/cons) → `comparison`
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
- Long temporal event labels/descriptions → `timeline-v` or `timeline-list`
- Roadmap of future work → `roadmap`
- Phases without precise dates → `phase-process`
- Horizontal timeline of items → `timeline-h`
- Vertical timeline → `timeline-v`

**Do not** use bare `process` when dates are provided. If each event needs a
phrase such as `Planck (1900): Energy is quantized`, prefer a vertical type:
`timeline-v` or `timeline-list` lets text read horizontally while events stack
vertically. `process` and `timeline-h` are for short step/event labels.

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
- Ordered facts/events with long descriptions → `circle-list` or `icon-list`
- Each step narrows / filters → `funnel`
- Steps are explicit phases → `phase-process`
- 7+ steps that need to wrap → `snake-process` or `bending-process`
- Steps escalate or decline → `step-up` / `step-down`
- Branching on condition → `decision-tree` or `state-machine`
- Steps run in parallel lanes → `swimlane`
- Returns to start → `cycle` (or `loop` for feedback)

Use `process` only when arrows mean workflow, causality, transformation, or
handoff. If the content is just an ordered list with long values, `circle-list`
or `icon-list` is the more generic, text-friendly choice.

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

## §2.5 — Plot family syntax reference

The plot family (`line-chart`, `scatter`, `area-chart`, `bar-chart`) has its own data shape — series of numbers, not just labels. Get this right and the diagram is trivial to author.

### Series shape

Each top-level `- Label: …` is one series. The value list is comma-separated, parsed at render time:

```mdart
type: line-chart
title: Quarterly revenue
x: Q1, Q2, Q3, Q4

- Revenue: 12, 18, 24, 32
- Cost:    9, 11, 14, 17
```

**Numeric `(x, y)` pairs** for irregular x-spacing (the chart auto-switches to a continuous numeric x-axis):
```mdart
- Team A: (1.2, 22), (2.5, 18), (3.7, 26), (5.1, 14)
```

**Gaps** — empty between commas, `null`, `na`, or `-` all break the line:
```mdart
- Sensor A: 12, 14, , null, 18, 22, na, 19
```

### Front-matter (chart-wide)

| Key | Example | Effect |
|---|---|---|
| `x:` / `x-axis:` | `x: Q1, Q2, Q3, Q4` | x-axis tick labels |
| `x-label:` | `x-label: Time (s)` | x-axis title |
| `y-label:` | `y-label: Voltage (V)` | y-axis title |
| `smooth:` | `smooth: true` | Catmull-Rom curves through points (line/area) |
| `points:` | `points: false` | hide markers (default: auto — on for ≤30 pts) |
| `line-width:` | `line-width: 4` | default stroke width (also: `lw:`, `stroke-width:`) |
| `stack:` | `stack: true` | stack bars instead of grouping (bar-chart only) |
| `grid:` | `grid: false` | hide gridlines (zero line still drawn if data crosses zero) |
| `ticks:` | `ticks: false` | hide tick labels (the numeric / category text on each axis) |
| `shade-y:` | `shade-y: 100..300 [warning]` | horizontal band — **repeatable** |
| `shade-x:` | `shade-x: Mar..Apr [campaign]` | vertical band — **repeatable** |
| `ref-y:` | `ref-y: 250 [SLA]` | horizontal reference line — **repeatable** |
| `ref-x:` | `ref-x: 25m [deploy]` | vertical reference line — **repeatable** |

Aliases: `label-x` / `label-y` work as parallels to `x-label` / `y-label` (same field, both forms compile identically).

Range separator: `..` (preferred, works with negatives). `—` and whitespace-padded `-` also accepted.

**Label positioning on reference lines** — by default a `ref-x` label sits at the top of its vertical line and a `ref-y` label sits at the right edge. Override the perpendicular-axis position with `@ <coord>` (data coords):

```
ref-x: 12 [Plateau]              # default — label at top of plot
ref-x: 12 @ 65 [Plateau]         # label at y=65 along the line

ref-y: 250 [SLA]                 # default — label at right edge
ref-y: 250 @ 5 [SLA]             # label at x=5 along the line
```

`@ <coord>` resolves the same way as the primary `at` value: numeric in continuous-x mode, label or 1-based index in categorical mode.

### Per-series attributes (in `[brackets]` after the label, before the colon)

| Attribute | Effect |
|---|---|
| `dashed` / `dotted` | stroke pattern |
| `thin` / `thick` / `bold` / `heavy` / `extra` | width tier (1 / 3.5 / 5 / 7 / 9 px) |
| `width=N` (also `w=N`) | explicit numeric stroke width |
| `smooth` / `straight` | override chart-level smoothing |
| `points` / `nopoints` | force markers on / off |

```mdart
- Actual [bold]:                12, 18, 24, 32
- Forecast [dashed, smooth]:    11, 17, 23, 30
- Last year [dotted, thin]:     10, 14, 19, 25
```

### Common patterns

**SLA monitoring** (zones + reference lines + smooth lines):
```mdart
type: line-chart
smooth: true
points: false
title: API latency
y-label: ms
shade-y: 0..100 [healthy]
shade-y: 100..300 [warning]
shade-y: 300..600 [critical]
ref-y: 250 [SLA target]
x: 0m, 5m, 10m, 15m, 20m, 25m, 30m

- p50: 80, 92, 105, 118, 130, 220, 95
- p99: 180, 210, 245, 280, 310, 580, 240
```

**Forecast vs actual** (per-series styles):
```mdart
type: line-chart
title: Forecast vs Actual
x: Q1, Q2, Q3, Q4

- Actual [bold]:               12, 18, 24, 32
- Forecast [dashed, smooth]:   11, 17, 23, 30
```

**Stacked bars**:
```mdart
type: bar-chart
stack: true
x: Q1, Q2, Q3, Q4

- Subscriptions: 40, 50, 65, 75
- Services:      25, 30, 30, 35
- Licenses:      15, 15, 15, 20
```

### What plot is NOT for

- A single percent or KPI → `gauge` / `bullet-chart`
- A few labels with one number each → `progress-list`
- Categorical breakdown of a whole → `waffle` / `treemap`
- Flow volumes between named nodes → `sankey`

If the data is "one number per row, ≤8 rows", it's almost always `progress-list`, not a `bar-chart` with one series.

---

## §3 — Node text density: keep labels short, split big diagrams

MdArt nodes are **fixed-size shapes**, not paragraphs. Long labels overflow,
get truncated, force tiny fonts, or wrap awkwardly. The diagram becomes
unreadable long before the data becomes complete.

**Rule of thumb per node:**

| Node kind | Target | Hard ceiling |
|---|---|---|
| Process step / cycle phase | 1–3 words | ~24 chars |
| Pyramid tier (narrow band) | 1–2 words | ~14 chars |
| Pyramid tier (wide band) | 1–4 words | ~32 chars |
| Tree / org-chart / mind-map node | 1–4 words | ~28 chars |
| SWOT / pros-cons / matrix-2x2 cell | short phrase, ≤ ~6 words | ~50 chars |
| `card-list` / `pyramid-list` body | 1 short sentence | ~80 chars |
| `kanban` / `sprint-board` card | task title only, no description | ~40 chars |
| Sequence / state-machine label | verb phrase or event name | ~24 chars |
| Comparison / matrix-nxm cell | a value, not a sentence | ~30 chars |
| Vertical timeline item (`timeline-v`, `timeline-list`) | date/name + short event phrase | ~80 chars |

**Compression techniques** (apply before emitting the fence):

- Drop articles (a/an/the) and filler verbs (is, are, has, can).
- Use noun phrases over full sentences: "User auth" not "The user authenticates with the system".
- Replace clauses with abbreviations where unambiguous: "Q3 launch" not "Launch in the third quarter".
- Move detail into the front-matter `title:` or a paragraph **outside** the fence — never cram it inside a node.
- For values: prefer `Name: 75%` over `Name (currently at 75%)`.
- Domain jargon is fine if the audience knows it (`PR review`, `OAuth`, `CDN`).

**Pyramid family — positional width matters.** Pyramid bands are not all the
same size; the available horizontal space *varies by position in the list*.
Put your shortest labels where the band is narrowest, longer ones where the
band is widest:

| Type | Narrow band (keep ≤1–2 words) | Wide band (more room, ≤4–5 words) |
|---|---|---|
| `pyramid`, `segmented-pyramid`, `pyramid-list` | first items (top) | last items (bottom) |
| `inverted-pyramid` | last items (bottom) | first items (top) |
| `diamond-pyramid` | first **and** last items (top & bottom) | middle items |

A pyramid summit labelled "Self-actualization needs and personal growth"
truncates to "Self-actu…"; that label belongs at the base, not the apex.
If the natural data has long text at the narrow end, consider switching
type — e.g. swap a `pyramid` for an `inverted-pyramid` so the longer items
sit at the wide top — or use `pyramid-list` (label appears alongside the
bar, not crammed inside).

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

**Long text needs text-friendly types.** Some diagrams are built from compact
shapes; others put labels in wider horizontal text lanes. Pick accordingly:

| More suitable for longer text | Avoid for longer text |
|---|---|
| `timeline-v`, `timeline-list` | `process`, `timeline-h`, `arrow-process` |
| `circle-list`, `icon-list`, `card-list`, `pyramid-list`, `hierarchy-list` | `cycle`, `gear-cycle`, `circle-process` |
| `comparison` / `matrix-nxm` cells with short values | `pyramid`, `step-up`, `step-down` |

Rule: if the content is a chronological story with named dates and explanatory
phrases, use `timeline-v` or `timeline-list`, not `process` or `timeline-h`.
If it is only an ordered list with descriptive text, use `circle-list` or
`icon-list`, not `process`.

---

## §4 — Orientation: prefer rows over columns

Horizontal canvas space is bounded; vertical space scrolls comfortably. **When
the data has a longer axis and a shorter axis, put the longer axis as rows.**
A diagram that needs 8 columns spills off the page or shrinks each cell to
illegibility; the same diagram with 8 rows just gets taller.

The control mechanism varies by type:

### a. Types with an explicit `direction:` flag

Only one type currently flips on `direction:` in the front-matter:

| Type | (default, no flag set) `TB` | `direction: LR` |
|---|---|---|
| `comparison` | top-level items become **rows** | top-level items become **columns** |

**The default already favours rows** — top-level items stack vertically, and the
columns are the (typically fewer) attribute names derived from children. So most
comparisons need no flag.

**Set `direction: LR` only when** the count of attributes (children) exceeds
the count of items (top-level). E.g. comparing 3 products on 12 features:

- Default TB → 3 rows × 12 columns ← **bad**, 12 narrow columns spill horizontally
- `direction: LR` → 12 rows × 3 columns ← **good**, 12 features stack vertically

```mdart
type: comparison
direction: LR
title: Database options
- PostgreSQL
  - License: Open
  - SQL: Yes
  - Scale: Vertical
  - ACID: Yes
  - Replication: Yes
  - Sharding: Add-on
  - JSON: Native
  - Full-text: Built-in
- MongoDB
  - License: SSPL
  - SQL: No
  - Scale: Horizontal
  - ACID: Document-level
  - Replication: Yes
  - Sharding: Native
  - JSON: Native
  - Full-text: Built-in
- Redis
  - License: BSD
  - SQL: No
  - Scale: Horizontal
  - ACID: No
  - Replication: Yes
  - Sharding: Cluster mode
  - JSON: Module
  - Full-text: Module
```

Without `direction: LR` the above produces 3 rows × 8 columns (8 cramped columns); with it, 8 rows × 3 columns.

**Decision rule:** count top-level items vs distinct attributes per item. If items ≥ attributes, omit the flag (default TB is fine). If attributes > items, add `direction: LR`.

### b. Types where data structure controls orientation

These don't read `direction:` — orientation is determined by which axis you make
top-level (parents) vs children. Put the **longer** axis as parents.

| Type | Top-level → | Children → | Implication |
|---|---|---|---|
| `matrix-nxm` | rows | columns | put more-numerous axis as top-level |
| `heatmap` | rows | columns | put more-numerous axis as top-level |
| `swimlane` | `- Lane` (bullet items) | `- Task` (bullet items) | already row-oriented; many lanes are fine |

For `matrix-nxm` / `heatmap`: if you're plotting "10 people × 4 skills", the people are top-level (10 rows), skills are children (4 columns) — *not* the other way around.

### c. Column-oriented types with hard column budgets

These types *must* render top-level items as columns by their nature. They don't have an orientation flag — instead, **cap the count and split** if you exceed it (per §3):

| Type | Top-level items become | Comfortable max |
|---|---|---|
| `kanban`, `sprint-board` | columns (statuses) | 5–6 columns |
| `sequence` | columns (actors) | ~6 actors |
| `class` | classes laid out horizontally | ~5 classes |

If a kanban needs 8 statuses or a sequence needs 10 actors, that's a sign to split into multiple fences (e.g. one sequence per sub-flow), not to cram them in.

### d. Hierarchy / org-chart orientation

For tree-shaped data, the choice is between two distinct types, not a flag:

- **Wider than deep** (many siblings, few levels) → `h-org-chart` (horizontal lays children left-to-right, parent stays narrow).
- **Deeper than wide** (few siblings, many levels) → `org-chart` or `tree` (vertical).
- **Very wide and very deep** → consider `hierarchy-list` (text outline), or split sub-trees into separate fences.

---

## §5 — Typed values: use `:` not `-` or `—`

When a node carries a label *and* an associated value (a number, a type, a
status, a description, a target), the parser splits them on the **first
unprotected `:`**:

- `Cache: 5ms`     → `{ label: "Cache", value: "5ms" }`
- `Cache - 5ms`    → `{ label: "Cache - 5ms", value: undefined }`
- `Cache — 5ms`    → `{ label: "Cache — 5ms", value: undefined }`
- `Site: https://example.com` → `{ label: "Site", value: "https://example.com" }` (the `://` is protected)

**Many renderers display `value` distinctly from `label`** — as a percentage
bar, a numeric badge, a second column, a typed field, an event name on an
arrow, a heatmap intensity, a sankey flow weight, etc. Using `-` or `—`
collapses both into one undifferentiated text blob, defeating the renderer.

**Types where `key: value` is structural (not just stylistic):**

| Family | Type | What `value` becomes |
|---|---|---|
| Statistical | `progress-list`, `bullet-chart`, `gauge`, `radar`, `waffle`, `scorecard` | the numeric magnitude (bar fill, dial angle, etc.) |
| Statistical | `sankey` | flow volume on `→ Target: 42` |
| Statistical | `heatmap` | cell colour intensity |
| Matrix | `comparison`, `matrix-nxm` | the cell content |
| Technical | `entity` | field type — `name: text [PK]` |
| Technical | `sequence` | message text on `→ Target: message` |
| Technical | `state-machine` | event label on `→ NextState: event` |
| List | `bullet-list`, `numbered-list`, `two-column-list`, `timeline-list`, `card-list` | the right-side / sub-text value |
| Planning | `gantt-lite`, `milestone`, `timeline` | dates, week ranges |

For these types, **always** prefer `Label: value`. Reserve `-` / `—` only for
free-text labels with no separable value (e.g. `Brand strength` in a SWOT cell,
where the dash would be inside a single descriptive phrase).
For `comparison`, **child keys become columns**. Prefer shared `key: value`
children when the row has a name (`Form`, `Example`, `Momentum`). Unkeyed
children are allowed beside keyed rows; they align positionally with an empty
row/column header. Use that only for parallel value-only lines, not for
one-off summaries or conclusions.

```mdart
type: comparison
- Gaussian wavepacket
  - Wavefunction: Minimum uncertainty state
  - Balances position and momentum spread   ← allowed if peer items have matching value-only lines
```

Give that idea a column key instead:

```mdart
type: comparison
- Gaussian wavepacket
  - Wavefunction: Minimum uncertainty state
  - Momentum: Balances position and momentum spread
  - Δp,Δx: Δx · Δp = ℏ/2
```

Also make sure every top-level item is the same kind of thing. In a
`comparison`, "Wave aspect" and "Particle aspect" are peer options; "Cannot
observe both simultaneously" is a conclusion/constraint, not a third option.
Put that conclusion in prose outside the fence, in a separate `card-list`, or
recast it into the same shared keys only if it truly behaves like another
comparable option.

```mdart
type: progress-list
- API tests: 92%      ← good — value parsed, bar fills to 92%
- UI tests - 78%      ← bad — label is "UI tests - 78%", no bar
- E2E tests — 60%     ← bad — same problem with em-dash
```

```mdart
type: sequence
- Browser
  → API: GET /users        ← good — message parsed
  → API - POST /login      ← bad — entire string is the target name, no message
```

If you're tempted to write a description with a dash for visual style, ask:
*does any renderer in this family actually do something with the value?* If
yes, switch to `:`.

### Inadvertent colons in free text — when the parser splits and when it doesn't

Free-text English routinely contains colons that aren't `key: value` pairs.
The parser is YAML-strict and skips colons that don't look like a kv split.
A `:` triggers the split **only when all** of the following hold:

1. It's followed by whitespace or end-of-line (so `3:30pm`, `aspect:value`
   without a space, and `:rocket:` don't split).
2. It's not flanked by digits on both sides (`3:30`, `16:9`).
3. It's not nested inside `()`, `[]`, `{}`, or `"…"` (parentheticals and
   quoted speech keep their colons).
4. It's not preceded by `\` (`\:` is an explicit escape).
5. It's not the leading `:` of a URL scheme (`://`).

Concrete results — these all keep the whole string as one label:

| Input | Why kept whole |
|---|---|
| `- Cache (e.g.: redis)` | colon inside `()` |
| `- Says "hello: world"` | colon inside `"…"` |
| `- Standup at 3:30pm` | digit:digit |
| `- Aspect ratio 16:9` | digit:digit |
| `- aspect-ratio:16:9` | no whitespace after colon |
| `- :rocket: launches` | first colon has no space; second has space — splits at second |
| `- Site: https://example.com` | `://` is URL-protected (the **outer** `:` still splits) |

These still split, because the colon has whitespace after, no flanking
digits, and is at top level:

| Input | Result |
|---|---|
| `- key: 75%` | label `key`, value `75%` |
| `- API tests: passing` | label `API tests`, value `passing` |
| `- Cache (e.g.: redis): in-memory` | label `Cache (e.g.: redis)`, value `in-memory` |

**The remaining ambiguous case** — sentence-initial labels like `Note: do
this later` — *will* still split (whitespace after, no parens, no digits).
For these you have three options:

1. **Reword.** `Note — do this later` (em-dash carries no parser weight).
2. **Restructure.** Move the "Note" framing into `title:` or move the
   sentence outside the fence.
3. **Escape with `\:`.** `Note\: do this later` keeps the whole string as
   one label. Only the *first* unescaped colon splits, so
   `key: foo\: bar` ⇒ label `key`, value `foo: bar`.

For agents: prefer option 1 (rewording) over option 3 (escape) — escapes
are uglier and harder for end-users to read in source. Reach for `\:` only
when removing the colon would damage the label's meaning.

> **Note on apostrophes:** `'` does **not** open a quote scope (otherwise
> contractions like `don't` would swallow every following colon). Use
> double quotes if you need a literal-quote scope, or escape directly.

---

## Quick anti-pattern reminders

Before emitting a diagram, sanity-check:

- **Picking by keyword match** — if the user said "timeline", that doesn't mean `timeline` (could be `timeline-list`, `gantt-lite`, or `roadmap`). Match data structure, not vocabulary.
- **Defaulting to generic types** — `process` for unordered items, `bullet-list` for comparisons, `tree` for processes are the top three failures.
- **Wrong family** — `pyramid` ≠ hierarchy; `cycle` ≠ recurring task; `network` ≠ hierarchy.
- **Verbose node labels** — sentences inside shapes overflow or shrink the font. Compress to noun phrases (§3).
- **Single overstuffed diagram** — if you'd need >12 flat nodes or >20 tree nodes, split into multiple fences (§3).
- **Wrong orientation** — `comparison` with many attributes per item and no `direction: LR`; `matrix-nxm` with the shorter axis as parents; kanban/sequence with too many columns. See §4.
- **Dashes instead of `:`** — `Item - description` and `Item — description` parse as one big label. Only `:` splits into `{label, value}`, which renderers display distinctly (bar fills, badges, columns, message text). See §5.
- **Syntax traps** — in `sequence` / `state-machine` / `network`, always use `→ Target: message`, never `- Target` (parses as edge but reads as containment). SWOT/pros-cons headings must be exact words (`Strengths`, `Pros`, etc.) or use the explicit `[strengths]` / `[pros]` attr.

For the full anti-pattern catalog with 8 categories of failure modes, **read `anti-patterns.md` in this skill directory**.

---

## Generation checklist

Before emitting a `mdart` fence:

1. Walk §2 top-to-bottom. First match wins.
2. Cross-check §1 — does the family default fit?
3. Apply §3 — are any labels too long? Is the diagram too dense to read? Compress or split.
4. Apply §4 — is the longer axis going to be rows? For `comparison`, default (TB) is row-friendly; add `direction: LR` only if attributes > items. For `matrix-nxm` / `heatmap`, put the longer axis as top-level items.
5. Apply §5 — wherever a node carries a number, type, status, or target, separate it with `:` not `-` / `—`. Renderers in statistical, matrix, technical, list, and planning families key off `value`.
6. Skim `anti-patterns.md` — am I about to make a known mistake?
7. Choose `theme:` only if the user requested a specific look. Otherwise omit.
8. Add `title:` only when it adds context the labels alone don't carry.

---

<sub>Skill version: derived from mdart v0.2.1 (2026-05-02). Regenerate via `scripts/regen-skill.md` in the mdart repo when its `layouts/` changes; consumers re-fetch via their own sync script.</sub>
