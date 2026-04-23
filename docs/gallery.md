# MdArt Layout Reference

**97 layouts across 10 families.** Every layout type with its source and rendered output.

See the [interactive playground](https://github.com/mdart/mdart) for live editing, or open [gallery.html](./gallery.html) for a richer viewer.

## Contents

- [Process (17)](#process)
- [List (15)](#list)
- [Cycle (9)](#cycle)
- [Hierarchy (9)](#hierarchy)
- [Matrix (7)](#matrix)
- [Pyramid (5)](#pyramid)
- [Relationship (13)](#relationship)
- [Statistical (9)](#statistical)
- [Planning (6)](#planning)
- [Technical (7)](#technical)

---

## Process

_Sequential steps, flows, and pipelines._

### `process`

```
type: process
- Discovery
- Design
- Build
- Test
- Deploy
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/process.svg">
  <img alt="process" src="./examples/gallery/process-light.svg">
</picture>

### `chevron-process`

```
type: chevron-process
- Discovery
- Design
- Build
- Test
- Deploy
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/chevron-process.svg">
  <img alt="chevron-process" src="./examples/gallery/chevron-process-light.svg">
</picture>

### `arrow-process`

```
type: arrow-process
- Research
- Prototype
- Build
- Launch
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/arrow-process.svg">
  <img alt="arrow-process" src="./examples/gallery/arrow-process-light.svg">
</picture>

### `circular-process`

```
type: circular-process
- Plan
- Build
- Test
- Ship
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/circular-process.svg">
  <img alt="circular-process" src="./examples/gallery/circular-process-light.svg">
</picture>

### `funnel`

```
type: funnel
- Awareness
- Interest
- Consideration
- Purchase
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/funnel.svg">
  <img alt="funnel" src="./examples/gallery/funnel-light.svg">
</picture>

### `roadmap`

```
type: roadmap
- Q1: Foundation
- Q2: Beta Launch
- Q3: Growth
- Q4: Scale
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/roadmap.svg">
  <img alt="roadmap" src="./examples/gallery/roadmap-light.svg">
</picture>

### `waterfall`

```
type: waterfall
- Requirements
- Design
- Development
- Testing
- Deployment
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/waterfall.svg">
  <img alt="waterfall" src="./examples/gallery/waterfall-light.svg">
</picture>

### `step-up`

```
type: step-up
- Awareness
- Consideration
- Evaluation
- Purchase
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/step-up.svg">
  <img alt="step-up" src="./examples/gallery/step-up-light.svg">
</picture>

### `step-down`

```
type: step-down
- Kickoff
- Design
- Build
- Release
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/step-down.svg">
  <img alt="step-down" src="./examples/gallery/step-down-light.svg">
</picture>

### `circle-process`

```
type: circle-process
- Ideate: Ideas
- Design: Prototype
- Build: Implement
- Ship: Launch
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/circle-process.svg">
  <img alt="circle-process" src="./examples/gallery/circle-process-light.svg">
</picture>

### `equation`

```
type: equation
- People
  - Team skills
  - Culture
- Process
  - Workflows
  - Systems
- Results
  - Outcomes
  - Impact
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/equation.svg">
  <img alt="equation" src="./examples/gallery/equation-light.svg">
</picture>

### `bending-process`

```
type: bending-process
- Research
- Design
- Prototype
- Test
- Review
- Launch
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/bending-process.svg">
  <img alt="bending-process" src="./examples/gallery/bending-process-light.svg">
</picture>

### `segmented-bar`

```
type: segmented-bar
title: Project Timeline · 12 weeks
- Discovery: 15%
- Design: 20%
- Development: 50%
- Launch: 15%
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/segmented-bar.svg">
  <img alt="segmented-bar" src="./examples/gallery/segmented-bar-light.svg">
</picture>

### `phase-process`

```
type: phase-process
- Discovery
  - User Research
  - Stakeholders
- Design
  - Wireframes
  - Prototype
- Build
  - Sprint 1
  - Sprint 2
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/phase-process.svg">
  <img alt="phase-process" src="./examples/gallery/phase-process-light.svg">
</picture>

### `timeline-h`

```
type: timeline-h
- Kickoff: Jan
- Design: Mar
- Beta: Jun
- Review: Sep
- Ship: Dec
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/timeline-h.svg">
  <img alt="timeline-h" src="./examples/gallery/timeline-h-light.svg">
</picture>

### `timeline-v`

```
type: timeline-v
- Project Kickoff: Jan '24
  - Team assembled
- Design Complete: Apr '24
  - Approved
- Beta Launch: Aug '24
  - 500 early users
- GA Release: Dec '24
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/timeline-v.svg">
  <img alt="timeline-v" src="./examples/gallery/timeline-v-light.svg">
</picture>

### `swimlane`

```
type: swimlane
- Customer
  - Request
  - Confirm
- Sales
  - Review
  - Propose
  - Close
- Support
  - Onboard
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/swimlane.svg">
  <img alt="swimlane" src="./examples/gallery/swimlane-light.svg">
</picture>

---

## List

_Structured lists with distinct visual treatments._

### `bullet-list`

```
type: bullet-list
- Fast iteration cycles
- Clear ownership
- Continuous feedback
- Data-driven decisions
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/bullet-list.svg">
  <img alt="bullet-list" src="./examples/gallery/bullet-list-light.svg">
</picture>

### `numbered-list`

```
type: numbered-list
- Define the problem
- Research solutions
- Prototype quickly
- Validate with users
- Ship and iterate
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/numbered-list.svg">
  <img alt="numbered-list" src="./examples/gallery/numbered-list-light.svg">
</picture>

### `checklist`

```
type: checklist
- Set up CI/CD pipeline [done]
- Write unit tests [done]
- Add integration tests [done]
- Performance profiling
- Security audit
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/checklist.svg">
  <img alt="checklist" src="./examples/gallery/checklist-light.svg">
</picture>

### `two-column-list`

```
type: two-column-list
- Planning: Define scope
- Planning: Set milestones
- Execution: Build features
- Execution: Fix bugs
- Review: Demo to stakeholders
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/two-column-list.svg">
  <img alt="two-column-list" src="./examples/gallery/two-column-list-light.svg">
</picture>

### `timeline-list`

```
type: timeline-list
- 2022: Founded
- 2023: Seed round
- 2024: Product launch
- 2025: Series A
- 2026: Expansion
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/timeline-list.svg">
  <img alt="timeline-list" src="./examples/gallery/timeline-list-light.svg">
</picture>

### `block-list`

```
type: block-list
- Strategy: Define your approach
- Design: Shape the solution
- Build: Execute the plan
- Launch: Ship to the world
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/block-list.svg">
  <img alt="block-list" src="./examples/gallery/block-list-light.svg">
</picture>

### `chevron-list`

```
type: chevron-list
- Awareness
- Consideration
- Decision
- Action
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/chevron-list.svg">
  <img alt="chevron-list" src="./examples/gallery/chevron-list-light.svg">
</picture>

### `card-list`

```
type: card-list
- Design
  - UI/UX
  - Figma
- Engineering
  - Frontend
  - Backend
- Growth
  - Marketing
  - Sales
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/card-list.svg">
  <img alt="card-list" src="./examples/gallery/card-list-light.svg">
</picture>

### `zigzag-list`

```
type: zigzag-list
- Research
- Prototype
- Test
- Launch
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/zigzag-list.svg">
  <img alt="zigzag-list" src="./examples/gallery/zigzag-list-light.svg">
</picture>

### `ribbon-list`

```
type: ribbon-list
- Vision: Long-term direction of the company
- Mission: Why we exist and who we serve
- Values: Principles that guide every decision
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/ribbon-list.svg">
  <img alt="ribbon-list" src="./examples/gallery/ribbon-list-light.svg">
</picture>

### `hexagon-list`

```
type: hexagon-list
- Speed
- Scale
- Trust
- Quality
- Impact
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/hexagon-list.svg">
  <img alt="hexagon-list" src="./examples/gallery/hexagon-list-light.svg">
</picture>

### `trapezoid-list`

```
type: trapezoid-list
- Executive
- Management
- Operations
- Foundation
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/trapezoid-list.svg">
  <img alt="trapezoid-list" src="./examples/gallery/trapezoid-list-light.svg">
</picture>

### `tab-list`

```
type: tab-list
- Team
  - Engineers
  - Designers
- Process
  - Planning
  - Reviews
- Tools
  - Figma
  - GitHub
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/tab-list.svg">
  <img alt="tab-list" src="./examples/gallery/tab-list-light.svg">
</picture>

### `circle-list`

```
type: circle-list
- Discovery: Research & requirements
- Planning: Scope & architecture
- Execution: Build & iterate
- Launch: Monitor & optimize
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/circle-list.svg">
  <img alt="circle-list" src="./examples/gallery/circle-list-light.svg">
</picture>

### `icon-list`

```
type: icon-list
- Performance: Sub-100ms response [⚡]
- Security: End-to-end encrypted [🔒]
- Analytics: Real-time insights [📊]
- Collaboration: Shared workspaces [🤝]
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/icon-list.svg">
  <img alt="icon-list" src="./examples/gallery/icon-list-light.svg">
</picture>

---

## Cycle

_Circular and recurring flows._

### `cycle`

```
type: cycle
- Plan
- Execute
- Measure
- Learn
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/cycle.svg">
  <img alt="cycle" src="./examples/gallery/cycle-light.svg">
</picture>

### `donut-cycle`

```
type: donut-cycle
- Ideate
- Prototype
- Test
- Refine
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/donut-cycle.svg">
  <img alt="donut-cycle" src="./examples/gallery/donut-cycle-light.svg">
</picture>

### `gear-cycle`

```
type: gear-cycle
- Intake
- Process
- Output
- Review
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/gear-cycle.svg">
  <img alt="gear-cycle" src="./examples/gallery/gear-cycle-light.svg">
</picture>

### `spiral`

```
type: spiral
- MVP
- Beta
- v1.0
- v2.0
- v3.0
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/spiral.svg">
  <img alt="spiral" src="./examples/gallery/spiral-light.svg">
</picture>

### `block-cycle`

```
type: block-cycle
- Research
- Design
- Build
- Launch
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/block-cycle.svg">
  <img alt="block-cycle" src="./examples/gallery/block-cycle-light.svg">
</picture>

### `segmented-cycle`

```
type: segmented-cycle
- Discovery
- Planning
- Execution
- Review
- Retrospective
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/segmented-cycle.svg">
  <img alt="segmented-cycle" src="./examples/gallery/segmented-cycle-light.svg">
</picture>

### `nondirectional-cycle`

```
type: nondirectional-cycle
- Brand
- Product
- Sales
- Support
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/nondirectional-cycle.svg">
  <img alt="nondirectional-cycle" src="./examples/gallery/nondirectional-cycle-light.svg">
</picture>

### `multidirectional-cycle`

```
type: multidirectional-cycle
- Strategy
- Design
- Engineering
- Data
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/multidirectional-cycle.svg">
  <img alt="multidirectional-cycle" src="./examples/gallery/multidirectional-cycle-light.svg">
</picture>

### `loop`

```
type: loop
- Collect
- Analyze
- Act
- Monitor
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/loop.svg">
  <img alt="loop" src="./examples/gallery/loop-light.svg">
</picture>

---

## Hierarchy

_Org charts, trees, and mind maps._

### `org-chart`

```
type: org-chart
- CEO
  - CTO
    - Engineering Lead
    - Architect
  - CFO
    - Controller
  - CMO
    - Brand
    - Growth
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/org-chart.svg">
  <img alt="org-chart" src="./examples/gallery/org-chart-light.svg">
</picture>

### `h-org-chart`

```
type: h-org-chart
- CEO
  - Engineering
    - Frontend
    - Backend
  - Product
    - Design
    - Research
  - Operations
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/h-org-chart.svg">
  <img alt="h-org-chart" src="./examples/gallery/h-org-chart-light.svg">
</picture>

### `tree`

```
type: tree
- Frontend
  - React
    - Components
    - Hooks
  - CSS
    - Tailwind
- Backend
  - Node
    - Routes
  - Database
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/tree.svg">
  <img alt="tree" src="./examples/gallery/tree-light.svg">
</picture>

### `hierarchy-list`

```
type: hierarchy-list
- Platform
  - Frontend
    - React App
    - Design System
  - Backend
    - API Server
  - Infrastructure
    - nginx
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/hierarchy-list.svg">
  <img alt="hierarchy-list" src="./examples/gallery/hierarchy-list-light.svg">
</picture>

### `radial-tree`

```
type: radial-tree
title: Product Platform
- Mobile
  - iOS
  - Android
- Web
  - React
  - API
- Data
  - Analytics
  - ML
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/radial-tree.svg">
  <img alt="radial-tree" src="./examples/gallery/radial-tree-light.svg">
</picture>

### `decision-tree`

```
type: decision-tree
- Urgent?
  - Do Now
  - Important?
    - Schedule
    - Eliminate
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/decision-tree.svg">
  <img alt="decision-tree" src="./examples/gallery/decision-tree-light.svg">
</picture>

### `sitemap`

```
type: sitemap
- acme.io
  - Home
  - Products
    - Free
    - Pro
  - Docs
    - Guides
    - API Ref
  - About
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/sitemap.svg">
  <img alt="sitemap" src="./examples/gallery/sitemap-light.svg">
</picture>

### `bracket`

```
type: bracket
- Q1 Winner
- Q2 Winner
- Q3 Winner
- Q4 Winner
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/bracket.svg">
  <img alt="bracket" src="./examples/gallery/bracket-light.svg">
</picture>

### `mind-map`

```
type: mind-map
title: Product Strategy
- Market
  - B2B
  - Enterprise
- Technology
  - Mobile
  - API
- Growth
  - SEO
- Revenue
  - Subscriptions
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/mind-map.svg">
  <img alt="mind-map" src="./examples/gallery/mind-map-light.svg">
</picture>

---

## Matrix

_Comparisons, SWOT, 2×2 grids, BCG, and Ansoff._

### `swot`

```
type: swot
title: Product Launch
+ Strong brand
+ Experienced team
- High CAC
- No mobile app
? Asia-Pacific expansion
? Enterprise tier
! New competitor funding
! Regulatory changes
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/swot.svg">
  <img alt="swot" src="./examples/gallery/swot-light.svg">
</picture>

### `pros-cons`

```
type: pros-cons
- Pros
  - Fast time to market
  - Low upfront cost
  - Flexible scaling
- Cons
  - Vendor lock-in
  - Less customization
  - Ongoing SaaS fees
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/pros-cons.svg">
  <img alt="pros-cons" src="./examples/gallery/pros-cons-light.svg">
</picture>

### `comparison`

```
type: comparison
- Feature
  - Starter: Basic
  - Pro: Advanced
  - Enterprise: Custom
- Storage
  - Starter: 10 GB
  - Pro: 100 GB
  - Enterprise: Unlimited
- Support
  - Starter: Community
  - Pro: Email
  - Enterprise: Dedicated
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/comparison.svg">
  <img alt="comparison" src="./examples/gallery/comparison-light.svg">
</picture>

### `matrix-2x2`

```
type: matrix-2x2
title: Prioritization Matrix
- Quick Wins
  - Fix login bug
  - Add dark mode
- Big Bets
  - Mobile app
  - AI features
- Fill-ins
  - Tooltip polish
- Avoid
  - Legacy API
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/matrix-2x2.svg">
  <img alt="matrix-2x2" src="./examples/gallery/matrix-2x2-light.svg">
</picture>

### `bcg`

```
type: bcg
title: Product Portfolio
- Stars
  - Platform API
  - Analytics Pro
- Question Marks
  - Mobile SDK
  - AI Assistant
- Cash Cows
  - Core SaaS
- Dogs
  - Legacy Export
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/bcg.svg">
  <img alt="bcg" src="./examples/gallery/bcg-light.svg">
</picture>

### `ansoff`

```
type: ansoff
title: Growth Strategy
- Market Penetration
  - Loyalty program
  - Upsell campaigns
- Product Development
  - Mobile app
  - API v2
- Market Development
  - Asia-Pacific
- Diversification
  - Marketplace
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/ansoff.svg">
  <img alt="ansoff" src="./examples/gallery/ansoff-light.svg">
</picture>

### `matrix-nxm`

```
type: matrix-nxm
title: Skills Matrix
- Alice
  - Expert
  - Proficient
  - Learning
- Bob
  - Proficient
  - Expert
  - Expert
- Carol
  - Learning
  - Proficient
  - Expert
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/matrix-nxm.svg">
  <img alt="matrix-nxm" src="./examples/gallery/matrix-nxm-light.svg">
</picture>

---

## Pyramid

_Stacked tiers showing hierarchy or importance._

### `pyramid`

```
type: pyramid
title: Maslow's Hierarchy
- Self-actualization
- Esteem
- Love & Belonging
- Safety
- Physiological
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/pyramid.svg">
  <img alt="pyramid" src="./examples/gallery/pyramid-light.svg">
</picture>

### `inverted-pyramid`

```
type: inverted-pyramid
title: Acquisition Funnel
- Awareness
- Interest
- Consideration
- Intent
- Purchase
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/inverted-pyramid.svg">
  <img alt="inverted-pyramid" src="./examples/gallery/inverted-pyramid-light.svg">
</picture>

### `pyramid-list`

```
type: pyramid-list
- Vision
- Strategy
- Tactics
- Actions
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/pyramid-list.svg">
  <img alt="pyramid-list" src="./examples/gallery/pyramid-list-light.svg">
</picture>

### `segmented-pyramid`

```
type: segmented-pyramid
title: Investment Allocation
- Speculative: 5%
- Growth: 20%
- Balanced: 35%
- Conservative: 40%
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/segmented-pyramid.svg">
  <img alt="segmented-pyramid" src="./examples/gallery/segmented-pyramid-light.svg">
</picture>

### `diamond-pyramid`

```
type: diamond-pyramid
- Niche
- Early Adopters
- Mainstream
- Late Majority
- Laggards
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/diamond-pyramid.svg">
  <img alt="diamond-pyramid" src="./examples/gallery/diamond-pyramid-light.svg">
</picture>

---

## Relationship

_Venn diagrams, concentric rings, and connection maps._

### `venn`

```
type: venn
- Design
  - UX Research
  - Prototyping
- Engineering
  - Frontend
  - Backend
- Product ∩ Engineering
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/venn.svg">
  <img alt="venn" src="./examples/gallery/venn-light.svg">
</picture>

### `venn-3`

```
type: venn-3
- Marketing
- Sales
- Product
- All Three ∩
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/venn-3.svg">
  <img alt="venn-3" src="./examples/gallery/venn-3-light.svg">
</picture>

### `venn-4`

```
type: venn-4
- Strategy
  - OKRs
- Design
  - Brand
- Engineering
  - Frontend
- Data
  - Analytics
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/venn-4.svg">
  <img alt="venn-4" src="./examples/gallery/venn-4-light.svg">
</picture>

### `concentric`

```
type: concentric
title: Organizational Layers
- Organization
- Department
- Team
- Individual
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/concentric.svg">
  <img alt="concentric" src="./examples/gallery/concentric-light.svg">
</picture>

### `balance`

```
type: balance
- Benefits
  - Speed
  - Flexibility
  - Cost
- Risks
  - Complexity
  - Dependencies
  - Maintenance
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/balance.svg">
  <img alt="balance" src="./examples/gallery/balance-light.svg">
</picture>

### `opposing-arrows`

```
type: opposing-arrows
- Supply
  - Inventory
  - Production
  - Logistics
- Demand
  - Orders
  - Forecast
  - Trends
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/opposing-arrows.svg">
  <img alt="opposing-arrows" src="./examples/gallery/opposing-arrows-light.svg">
</picture>

### `web`

```
type: web
title: Team Dependencies
- Frontend
- Backend
- Design
- Data
- DevOps
- QA
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/web.svg">
  <img alt="web" src="./examples/gallery/web-light.svg">
</picture>

### `cluster`

```
type: cluster
title: Engineering Org
- Platform
  - Core API
  - Auth
- Product
  - Search
  - Feed
- Infrastructure
  - Compute
  - Storage
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/cluster.svg">
  <img alt="cluster" src="./examples/gallery/cluster-light.svg">
</picture>

### `target`

```
type: target
title: Focus Areas
- Core Goal
- Must Have
- Should Have
- Nice to Have
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/target.svg">
  <img alt="target" src="./examples/gallery/target-light.svg">
</picture>

### `radial`

```
type: radial
title: Platform
- Mobile
  - iOS
  - Android
- Web
  - React
  - API
- Data
  - Analytics
- Design
  - UI
- Security
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/radial.svg">
  <img alt="radial" src="./examples/gallery/radial-light.svg">
</picture>

### `converging`

```
type: converging
title: Product Success
- User Research
- Market Analysis
- Technical Feasibility
- Business Viability
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/converging.svg">
  <img alt="converging" src="./examples/gallery/converging-light.svg">
</picture>

### `diverging`

```
type: diverging
title: Platform APIs
- Core Platform
- Mobile SDK
- Web Embed
- Partner API
- Webhooks
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/diverging.svg">
  <img alt="diverging" src="./examples/gallery/diverging-light.svg">
</picture>

### `plus`

```
type: plus
title: Growth Framework
- Acquire
- Activate
- Retain
- Revenue
- Referral
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/plus.svg">
  <img alt="plus" src="./examples/gallery/plus-light.svg">
</picture>

---

## Statistical

_Progress bars, scorecards, charts, and data visualizations._

### `progress-list`

```
type: progress-list
title: Q4 KPIs
- Revenue: 87%
- Customer Retention: 92%
- NPS Score: 64%
- Bug Resolution: 45%
- Feature Delivery: 73%
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/progress-list.svg">
  <img alt="progress-list" src="./examples/gallery/progress-list-light.svg">
</picture>

### `bullet-chart`

```
type: bullet-chart
title: Sales vs Target
- Revenue: 78 [85]
- Pipeline: 62 [70]
- Deals Closed: 91 [80]
- Retention: 88 [90]
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/bullet-chart.svg">
  <img alt="bullet-chart" src="./examples/gallery/bullet-chart-light.svg">
</picture>

### `scorecard`

```
type: scorecard
title: Monthly Metrics
- MRR: $128K [+12%]
- Churn: 2.1% [-0.3%]
- MAU: 48,200 [+8%]
- ARPU: $2.65 [+4%]
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/scorecard.svg">
  <img alt="scorecard" src="./examples/gallery/scorecard-light.svg">
</picture>

### `treemap`

```
type: treemap
title: Time Allocation
- Feature Dev: 40%
- Bug Fixes: 20%
- Planning: 15%
- Code Review: 12%
- Infra: 8%
- Docs: 5%
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/treemap.svg">
  <img alt="treemap" src="./examples/gallery/treemap-light.svg">
</picture>

### `sankey`

```
type: sankey
title: Traffic Sources
- Organic: 45
  - Landing Page
  - Blog
  - Docs
- Paid: 30
  - Landing Page
  - Pricing
- Direct: 25
  - Dashboard
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/sankey.svg">
  <img alt="sankey" src="./examples/gallery/sankey-light.svg">
</picture>

### `waffle`

```
type: waffle
title: Budget Allocation
- Engineering: 30%
- Marketing: 20%
- Sales: 10%
- Operations: 10%
- Other: 30%
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/waffle.svg">
  <img alt="waffle" src="./examples/gallery/waffle-light.svg">
</picture>

### `gauge`

```
type: gauge
title: Health Metrics
- Uptime: 99%
- Error Rate: 52%
- Satisfaction: 84%
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/gauge.svg">
  <img alt="gauge" src="./examples/gallery/gauge-light.svg">
</picture>

### `radar`

```
type: radar
title: Team Skills
- Frontend: 85
- Backend: 72
- DevOps: 60
- Design: 45
- Data: 68
- Testing: 78
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/radar.svg">
  <img alt="radar" src="./examples/gallery/radar-light.svg">
</picture>

### `heatmap`

```
type: heatmap
title: Response Time by Hour & Day
- Mon
  - 45ms
  - 82ms
  - 120ms
  - 95ms
- Wed
  - 38ms
  - 77ms
  - 140ms
  - 88ms
- Fri
  - 52ms
  - 91ms
  - 108ms
  - 72ms
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/heatmap.svg">
  <img alt="heatmap" src="./examples/gallery/heatmap-light.svg">
</picture>

---

## Planning

_Kanban, Gantt, sprint boards, timelines, and work breakdown._

### `kanban`

```
type: kanban
title: Sprint 14
- Backlog
  - Auth refactor
  - Dark mode toggle
  - Export API
- In Progress
  - MdArt layouts [active]
  - SSE reconnect fix
- Done
  - Image gallery [done]
  - Error console [done]
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/kanban.svg">
  <img alt="kanban" src="./examples/gallery/kanban-light.svg">
</picture>

### `gantt`

```
type: gantt
title: Q2 Roadmap
- Auth system [wk1-wk3]
- API v2 [wk2-wk6]
- Dashboard [wk4-wk8]
- Mobile app [wk6-wk12]
- Launch [wk12-wk13]
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/gantt.svg">
  <img alt="gantt" src="./examples/gallery/gantt-light.svg">
</picture>

### `sprint-board`

```
type: sprint-board
title: Sprint 14
- Backlog
  - Payment gateway: 8
  - Mobile nav: 5
- In Progress
  - Search filters: 5 [active]
  - Analytics dash: 5 [active]
- Done
  - Error handling: 2 [done]
  - Unit tests: 4 [done]
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/sprint-board.svg">
  <img alt="sprint-board" src="./examples/gallery/sprint-board-light.svg">
</picture>

### `timeline`

```
type: timeline
title: Product Roadmap
- Q1 '23: Kickoff [done]
- Q2 '23: Alpha [done]
- Q3 '23: Beta [active]
- Q4 '23: Launch
- Q1 '24: v2.0
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/timeline.svg">
  <img alt="timeline" src="./examples/gallery/timeline-light.svg">
</picture>

### `milestone`

```
type: milestone
title: Project Alpha
- Requirements [done]
- Design [done]
- Development [active]
- Testing
- Launch
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/milestone.svg">
  <img alt="milestone" src="./examples/gallery/milestone-light.svg">
</picture>

### `wbs`

```
type: wbs
title: Platform v2
- Frontend
  - Components [done]
  - State Mgmt
- Backend
  - API Design [done]
  - Auth [active]
- QA
  - Unit Tests
  - E2E
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/wbs.svg">
  <img alt="wbs" src="./examples/gallery/wbs-light.svg">
</picture>

---

## Technical

_Architecture diagrams, ER models, sequences, state machines, and class diagrams._

### `layered-arch`

```
type: layered-arch
title: System Architecture
- Presentation
  - React SPA
  - Vite HMR
- API Gateway
  - Express routes
  - Auth middleware
- Business Logic
  - Claude worker
  - Scheduler
- Data
  - SQLite
  - File system
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/layered-arch.svg">
  <img alt="layered-arch" src="./examples/gallery/layered-arch-light.svg">
</picture>

### `entity`

```
type: entity
title: Core Schema
- sessions
  - id [PK]
  - project_id [FK]
  - title
  - created_at
- projects
  - id [PK]
  - name
  - path
- artifacts
  - id [PK]
  - session_id [FK]
  - type
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/entity.svg">
  <img alt="entity" src="./examples/gallery/entity-light.svg">
</picture>

### `network`

```
type: network
title: Service Topology
- Browser
  → API Server
  → CDN
- API Server
  → Worker
  → SQLite
- Worker
  → Claude CLI
  → MCP Server
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/network.svg">
  <img alt="network" src="./examples/gallery/network-light.svg">
</picture>

### `pipeline`

```
type: pipeline
title: CI/CD Pipeline
- Source → Lint → Test → Build → Deploy → Monitor
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/pipeline.svg">
  <img alt="pipeline" src="./examples/gallery/pipeline-light.svg">
</picture>

### `sequence`

```
type: sequence
title: Auth Flow
- Browser
  → API: POST /login
- API
  → DB: SELECT user
- DB
  → API: user row
- API
  → Browser: Set-Cookie
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/sequence.svg">
  <img alt="sequence" src="./examples/gallery/sequence-light.svg">
</picture>

### `state-machine`

```
type: state-machine
title: Order Lifecycle
- Pending
  → Processing: payment ok
  → Cancelled: timeout
- Processing
  → Shipped: packed
  → Pending: retry
- Shipped
  → Delivered: confirmed
- Delivered [final]
- Cancelled [final]
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/state-machine.svg">
  <img alt="state-machine" src="./examples/gallery/state-machine-light.svg">
</picture>

### `class`

```
type: class
title: Domain Model
- Animal [abstract]
  - + name
  - + species
  - + speak() [abstract]
- Dog
  - - breed
  - + speak()
  - + fetch()
- Cat [interface]
  - + purr()
  - + scratch()
```

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/class.svg">
  <img alt="class" src="./examples/gallery/class-light.svg">
</picture>
