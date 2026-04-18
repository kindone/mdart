# mdart-marked

[marked](https://marked.js.org) v15 extension that renders `mdart` fenced code blocks as inline SVG.

````markdown
```mdart
type: chevron-process
title: Development Lifecycle

Discovery → Design → Build → Test → Deploy
```
````

![Process](../../docs/examples/process.svg)

Full syntax reference with rendered examples: **[docs/syntax.md](../../docs/syntax.md)**

## Install

```bash
npm install mdart mdart-marked marked
```

## Usage

```ts
import { Marked } from 'marked'
import { mdartExtension } from 'mdart-marked'

const marked = new Marked({ extensions: [mdartExtension()] })

const html = await marked.parse(`
# Hello

\`\`\`mdart process
Discovery → Design → Build → Test → Deploy
\`\`\`
`)
```

### Convenience wrapper

```ts
import { renderWithMarked } from 'mdart-marked'

const html = await renderWithMarked(markdown)
```

## Configuration

Pass a config object to `mdartExtension()` or `renderWithMarked()` to set plugin-level defaults. These override any global `configureMdArt()` config but remain below per-fence front-matter.

```ts
import { configureMdArt } from 'mdart'
import { mdartExtension, renderWithMarked } from 'mdart-marked'

// Global — applies everywhere
configureMdArt({ theme: 'mono-light' })

// Plugin-level — overrides global for this marked instance
const marked = new Marked({ extensions: [mdartExtension({ theme: 'mono-dark' })] })

// Convenience wrapper with config
const html = await renderWithMarked(markdown, { theme: 'mono-dark' })
```

## How it works

The extension registers a custom block-level tokenizer that matches `` ```mdart `` fences. The renderer calls `renderMdArt()` from the `mdart` core package and returns the SVG inline — no external requests, no additional script tags needed.

Non-`mdart` fences are left untouched and rendered by marked as normal.

## Peer dependencies

```json
{
  "mdart": ">=0.1.0",
  "marked": ">=15.0.0"
}
```

## License

MIT
