# mdart-markdown-it

[markdown-it](https://github.com/markdown-it/markdown-it) v14 plugin that renders `mdart` fenced code blocks as inline SVG.

````markdown
```mdart
type: cycle
title: Build–Measure–Learn

Plan → Build → Measure → Learn
```
````

![Cycle](../../docs/examples/cycle.svg)

Full syntax reference with rendered examples: **[docs/syntax.md](../../docs/syntax.md)**

## Install

```bash
npm install mdart mdart-markdown-it markdown-it
```

## Usage

```ts
import MarkdownIt from 'markdown-it'
import { mdartPlugin } from 'mdart-markdown-it'

const md = new MarkdownIt().use(mdartPlugin)

const html = md.render(`
# Hello

\`\`\`mdart process
Discovery → Design → Build → Test → Deploy
\`\`\`
`)
```

### Convenience wrapper

```ts
import { renderWithMarkdownIt } from 'mdart-markdown-it'

const html = renderWithMarkdownIt(markdown)
```

## How it works

The plugin overrides the `fence` renderer rule. When it encounters a fence with `lang === 'mdart'`, it calls `renderMdArt()` from the `mdart` core package and returns the SVG inline. All other fenced blocks pass through to the original renderer unchanged.

The optional hint type can be appended after the language tag:

````markdown
```mdart cycle
Plan → Build → Measure → Learn
```
````

## Peer dependencies

```json
{
  "mdart": ">=0.1.0",
  "markdown-it": ">=14.0.0"
}
```

## License

MIT
