# MdArt Text Combination Gallery

Stress cases for flexible text sizing, multiline labels, key-value rows, values, and inline attributes.

## Process And Flow

### Dense process labels

```mdart
type: process
title: Customer Onboarding
- Intake: Enterprise security questionnaire [owner: sales]
- Review: DPA [legal]
- Setup: Workspace provisioning with identity provider mapping and legacy role translation [platform]
- Launch: Guided rollout
```

### Arrow process with mixed label lengths

```mdart
type: arrow-process
title: Release Decision Path
- Request: Scope change from strategic account
- Triage: Risk check
- Approve: Executive sponsor confirms priority after customer renewal review
- Ship: Canary
```

### Timeline with dates, values, and child notes

```mdart
type: timeline-v
title: Migration Plan
- 2026-07-08: Audit
  - Identify orphaned webhook consumers
  - Confirm rollback contacts and escalation labels for every region
- 2026-07-12: Parallel-run billing export reconciliation
  - Target variance: under 0.1%
  - Manual exception queue
- 2026-07-18: Cutover readiness review with legal, finance, support, and platform leads [go/no-go]
  - Signoff: Finance, Support, Platform
```

## Lists

### Key-value list wrapping

```mdart
type: bullet-list
title: Support Readiness
- Routing: VIP bypass
- Coverage: Seoul, London, and San Francisco overlap windows
- Escalation: Incident commander owns external communications
- Recovery: Documented rollback decision within fifteen minutes after payment export drift alert
```

### Two-column comparison text

```mdart
type: two-column-list
title: Rollout Guardrails
- Must Have: Automated reconciliation, alert ownership, and rollback rehearsal
- Nice To Have: Dashboard polish
- Blocker: Missing billing export parity for annual enterprise contracts
- Watch: Excess notification volume during staged tenant migration across high-touch accounts
```

### Zigzag key-value nodes

```mdart
type: zigzag-list
title: Incident Review
- Detection: Probe alert
- Containment: Feature flag disabled secondary enrichment path
- Resolution: Queue workers scaled and retry policy reduced burst pressure
- Prevention: Capacity test added to release checklist with new tenant-volume fixture
```

### Hexagon labels with attributes

```mdart
type: hexagon-list
title: Quality Gates
- Parser consistency: required
- SVG accessibility titles for truncated content across nested values: required
- Mobile WebView animation reliability: watch
- Theme contrast: required
- Markdown integration smoke coverage: required
```

## Hierarchy

### Organization labels with role/value pairs

```mdart
type: org-chart
title: Launch Team
- Commander: Mina [Seoul]
  - Customer Comms: David Chen [status page + email]
  - Platform Lead: Priya Shah [deploy + rollback]
  - Revenue Operations Validation Lead: Omar Reyes [billing export parity + contract exceptions]
    - Exceptions: Annual enterprise plans
```

### Mind map overlap and multiline stress

```mdart
type: mind-map
title: AI Workspace
- Context
  - Memory
  - Project-specific skills and coding conventions for renderer edits
- Execution
  - Build, test, reload, and health verification
  - Recovery after interrupted turns
- Governance
  - Explicit commit boundaries
  - Schedule tools with local timezone confirmation and persisted labels
```

### Decision tree dense branches

```mdart
type: decision-tree
title: Release Decision
- Production deploy request
  - Tests green
    - Start canary with five percent traffic
    - Monitor checkout, billing, support queues, and reversal alarms
  - Tests failing or rollback unclear for data migration
    - Hold release and assign recovery owner
```

## Matrix

### Comparison table with long headers

```mdart
type: comparison
title: Provider Review
- Option
  - Internal
  - External charting dependency
  - Hybrid renderer with adapter boundary and shared text-fit helpers
- Maintenance Burden
  - Known code paths but broad layout surface area
  - Lower renderer work
  - Moderate upkeep with clearer extension points
- Animation Reliability
  - Direct control over CSS and SVG behavior
  - Dependent on third-party internals
  - Centralized scoping plus targeted custom effects in individual layouts
```

### SWOT dense cells

```mdart
type: swot
title: MdArt Animation System
+ Central timing helpers reduce drift
+ SVG-native output works in markdown and artifacts
- Many renderer-specific geometry edge cases remain
- Mobile browsers differ
? Text fitting enables denser professional diagrams
? Scoped CSS supports multiple diagrams per document
! Unscoped keyframes can cause cross-diagram interference in long documents
! Overly verbose labels still need author discipline
```

### Heatmap key-value cells

```mdart
type: heatmap
title: Support Load By Region
- Seoul
  - Billing: 8
  - Workspace provisioning blockers: 5
  - SSO mapping corrections for legacy identity provider aliases: 3
- London
  - Billing reconciliation questions: 6
  - Provisioning: 4
  - SSO mapping corrections: 7
- San Francisco
  - Billing reconciliation questions requiring finance approval: 9
  - Workspace provisioning blockers: 2
  - SSO mapping corrections: 5
```

## Cycle And Relationship

### Cycle with long action labels

```mdart
type: cycle
title: Continuous Improvement
- Observe friction
- Diagnose root cause with logs, traces, and support notes
- Improve renderer behavior or authoring guidance for labels with values and attrs
- Verify in gallery, artifact, and mobile preview contexts
```

### Loop with value labels

```mdart
type: loop
title: Feedback Loop
- Draft: Initial text
- Render: Check wrapping, truncation, and animation pacing
- Review: Screenshot differences, stakeholder notes, and mobile viewport behavior
- Refine: Smaller labels or split into separate diagrams
```

### Plus relationship text density

```mdart
type: plus
title: Readiness Factors
- Readiness
- Test coverage confidence
- Rollback clarity for high-risk data migration paths
- Support staffing
- Customer communication timing and executive sponsor alignment
```

### Web relationship nodes

```mdart
type: web
title: Dependency Web
- Artifact Viewer
  - API
  - Client-side preview bundle
- Playground Demo
  - Markdown examples with deliberately uneven text length
  - Type examples
- Documentation
  - Skill guidance
  - Syntax reference and anti-pattern notes
```

## Statistical And Plot

### Progress bars with longer labels

```mdart
type: progress-list
title: Migration Completion
- IDP mappings: 82
- Billing export reconciliation cases resolved: 67
- Customer success launch notes delivered to named account teams: 91
- Rollback rehearsal checklist completion: 74
```

### Bullet chart with target values

```mdart
type: bullet-chart
title: Launch Metrics
- Revenue readiness: 78 [85]
- Payment export parity confidence: 62 [75]
- Support article coverage completeness for regional launch paths: 91 [90]
- Post-cutover monitoring confidence: 88 [95]
```

### Gauge labels

```mdart
type: gauge
title: Operational Confidence
- Ready: 86
- Rollback confidence: 72
- Support coverage across Seoul, London, and San Francisco: 94
```

### Line chart with long series names

```mdart
type: line-chart
title: Queue Pressure Forecast
x: Mon, Tue, Wed, Thu, Fri
y-label: Tickets
smooth: true
points: true
- Billing: 12, 18, 27, 22, 15
- Workspace provisioning blockers: 8, 11, 16, 12, 9
- SSO mapping corrections for legacy aliases: 4, 9, 13, 10, 6
```

## Technical

### Layered architecture with component values

```mdart
type: layered-arch
title: MdArt Rendering Path
- Authoring Surface
  - Fence
  - Demo source editor and saved examples
- Parser
  - Front matter, values, children, and flow edges
  - Escape-aware key-value splitting for labels containing literal colons
- Renderer
  - Layout-specific SVG geometry
  - Scoped animation CSS
- Consumer
  - Steward artifact viewer with server-side render fallback
  - Playground markdown preview
```

### Network nodes with edge labels

```mdart
type: network
title: Preview Dependency Network
- Demo Browser
  -> Playground Server
  -> Steward Artifact Viewer with artifact relay
- Playground Server
  -> MdArt source
  -> Markdown adapter packages
- Steward Artifact Viewer
  -> /api/mdart/render
  -> Built client bundle and cached static assets
```

### Flowchart with decision branches and backward edge

```mdart
type: flowchart
title: Checkout Flow

- Start [start]
  → Review Cart
- Review Cart
  → Apply Coupon [decision]
- Apply Coupon [decision]
  → Validate Coupon: yes
  → Enter Payment: no
- Validate Coupon [decision]
  → Apply Discount: valid
  → Review Cart: invalid
- Apply Discount
  → Enter Payment
- Enter Payment
  → Charge Card [decision]
- Charge Card [decision]
  → Confirm Order: success
  → Enter Payment: declined
- Confirm Order
  → End [end]
```

### Sequence with long message text, activation bars, divider, and alt region

```mdart
type: sequence
title: Password Reset Flow

- User → Gateway: POST /auth/password-reset with verified email and client fingerprint [+]

- divider: Rate limit check and token generation

- Gateway → RateLimit: evaluate rolling window for source IP and account identifier [+]
- alt: within per-account and per-IP limit thresholds
  - RateLimit → Gateway: allowed — 4 of 5 daily resets consumed [-]
  - Gateway → DB: INSERT reset_tokens with 6-hour expiry and account lock escalation flag [+]
  - DB → Gateway: token persisted with idempotency key for duplicate-submission safety [-]
  - Gateway → Email: dispatch transactional message with HMAC-signed single-use link [-]
  - Gateway → User: 202 Accepted — check your inbox, link expires in 6 hours [-]
  - else:
    - RateLimit → Gateway: denied — daily reset limit reached for this account [-]
    - Gateway → User: 429 Too Many Requests — wait 24 hours or contact support [-]
```

### Class members and modifiers

```mdart
type: class
title: Animation Scoping
- SvgAnimationScope
  - [-] stableHash(rawSourceAndType): string
  - [-] renameKeyframes(svg): string
  - [-] prefixSelectors(css): string
  - [+] apply(svg): ScopedSvgWithDiagramLocalNames
- LayoutRenderer
  - [+] render(spec, theme): string
  - [#] emitSeqSpotlightCSS(): string
```
