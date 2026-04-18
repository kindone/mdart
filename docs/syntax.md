# MdArt Syntax Reference

## Fence syntax

````markdown
```mdart <type>          ← inline type
- Item
```

```mdart                 ← full front-matter
type: kanban
title: Sprint 22
theme: rose              ← any named theme (see Themes section below)
- Item
```
````

## Item grammar

```
- Label                    plain item
- Label: value             with value  (text after first colon)
- Label [attr] [attr]      with attrs  (text inside brackets)
  - Child                  child item  (any consistent indent)
  -> Target: message       flow child  (→ U+2192 or ASCII ->)
```

Arrow chain shorthand: `Step 1 -> Step 2 -> Step 3`

`->` and `→` are identical everywhere — use whichever your keyboard prefers.

**Soft syntax exchangeability** — the parser does not lock syntax to diagram type:
- `-> Child` works wherever `- Child` works, and vice versa
- `+`, `?`, `!` prefix items (SWOT-style) are treated as plain items in any non-SWOT type
- `-` items in `swot` are treated as weaknesses at top level, plain bullets when nested

---

## Syntax patterns

Most of the 101 layout types share one of five input patterns. Visual rendering varies; syntax does not.

---

### 1 · Flat list

```
- Item one
- Item two
- Item three
```

Or as an arrow chain: `Step 1 -> Step 2 -> Step 3`

**Process** — process, chevron-process, arrow-process, circular-process, waterfall, snake-process, bending-process, step-up, step-down
**Cycle** — cycle, donut-cycle, block-cycle, gear-cycle, nondirectional-cycle, multidirectional-cycle, loop, spiral
**List** — bullet-list, numbered-list, chevron-list, hexagon-list, zigzag-list, trapezoid-list
**Pyramid** — pyramid, inverted-pyramid, pyramid-list, diamond-pyramid
**Relationship** — concentric, target, web, converging, diverging, plus, bracket, bracket-tree

Value adds a sub-label inside each shape for: `circle-process`, `funnel` (counts), `roadmap` (phase names), `timeline-h`/`timeline-v` (dates).

```mdart chevron-process
Discovery -> Design -> Build -> Test -> Deploy
```

---

### 2 · Flat list with percentage value

```
- Label: 75
- Label: 75%
```

Bare numbers and `%`-suffixed are identical — the parser strips `%` before interpreting.

**Statistical** — progress-list, waffle, gauge, radar, segmented-bar, segmented-cycle, segmented-pyramid
**Note:** `treemap` accepts values but uses them as display text only; cell size is uniform.

`gauge` colours by threshold: green ≥ 70 %, amber ≥ 40 %, red < 40 %.
`bullet-chart` and `scorecard` have their own value format — see §5.

```mdart gauge
title: System Health
- Uptime: 98
- Coverage: 64
- Error Rate: 22
```

---

### 3 · Nested list

```
- Parent
  - Child
  - Child
    - Grandchild
```

**Hierarchy** — org-chart, h-org-chart, tree, hierarchy-list, sitemap, radial-tree, decision-tree, mind-map, bracket-tree
**Process** — phase-process (phases → tasks), swimlane (lanes → tasks)
**List** — card-list (cards → bullets), tab-list (tabs → content)
**Planning** — kanban / sprint-board (columns → cards), wbs (work breakdown tree)
**Relationship** — cluster (groups → items), venn-4 (circles → items), balance / counterbalance / opposing-arrows (two sides → points)
**Matrix** — matrix-2x2, bcg, ansoff, pros-cons (each quadrant/side → child items)
**Technical** — layered-arch (layers → components)

```mdart mind-map
- Product
  - Mobile
    - iOS
    - Android
  - Web
    - Dashboard
    - API
  - Platform
    - Auth
    - Billing
```

---

### 4 · Flow children

```
- Node A
  -> Node B: edge label
  -> Node C
- Node B
  -> Node D: edge label
```

| Type | Nodes are | Edges are |
|---|---|---|
| `network` | infrastructure nodes | connections (label optional) |
| `sequence` | actors | ordered messages (return arrows auto-inferred) |
| `state-machine` | states | transitions with event label |

`state-machine` extras: `[final]` attr on a state adds a double border; states named `End` or `Final` are auto-detected as final.

```mdart sequence
title: Login Flow
- Client
  -> Auth: POST /login
- Auth
  -> DB: SELECT user
- DB
  -> Auth: user row
- Auth
  -> Client: 200 OK + token
```

---

### 5 · Special syntax

Types that don't fit the patterns above.

#### `swot`
Prefix character determines quadrant — no `- Item` bullets needed.
```
+ Strength
- Weakness
? Opportunity
! Threat
```

```mdart swot
title: Market Entry
+ Strong engineering team
+ Low infrastructure cost
- Limited brand recognition
- Small sales force
? Emerging market segment
? Partnership opportunities
! Established incumbents
! Regulatory uncertainty
```

#### `comparison`
Top-level items = **rows** (attributes); children = `Column: value` pairs.
```
- Type
  - Postgres: Relational
  - Mongo: Document
- Scale
  - Postgres: Vertical
  - Mongo: Horizontal
```

```mdart comparison
title: Database Comparison
- Storage model
  - PostgreSQL: Relational
  - MongoDB: Document
  - Redis: Key-value
- Scaling
  - PostgreSQL: Vertical
  - MongoDB: Horizontal
  - Redis: In-memory
- Best for
  - PostgreSQL: OLTP / analytics
  - MongoDB: Flexible schemas
  - Redis: Caching / sessions
```

#### `matrix-nxm`
Top-level items = rows; children = cell values in column order.
```
- Alice
  - Expert
  - Proficient
- Bob
  - Proficient
  - Expert
```

```mdart matrix-nxm
title: Skills Matrix
- Alice
  - Expert
  - Proficient
  - Learning
- Bob
  - Proficient
  - Expert
  - Proficient
- Carol
  - Learning
  - Proficient
  - Expert
```

#### `heatmap`
Top-level items = rows; children = cells. Value sets colour intensity.
```
- Mon
  - Morning: 5     ← key: value  →  labelled cell
  - Midday: 12
- Tue
  - 8              ← plain number →  number shown as label
  - 14
```

```mdart heatmap
title: Support Tickets by Day & Shift
- Mon
  - Morning: 4
  - Afternoon: 14
  - Evening: 7
- Wed
  - Morning: 9
  - Afternoon: 18
  - Evening: 3
- Fri
  - Morning: 12
  - Afternoon: 11
  - Evening: 6
```

#### `sankey`
Top-level items = sources with `value` = flow weight; children = destination names.
```
- Organic: 45
  - Blog
  - Docs
- Paid: 30
  - Landing Page
```

```mdart sankey
title: Traffic Sources
- Organic: 45
  - Blog
  - Docs
- Paid: 30
  - Landing Page
  - Demo
- Referral: 25
  - Signup
  - Pricing
```

#### `gantt` · `gantt-lite`
Range in `[wkN–wkN]` attr. Milestones use `*` prefix with a single week.
```
- Research [wk1–wk2]
- Build    [wk2–wk6]
* Launch   [wk6]
```
> ISO date strings are not supported — use week numbers.

```mdart gantt-lite
title: Q2 Roadmap
- Discovery [wk1–wk2]
- Design [wk2–wk4]
- Engineering [wk4–wk10]
- QA & Staging [wk9–wk11]
* Beta Launch [wk11]
- Rollout [wk11–wk13]
* GA Release [wk13]
```

#### `pipeline`
Single item whose label is an inline arrow chain.
```
- Source -> Lint -> Test -> Build -> Deploy
```

```mdart pipeline
- Checkout -> Lint -> Test -> Build -> Push -> Deploy
```

#### `entity`
Top-level = tables; children = fields. Attrs: `[PK]`, `[FK->table]`.
```
- users
  - id [PK]
  - team_id [FK->teams]
  - email
```

```mdart entity
title: Blog Schema
- posts
  - id: int [PK]
  - title: varchar
  - author_id: int [FK->users]
- users
  - id: int [PK]
  - name: varchar
  - email: varchar
- comments
  - id: int [PK]
  - post_id: int [FK->posts]
  - body: text
```

#### `class`
Top-level = classes (`[abstract]`, `[interface]`). Children = members.
Visibility prefix — bare char or bracket form, both accepted:

| `+` or `[+]` | public | `-` or `[-]` | private | `#` or `[#]` | protected | `~` or `[~]` | package |

Members with `()` = methods; without = fields. Method attr `[static]` underlines.
```
- Animal [abstract]
  - + name
  - + speak() [abstract]
- Dog
  - [+] speak()
  - [-] breed
```

```mdart class
title: Animals
- Animal [abstract]
  - + name: string
  - + speak(): string [abstract]
  - + breathe() [static]
- Pet [interface]
  - + owner: string
- Dog
  - - breed: string
  - + speak(): string
  - + fetch()
```

#### `venn` · `venn-3`
Children inside each circle; a peer item containing `∩` labels the intersection.
```
- Design
  - UX Research
- Engineering
  - Backend
- Design ∩ Engineering
```

```mdart venn-3
title: Full-Stack Skills
- Frontend
  - React
  - CSS
- Backend
  - Node.js
  - SQL
- DevOps
  - Docker
  - CI/CD
- Frontend ∩ Backend
- Backend ∩ DevOps
- Frontend ∩ DevOps
```

#### `ribbon-list` · `block-list`
`- Label: description` — label rendered as header, description as body text.
```
- Vision: The long-term direction of the company
- Mission: Why we exist and who we serve
- Values: Principles that guide every decision
```

```mdart ribbon-list
title: Company Pillars
- Vision: Build tools that make developers 10x more productive
- Mission: Reduce friction between idea and deployed software
- Values: Ship fast, own the outcome, default to open
```

#### `icon-list`
`- Label: description [emoji]` — emoji or icon in brackets at end.
```
- Security: Encrypted at rest [🔒]
- Speed: Sub-100ms API [⚡]
```

```mdart icon-list
title: Platform Features
- Security: Zero-trust, encrypted at rest and in transit [🔒]
- Performance: Sub-50ms p99 response time [⚡]
- Reliability: 99.99% uptime SLA [🛡️]
- Observability: Full trace, log, and metric pipeline [📊]
```

#### `bullet-chart`
`- Label: actual [target]` — actual value bar plotted against a target marker, over danger/warning/good bands.
```
- Revenue: 78 [85]
- Pipeline: 62 [70]
- Retention: 91 [90]
```

```mdart bullet-chart
title: Sales vs Target
- Revenue: 78 [85]
- Pipeline: 62 [70]
- Win Rate: 91 [90]
- New Logos: 44 [60]
```

#### `scorecard`
`- Label: value [trend]` — value displayed prominently, trend shown as a muted badge.
```
- MRR: $128K [+12%]
- Churn: 2.1% [-0.3%]
- MAU: 48,200 [+8%]
```

```mdart scorecard
title: Monthly Metrics
- MRR: $128K [+12%]
- Churn: 2.1% [-0.3%]
- MAU: 48,200 [+8%]
- NPS: 72 [+5]
```

---

## Themes

Each diagram family has its own default color scheme. Override with `theme:` in front-matter, `configureMdArt()` globally, or plugin-level config.

### Named themes

| Name | Hue | Default for |
|---|---|---|
| `mono-light` | Neutral light | — |
| `mono-dark` | Neutral dark | — |
| `cyan` | Cyan | list types |
| `emerald` | Green | process, statistical |
| `violet` | Purple | cycle |
| `lavender` | Light purple | planning |
| `amber` | Gold | hierarchy |
| `orange` | Orange | pyramid |
| `rose` | Red-pink | relationship |
| `blue` | Blue | matrix |
| `sky` | Sky blue | technical |

````mdart
type: venn
theme: sky
title: Cloud & Edge

- Cloud Computing
  - Auto-scaling
  - Managed services
- Edge Computing
  - Low latency
  - Offline capable
- A ∩ B
  - Hybrid workloads
````

### Global configuration

Set defaults once at app startup — applies to every diagram rendered in that process:

```ts
import { configureMdArt } from 'mdart'

// Use mono-light theme for all diagrams
configureMdArt({ theme: 'mono-light' })

// Override specific colors globally
configureMdArt({ colors: { bg: '#0f172a', surface: '#1e293b' } })
```

Reset to defaults (useful in tests):

```ts
import { resetMdArtConfig } from 'mdart'
resetMdArtConfig()
```

### Plugin-level config

Passed to the plugin factory — overrides global config, but still below per-fence front-matter:

```ts
// marked
const marked = new Marked({ extensions: [mdartExtension({ theme: 'mono-light' })] })

// markdown-it
const md = new MarkdownIt().use(mdartPlugin({ theme: 'mono-light' }))

// remark/unified
unified().use(remarkMdart({ theme: 'mono-light' }))
```

### Priority (lowest → highest)

```
family default  <  global config  <  plugin config  <  per-fence front-matter
```

---

## Color overrides (front-matter)

Any theme color can be overridden per fence via front-matter key: value pairs. All fields are hex strings except `palette` (comma-separated list).

| Key | Default | Used by |
|---|---|---|
| `primary` | theme | shapes, bars |
| `secondary` | theme | gradients, FK badges |
| `accent` | theme | highlights, positive trend, good-threshold fill |
| `muted` | theme | track backgrounds, fills |
| `bg` | theme | SVG background |
| `surface` | theme | card/box backgrounds |
| `border` | theme | strokes |
| `text` | theme | primary labels |
| `textMuted` | theme | secondary labels |
| `danger` | `#f87171` | < 40% threshold (gauges, progress bars, bullet charts) |
| `warning` | `#fbbf24` | 40–70% threshold (gauges, progress bars, bullet charts) |
| `palette` | `#f59e0b, #ec4899, #06b6d4, #8b5cf6` | extra colors in treemap, waffle, sankey |

**`bg` / `surface` / `border`** — control the canvas background, card/box fills, and stroke colors:

```mdart
type: scorecard
title: Q3 KPIs
bg: #0f172a
surface: #1e293b
border: #334155

- ARR: $4.2M [+22%]
- Churn: 1.8% [-0.4%]
- NPS: 68 [+5]
- CAC: $320 [-12%]
```

**`primary` / `secondary` / `muted`** — control shape fills, gradients, and background tracks:

```mdart
type: cycle
title: Release Cycle
primary: #f97316
secondary: #c2410c
muted: #431407

- Plan
- Build
- Test
- Ship
```

**`text` / `textMuted`** — override label and secondary text colors (useful when pairing with a light `bg`):

```mdart
type: bullet-list
title: Principles
bg: #fafaf9
surface: #f5f5f4
border: #d6d3d1
primary: #0369a1
text: #1c1917
textMuted: #78716c

- Design for the user first
- Ship small and iterate
- Measure before optimizing
- Leave the code better than you found it
```

**`danger` / `warning` / `accent`** — override the three threshold colors used in gauges, progress bars, and bullet charts:

```mdart
type: progress-list
title: Sprint Health
danger: #dc2626
warning: #ea580c
accent: #16a34a

- Tests Passing: 91
- Code Coverage: 58
- Open Bugs: 22
- Velocity: 74
```

**`palette`** — override the extended color set used in treemap, waffle, and sankey:

```mdart
type: waffle
title: Team Allocation
palette: #6366f1, #f43f5e, #14b8a6, #f59e0b

- Engineering: 45
- Product: 25
- Design: 20
- Other: 10
```

```mdart
type: treemap
title: Codebase Breakdown
palette: #7c3aed, #0891b2, #059669, #d97706, #be185d

- Core: 38%
- API: 22%
- UI: 18%
- Tests: 14%
- Infra: 8%
```

---

## Status & modifier attrs

| Attr | Applies to | Effect |
|---|---|---|
| `[done]` | checklist, kanban, sprint-board, timeline, milestone, wbs | Completed styling |
| `[active]` | kanban, sprint-board, timeline, milestone, wbs | In-progress highlight |
| `[final]` | state-machine states | Double-border |
| `[abstract]` | class classes | Italic name |
| `[interface]` | class classes | «interface» label |
| `[static]` | class methods | Underlined |
| `[PK]` / `[FK->t]` | entity fields | Key badges |

**`[done]` / `[active]`** — mark completed and in-progress items in task-tracking layouts:

```mdart sprint-board
title: Sprint 14
- Backlog
  - Write API docs
  - Add dark mode
- In Progress [active]
  - Auth redesign [active]
  - Fix search bug [active]
- Done
  - Login page [done]
  - Unit tests [done]
  - CI pipeline [done]
```

**`[final]`** — marks terminal states in state machines with a double border:

```mdart state-machine
title: Order Lifecycle
- Pending
  -> Processing: payment_confirmed
- Processing
  -> Shipped: fulfilment_complete
  -> Cancelled: payment_failed
- Shipped
  -> Delivered: delivery_confirmed
- Delivered [final]
- Cancelled [final]
```

**`[abstract]` / `[interface]` / `[static]`** — class diagram modifiers:

```mdart class
title: Shape Hierarchy
- Shape [abstract]
  - + color: string
  - + area(): float [abstract]
  - + describe() [static]
- Drawable [interface]
  - + draw()
- Circle
  - - radius: float
  - + area(): float
  - + draw()
- Rectangle
  - - width: float
  - - height: float
  - + area(): float
  - + draw()
```

**`[PK]` / `[FK->table]`** — mark primary and foreign keys in entity diagrams:

```mdart entity
title: E-Commerce Schema
- orders
  - id: int [PK]
  - customer_id: int [FK->customers]
  - product_id: int [FK->products]
  - total: decimal
- customers
  - id: int [PK]
  - email: varchar
  - name: varchar
- products
  - id: int [PK]
  - sku: varchar
  - price: decimal
```
