import type { MdArtTheme, ThemeMode } from './theme'

/**
 * Global configuration for MdArt.
 *
 * Set once at app startup via `configureMdArt()`; applies to every diagram
 * rendered by `renderMdArt()` unless overridden at a lower level.
 *
 * Priority (lowest → highest):
 *   category default  <  global config  <  plugin config  <  per-fence front-matter
 */
export interface MdArtConfig {
  /**
   * Default theme name applied when a fence has no `theme:` front-matter.
   * Accepts any named theme ('mono-light', 'mono-dark') or a category name
   * ('process', 'hierarchy', …).
   */
  theme?: string

  /**
   * Default colour mode. 'dark' (default) uses the saturated dark category
   * palettes; 'light' uses their light-mode counterparts with the same hues
   * on off-white backgrounds. Per-fence `mode:` front-matter overrides this.
   */
  mode?: ThemeMode

  /**
   * Default color overrides applied to every diagram.
   * Per-fence `primary:`, `secondary:` … values still take precedence.
   */
  colors?: Partial<MdArtTheme>
}

// ── Module-level singleton ────────────────────────────────────────────────────

let _config: MdArtConfig = {}

/**
 * Set global MdArt defaults.
 * Subsequent calls replace (not merge) the previous global config.
 *
 * @example
 * configureMdArt({ theme: 'mono-light' })
 * configureMdArt({ colors: { primary: '#6366f1', bg: '#0f172a' } })
 */
export function configureMdArt(config: MdArtConfig): void {
  _config = { ...config }
}

/**
 * Reset global config to its empty defaults.
 * Primarily for use in tests.
 */
export function resetMdArtConfig(): void {
  _config = {}
}

/** @internal — used by renderer.ts */
export function getGlobalConfig(): Readonly<MdArtConfig> {
  return _config
}
