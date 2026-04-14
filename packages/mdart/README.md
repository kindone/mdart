# mdart

Core renderer and parser for the MdArt diagram DSL.

![Org chart example](../../docs/examples/org-chart.svg)

## Install

```bash
npm install mdart
```

## Usage

### Render a diagram

```ts
import { renderMdArt } from 'mdart'

const svg = renderMdArt(`
type: org-chart
title: Engineering

- CTO
  - Frontend
  - Backend
  - Platform
`)

// svg is a self-contained <svg>...</svg> string, ready to inject into the DOM
document.body.innerHTML = svg
```

An optional second argument hints the layout type when you're rendering a bare
source string without front-matter:

```ts
const svg = renderMdArt('Plan → Build → Measure → Learn', 'cycle')
```

### Parse without rendering

```ts
import { parseMdArt } from 'mdart'
import type { MdArtSpec } from 'mdart'

const spec: MdArtSpec = parseMdArt(`
type: kanban

- Backlog
  - Write docs
  - Fix bug #42
- In Progress
  - Add tests
- Done
  - Initial release
`)
```

### Browser tab interactivity

Layouts with multiple tabs (e.g. `tab-list`) need a small client-side script
to wire click handlers. Import from the `mdart/preview` subpath so bundlers
can tree-shake it out of server builds:

```ts
import { tryActivateMdArtTabFromEventTarget } from 'mdart/preview'

document.addEventListener('click', (e) => {
  tryActivateMdArtTabFromEventTarget(e.target)
})
```

## API

### `renderMdArt(source, hintType?)`

| Parameter | Type | Description |
|---|---|---|
| `source` | `string` | MdArt DSL source (with or without front-matter) |
| `hintType` | `string \| undefined` | Layout type hint (overridden by front-matter `type:`) |

Returns a `string` containing a self-contained SVG element.

Throws if the source cannot be parsed or the layout type is unknown.

### `parseMdArt(source)`

Returns an `MdArtSpec` object with the parsed `type`, `title`, `theme`, and `items`.

## Themes

Pass `theme:` in front-matter to switch colour schemes:

```
type: process
theme: mono-light

Step 1 → Step 2 → Step 3
```

Available themes: `default`, `mono-light`, `mono-dark`, `ocean`, `forest`, `sunset`.

## License

MIT
