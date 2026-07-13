// Feature:     MdArt config lifecycle — state isolation across renders
// Arch/Design: MdArt maintains a module-level global config (`_config: MdArtConfig`).
//              `configureMdArt(cfg)` replaces it (not merges); `resetMdArtConfig()`
//              sets it back to `{}`. Per-call `pluginConfig` (third arg to renderMdArt)
//              is ephemeral — it is merged on top of global for that call only and must
//              NOT persist to subsequent calls.
//
//              This file tests the config STATE MACHINE under sequences of operations:
//              configure, render, reset, and per-call plugin config. The critical
//              invariants are:
//
//   S-1 (replace, not merge):
//     configureMdArt(A); configureMdArt(B); getGlobalConfig() === B, not {...A, ...B}
//   S-2 (reset restores empty):
//     ∀ cfg: configureMdArt(cfg); resetMdArtConfig(); getGlobalConfig() deep-equals {}
//   S-3 (reset idempotent):
//     ∀ cfg: configure(cfg); reset(); reset(); getGlobalConfig() === {}
//   S-4 (plugin config ephemeral):
//     ∀ (globalCfg, pluginCfg, src, type): render(src, type, pluginCfg) reads merged config
//       but leaves getGlobalConfig() === globalCfg after the call
//   S-5 (sequential render stability):
//     ∀ (src1, src2, type): render(src1); render(src2); render(src1) === first render(src1)
//   S-6 (configure-render-reset-render cycle):
//     ∀ (cfg, src, type): freshRender = render(src); configure(cfg); reset();
//                         render(src) === freshRender
//   S-7 (n-deep configure sequence):
//     ∀ sequence of configure calls: only the last call's theme persists
//   S-8 (plugin config priority over global):
//     ∀ (globalTheme, pluginTheme): render(src, type, {theme: pluginTheme}) uses pluginTheme
//       regardless of what getGlobalConfig().theme is
// @quality:    correctness
// @type:       property
// @mode:       verification

import { describe, it, afterEach } from 'vitest'
import { forAll, Gen } from 'jsproptest'
import { configureMdArt, resetMdArtConfig, getGlobalConfig } from '../config'
import { renderMdArt } from '../renderer'

afterEach(() => resetMdArtConfig())

const THEMES = ['mono-light', 'mono-dark'] as const

// A short but non-trivial source that renders something visible for all types.
const SIMPLE_SRC_3 = '- Alpha\n- Beta\n- Gamma'

// Types stable for a plain flat source (no special syntax needed).
const STABLE_TYPES = ['process', 'bullet-list', 'cycle', 'pyramid', 'org-chart']

// Background rect sentinel (the bg rect is rx="8" and carries theme.bg color).
const THEME_BG: Record<string, string> = {
  'mono-light': '#ffffff',
  'mono-dark':  '#111827',
}

// ── S-1: Replace, not merge ───────────────────────────────────────────────────
//
// configureMdArt does a full replace: calling it twice must result in the second
// call's value, not a merge of the two. This prevents "sticky" config leaking
// across separate configure calls.

describe('S-1 (replace, not merge): second configure call overwrites first', () => {

  it('∀ (themeA, themeB) where themeA ≠ themeB: final config is themeB, not themeA', () => {
    // Use the two distinct known themes as the "A" and "B" values.
    configureMdArt({ theme: 'mono-light' })
    configureMdArt({ theme: 'mono-dark'  })
    const cfg = getGlobalConfig()
    if (cfg.theme !== 'mono-dark') throw new Error(`Expected mono-dark, got: ${String(cfg.theme)}`)
    if ((cfg as Record<string, unknown>)['mono-light']) throw new Error('Stale themeA key leaked into config')
    resetMdArtConfig()

    configureMdArt({ theme: 'mono-dark'  })
    configureMdArt({ theme: 'mono-light' })
    const cfg2 = getGlobalConfig()
    if (cfg2.theme !== 'mono-light') throw new Error(`Expected mono-light, got: ${String(cfg2.theme)}`)
  })

  it('∀ (animate:true, then animate:false): second call wins', () => {
    configureMdArt({ animate: true  })
    configureMdArt({ animate: false })
    const cfg = getGlobalConfig()
    if (cfg.animate !== false) throw new Error(`Expected animate:false, got: ${String(cfg.animate)}`)
  })

  it('∀ sequence of n theme configure calls: only the last theme persists', { timeout: 20000 }, () => {
    forAll(
      (n: number) => {
        // Call configure n times, cycling through themes
        for (let i = 0; i < n; i++) {
          configureMdArt({ theme: THEMES[i % THEMES.length] })
        }
        const expected = THEMES[(n - 1) % THEMES.length]
        const actual = getGlobalConfig().theme
        resetMdArtConfig()
        return actual === expected
      },
      Gen.inRange(1, 8),
    )
  })

})

// ── S-2: Reset restores empty config ─────────────────────────────────────────
//
// After any configureMdArt call, resetMdArtConfig() must restore getGlobalConfig()
// to exactly {} (empty object). No key from the previous config may survive.

describe('S-2 (reset restores empty): getGlobalConfig() === {} after reset', () => {

  it('reset after theme configure → empty config', () => {
    configureMdArt({ theme: 'mono-dark' })
    resetMdArtConfig()
    const cfg = getGlobalConfig()
    if (Object.keys(cfg).length !== 0) {
      throw new Error(`Config not empty after reset: ${JSON.stringify(cfg)}`)
    }
  })

  it('reset after animate:false configure → empty config', () => {
    configureMdArt({ animate: false })
    resetMdArtConfig()
    const cfg = getGlobalConfig()
    if (cfg.animate !== undefined) {
      throw new Error(`animate key survived reset: ${String(cfg.animate)}`)
    }
  })

  it('∀ (theme, animate): configuring both fields → reset → config is {}', { timeout: 15000 }, () => {
    forAll(
      (themeIdx: number, anim: boolean) => {
        configureMdArt({ theme: THEMES[themeIdx % THEMES.length], animate: anim })
        resetMdArtConfig()
        const cfg = getGlobalConfig()
        const isEmpty = Object.keys(cfg).length === 0
        if (!isEmpty) resetMdArtConfig()
        return isEmpty
      },
      Gen.inRange(0, 1),
      Gen.elementOf(true, false),
    )
  })

})

// ── S-3: Reset idempotent ─────────────────────────────────────────────────────
//
// Calling resetMdArtConfig() twice must produce the same state as calling it
// once. The second reset must be a no-op, not a failure or unexpected mutation.

describe('S-3 (reset idempotent): calling reset twice ≡ calling reset once', () => {

  it('reset; reset → config still {}', () => {
    configureMdArt({ theme: 'mono-dark', animate: false })
    resetMdArtConfig()
    resetMdArtConfig()
    const cfg = getGlobalConfig()
    if (Object.keys(cfg).length !== 0) {
      throw new Error(`Config not empty after double reset: ${JSON.stringify(cfg)}`)
    }
  })

  it('∀ n resets: all produce {}', { timeout: 15000 }, () => {
    forAll(
      (n: number) => {
        configureMdArt({ theme: 'mono-light' })
        for (let i = 0; i < n; i++) resetMdArtConfig()
        const isEmpty = Object.keys(getGlobalConfig()).length === 0
        if (!isEmpty) resetMdArtConfig()
        return isEmpty
      },
      Gen.inRange(1, 6),
    )
  })

})

// ── S-4: Plugin config is ephemeral ──────────────────────────────────────────
//
// The third argument to renderMdArt (pluginConfig) is per-call only. After the
// call returns, getGlobalConfig() must equal what it was before the call.
// Plugin config must NOT be absorbed into the global config.

describe('S-4 (plugin config ephemeral): renderMdArt(src, type, pluginCfg) leaves global unchanged', () => {

  it('calling render with pluginConfig does not mutate global config', () => {
    // Set global to theme A
    configureMdArt({ theme: 'mono-light' })
    const before = { ...getGlobalConfig() }

    // Render with theme B as plugin config
    renderMdArt(`type: process\n${SIMPLE_SRC_3}`, 'process', { theme: 'mono-dark' })

    // Global config must still be theme A
    const after = getGlobalConfig()
    if (after.theme !== before.theme) {
      throw new Error(`Global config mutated: was ${String(before.theme)}, now ${String(after.theme)}`)
    }
  })

  it('∀ (globalTheme, pluginTheme) both valid: global unchanged after render', { timeout: 15000 }, () => {
    forAll(
      (gIdx: number, pIdx: number, typeIdx: number) => {
        const globalTheme = THEMES[gIdx % THEMES.length]
        const pluginTheme = THEMES[pIdx % THEMES.length]
        const type = STABLE_TYPES[typeIdx % STABLE_TYPES.length]

        configureMdArt({ theme: globalTheme })
        renderMdArt(`type: ${type}\n${SIMPLE_SRC_3}`, undefined, { theme: pluginTheme })

        const survived = getGlobalConfig().theme === globalTheme
        resetMdArtConfig()
        return survived
      },
      Gen.inRange(0, 1),
      Gen.inRange(0, 1),
      Gen.inRange(0, STABLE_TYPES.length - 1),
    )
  })

})

// ── S-5: Sequential render stability ─────────────────────────────────────────
//
// Rendering source B between two renders of source A must not affect the result
// for A. Renders must be pure functions of (source, config); no state must
// accumulate between calls.

describe('S-5 (sequential stability): render(A); render(B); render(A) === first render(A)', () => {

  it('∀ (typeA, typeB, n): interleaved renders of two sources produce identical results', { timeout: 20000 }, () => {
    forAll(
      (aIdx: number, bIdx: number, n: number) => {
        const typeA = STABLE_TYPES[aIdx % STABLE_TYPES.length]
        const typeB = STABLE_TYPES[bIdx % STABLE_TYPES.length]
        const srcA = `type: ${typeA}\n${Array.from({ length: n },     (_, i) => `- Item${i}`).join('\n')}`
        const srcB = `type: ${typeB}\n${Array.from({ length: n + 1 }, (_, i) => `- Diff${i}`).join('\n')}`

        const r1 = renderMdArt(srcA)
        renderMdArt(srcB)  // interleaved render of a different source
        const r3 = renderMdArt(srcA)

        return r1 === r3
      },
      Gen.inRange(0, STABLE_TYPES.length - 1),
      Gen.inRange(0, STABLE_TYPES.length - 1),
      Gen.inRange(2, 4),
    )
  })

})

// ── S-6: Configure-render-reset-render cycle ──────────────────────────────────
//
// The core lifecycle contract for docs plugins:
//   1. configureMdArt(cfg)   ← plugin sets global theme for its session
//   2. renderMdArt(src, type) ← renders using that global config
//   3. resetMdArtConfig()    ← plugin tears down after session
//   4. renderMdArt(src, type) ← next render must use the defaults, not the plugin's theme
//
// Step 4 must be identical to a fresh render before any configuration.

describe('S-6 (configure-render-reset cycle): post-reset render matches default render', () => {

  it('∀ (theme, type, n): freshRender === configure+reset+render', { timeout: 20000 }, () => {
    forAll(
      (themeIdx: number, typeIdx: number, n: number) => {
        const theme = THEMES[themeIdx % THEMES.length]
        const type  = STABLE_TYPES[typeIdx % STABLE_TYPES.length]
        const src   = `type: ${type}\n${Array.from({ length: n }, (_, i) => `- Item${i}`).join('\n')}`

        // Baseline: fresh render with no global config
        const svgFresh = renderMdArt(src)

        // Configure, render (to ensure state is set), then reset
        configureMdArt({ theme })
        renderMdArt(src)   // side-load — render while configured
        resetMdArtConfig()

        // Post-reset render must equal the fresh baseline
        const svgPostReset = renderMdArt(src)

        return svgFresh === svgPostReset
      },
      Gen.inRange(0, 1),
      Gen.inRange(0, STABLE_TYPES.length - 1),
      Gen.inRange(2, 4),
    )
  })

})

// ── S-7 (plugin priority): plugin theme renders with plugin's colors ──────────
//
// pluginConfig.theme must override getGlobalConfig().theme when both are set.
// This is the "plugin overrides global" half of the priority ladder.
// (The "fence overrides plugin" half is tested in config.prop.ts.)

describe('S-8 (plugin theme priority): pluginConfig.theme overrides global theme in SVG output', () => {

  it('∀ (globalTheme, pluginTheme) distinct: rendered SVG uses pluginTheme bg color', { timeout: 15000 }, () => {
    forAll(
      (gIdx: number) => {
        // Use the two themes as "global" and "plugin" (always distinct)
        const globalTheme = THEMES[gIdx]
        const pluginTheme = THEMES[1 - gIdx]   // the other theme

        configureMdArt({ theme: globalTheme })

        const src = `type: process\n${SIMPLE_SRC_3}`
        const svg = renderMdArt(src, undefined, { theme: pluginTheme })

        const bgRectFill = svg.match(/fill="(#[0-9a-fA-F]{6})" rx="8"/)?.[1]

        const survived = bgRectFill === THEME_BG[pluginTheme]
          && bgRectFill !== THEME_BG[globalTheme]

        resetMdArtConfig()
        return survived
      },
      Gen.inRange(0, 1),
    )
  })

})
