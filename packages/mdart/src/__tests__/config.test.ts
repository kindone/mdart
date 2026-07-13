import { describe, it, expect, beforeEach } from 'vitest'
import { configureMdArt, resetMdArtConfig, getGlobalConfig } from '../config'
import { renderMdArt } from '../renderer'

beforeEach(() => resetMdArtConfig())

// ── getGlobalConfig ──────────────────────────────────────────────────────────

describe('getGlobalConfig', () => {
  it('returns empty object by default', () => {
    expect(getGlobalConfig()).toEqual({})
  })

  it('reflects values set by configureMdArt', () => {
    configureMdArt({ theme: 'mono-light' })
    expect(getGlobalConfig().theme).toBe('mono-light')
  })

  it('replaces config on subsequent calls (no merge)', () => {
    configureMdArt({ theme: 'mono-light', colors: { primary: '#ff0000' } })
    configureMdArt({ theme: 'mono-dark' })
    const cfg = getGlobalConfig()
    expect(cfg.theme).toBe('mono-dark')
    expect(cfg.colors).toBeUndefined()
  })
})

// ── Theme priority ───────────────────────────────────────────────────────────

describe('theme priority', () => {
  // Unique fill colours per theme, anchored to the background rect (rx="8").
  // We can't use bare 'fill="#ffffff"' because the process renderer uses
  // contrastColor(nodeFill) for text, which produces white text on dark-gray
  // nodes in *both* themes. The background rect (rx="8") is the stable
  // discriminator: it always carries theme.bg, unique per theme.
  //   mono-light: bg=#ffffff  mono-dark: bg=#111827
  const LIGHT_ONLY = 'fill="#ffffff" rx="8"'   // background rect, mono-light
  const DARK_ONLY  = 'fill="#111827" rx="8"'  // background rect, mono-dark

  it('applies global theme when no per-fence theme is set', () => {
    configureMdArt({ theme: 'mono-light' })
    const svg = renderMdArt('type: process\n\n- A → B')
    expect(svg).toContain(LIGHT_ONLY)
    expect(svg).not.toContain(DARK_ONLY)
  })

  it('per-fence theme overrides global theme', () => {
    configureMdArt({ theme: 'mono-light' })
    const svg = renderMdArt('type: process\ntheme: mono-dark\n\n- A → B')
    expect(svg).toContain(DARK_ONLY)
    expect(svg).not.toContain(LIGHT_ONLY)
  })

  it('plugin-level theme overrides global theme', () => {
    configureMdArt({ theme: 'mono-light' })
    const svg = renderMdArt('type: process\n\n- A → B', undefined, { theme: 'mono-dark' })
    expect(svg).toContain(DARK_ONLY)
    expect(svg).not.toContain(LIGHT_ONLY)
  })

  it('per-fence theme overrides plugin-level theme', () => {
    const svg = renderMdArt(
      'type: process\ntheme: mono-light\n\n- A → B',
      undefined,
      { theme: 'mono-dark' }
    )
    expect(svg).toContain(LIGHT_ONLY)
    expect(svg).not.toContain(DARK_ONLY)
  })
})

// ── Color priority ───────────────────────────────────────────────────────────

describe('color priority', () => {
  it('applies global color override to all diagrams', () => {
    configureMdArt({ colors: { bg: '#abcdef' } })
    const svg = renderMdArt('type: process\n\n- A → B')
    expect(svg).toContain('#abcdef')
  })

  it('plugin-level colors override global colors', () => {
    configureMdArt({ colors: { bg: '#aaaaaa' } })
    const svg = renderMdArt('type: process\n\n- A → B', undefined, { colors: { bg: '#bbbbbb' } })
    expect(svg).toContain('#bbbbbb')
    expect(svg).not.toContain('#aaaaaa')
  })

  it('per-fence colors override plugin-level colors', () => {
    const svg = renderMdArt(
      'type: process\nbg: #cccccc\n\n- A → B',
      undefined,
      { colors: { bg: '#bbbbbb' } }
    )
    expect(svg).toContain('#cccccc')
    expect(svg).not.toContain('#bbbbbb')
  })

  it('per-fence colors override global colors', () => {
    configureMdArt({ colors: { bg: '#aaaaaa' } })
    const svg = renderMdArt('type: process\nbg: #cccccc\n\n- A → B')
    expect(svg).toContain('#cccccc')
    expect(svg).not.toContain('#aaaaaa')
  })
})

// ── resetMdArtConfig ─────────────────────────────────────────────────────────

describe('resetMdArtConfig', () => {
  it('clears global config', () => {
    configureMdArt({ theme: 'mono-light', colors: { primary: '#ff0000' } })
    resetMdArtConfig()
    expect(getGlobalConfig()).toEqual({})
  })
})
