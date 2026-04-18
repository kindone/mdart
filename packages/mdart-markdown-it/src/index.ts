/**
 * markdown-it-mdart adapter
 *
 * A real `markdown-it` plugin that overrides the `fence` renderer rule to
 * intercept ```mdart blocks and replace them with inline SVG. All other
 * fenced code blocks pass through to the default renderer unchanged.
 *
 * This is the exact shape a published `markdown-it-mdart` package would
 * export — only the import path would change from a local relative path to
 * `@mdart/core`.
 *
 * Usage (app code):
 *   import MarkdownIt from 'markdown-it'
 *   import { mdartPlugin } from 'markdown-it-mdart'
 *
 *   // With global config (applies to all diagrams site-wide):
 *   import { configureMdArt } from 'mdart'
 *   configureMdArt({ theme: 'mono-light' })
 *   const md = new MarkdownIt().use(mdartPlugin())
 *
 *   // With plugin-level config (overrides global for this md instance):
 *   const md = new MarkdownIt().use(mdartPlugin({ theme: 'mono-dark' }))
 *
 *   const html = md.render(markdown)
 */

import MarkdownIt from 'markdown-it'
import type { PluginSimple } from 'markdown-it'

// In a published package this would be:  import { renderMdArt } from '@mdart/core'
import { renderMdArt } from 'mdart'
import type { MdArtConfig } from 'mdart'

// ── Plugin ────────────────────────────────────────────────────────────────────

/**
 * Create a markdown-it plugin that renders ```mdart fences as inline SVG.
 *
 * @param config - Optional plugin-level config. Merged on top of any global
 *                 config set via `configureMdArt()`, but below per-fence
 *                 front-matter values.
 *
 * @example
 * const md = new MarkdownIt().use(mdartPlugin({ theme: 'mono-light' }))
 */
export function mdartPlugin(config?: MdArtConfig): PluginSimple {
  return (md: MarkdownIt): void => {
    // Capture the original fence renderer so non-mdart fences pass through.
    const defaultFence =
      md.renderer.rules['fence'] ??
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((tokens: any[], idx: number, options: MarkdownIt['options'], _env: unknown, self: MarkdownIt['renderer']) =>
        self.renderToken(tokens, idx, options))

    md.renderer.rules['fence'] = (tokens, idx, options, env, self) => {
      const token = tokens[idx]
      // token.info = "mdart" or "mdart hintType"
      const parts    = token.info.trim().split(/\s+/)
      const lang     = parts[0]
      const hintType = parts[1]  // optional

      if (lang === 'mdart') {
        try {
          return renderMdArt(token.content, hintType, config)
        } catch (err) {
          return `<pre class="mdart-error">${md.utils.escapeHtml(String(err))}</pre>`
        }
      }

      return defaultFence(tokens, idx, options, env, self)
    }
  }
}

// ── Convenience wrapper ───────────────────────────────────────────────────────

/**
 * Render a full Markdown document, with mdart fences replaced by SVG.
 *
 * @param markdown - Source markdown string
 * @param config   - Optional plugin-level config (see `mdartPlugin`)
 */
export function renderWithMarkdownIt(markdown: string, config?: MdArtConfig): string {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: true })
  md.use(mdartPlugin(config))
  return md.render(markdown)
}
