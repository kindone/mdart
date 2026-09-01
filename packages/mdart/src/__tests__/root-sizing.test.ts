// Feature:     Root <svg> display-sizing strategy (flow / fit / raw)
// Arch/Design: renderMdArtDetailed post-processes the assembled SVG via
//              applyRootSizing(), rewriting the root style attribute uniformly
//              for every layout. Precedence: per-fence front-matter > plugin
//              config > global config > 'flow' default.
// Spec:        flow caps rendered width at the diagram's natural size; fit
//              fills a bounded box; raw leaves the layout's own style alone.
// @quality:    correctness
// @type:       example
// @mode:       verification

import { afterEach, describe, expect, it } from 'vitest'
import { renderMdArt, applyRootSizing } from '../renderer'
import { configureMdArt, resetMdArtConfig } from '../config'

const PROCESS = `type: process
A → B → C`

function rootStyle(svg: string): string {
  return svg.match(/^<svg\b[^>]*\sstyle="([^"]*)"/)?.[1] ?? ''
}
function viewBoxW(svg: string): number {
  const vb = svg.match(/viewBox="\s*[-\d.]+\s+[-\d.]+\s+([-\d.]+)/)
  return vb ? parseFloat(vb[1]) : NaN
}

afterEach(() => resetMdArtConfig())

describe('applyRootSizing (unit)', () => {
  const base = '<svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">x</svg>'

  it('flow: caps max-width at the intrinsic viewBox width', () => {
    const out = applyRootSizing(base, { sizing: 'flow' })
    expect(rootStyle(out)).toBe('width:100%;height:auto;max-width:min(100%, 600px)')
  })

  it('flow: author max-width overrides the intrinsic cap', () => {
    const out = applyRootSizing(base, { sizing: 'flow', maxWidth: 900 })
    expect(rootStyle(out)).toContain('max-width:min(100%, 900px)')
  })

  it('flow: author width sets a fixed px width', () => {
    const out = applyRootSizing(base, { sizing: 'flow', width: 320 })
    expect(rootStyle(out)).toContain('width:320px')
    expect(rootStyle(out)).toContain('max-width:min(100%, 600px)')
  })

  it('fit: fills the box, drops any max-width', () => {
    const out = applyRootSizing(base, { sizing: 'fit' })
    expect(rootStyle(out)).toBe('width:100%;height:100%')
  })

  it('raw with no overrides is a no-op', () => {
    const out = applyRootSizing(base, { sizing: 'raw' })
    expect(out).toBe(base)
  })

  it('raw still applies explicit author overrides', () => {
    const out = applyRootSizing(base, { sizing: 'raw', maxWidth: 500 })
    expect(rootStyle(out)).toBe('width:100%;height:auto;max-width:500px')
  })

  it('preserves non-sizing declarations (background, border-radius)', () => {
    const withBg = base.replace('width:100%;height:auto', 'width:100%;height:auto;background:#0f172a;border-radius:8px')
    const out = applyRootSizing(withBg, { sizing: 'flow' })
    expect(rootStyle(out)).toContain('background:#0f172a')
    expect(rootStyle(out)).toContain('border-radius:8px')
    expect(rootStyle(out)).toContain('max-width:min(100%, 600px)')
  })

  it('align: center emits margin-inline:auto', () => {
    const out = applyRootSizing(base, { sizing: 'flow', align: 'center' })
    expect(rootStyle(out)).toContain('display:block')
    expect(rootStyle(out)).toContain('margin-inline:auto')
  })

  it('adds a style attribute to a root that had none', () => {
    const bare = '<svg viewBox="0 0 400 80" xmlns="http://www.w3.org/2000/svg">x</svg>'
    const out = applyRootSizing(bare, { sizing: 'flow' })
    expect(rootStyle(out)).toBe('width:100%;height:auto;max-width:min(100%, 400px)')
  })

  it('leaves non-svg input untouched', () => {
    expect(applyRootSizing('not an svg', { sizing: 'flow' })).toBe('not an svg')
  })
})

describe('renderMdArt sizing integration', () => {
  it('defaults to flow — root gains an intrinsic max-width cap', () => {
    const svg = renderMdArt(PROCESS)
    const w = viewBoxW(svg)
    expect(rootStyle(svg)).toContain(`max-width:min(100%, ${w}px)`)
  })

  it('per-fence `sizing: raw` disables the cap', () => {
    const svg = renderMdArt(`type: process\nsizing: raw\nA → B → C`)
    expect(rootStyle(svg)).not.toContain('max-width')
  })

  it('per-fence `sizing: fit` fills the box', () => {
    const svg = renderMdArt(`type: process\nsizing: fit\nA → B → C`)
    expect(rootStyle(svg)).toBe('width:100%;height:100%')
  })

  it('per-fence `max-width:` is honored', () => {
    const svg = renderMdArt(`type: process\nmax-width: 480\nA → B → C`)
    expect(rootStyle(svg)).toContain('max-width:min(100%, 480px)')
  })

  it('global config sizing is respected and overridden by front-matter', () => {
    configureMdArt({ sizing: 'raw' })
    expect(rootStyle(renderMdArt(PROCESS))).not.toContain('max-width')
    expect(rootStyle(renderMdArt(`type: process\nsizing: flow\nA → B → C`))).toContain('max-width:min(100%,')
  })

  it('plugin config sizing overrides global, loses to front-matter', () => {
    configureMdArt({ sizing: 'raw' })
    expect(rootStyle(renderMdArt(PROCESS, undefined, { sizing: 'fit' }))).toBe('width:100%;height:100%')
    expect(rootStyle(renderMdArt(`type: process\nsizing: raw\nA → B → C`, undefined, { sizing: 'fit' }))).not.toContain('height:100%')
  })
})
