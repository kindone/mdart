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

![process](./examples/gallery/process.svg)

### `chevron-process`

```
type: chevron-process
- Discovery
- Design
- Build
- Test
- Deploy
```

![chevron-process](./examples/gallery/chevron-process.svg)

### `arrow-process`

```
type: arrow-process
- Research
- Prototype
- Build
- Launch
```

![arrow-process](./examples/gallery/arrow-process.svg)

### `circular-process`

```
type: circular-process
- Plan
- Build
- Test
- Ship
```

![circular-process](./examples/gallery/circular-process.svg)

### `funnel`

```
type: funnel
- Awareness
- Interest
- Consideration
- Purchase
```

![funnel](./examples/gallery/funnel.svg)

### `roadmap`

```
type: roadmap
- Q1: Foundation
- Q2: Beta Launch
- Q3: Growth
- Q4: Scale
```

![roadmap](./examples/gallery/roadmap.svg)

### `waterfall`

```
type: waterfall
- Requirements
- Design
- Development
- Testing
- Deployment
```

![waterfall](./examples/gallery/waterfall.svg)

### `step-up`

```
type: step-up
- Awareness
- Consideration
- Evaluation
- Purchase
```

![step-up](./examples/gallery/step-up.svg)

### `step-down`

```
type: step-down
- Kickoff
- Design
- Build
- Release
```

![step-down](./examples/gallery/step-down.svg)

### `circle-process`

```
type: circle-process
- Ideate: Ideas
- Design: Prototype
- Build: Implement
- Ship: Launch
```

![circle-process](./examples/gallery/circle-process.svg)

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

![equation](./examples/gallery/equation.svg)

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

![bending-process](./examples/gallery/bending-process.svg)

### `segmented-bar`

```
type: segmented-bar
title: Project Timeline · 12 weeks
- Discovery: 15%
- Design: 20%
- Development: 50%
- Launch: 15%
```

![segmented-bar](./examples/gallery/segmented-bar.svg)

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

![phase-process](./examples/gallery/phase-process.svg)

### `timeline-h`

```
type: timeline-h
- Kickoff: Jan
- Design: Mar
- Beta: Jun
- Review: Sep
- Ship: Dec
```

![timeline-h](./examples/gallery/timeline-h.svg)

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

![timeline-v](./examples/gallery/timeline-v.svg)

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

![swimlane](./examples/gallery/swimlane.svg)

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

![bullet-list](./examples/gallery/bullet-list.svg)

### `numbered-list`

```
type: numbered-list
- Define the problem
- Research solutions
- Prototype quickly
- Validate with users
- Ship and iterate
```

![numbered-list](./examples/gallery/numbered-list.svg)

### `checklist`

```
type: checklist
- Set up CI/CD pipeline [done]
- Write unit tests [done]
- Add integration tests [done]
- Performance profiling
- Security audit
```

![checklist](./examples/gallery/checklist.svg)

### `two-column-list`

```
type: two-column-list
- Planning: Define scope
- Planning: Set milestones
- Execution: Build features
- Execution: Fix bugs
- Review: Demo to stakeholders
```

![two-column-list](./examples/gallery/two-column-list.svg)

### `timeline-list`

```
type: timeline-list
- 2022: Founded
- 2023: Seed round
- 2024: Product launch
- 2025: Series A
- 2026: Expansion
```

![timeline-list](./examples/gallery/timeline-list.svg)

### `block-list`

```
type: block-list
- Strategy: Define your approach
- Design: Shape the solution
- Build: Execute the plan
- Launch: Ship to the world
```

![block-list](./examples/gallery/block-list.svg)

### `chevron-list`

```
type: chevron-list
- Awareness
- Consideration
- Decision
- Action
```

![chevron-list](./examples/gallery/chevron-list.svg)

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

![card-list](./examples/gallery/card-list.svg)

### `zigzag-list`

```
type: zigzag-list
- Research
- Prototype
- Test
- Launch
```

![zigzag-list](./examples/gallery/zigzag-list.svg)

### `ribbon-list`

```
type: ribbon-list
- Vision: Long-term direction of the company
- Mission: Why we exist and who we serve
- Values: Principles that guide every decision
```

![ribbon-list](./examples/gallery/ribbon-list.svg)

### `hexagon-list`

```
type: hexagon-list
- Speed
- Scale
- Trust
- Quality
- Impact
```

![hexagon-list](./examples/gallery/hexagon-list.svg)

### `trapezoid-list`

```
type: trapezoid-list
- Executive
- Management
- Operations
- Foundation
```

![trapezoid-list](./examples/gallery/trapezoid-list.svg)

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

![tab-list](./examples/gallery/tab-list.svg)

### `circle-list`

```
type: circle-list
- Discovery: Research & requirements
- Planning: Scope & architecture
- Execution: Build & iterate
- Launch: Monitor & optimize
```

![circle-list](./examples/gallery/circle-list.svg)

### `icon-list`

```
type: icon-list
- Performance: Sub-100ms response [⚡]
- Security: End-to-end encrypted [🔒]
- Analytics: Real-time insights [📊]
- Collaboration: Shared workspaces [🤝]
```

![icon-list](./examples/gallery/icon-list.svg)

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

![cycle](./examples/gallery/cycle.svg)

### `donut-cycle`

```
type: donut-cycle
- Ideate
- Prototype
- Test
- Refine
```

![donut-cycle](./examples/gallery/donut-cycle.svg)

### `gear-cycle`

```
type: gear-cycle
- Intake
- Process
- Output
- Review
```

![gear-cycle](./examples/gallery/gear-cycle.svg)

### `spiral`

```
type: spiral
- MVP
- Beta
- v1.0
- v2.0
- v3.0
```

![spiral](./examples/gallery/spiral.svg)

### `block-cycle`

```
type: block-cycle
- Research
- Design
- Build
- Launch
```

![block-cycle](./examples/gallery/block-cycle.svg)

### `segmented-cycle`

```
type: segmented-cycle
- Discovery
- Planning
- Execution
- Review
- Retrospective
```

![segmented-cycle](./examples/gallery/segmented-cycle.svg)

### `nondirectional-cycle`

```
type: nondirectional-cycle
- Brand
- Product
- Sales
- Support
```

![nondirectional-cycle](./examples/gallery/nondirectional-cycle.svg)

### `multidirectional-cycle`

```
type: multidirectional-cycle
- Strategy
- Design
- Engineering
- Data
```

![multidirectional-cycle](./examples/gallery/multidirectional-cycle.svg)

### `loop`

```
type: loop
- Collect
- Analyze
- Act
- Monitor
```

![loop](./examples/gallery/loop.svg)

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

![org-chart](./examples/gallery/org-chart.svg)

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

![h-org-chart](./examples/gallery/h-org-chart.svg)

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

![tree](./examples/gallery/tree.svg)

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

![hierarchy-list](./examples/gallery/hierarchy-list.svg)

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

![radial-tree](./examples/gallery/radial-tree.svg)

### `decision-tree`

```
type: decision-tree
- Urgent?
  - Do Now
  - Important?
    - Schedule
    - Eliminate
```

![decision-tree](./examples/gallery/decision-tree.svg)

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

![sitemap](./examples/gallery/sitemap.svg)

### `bracket`

```
type: bracket
- Q1 Winner
- Q2 Winner
- Q3 Winner
- Q4 Winner
```

![bracket](./examples/gallery/bracket.svg)

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

![mind-map](./examples/gallery/mind-map.svg)

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

![swot](./examples/gallery/swot.svg)

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

![pros-cons](./examples/gallery/pros-cons.svg)

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

![comparison](./examples/gallery/comparison.svg)

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

![matrix-2x2](./examples/gallery/matrix-2x2.svg)

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

![bcg](./examples/gallery/bcg.svg)

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

![ansoff](./examples/gallery/ansoff.svg)

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

![matrix-nxm](./examples/gallery/matrix-nxm.svg)

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

![pyramid](./examples/gallery/pyramid.svg)

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

![inverted-pyramid](./examples/gallery/inverted-pyramid.svg)

### `pyramid-list`

```
type: pyramid-list
- Vision
- Strategy
- Tactics
- Actions
```

![pyramid-list](./examples/gallery/pyramid-list.svg)

### `segmented-pyramid`

```
type: segmented-pyramid
title: Investment Allocation
- Speculative: 5%
- Growth: 20%
- Balanced: 35%
- Conservative: 40%
```

![segmented-pyramid](./examples/gallery/segmented-pyramid.svg)

### `diamond-pyramid`

```
type: diamond-pyramid
- Niche
- Early Adopters
- Mainstream
- Late Majority
- Laggards
```

![diamond-pyramid](./examples/gallery/diamond-pyramid.svg)

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

![venn](./examples/gallery/venn.svg)

### `venn-3`

```
type: venn-3
- Marketing
- Sales
- Product
- All Three ∩
```

![venn-3](./examples/gallery/venn-3.svg)

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

![venn-4](./examples/gallery/venn-4.svg)

### `concentric`

```
type: concentric
title: Organizational Layers
- Organization
- Department
- Team
- Individual
```

![concentric](./examples/gallery/concentric.svg)

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

![balance](./examples/gallery/balance.svg)

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

![opposing-arrows](./examples/gallery/opposing-arrows.svg)

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

![web](./examples/gallery/web.svg)

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

![cluster](./examples/gallery/cluster.svg)

### `target`

```
type: target
title: Focus Areas
- Core Goal
- Must Have
- Should Have
- Nice to Have
```

![target](./examples/gallery/target.svg)

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

![radial](./examples/gallery/radial.svg)

### `converging`

```
type: converging
title: Product Success
- User Research
- Market Analysis
- Technical Feasibility
- Business Viability
```

![converging](./examples/gallery/converging.svg)

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

![diverging](./examples/gallery/diverging.svg)

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

![plus](./examples/gallery/plus.svg)

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

![progress-list](./examples/gallery/progress-list.svg)

### `bullet-chart`

```
type: bullet-chart
title: Sales vs Target
- Revenue: 78 [85]
- Pipeline: 62 [70]
- Deals Closed: 91 [80]
- Retention: 88 [90]
```

![bullet-chart](./examples/gallery/bullet-chart.svg)

### `scorecard`

```
type: scorecard
title: Monthly Metrics
- MRR: $128K [+12%]
- Churn: 2.1% [-0.3%]
- MAU: 48,200 [+8%]
- ARPU: $2.65 [+4%]
```

![scorecard](./examples/gallery/scorecard.svg)

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

![treemap](./examples/gallery/treemap.svg)

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

![sankey](./examples/gallery/sankey.svg)

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

![waffle](./examples/gallery/waffle.svg)

### `gauge`

```
type: gauge
title: Health Metrics
- Uptime: 99%
- Error Rate: 52%
- Satisfaction: 84%
```

![gauge](./examples/gallery/gauge.svg)

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

![radar](./examples/gallery/radar.svg)

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

![heatmap](./examples/gallery/heatmap.svg)

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

![kanban](./examples/gallery/kanban.svg)

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

![gantt](./examples/gallery/gantt.svg)

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

![sprint-board](./examples/gallery/sprint-board.svg)

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

![timeline](./examples/gallery/timeline.svg)

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

![milestone](./examples/gallery/milestone.svg)

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

![wbs](./examples/gallery/wbs.svg)

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

![layered-arch](./examples/gallery/layered-arch.svg)

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

![entity](./examples/gallery/entity.svg)

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

![network](./examples/gallery/network.svg)

### `pipeline`

```
type: pipeline
title: CI/CD Pipeline
- Source → Lint → Test → Build → Deploy → Monitor
```

![pipeline](./examples/gallery/pipeline.svg)

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

![sequence](./examples/gallery/sequence.svg)

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

![state-machine](./examples/gallery/state-machine.svg)

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

![class](./examples/gallery/class.svg)
