/**
 * marked-mdart adapter
 *
 * A real `marked` extension that intercepts ```mdart fences and renders them
 * to inline SVG. This is the exact shape a published `marked-mdart` package
 * would export — only the import path would change from a local relative path
 * to `@mdart/core`.
 *
 * Usage (app code):
 *   import { Marked } from 'marked'
 *   import { mdartExtension } from 'marked-mdart'
 *
 *   // With global config (applies to all diagrams site-wide):
 *   import { configureMdArt } from 'mdart'
 *   configureMdArt({ theme: 'mono-light' })
 *   const marked = new Marked({ extensions: [mdartExtension()] })
 *
 *   // With plugin-level config (overrides global for this marked instance):
 *   const marked = new Marked({ extensions: [mdartExtension({ theme: 'mono-dark' })] })
 *
 *   const html = await marked.parse(markdown)
 */

import { Marked, type TokenizerExtension, type RendererExtension, type Tokens } from 'marked'

// In a published package this would be:  import { renderMdArt } from '@mdart/core'
import { renderMdArt } from 'mdart'
import type { MdArtConfig } from 'mdart'

// ── Token type ────────────────────────────────────────────────────────────────

interface MdartToken extends Tokens.Generic {
  type:     'mdart'
  raw:      string
  source:   string
  hintType: string | undefined
}

// ── Extension ─────────────────────────────────────────────────────────────────

/**
 * Create a marked extension that renders ```mdart fences as inline SVG.
 *
 * @param config - Optional plugin-level config. Merged on top of any global
 *                 config set via `configureMdArt()`, but below per-fence
 *                 front-matter values.
 */
export function mdartExtension(config?: MdArtConfig): TokenizerExtension & RendererExtension {
  return {
    name:  'mdart',
    level: 'block',

    start(src: string): number | undefined {
      const idx = src.indexOf('\n```mdart')
      return idx >= 0 ? idx : undefined
    },

    tokenizer(src: string): MdartToken | undefined {
      // Matches ```mdart or ```mdart <hintType>
      const match = /^```mdart(?:\s+(\S+))?\n([\s\S]*?)```[ \t]*(?:\n|$)/.exec(src)
      if (!match) return undefined
      return {
        type:     'mdart',
        raw:      match[0],
        source:   match[2],
        hintType: match[1],
      }
    },

    renderer(token: Tokens.Generic): string {
      const t = token as MdartToken
      try {
        return renderMdArt(t.source, t.hintType, config)
      } catch (err) {
        return `<pre class="mdart-error">${String(err)}</pre>`
      }
    },
  }
}

// ── Convenience wrapper ───────────────────────────────────────────────────────

/**
 * Render a full Markdown document, with mdart fences replaced by SVG.
 *
 * @param markdown - Source markdown string
 * @param config   - Optional plugin-level config (see `mdartExtension`)
 */
export async function renderWithMarked(markdown: string, config?: MdArtConfig): Promise<string> {
  const instance = new Marked({ extensions: [mdartExtension(config)] })
  return await instance.parse(markdown)
}
