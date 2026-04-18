# mdart-remark

[unified](https://unifiedjs.com)/remark plugin that renders `mdart` fenced code blocks as inline SVG.

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

![Sequence](../../docs/examples/sequence.svg)

Full syntax reference with rendered examples: **[docs/syntax.md](../../docs/syntax.md)**

## Install

```bash
npm install mdart mdart-remark unified remark-parse remark-rehype rehype-stringify unist-util-visit
```

## Usage

```ts
import { unified }         from 'unified'
import remarkParse         from 'remark-parse'
import remarkRehype        from 'remark-rehype'
import rehypeStringify     from 'rehype-stringify'
import { remarkMdart }     from 'mdart-remark'

const html = await unified()
  .use(remarkParse)
  .use(remarkMdart())                            // ← before remarkRehype
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeStringify, { allowDangerousHtml: true })
  .process(markdown)
  .then(String)
```

### Convenience wrapper

```ts
import { renderWithUnified } from 'mdart-remark'

const html = await renderWithUnified(markdown)
```

## Configuration

`remarkMdart()` is a factory — call it with an optional config to set plugin-level defaults:

```ts
import { configureMdArt } from 'mdart'
import { remarkMdart, renderWithUnified } from 'mdart-remark'

// Global — applies everywhere
configureMdArt({ theme: 'mono-light' })

// Plugin-level — overrides global for this pipeline
unified().use(remarkMdart({ theme: 'mono-dark' }))

// Convenience wrapper with config
const html = await renderWithUnified(markdown, { theme: 'mono-dark' })
```

## How it works

The plugin visits every `code` node in the mdast tree. When it finds one with `lang === 'mdart'`, it calls `renderMdArt()` from the `mdart` core package and replaces the node with a raw `html` node containing the SVG. The `allowDangerousHtml: true` option on `remark-rehype` and `rehype-stringify` lets that raw HTML pass through to the final output untouched.

The optional hint type uses the node's `meta` field (the text after the language tag):

````markdown
```mdart cycle
Plan → Build → Measure → Learn
```
````

## Peer dependencies

```json
{
  "mdart": ">=0.1.0",
  "unified": ">=11.0.0",
  "remark-parse": ">=11.0.0",
  "remark-rehype": ">=11.0.0",
  "rehype-stringify": ">=10.0.0",
  "unist-util-visit": ">=5.0.0"
}
```

## License

MIT
