/**
 * Generate SVG example files for README documentation.
 * Run: node scripts/gen-examples.mjs
 */

import { renderMdArt } from '../packages/mdart/dist/index.js'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = join(__dir, '..')
const out   = join(root, 'docs', 'examples')

await mkdir(out, { recursive: true })

const examples = [
  {
    file: 'process.svg',
    source: `type: chevron-process
title: Development Lifecycle

Discovery → Design → Build → Test → Deploy`,
  },
  {
    file: 'org-chart.svg',
    source: `type: org-chart
title: Engineering Team

- CTO
  - Frontend
  - Backend
  - Platform`,
  },
  {
    file: 'kanban.svg',
    source: `type: kanban
title: Sprint Board

- Backlog
  - Write docs
  - Fix bug #42
- In Progress
  - Add tests
- Done
  - Initial release`,
  },
  {
    file: 'cycle.svg',
    source: `type: cycle
title: Build–Measure–Learn

Plan → Build → Measure → Learn`,
  },
  {
    file: 'swot.svg',
    source: `type: swot
title: Product Analysis

+ Strong brand recognition
+ Existing distribution network
- High customer acquisition cost
- Limited mobile presence
? Asia-Pacific expansion
? API partnership programme
! New low-cost competitor
! Regulatory changes`,
  },
  {
    file: 'gantt.svg',
    source: `type: gantt-lite
title: Q3 Roadmap

- Research     [wk1–wk2]
- Design       [wk2–wk4]
- Development  [wk3–wk8]
- Testing      [wk7–wk9]
* Launch       [wk10]`,
  },
  {
    file: 'sequence.svg',
    source: `type: sequence
title: Auth Flow

- Browser
  → API: POST /login
- API
  → DB: validate credentials
- DB
  → API: user record
- API
  → Browser: 200 + JWT`,
  },
  {
    file: 'pyramid.svg',
    source: `type: pyramid
title: Maslow's Hierarchy

- Self-actualisation
- Esteem
- Love & Belonging
- Safety
- Physiological`,
  },
]

let ok = 0
for (const { file, source } of examples) {
  try {
    const svg  = renderMdArt(source)
    const path = join(out, file)
    await writeFile(path, svg, 'utf8')
    console.log(`✓  docs/examples/${file}`)
    ok++
  } catch (err) {
    console.error(`✗  ${file}: ${err.message}`)
  }
}

console.log(`\n${ok}/${examples.length} examples generated → docs/examples/`)
