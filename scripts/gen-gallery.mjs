/**
 * Generate docs/gallery.html — a full layout reference with code+SVG pairs.
 * Run: node scripts/gen-gallery.mjs
 */

import { renderMdArt } from '../packages/mdart/dist/index.js'
import { writeFile, mkdir, readdir, unlink } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = join(__dir, '..')

// ── Examples ──────────────────────────────────────────────────────────────────

const FAMILIES = [
  {
    name: 'Process',
    slug: 'process',
    desc: 'Sequential steps, flows, and pipelines.',
    layouts: [
      { name: 'process', source: `type: process\n- Discovery\n- Design\n- Build\n- Test\n- Deploy` },
      { name: 'chevron-process', source: `type: chevron-process\n- Discovery\n- Design\n- Build\n- Test\n- Deploy` },
      { name: 'arrow-process', source: `type: arrow-process\n- Research\n- Prototype\n- Build\n- Launch` },
      { name: 'circular-process', source: `type: circular-process\n- Plan\n- Build\n- Test\n- Ship` },
      { name: 'funnel', source: `type: funnel\n- Awareness\n- Interest\n- Consideration\n- Purchase` },
      { name: 'roadmap', source: `type: roadmap\n- Q1: Foundation\n- Q2: Beta Launch\n- Q3: Growth\n- Q4: Scale` },
      { name: 'waterfall', source: `type: waterfall\n- Requirements\n- Design\n- Development\n- Testing\n- Deployment` },
      { name: 'step-up', source: `type: step-up\n- Awareness\n- Consideration\n- Evaluation\n- Purchase` },
      { name: 'step-down', source: `type: step-down\n- Kickoff\n- Design\n- Build\n- Release` },
      { name: 'circle-process', source: `type: circle-process\n- Ideate: Ideas\n- Design: Prototype\n- Build: Implement\n- Ship: Launch` },
      { name: 'equation', source: `type: equation\n- People\n  - Team skills\n  - Culture\n- Process\n  - Workflows\n  - Systems\n- Results\n  - Outcomes\n  - Impact` },
      { name: 'bending-process', source: `type: bending-process\n- Research\n- Design\n- Prototype\n- Test\n- Review\n- Launch` },
      { name: 'segmented-bar', source: `type: segmented-bar\ntitle: Project Timeline · 12 weeks\n- Discovery: 15%\n- Design: 20%\n- Development: 50%\n- Launch: 15%` },
      { name: 'phase-process', source: `type: phase-process\n- Discovery\n  - User Research\n  - Stakeholders\n- Design\n  - Wireframes\n  - Prototype\n- Build\n  - Sprint 1\n  - Sprint 2` },
      { name: 'timeline-h', source: `type: timeline-h\n- Kickoff: Jan\n- Design: Mar\n- Beta: Jun\n- Review: Sep\n- Ship: Dec` },
      { name: 'timeline-v', source: `type: timeline-v\n- Project Kickoff: Jan '24\n  - Team assembled\n- Design Complete: Apr '24\n  - Approved\n- Beta Launch: Aug '24\n  - 500 early users\n- GA Release: Dec '24` },
      { name: 'swimlane', source: `type: swimlane\n- Customer\n  - Request\n  - Confirm\n- Sales\n  - Review\n  - Propose\n  - Close\n- Support\n  - Onboard` },
    ],
  },
  {
    name: 'List',
    slug: 'list',
    desc: 'Structured lists with distinct visual treatments.',
    layouts: [
      { name: 'bullet-list', source: `type: bullet-list\n- Fast iteration cycles\n- Clear ownership\n- Continuous feedback\n- Data-driven decisions` },
      { name: 'numbered-list', source: `type: numbered-list\n- Define the problem\n- Research solutions\n- Prototype quickly\n- Validate with users\n- Ship and iterate` },
      { name: 'checklist', source: `type: checklist\n- Set up CI/CD pipeline [done]\n- Write unit tests [done]\n- Add integration tests [done]\n- Performance profiling\n- Security audit` },
      { name: 'two-column-list', source: `type: two-column-list\n- Planning: Define scope\n- Planning: Set milestones\n- Execution: Build features\n- Execution: Fix bugs\n- Review: Demo to stakeholders` },
      { name: 'timeline-list', source: `type: timeline-list\n- 2022: Founded\n- 2023: Seed round\n- 2024: Product launch\n- 2025: Series A\n- 2026: Expansion` },
      { name: 'block-list', source: `type: block-list\n- Strategy: Define your approach\n  - Vision\n  - Goals\n- Design: Shape the solution\n  - Research\n  - Prototype\n- Build: Execute the plan\n  - Ship\n  - Measure\n- Launch: Ship to the world\n  - Announce\n  - Iterate` },
      { name: 'chevron-list', source: `type: chevron-list\n- Awareness\n- Consideration\n- Decision\n- Action` },
      { name: 'card-list', source: `type: card-list\n- Design\n  - UI/UX\n  - Figma\n- Engineering\n  - Frontend\n  - Backend\n- Growth\n  - Marketing\n  - Sales` },
      { name: 'zigzag-list', source: `type: zigzag-list\n- Research\n- Prototype\n- Test\n- Launch` },
      { name: 'ribbon-list', source: `type: ribbon-list\n- Vision: Long-term direction of the company\n- Mission: Why we exist and who we serve\n- Values: Principles that guide every decision` },
      { name: 'hexagon-list', source: `type: hexagon-list\n- Speed\n- Scale\n- Trust\n- Quality\n- Impact` },
      { name: 'trapezoid-list', source: `type: trapezoid-list\n- Executive\n- Management\n- Operations\n- Foundation` },
      { name: 'tab-list', source: `type: tab-list\n- Team\n  - Engineers\n  - Designers\n- Process\n  - Planning\n  - Reviews\n- Tools\n  - Figma\n  - GitHub` },
      { name: 'circle-list', source: `type: circle-list\n- Discovery: Research & requirements\n- Planning: Scope & architecture\n- Execution: Build & iterate\n- Launch: Monitor & optimize` },
      { name: 'icon-list', source: `type: icon-list\n- Performance: Sub-100ms response [⚡]\n- Security: End-to-end encrypted [🔒]\n- Analytics: Real-time insights [📊]\n- Collaboration: Shared workspaces [🤝]` },
    ],
  },
  {
    name: 'Cycle',
    slug: 'cycle',
    desc: 'Circular and recurring flows.',
    layouts: [
      { name: 'cycle', source: `type: cycle\n- Plan\n- Execute\n- Measure\n- Learn` },
      { name: 'donut-cycle', source: `type: donut-cycle\n- Ideate\n- Prototype\n- Test\n- Refine` },
      { name: 'gear-cycle', source: `type: gear-cycle\n- Intake\n- Process\n- Output\n- Review` },
      { name: 'spiral', source: `type: spiral\n- MVP\n- Beta\n- v1.0\n- v2.0\n- v3.0` },
      { name: 'block-cycle', source: `type: block-cycle\n- Research\n  - Interviews\n  - Competitive analysis\n- Design\n  - Wireframes\n  - User testing\n- Build\n  - Implementation\n  - QA\n- Launch\n  - Rollout\n  - Monitoring` },
      { name: 'segmented-cycle', source: `type: segmented-cycle\n- Discovery\n- Planning\n- Execution\n- Review\n- Retrospective` },
      { name: 'nondirectional-cycle', source: `type: nondirectional-cycle\n- Brand\n- Product\n- Sales\n- Support` },
      { name: 'multidirectional-cycle', source: `type: multidirectional-cycle\n- Strategy\n- Design\n- Engineering\n- Data` },
      { name: 'loop', source: `type: loop\n- Collect\n- Analyze\n- Act\n- Monitor` },
    ],
  },
  {
    name: 'Hierarchy',
    slug: 'hierarchy',
    desc: 'Org charts, trees, and mind maps.',
    layouts: [
      { name: 'org-chart', source: `type: org-chart\n- CEO\n  - CTO\n    - Engineering Lead\n    - Architect\n  - CFO\n    - Controller\n  - CMO\n    - Brand\n    - Growth` },
      { name: 'h-org-chart', source: `type: h-org-chart\n- CEO\n  - Engineering\n    - Frontend\n    - Backend\n  - Product\n    - Design\n    - Research\n  - Operations` },
      { name: 'tree', source: `type: tree\n- Frontend\n  - React\n    - Components\n    - Hooks\n  - CSS\n    - Tailwind\n- Backend\n  - Node\n    - Routes\n  - Database` },
      { name: 'hierarchy-list', source: `type: hierarchy-list\n- Platform\n  - Frontend\n    - React App\n    - Design System\n  - Backend\n    - API Server\n  - Infrastructure\n    - nginx` },
      { name: 'radial-tree', source: `type: radial-tree\ntitle: Product Platform\n- Mobile\n  - iOS\n  - Android\n- Web\n  - React\n  - API\n- Data\n  - Analytics\n  - ML` },
      { name: 'decision-tree', source: `type: decision-tree\n- Urgent?\n  - Do Now\n  - Important?\n    - Schedule\n    - Eliminate` },
      { name: 'sitemap', source: `type: sitemap\n- acme.io\n  - Home\n  - Products\n    - Free\n    - Pro\n  - Docs\n    - Guides\n    - API Ref\n  - About` },
      { name: 'bracket', source: `type: bracket\n- Q1 Winner\n- Q2 Winner\n- Q3 Winner\n- Q4 Winner` },
      { name: 'mind-map', source: `type: mind-map\ntitle: Product Strategy\n- Market\n  - B2B\n  - Enterprise\n- Technology\n  - Mobile\n  - API\n- Growth\n  - SEO\n- Revenue\n  - Subscriptions` },
    ],
  },
  {
    name: 'Matrix',
    slug: 'matrix',
    desc: 'Comparisons, SWOT, 2×2 grids, BCG, and Ansoff.',
    layouts: [
      { name: 'swot', source: `type: swot\ntitle: Product Launch\n+ Strong brand\n+ Experienced team\n- High CAC\n- No mobile app\n? Asia-Pacific expansion\n? Enterprise tier\n! New competitor funding\n! Regulatory changes` },
      { name: 'pros-cons', source: `type: pros-cons\n- Pros\n  - Fast time to market\n  - Low upfront cost\n  - Flexible scaling\n- Cons\n  - Vendor lock-in\n  - Less customization\n  - Ongoing SaaS fees` },
      { name: 'comparison', source: `type: comparison\n- Feature\n  - Starter: Basic\n  - Pro: Advanced\n  - Enterprise: Custom\n- Storage\n  - Starter: 10 GB\n  - Pro: 100 GB\n  - Enterprise: Unlimited\n- Support\n  - Starter: Community\n  - Pro: Email\n  - Enterprise: Dedicated` },
      { name: 'matrix-2x2', source: `type: matrix-2x2\ntitle: Prioritization Matrix\n- Quick Wins\n  - Fix login bug\n  - Add dark mode\n- Big Bets\n  - Mobile app\n  - AI features\n- Fill-ins\n  - Tooltip polish\n- Avoid\n  - Legacy API` },
      { name: 'bcg', source: `type: bcg\ntitle: Product Portfolio\n- Stars\n  - Platform API\n  - Analytics Pro\n- Question Marks\n  - Mobile SDK\n  - AI Assistant\n- Cash Cows\n  - Core SaaS\n- Dogs\n  - Legacy Export` },
      { name: 'ansoff', source: `type: ansoff\ntitle: Growth Strategy\n- Market Penetration\n  - Loyalty program\n  - Upsell campaigns\n- Product Development\n  - Mobile app\n  - API v2\n- Market Development\n  - Asia-Pacific\n- Diversification\n  - Marketplace` },
      { name: 'matrix-nxm', source: `type: matrix-nxm\ntitle: Skills Matrix\n- Alice\n  - Expert\n  - Proficient\n  - Learning\n- Bob\n  - Proficient\n  - Expert\n  - Expert\n- Carol\n  - Learning\n  - Proficient\n  - Expert` },
    ],
  },
  {
    name: 'Pyramid',
    slug: 'pyramid',
    desc: 'Stacked tiers showing hierarchy or importance.',
    layouts: [
      { name: 'pyramid', source: `type: pyramid\ntitle: Maslow's Hierarchy\n- Self-actualization\n- Esteem\n- Love & Belonging\n- Safety\n- Physiological` },
      { name: 'inverted-pyramid', source: `type: inverted-pyramid\ntitle: Acquisition Funnel\n- Awareness\n- Interest\n- Consideration\n- Intent\n- Purchase` },
      { name: 'pyramid-list', source: `type: pyramid-list\n- Vision\n- Strategy\n- Tactics\n- Actions` },
      { name: 'segmented-pyramid', source: `type: segmented-pyramid\ntitle: Investment Allocation\n- Speculative: 5%\n- Growth: 20%\n- Balanced: 35%\n- Conservative: 40%` },
      { name: 'diamond-pyramid', source: `type: diamond-pyramid\n- Niche\n- Early Adopters\n- Mainstream\n- Late Majority\n- Laggards` },
    ],
  },
  {
    name: 'Relationship',
    slug: 'relationship',
    desc: 'Venn diagrams, concentric rings, and connection maps.',
    layouts: [
      { name: 'venn', source: `type: venn\n- Design\n  - UX Research\n  - Prototyping\n- Engineering\n  - Frontend\n  - Backend\n- Product ∩ Engineering` },
      { name: 'venn-3', source: `type: venn-3\n- Marketing\n  - Campaigns\n  - Content\n- Sales\n  - Pipeline\n  - Accounts\n- Product\n  - Features\n  - UX\n- All Three ∩` },
      { name: 'venn-4', source: `type: venn-4\n- Strategy\n  - OKRs\n- Design\n  - Brand\n- Engineering\n  - Frontend\n- Data\n  - Analytics` },
      { name: 'concentric', source: `type: concentric\ntitle: Organizational Layers\n- Organization\n- Department\n- Team\n- Individual` },
      { name: 'balance', source: `type: balance\n- Benefits\n  - Speed\n  - Flexibility\n  - Cost\n- Risks\n  - Complexity\n  - Dependencies\n  - Maintenance` },
      { name: 'opposing-arrows', source: `type: opposing-arrows\n- Supply\n  - Inventory\n  - Production\n  - Logistics\n- Demand\n  - Orders\n  - Forecast\n  - Trends` },
      { name: 'web', source: `type: web\ntitle: Team Dependencies\n- Frontend\n- Backend\n- Design\n- Data\n- DevOps\n- QA` },
      { name: 'cluster', source: `type: cluster\ntitle: Engineering Org\n- Platform\n  - Core API\n  - Auth\n- Product\n  - Search\n  - Feed\n- Infrastructure\n  - Compute\n  - Storage` },
      { name: 'target', source: `type: target\ntitle: Focus Areas\n- Core Goal\n- Must Have\n- Should Have\n- Nice to Have` },
      { name: 'radial', source: `type: radial\ntitle: Platform\n- Mobile\n  - iOS\n  - Android\n- Web\n  - React\n  - API\n- Data\n  - Analytics\n- Design\n  - UI\n- Security` },
      { name: 'converging', source: `type: converging\ntitle: Product Success\n- User Research\n- Market Analysis\n- Technical Feasibility\n- Business Viability` },
      { name: 'diverging', source: `type: diverging\ntitle: Platform APIs\n- Core Platform\n- Mobile SDK\n- Web Embed\n- Partner API\n- Webhooks` },
      { name: 'plus', source: `type: plus\ntitle: Growth Framework\n- Acquire\n- Activate\n- Retain\n- Revenue\n- Referral` },
    ],
  },
  {
    name: 'Statistical',
    slug: 'statistical',
    desc: 'Progress bars, scorecards, charts, and data visualizations.',
    layouts: [
      { name: 'progress-list', source: `type: progress-list\ntitle: Q4 KPIs\n- Revenue: 87%\n- Customer Retention: 92%\n- NPS Score: 64%\n- Bug Resolution: 45%\n- Feature Delivery: 73%` },
      { name: 'bullet-chart', source: `type: bullet-chart\ntitle: Sales vs Target\n- Revenue: 78 [85]\n- Pipeline: 62 [70]\n- Deals Closed: 91 [80]\n- Retention: 88 [90]` },
      { name: 'scorecard', source: `type: scorecard\ntitle: Monthly Metrics\n- MRR: $128K [+12%]\n- Churn: 2.1% [-0.3%]\n- MAU: 48,200 [+8%]\n- ARPU: $2.65 [+4%]` },
      { name: 'treemap', source: `type: treemap\ntitle: Time Allocation\n- Feature Dev: 40%\n- Bug Fixes: 20%\n- Planning: 15%\n- Code Review: 12%\n- Infra: 8%\n- Docs: 5%` },
      { name: 'sankey', source: `type: sankey\ntitle: Traffic Sources\n- Organic: 45\n  - Landing Page\n  - Blog\n  - Docs\n- Paid: 30\n  - Landing Page\n  - Pricing\n- Direct: 25\n  - Dashboard` },
      { name: 'waffle', source: `type: waffle\ntitle: Budget Allocation\n- Engineering: 30%\n- Marketing: 20%\n- Sales: 10%\n- Operations: 10%\n- Other: 30%` },
      { name: 'gauge', source: `type: gauge\ntitle: Health Metrics\n- Uptime: 99%\n- Error Rate: 52%\n- Satisfaction: 84%` },
      { name: 'radar', source: `type: radar\ntitle: Team Skills\n- Frontend: 85\n- Backend: 72\n- DevOps: 60\n- Design: 45\n- Data: 68\n- Testing: 78` },
      { name: 'heatmap', source: `type: heatmap\ntitle: Response Time by Hour & Day\n- Mon\n  - 45ms\n  - 82ms\n  - 120ms\n  - 95ms\n- Wed\n  - 38ms\n  - 77ms\n  - 140ms\n  - 88ms\n- Fri\n  - 52ms\n  - 91ms\n  - 108ms\n  - 72ms` },
    ],
  },
  {
    name: 'Planning',
    slug: 'planning',
    desc: 'Kanban, Gantt, sprint boards, timelines, and work breakdown.',
    layouts: [
      { name: 'kanban', source: `type: kanban\ntitle: Sprint 14\n- Backlog\n  - Auth refactor\n  - Dark mode toggle\n  - Export API\n- In Progress\n  - MdArt layouts [active]\n  - SSE reconnect fix\n- Done\n  - Image gallery [done]\n  - Error console [done]` },
      { name: 'gantt', source: `type: gantt\ntitle: Q2 Roadmap\n- Auth system [wk1-wk3]\n- API v2 [wk2-wk6]\n- Dashboard [wk4-wk8]\n- Mobile app [wk6-wk12]\n- Launch [wk12-wk13]` },
      { name: 'sprint-board', source: `type: sprint-board\ntitle: Sprint 14\n- Backlog\n  - Payment gateway: 8\n  - Mobile nav: 5\n- In Progress\n  - Search filters: 5 [active]\n  - Analytics dash: 5 [active]\n- Done\n  - Error handling: 2 [done]\n  - Unit tests: 4 [done]` },
      { name: 'timeline', source: `type: timeline\ntitle: Product Roadmap\n- Q1 '23: Kickoff [done]\n- Q2 '23: Alpha [done]\n- Q3 '23: Beta [active]\n- Q4 '23: Launch\n- Q1 '24: v2.0` },
      { name: 'milestone', source: `type: milestone\ntitle: Project Alpha\n- Requirements [done]\n- Design [done]\n- Development [active]\n- Testing\n- Launch` },
      { name: 'wbs', source: `type: wbs\ntitle: Platform v2\n- Frontend\n  - Components [done]\n  - State Mgmt\n- Backend\n  - API Design [done]\n  - Auth [active]\n- QA\n  - Unit Tests\n  - E2E` },
    ],
  },
  {
    name: 'Technical',
    slug: 'technical',
    desc: 'Architecture diagrams, ER models, sequences, state machines, and class diagrams.',
    layouts: [
      { name: 'layered-arch', source: `type: layered-arch\ntitle: System Architecture\n- Presentation\n  - React SPA\n  - Vite HMR\n- API Gateway\n  - Express routes\n  - Auth middleware\n- Business Logic\n  - Claude worker\n  - Scheduler\n- Data\n  - SQLite\n  - File system` },
      { name: 'entity', source: `type: entity\ntitle: Core Schema\n- sessions\n  - id [PK]\n  - project_id [FK]\n  - title\n  - created_at\n- projects\n  - id [PK]\n  - name\n  - path\n- artifacts\n  - id [PK]\n  - session_id [FK]\n  - type` },
      { name: 'network', source: `type: network\ntitle: Service Topology\n- Browser\n  → API Server\n  → CDN\n- API Server\n  → Worker\n  → SQLite\n- Worker\n  → Claude CLI\n  → MCP Server` },
      { name: 'pipeline', source: `type: pipeline\ntitle: CI/CD Pipeline\n- Source → Lint → Test → Build → Deploy → Monitor` },
      { name: 'sequence', source: `type: sequence\ntitle: Auth Flow\n- Browser\n  → API: POST /login\n- API\n  → DB: SELECT user\n- DB\n  → API: user row\n- API\n  → Browser: Set-Cookie` },
      { name: 'state-machine', source: `type: state-machine\ntitle: Order Lifecycle\n- Pending\n  → Processing: payment ok\n  → Cancelled: timeout\n- Processing\n  → Shipped: packed\n  → Pending: retry\n- Shipped\n  → Delivered: confirmed\n- Delivered [final]\n- Cancelled [final]` },
      { name: 'class', source: `type: class\ntitle: Domain Model\n- Animal [abstract]\n  - + name\n  - + species\n  - + speak() [abstract]\n- Dog\n  - - breed\n  - + speak()\n  - + fetch()\n- Cat [interface]\n  - + purr()\n  - + scratch()` },
    ],
  },
]

// ── Render all SVGs ───────────────────────────────────────────────────────────

let total = 0, failed = 0
for (const family of FAMILIES) {
  for (const layout of family.layouts) {
    try {
      layout.svgDark  = renderMdArt(layout.source)
      layout.svgLight = renderMdArt(layout.source, undefined, { mode: 'light' })
      total++
    } catch (err) {
      const errHtml = `<div class="render-error">${layout.name}: ${err.message}</div>`
      layout.svgDark = layout.svgLight = errHtml
      failed++
    }
  }
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function layoutCard(layout) {
  return `
    <div class="card" id="${layout.name}">
      <div class="card-header">
        <code class="card-name">${layout.name}</code>
      </div>
      <div class="card-body">
        <div class="card-code"><pre>${esc(layout.source)}</pre></div>
        <div class="card-svg">
          <picture>
            <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/${layout.name}.svg">
            <img alt="${layout.name}" src="./examples/gallery/${layout.name}-light.svg">
          </picture>
        </div>
      </div>
    </div>`
}

function familySection(family) {
  return `
  <section id="${family.slug}">
    <div class="family-header">
      <h2>${family.name}</h2>
      <p>${family.desc}</p>
    </div>
    ${family.layouts.map(layoutCard).join('\n')}
  </section>`
}

const navLinks = FAMILIES.map(f =>
  `<a href="#${f.slug}" class="nav-link">${f.name} <span class="nav-count">${f.layouts.length}</span></a>`
).join('\n')

const layoutCount = FAMILIES.reduce((n, f) => n + f.layouts.length, 0)

// ── HTML page ─────────────────────────────────────────────────────────────────

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MdArt Layout Reference</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  /* Light mode (default) */
  --bg:      #ffffff;
  --surface: #f6f8fa;
  --border:  #d0d7de;
  --text:    #1f2328;
  --muted:   #656d76;
  --accent:  #0969da;
  --code-bg: #f6f8fa;
  --nav-w:   220px;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg:      #0d1117;
    --surface: #161b22;
    --border:  #21262d;
    --text:    #e6edf3;
    --muted:   #8b949e;
    --accent:  #58a6ff;
    --code-bg: #0d1117;
  }
}

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
  display: flex;
  min-height: 100vh;
}

/* ── Sidebar ── */
nav {
  width: var(--nav-w);
  min-width: var(--nav-w);
  background: var(--surface);
  border-right: 1px solid var(--border);
  padding: 1.5rem 0;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
}
.nav-title {
  padding: 0 1.25rem 1.25rem;
  font-size: .75rem;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .08em;
  border-bottom: 1px solid var(--border);
  margin-bottom: .5rem;
}
.nav-title strong { display: block; font-size: 1rem; color: var(--text); text-transform: none; letter-spacing: 0; margin-bottom: .2rem; }
.nav-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: .4rem 1.25rem;
  font-size: .875rem;
  color: var(--muted);
  text-decoration: none;
  border-radius: 0;
  transition: color .15s, background .15s;
}
.nav-link:hover { color: var(--text); background: color-mix(in srgb, var(--text) 5%, transparent); }
.nav-link.active { color: var(--accent); }
.nav-count {
  font-size: .7rem;
  background: var(--border);
  color: var(--muted);
  padding: .1em .45em;
  border-radius: 10px;
}

/* ── Main ── */
main {
  flex: 1;
  padding: 2.5rem 2rem 4rem;
  max-width: 960px;
}
.page-header { margin-bottom: 2.5rem; }
.page-header h1 { font-size: 1.75rem; margin-bottom: .35rem; }
.page-header p { color: var(--muted); font-size: .95rem; }
.layout-count {
  display: inline-block;
  margin-top: .5rem;
  padding: .2em .7em;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: .75rem;
  color: var(--muted);
}

section { margin-bottom: 3.5rem; }

.family-header { margin-bottom: 1.25rem; padding-bottom: .75rem; border-bottom: 1px solid var(--border); }
.family-header h2 { font-size: 1.2rem; margin-bottom: .25rem; }
.family-header p { font-size: .875rem; color: var(--muted); }

/* ── Card ── */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  margin-bottom: 1.25rem;
  overflow: hidden;
}
.card-header {
  padding: .55rem 1rem;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}
.card-name {
  font-family: ui-monospace, 'Cascadia Code', monospace;
  font-size: .8rem;
  color: var(--accent);
}
.card-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}
@media (max-width: 700px) {
  .card-body { grid-template-columns: 1fr; }
  nav { display: none; }
  main { padding: 1.25rem; }
}
.card-code {
  border-right: 1px solid var(--border);
  padding: 1rem;
  background: var(--code-bg);
  overflow-x: auto;
}
.card-code pre {
  font-family: ui-monospace, 'Cascadia Code', monospace;
  font-size: .75rem;
  line-height: 1.65;
  color: var(--text);
  white-space: pre;
}
.card-svg {
  padding: .75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
}
.card-svg svg,
.card-svg img { width: 100%; height: auto; display: block; }
.render-error {
  color: #ff7b72;
  font-size: .8rem;
  font-family: ui-monospace, monospace;
  padding: 1rem;
}
</style>
</head>
<body>

<nav id="sidebar">
  <div class="nav-title">
    <strong>MdArt</strong>
    Layout Reference
  </div>
  ${navLinks}
</nav>

<main>
  <div class="page-header">
    <h1>Layout Reference</h1>
    <p>Every MdArt layout type — source code alongside rendered output.</p>
    <span class="layout-count">${layoutCount} layouts across ${FAMILIES.length} families</span>
  </div>

  ${FAMILIES.map(familySection).join('\n')}
</main>

<script>
  // Highlight active nav link on scroll
  const sections = document.querySelectorAll('section[id]')
  const links    = document.querySelectorAll('.nav-link')
  const obs = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) {
        links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id))
      }
    }
  }, { threshold: 0.15 })
  sections.forEach(s => obs.observe(s))
</script>
</body>
</html>`

// ── Markdown gallery (GitHub-friendly) ────────────────────────────────────────

// Write each SVG pair (dark + light) to docs/examples/gallery/ so gallery.md
// and gallery.html can reference them via <picture> elements.
const galleryImgDir = join(root, 'docs', 'examples', 'gallery')
await mkdir(galleryImgDir, { recursive: true })

// Clear stale SVGs so removed layouts don't leave orphans
for (const f of await readdir(galleryImgDir)) {
  if (f.endsWith('.svg')) await unlink(join(galleryImgDir, f))
}

for (const family of FAMILIES) {
  for (const layout of family.layouts) {
    const ok = layout.svgDark && !layout.svgDark.startsWith('<div class="render-error"')
    if (!ok) continue
    await writeFile(join(galleryImgDir, `${layout.name}.svg`),       layout.svgDark,  'utf8')
    await writeFile(join(galleryImgDir, `${layout.name}-light.svg`), layout.svgLight, 'utf8')
  }
}

const tocLines = FAMILIES.map(f => `- [${f.name} (${f.layouts.length})](#${f.slug})`).join('\n')

const mdSections = FAMILIES.map(f => {
  const cards = f.layouts.map(l => {
    const hasSvg = l.svgDark && !l.svgDark.startsWith('<div class="render-error"')
    const picture = hasSvg
      ? [
          '<picture>',
          `  <source media="(prefers-color-scheme: dark)" srcset="./examples/gallery/${l.name}.svg">`,
          `  <img alt="${l.name}" src="./examples/gallery/${l.name}-light.svg">`,
          '</picture>',
        ].join('\n')
      : `> *(render error)*`
    return [
      `### \`${l.name}\``,
      '',
      '```',
      l.source,
      '```',
      '',
      picture,
      '',
    ].join('\n')
  }).join('\n')

  return [
    `## ${f.name}`,
    '',
    `_${f.desc}_`,
    '',
    cards,
  ].join('\n')
}).join('\n---\n\n')

const md = [
  `# MdArt Layout Reference`,
  '',
  `**${layoutCount} layouts across ${FAMILIES.length} families.** Every layout type with its source and rendered output.`,
  '',
  `See the [interactive playground](https://github.com/mdart/mdart) for live editing, or open [gallery.html](./gallery.html) for a richer viewer.`,
  '',
  '## Contents',
  '',
  tocLines,
  '',
  '---',
  '',
  mdSections,
].join('\n')

// ── Playground markdown showcase (gallery-all-diagram-types.md) ──────────────
// Shows every layout type in a single markdown doc — rendered by the demo's
// markdown mode so users can see all 97 layouts with their source + SVG in
// one scrollable page.

const playgroundMd = [
  '# MdArt Diagram Gallery',
  '',
  `Every layout type (${layoutCount} total across ${FAMILIES.length} families) with its mdart source.`,
  '',
  ...FAMILIES.flatMap(f => [
    `## ${f.name}`,
    '',
    ...f.layouts.flatMap(l => [
      `### \`${l.name}\``,
      '',
      '```mdart',
      l.source,
      '```',
      '',
    ]),
  ]),
].join('\n')

// ── Write ─────────────────────────────────────────────────────────────────────

await mkdir(join(root, 'docs'), { recursive: true })
await writeFile(join(root, 'docs', 'gallery.html'), html, 'utf8')
await writeFile(join(root, 'docs', 'gallery.md'),   md,   'utf8')

const playgroundMdPath = join(root, 'apps/playground/examples/markdown/gallery-all-diagram-types.md')
await writeFile(playgroundMdPath, playgroundMd, 'utf8')

console.log(`✓  ${total} layouts rendered${failed ? ` (${failed} failed)` : ''} → docs/gallery.html, docs/gallery.md, docs/examples/gallery/*.svg, apps/playground/examples/markdown/gallery-all-diagram-types.md`)
