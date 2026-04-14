# MdArt

A markdown-native diagram DSL that renders structured diagrams as inline SVG directly from fenced code blocks.

```mdart
type: process
Discovery → Design → Build → Test → Deploy
```

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

Each family has multiple layout types (99 total) — org charts, kanban boards, Gantt charts, sequence diagrams, SWOT analyses, Sankey flows, and much more.

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
```

## License

MIT
