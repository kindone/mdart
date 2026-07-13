// Feature:     MdArt global config — theme/color priority ladder
// Arch/Design: Three priority levels: global (configureMdArt) < plugin (renderMdArt arg) < fence
//              (type:/theme:/bg: front-matter). Higher-priority setting wins and the
//              lower-priority value must NOT appear in the rendered SVG.
//              configureMdArt replaces (not merges) the global config; resetMdArtConfig
//              reverts to empty.
// Spec:        ∀ configureMdArt(cfg): getGlobalConfig() === cfg (exact replace, no merge)
//              ∀ after resetMdArtConfig: getGlobalConfig() === {}
//              ∀ (globalTheme, fenceTheme): fence theme's bg rect appears, global's doesn't
//              ∀ (globalTheme, pluginTheme): plugin theme's bg rect appears, global's doesn't
//              ∀ (pluginTheme, fenceTheme): fence theme's bg rect appears, plugin's doesn't
//              ∀ (globalColor, pluginColor): plugin color appears in SVG, global's doesn't
//              ∀ (globalColor, fenceColor): fence color appears in SVG, global's doesn't
//              ∀ (pluginColor, fenceColor): fence color appears in SVG, plugin's doesn't
// @quality:    correctness
// @type:       property
// @mode:       verification

import { describe, it, afterEach } from 'vitest'
import { forAll, Gen } from 'jsproptest'
import { configureMdArt, resetMdArtConfig, getGlobalConfig } from '../config'
import { renderMdArt } from '../renderer'
import { THEMES, genTheme, rgbToHex, genColorPair } from './domains'

afterEach(() => resetMdArtConfig())

// ── Theme background-rect sentinels ───────────────────────────────────────────
//
// The background rect (rx="8") always carries theme.bg. Node rects use rx="6"
// and text elements have no rx, so `fill="{bg}" rx="8"` uniquely identifies
// the theme in any process-family SVG.
function bgRect(theme: string): string {
  const BG: Record<string, string> = { 'mono-light': '#ffffff', 'mono-dark': '#111827' }
  return `fill="${BG[theme]}" rx="8"`
}

const PROCESS_SRC = 'type: process\n\n- A → B'

// ── getGlobalConfig / configureMdArt ─────────────────────────────────────────

describe('getGlobalConfig after configureMdArt', () => {

  it('∀ theme setting: getGlobalConfig().theme === that theme', { timeout: 15000 }, () => {
    forAll(
      (theme: string) => {
        configureMdArt({ theme: theme as any })
        const result = getGlobalConfig().theme === theme
        resetMdArtConfig()
        return result
      },
      genTheme,
    )
  })

  it('second configureMdArt call replaces first (no merge)', { timeout: 15000 }, () => {
    forAll(
      (t1: string, t2: string) => {
        configureMdArt({ theme: t1 as any, colors: { primary: '#ff0000' } })
        configureMdArt({ theme: t2 as any })
        const cfg = getGlobalConfig()
        const result = cfg.theme === t2 && cfg.colors === undefined
        resetMdArtConfig()
        return result
      },
      genTheme,
      genTheme,
    )
  })

  it('resetMdArtConfig always produces empty config', { timeout: 15000 }, () => {
    forAll(
      (theme: string) => {
        configureMdArt({ theme: theme as any })
        resetMdArtConfig()
        return JSON.stringify(getGlobalConfig()) === '{}'
      },
      genTheme,
    )
  })

})

// ── Theme priority: fence > plugin > global ───────────────────────────────────

describe('theme priority ordering', () => {

  it('∀ (globalTheme, fenceTheme) where they differ: fence theme wins', { timeout: 20000 }, () => {
    // Only meaningful when themes differ
    const [t1, t2] = [THEMES[0], THEMES[1]] // mono-light, mono-dark
    forAll(
      (swap: number) => {
        const [global, fence] = swap % 2 === 0 ? [t1, t2] : [t2, t1]
        configureMdArt({ theme: global })
        const src = `type: process\ntheme: ${fence}\n\n- A → B`
        const svg = renderMdArt(src)
        resetMdArtConfig()
        return svg.includes(bgRect(fence)) && !svg.includes(bgRect(global))
      },
      Gen.inRange(0, 1),
    )
  })

  it('∀ (globalTheme, pluginTheme) where they differ: plugin theme wins', { timeout: 20000 }, () => {
    const [t1, t2] = [THEMES[0], THEMES[1]]
    forAll(
      (swap: number) => {
        const [global, plugin] = swap % 2 === 0 ? [t1, t2] : [t2, t1]
        configureMdArt({ theme: global })
        const svg = renderMdArt(PROCESS_SRC, undefined, { theme: plugin })
        resetMdArtConfig()
        return svg.includes(bgRect(plugin)) && !svg.includes(bgRect(global))
      },
      Gen.inRange(0, 1),
    )
  })

  it('∀ (pluginTheme, fenceTheme) where they differ: fence theme wins', { timeout: 20000 }, () => {
    const [t1, t2] = [THEMES[0], THEMES[1]]
    forAll(
      (swap: number) => {
        const [plugin, fence] = swap % 2 === 0 ? [t1, t2] : [t2, t1]
        const src = `type: process\ntheme: ${fence}\n\n- A → B`
        const svg = renderMdArt(src, undefined, { theme: plugin })
        return svg.includes(bgRect(fence)) && !svg.includes(bgRect(plugin))
      },
      Gen.inRange(0, 1),
    )
  })

  it('same-theme at all three levels is consistent (no bleeding)', { timeout: 15000 }, () => {
    forAll(
      (theme: string) => {
        configureMdArt({ theme: theme as any })
        const src = `type: process\ntheme: ${theme}\n\n- A → B`
        const svg = renderMdArt(src, undefined, { theme: theme as any })
        resetMdArtConfig()
        return svg.includes(bgRect(theme))
      },
      genTheme,
    )
  })

})

// ── Color priority: fence > plugin > global ───────────────────────────────────

describe('color priority ordering', () => {

  it('∀ global bg color: color appears in SVG', { timeout: 15000 }, () => {
    forAll(
      (r: number, g: number, b: number) => {
        const color = rgbToHex(r, g, b)
        configureMdArt({ colors: { bg: color } })
        const svg = renderMdArt(PROCESS_SRC)
        resetMdArtConfig()
        return svg.includes(color)
      },
      Gen.inRange(0, 254),
      Gen.inRange(0, 255),
      Gen.inRange(0, 255),
    )
  })

  it('∀ (global, plugin) bg colors: plugin color appears, global does not', { timeout: 20000 }, () => {
    forAll(
      (r: number, g: number, b: number) => {
        const colorA = rgbToHex(r, g, b)
        const colorB = rgbToHex(r, (g + 1) % 256, b)   // guaranteed different
        configureMdArt({ colors: { bg: colorA } })
        const svg = renderMdArt(PROCESS_SRC, undefined, { colors: { bg: colorB } })
        resetMdArtConfig()
        return svg.includes(colorB) && !svg.includes(colorA)
      },
      Gen.inRange(0, 254),
      Gen.inRange(0, 254),
      Gen.inRange(0, 255),
    )
  })

  it('∀ (global, fence) bg colors: fence color appears, global does not', { timeout: 20000 }, () => {
    forAll(
      (r: number, g: number, b: number) => {
        const colorA = rgbToHex(r, g, b)
        const colorB = rgbToHex(r, (g + 1) % 256, b)
        configureMdArt({ colors: { bg: colorA } })
        const src = `type: process\nbg: ${colorB}\n\n- A → B`
        const svg = renderMdArt(src)
        resetMdArtConfig()
        return svg.includes(colorB) && !svg.includes(colorA)
      },
      Gen.inRange(0, 254),
      Gen.inRange(0, 254),
      Gen.inRange(0, 255),
    )
  })

  it('∀ (plugin, fence) bg colors: fence color appears, plugin does not', { timeout: 20000 }, () => {
    forAll(
      (r: number, g: number, b: number) => {
        const colorA = rgbToHex(r, g, b)
        const colorB = rgbToHex(r, (g + 1) % 256, b)
        const src = `type: process\nbg: ${colorB}\n\n- A → B`
        const svg = renderMdArt(src, undefined, { colors: { bg: colorA } })
        return svg.includes(colorB) && !svg.includes(colorA)
      },
      Gen.inRange(0, 254),
      Gen.inRange(0, 254),
      Gen.inRange(0, 255),
    )
  })

})
