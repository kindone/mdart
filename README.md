# MdArt

A markdown-native diagram DSL that renders structured diagrams as inline SVG directly from fenced code blocks.

## Examples

````markdown
```mdart
type: chevron-process
title: Development Lifecycle

Discovery → Design → Build → Test → Deploy
```
````

![Process](./docs/examples/process.svg)

---

````markdown
```mdart
type: org-chart
title: Engineering Team

- CTO
  - Frontend
  - Backend
  - Platform
```
````

![Org chart](./docs/examples/org-chart.svg)

---

````markdown
```mdart
type: kanban
title: Sprint Board

- Backlog
  - Write docs
  - Fix bug #42
- In Progress
  - Add tests
- Done
  - Initial release
```
````

![Kanban](./docs/examples/kanban.svg)

---

````markdown
```mdart
type: swot
title: Product Analysis

+ Strong brand recognition
+ Existing distribution network
- High customer acquisition cost
- Limited mobile presence
? Asia-Pacific expansion
? API partnership programme
! New low-cost competitor
! Regulatory changes
```
````

![SWOT](./docs/examples/swot.svg)

---

````markdown
```mdart
type: sequence
title: Auth Flow

- Browser
  → API: POST /login
- API
  → DB: validate credentials
- DB
  → API: user record
- API
  → Browser: 200 + JWT
```
````

![Sequence](./docs/examples/sequence.svg)

---

````markdown
```mdart
type: gantt-lite
title: Q3 Roadmap

- Research     [wk1–wk2]
- Design       [wk2–wk4]
- Development  [wk3–wk8]
- Testing      [wk7–wk9]
* Launch       [wk10]
```
````

![Gantt](./docs/examples/gantt.svg)

## Packages

| Package | Description |
|---|---|
| [`mdart`](./packages/mdart) | Core renderer and parser |
| [`mdart-marked`](./packages/mdart-marked) | [marked](https://marked.js.org) v15 extension |
| [`mdart-markdown-it`](./packages/mdart-markdown-it) | [markdown-it](https://github.com/markdown-it/markdown-it) v14 plugin |
| [`mdart-remark`](./packages/mdart-remark) | [unified](https://unifiedjs.com)/remark plugin |

## Layout families

MdArt supports 10 diagram families out of the box:

**Process** · **List** · **Cycle** · **Matrix** · **Hierarchy** · **Pyramid** · **Relationship** · **Statistical** · **Planning** · **Technical**

Each family has multiple layout types (97 total) — org charts, kanban boards, Gantt charts, sequence diagrams, SWOT analyses, Sankey flows, and much more.

## Quick start

```bash
npm install mdart
```

```ts
import { renderMdArt } from 'mdart'

const svg = renderMdArt(`
type: cycle
Plan → Build → Measure → Learn
`)

document.body.innerHTML = svg
```

Apply a theme globally or per fence:

```ts
import { configureMdArt } from 'mdart'
configureMdArt({ theme: 'mono-light' })
```

Or per fence with `theme: mono-light` in front-matter. Available themes: `mono-light` · `mono-dark` · `cyan` · `emerald` · `violet` · `lavender` · `amber` · `orange` · `rose` · `blue` · `sky`

See the individual package READMEs for markdown ecosystem integrations.

## Repository layout

```
packages/
  mdart/              # core renderer + parser
  mdart-marked/       # marked v15 extension
  mdart-markdown-it/  # markdown-it v14 plugin
  mdart-remark/       # unified/remark plugin
apps/
  playground/         # interactive browser playground
  vscode/             # VS Code extension (Marketplace: mdart)
```

## Development

```bash
# Install all dependencies
npm install

# Type-check all packages
npm run check

# Run tests
npm run test:all

# Build all packages
npm run build

# Regenerate example SVGs after renderer changes
npm run gen-examples
```

## Gallery

Browse all 97 layout types with source + rendered SVG: **[docs/gallery.md](./docs/gallery.md)** (GitHub-friendly) or [docs/gallery.html](./docs/gallery.html) (richer standalone viewer — clone the repo).

## Syntax reference

Full syntax documentation with rendered examples for all 97 layout types, color overrides, and modifier attrs: **[docs/syntax.md](./docs/syntax.md)**

## License

MIT
