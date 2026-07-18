import type { MdArtTheme, ThemeMode } from './theme'
import type { ValidationIssue } from './validator'

export type TextBoundsDebugMode = 'none' | 'red' | 'blue' | 'both' | 'layout' | 'svg'

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

  /**
   * Enable or disable animation globally. Defaults to true (animated).
   * Per-fence `animate: false` still overrides this.
   */
  animate?: boolean

  /**
   * Global animation speed multiplier. >1 = faster, <1 = slower. Default 1.0.
   * Per-fence `animate-speed:` overrides this.
   */
  animateSpeed?: number

  /**
   * Validation mode for `renderMdArtDetailed` (and the `renderMdArt` wrapper).
   *
   * - `'silent'`  — skip validation entirely; `issues` array is always empty.
   * - `'warning'` — (default) run validation; issues are collected and passed to
   *                 `onIssue`, but rendering still proceeds regardless of level.
   * - `'error'`   — run validation; if any error-level issue is found, rendering
   *                 is aborted and the SVG is replaced with an error SVG.
   *
   * Per-call `pluginConfig.validate` overrides this global setting.
   */
  validate?: 'silent' | 'warning' | 'error'

  /**
   * Callback invoked once per validation issue (when `validate !== 'silent'`).
   * Useful for logging issues without needing to inspect the returned array.
   *
   * @example
   * configureMdArt({
   *   onIssue: (issue) => console.warn(`[mdart] ${issue.code}: ${issue.message}`)
   * })
   */
  onIssue?: (issue: ValidationIssue) => void

  /**
   * Emit `data-item-index="{i}"` on every per-item `<g>` group, independently
   * of animation state.
   *
   * When `false` (default), item groups are only emitted when `animate: true`.
   * When `true`, every renderer that supports item grouping will emit a `<g>`
   * wrapper with a stable `data-item-index` attribute regardless of whether
   * animation is on or off.
   *
   * Intended for the test harness and tooling (e.g. `checkSvg` heuristics,
   * `annotateSvg` overlays). Not recommended in production renders — it adds
   * wrapper elements that slightly increase SVG output size.
   *
   * @example
   * configureMdArt({ instrument: true, animate: false })
   */
  instrument?: boolean

  /**
   * Emit debug overlay rectangles for text regions.
   *
   * Intended for renderer development and visual test authoring. The overlays
   * are nonsemantic SVG elements marked with `data-mdart-debug="text-bounds"`.
   *
   * - `red`  — fitted/wrapped layout boxes where available; red fallback boxes otherwise
   * - `blue` — fallback boxes estimated from final SVG `<text>` nodes
   * - `both` — both layout and fallback overlay types
   * - `none` — no boxes
   *
   * Boolean values are kept for compatibility: `true` means `both`, `false`
   * means `none`. `layout` and `svg` are accepted aliases for `red` and `blue`.
   */
  debugTextBounds?: boolean | TextBoundsDebugMode
}

// ── Module-level singleton ────────────────────────────────────────────────────

let _config: MdArtConfig = {}
let _renderConfig: MdArtConfig | null = null

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

/** @internal — effective config for the currently active render call. */
export function getActiveConfig(): Readonly<MdArtConfig> {
  return _renderConfig ?? _config
}

/** @internal — provide per-render plugin config to shared layout helpers. */
export function withMdArtRenderConfig<T>(config: MdArtConfig, fn: () => T): T {
  const prev = _renderConfig
  _renderConfig = { ...config }
  try {
    return fn()
  } finally {
    _renderConfig = prev
  }
}

/** @internal — normalize legacy boolean and current string debug modes. */
export function getTextBoundsDebugMode(config: Pick<MdArtConfig, 'debugTextBounds'>): TextBoundsDebugMode {
  const mode = config.debugTextBounds
  if (mode === true) return 'both'
  if (mode === false || mode === undefined) return 'none'
  if (mode === 'layout') return 'red'
  if (mode === 'svg') return 'blue'
  return mode
}
