# mdart

Core renderer and parser for the MdArt diagram DSL.

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

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/kindone/mdart/main/docs/examples/org-chart.svg">
  <img alt="Org chart" src="https://raw.githubusercontent.com/kindone/mdart/main/docs/examples/org-chart-light.svg">
</picture>

Full syntax documentation with rendered examples for all 97 layout types, color overrides, and modifier attrs: **[docs/syntax.md](https://github.com/kindone/mdart/blob/main/docs/syntax.md)**

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

### `renderMdArt(source, hintType?, pluginConfig?)`

| Parameter | Type | Description |
|---|---|---|
| `source` | `string` | MdArt DSL source (with or without front-matter) |
| `hintType` | `string \| undefined` | Layout type hint (overridden by front-matter `type:`) |
| `pluginConfig` | `MdArtConfig \| undefined` | Plugin-level config (overrides global, below per-fence) |

Returns a `string` containing a self-contained SVG element.

Throws if the source cannot be parsed or the layout type is unknown.

### `parseMdArt(source)`

Returns an `MdArtSpec` object with the parsed `type`, `title`, `theme`, and `items`.

### `configureMdArt(config)`

Sets global defaults applied to every `renderMdArt()` call. Subsequent calls replace (not merge) the previous config.

| Field | Type | Description |
|---|---|---|
| `theme` | `string \| undefined` | Default theme name |
| `colors` | `Partial<MdArtTheme> \| undefined` | Default color overrides |

### `resetMdArtConfig()`

Resets global config to empty defaults. Primarily for use in tests.

## Themes

Each diagram family has a built-in color scheme. Override it per fence, globally, or at the plugin level.

### Named themes

`mono-light` · `mono-dark` · `cyan` · `emerald` · `violet` · `lavender` · `amber` · `orange` · `rose` · `blue` · `sky`

```
type: process
theme: emerald

Step 1 → Step 2 → Step 3
```

### Global configuration

```ts
import { configureMdArt, resetMdArtConfig } from 'mdart'

// Apply to all diagrams in this process
configureMdArt({ theme: 'mono-light' })

// Or override individual colors
configureMdArt({ colors: { primary: '#6366f1', bg: '#0f172a' } })

// Reset (useful in tests)
resetMdArtConfig()
```

## License

MIT
