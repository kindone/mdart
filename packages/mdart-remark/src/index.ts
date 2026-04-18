/**
 * remark-mdart adapter
 *
 * A real unified/remark plugin that visits `code` nodes in the mdast tree,
 * renders any node whose `lang === 'mdart'` to SVG, and replaces it with an
 * `html` node so the inline SVG passes through rehype untouched.
 *
 * This is the exact shape a published `remark-mdart` package would export —
 * only the import path would change from a local relative path to `@mdart/core`.
 *
 * Usage (app code):
 *   import { unified }        from 'unified'
 *   import remarkParse        from 'remark-parse'
 *   import remarkRehype       from 'remark-rehype'
 *   import rehypeStringify    from 'rehype-stringify'
 *   import { remarkMdart }    from 'remark-mdart'
 *
 *   // With global config (applies to all diagrams site-wide):
 *   import { configureMdArt } from 'mdart'
 *   configureMdArt({ theme: 'mono-light' })
 *   const html = await unified()
 *     .use(remarkParse)
 *     .use(remarkMdart())               // ← inject before remarkRehype
 *     .use(remarkRehype, { allowDangerousHtml: true })
 *     .use(rehypeStringify, { allowDangerousHtml: true })
 *     .process(markdown)
 *     .then(String)
 *
 *   // With plugin-level config (overrides global for this pipeline):
 *   .use(remarkMdart({ theme: 'mono-dark' }))
 */

import { unified }            from 'unified'
import remarkParse            from 'remark-parse'
import remarkRehype           from 'remark-rehype'
import rehypeStringify        from 'rehype-stringify'
import { visit }              from 'unist-util-visit'
import type { Root, Code, Html } from 'mdast'
import type { Plugin }        from 'unified'

// In a published package this would be:  import { renderMdArt } from '@mdart/core'
import { renderMdArt } from 'mdart'
import type { MdArtConfig } from 'mdart'

// ── Plugin ────────────────────────────────────────────────────────────────────

/**
 * Create a remark plugin that renders ```mdart fences as inline SVG.
 *
 * Transforms `code` nodes with lang="mdart" into raw `html` nodes containing
 * the rendered SVG. Must be used before remarkRehype.
 *
 * @param config - Optional plugin-level config. Merged on top of any global
 *                 config set via `configureMdArt()`, but below per-fence
 *                 front-matter values.
 *
 * @example
 * unified().use(remarkMdart({ theme: 'mono-light' }))
 */
export function remarkMdart(config?: MdArtConfig): Plugin<[], Root> {
  const plugin: Plugin<[], Root> = () => (tree: Root) => {
    visit(tree, 'code', (node: Code, index, parent) => {
      if (node.lang !== 'mdart') return

      // node.meta holds the hint type (the text after the language tag)
      const hintType = node.meta?.trim() || undefined

      let svg: string
      try {
        svg = renderMdArt(node.value, hintType, config)
      } catch (err) {
        svg = `<pre class="mdart-error">${String(err)}</pre>`
      }

      // Replace the code node with a raw HTML node.
      // remarkRehype's `allowDangerousHtml: true` will pass it through as-is.
      const htmlNode: Html = { type: 'html', value: svg }
      if (parent && typeof index === 'number') {
        parent.children.splice(index, 1, htmlNode)
      }
    })
  }
  return plugin
}

// ── Convenience wrapper ───────────────────────────────────────────────────────

/**
 * Render a full Markdown document, with mdart fences replaced by SVG.
 *
 * @param markdown - Source markdown string
 * @param config   - Optional plugin-level config (see `remarkMdart`)
 */
export async function renderWithUnified(markdown: string, config?: MdArtConfig): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkMdart(config))
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(markdown)
  return String(file)
}
