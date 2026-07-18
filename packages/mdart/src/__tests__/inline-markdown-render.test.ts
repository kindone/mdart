import { describe, expect, it } from 'vitest'
import { renderMdArt } from '../renderer'
import { estimateTextWidth, FONT_MONO_ATTR, regularPolygonPoints, roundedRectPath, truncate, wrapLabel } from '../layouts/shared'

describe('inline markdown rendering', () => {
  it('builds shared geometry primitives deterministically', () => {
    expect(regularPolygonPoints(10, 20, 5, 4, 0)).toBe('15.0,20.0 10.0,25.0 5.0,20.0 10.0,15.0')
    expect(roundedRectPath(0, 0, 20, 10, { tl: 2, tr: 3, br: 4, bl: 5 })).toBe(
      'M2.0,0 H17.0 A3,3 0 0,1 20.0,3.0 V6.0 A4,4 0 0,1 16.0,10.0 H5.0 A5,5 0 0,1 0.0,5.0 V2.0 A2,2 0 0,1 2.0,0 Z',
    )
  })

  it('measures wraps and truncates against visible inline text', () => {
    expect(estimateTextWidth('**State**', 12)).toBe(estimateTextWidth('State', 12))

    const wrapped = wrapLabel('**State**', 5, 1)
    expect(wrapped.lines).toEqual(['**State**'])
    expect(wrapped.truncated).toBe(false)

    expect(truncate('**State**', 5)).toBe('**State**')
    expect(truncate('**State** vector', 8)).toBe('**State** v…')
  })

  it('draws fitted text debug boxes only when requested', () => {
    const source = `
type: process
- customer migration readiness checkpoint: requires manual verification before release
`
    const normal = renderMdArt(source, 'process')
    const debug = renderMdArt(source, 'process', { debugTextBounds: true })

    expect(normal).not.toContain('data-mdart-debug="text-bounds"')
    expect(debug).toContain('data-mdart-debug="text-bounds"')
    expect(debug).toContain('data-mdart-debug-label="fit-block"')
  })

  it('supports separate text debug modes for red and blue text boxes', () => {
    const source = `
type: process
- customer migration readiness checkpoint: requires manual verification before release
`
    const none = renderMdArt(source, 'process', { debugTextBounds: 'none' })
    const red = renderMdArt(source, 'process', { debugTextBounds: 'red' })
    const blue = renderMdArt(source, 'process', { debugTextBounds: 'blue' })
    const both = renderMdArt(source, 'process', { debugTextBounds: 'both' })

    expect(none).not.toContain('data-mdart-debug="text-bounds"')
    expect(red).toContain('data-mdart-debug-label="fit-block"')
    expect(red).not.toContain('data-mdart-debug-label="text-element"')
    expect(blue).not.toContain('data-mdart-debug-label="fit-block"')
    expect(blue).toContain('data-mdart-debug-label="text-element"')
    expect(both).toContain('data-mdart-debug-label="fit-block"')
    expect(both).toContain('data-mdart-debug-label="text-element"')
    expect(both.indexOf('data-mdart-debug-label="fit-block"')).toBeGreaterThan(
      both.indexOf('data-mdart-debug-label="text-element"'),
    )
  })

  it('draws fallback debug boxes for renderer-specific text elements', () => {
    const source = `
type: segmented-bar
- Design: 30
- Build: 45
- Test: 25
`
    const debug = renderMdArt(source, 'segmented-bar', { debugTextBounds: true })

    expect(debug).toContain('data-mdart-debug="text-bounds"')
    expect(debug).toContain('data-mdart-debug-label="text-element"')
  })

  it('draws red fallback boxes when a renderer has no layout debug boxes', () => {
    const source = `
type: segmented-bar
- Design: 30
- Build: 45
- Test: 25
`
    const red = renderMdArt(source, 'segmented-bar', { debugTextBounds: 'red' })

    expect(red).toContain('data-mdart-debug-label="text-element"')
    expect(red).toContain('stroke="#ec4899"')
    expect(red).toContain('data-mdart-debug-layer="red-text-bounds"')

    const both = renderMdArt(source, 'segmented-bar', { debugTextBounds: 'both' })
    expect(both).toContain('stroke="#0ea5e9"')
    expect(both).toContain('stroke="#ec4899"')
  })

  it('honors per-render animation config', () => {
    const source = `
type: process
- A
- B
`
    const animated = renderMdArt(source, 'process', { animate: true })
    const statik = renderMdArt(source, 'process', { animate: false })

    expect(animated).toContain('mdart-n0')
    expect(statik).not.toContain('mdart-n0')
  })

  it('renders bold italic strike and code in text-heavy list renderers', () => {
    const svg = renderMdArt(`
type: bullet-list
- **Bold** and *italic*: ~~removed~~ then \`code\`
`, 'bullet-list')

    expect(svg).toContain('font-weight="700">Bold</tspan>')
    expect(svg).toContain('font-style="italic">italic</tspan>')
    expect(svg).toContain('text-decoration="line-through">removed</tspan>')
    expect(svg).toContain(`${FONT_MONO_ATTR}>code</tspan>`)
    expect(svg).not.toContain('>**Bold**</tspan>')
    expect(svg).not.toContain('>*italic*</tspan>')
    expect(svg).not.toContain('>~~removed~~</tspan>')
  })

  it('renders inline styles through shared wrapped text helpers', () => {
    const svg = renderMdArt(`
type: comparison
direction: LR

- A
  - Form: **Product**
  - Note: *separable*

- B
  - Form: **Entangled**
  - Note: *correlated*
`, 'comparison')

    expect(svg).toContain('font-weight="700">Product</tspan>')
    expect(svg).toContain('font-weight="700">Entangled</tspan>')
    expect(svg).toContain('font-style="italic">separable</tspan>')
    expect(svg).toContain('font-style="italic">correlated</tspan>')
  })

  it('renders inline styles in numbered-list label and value text', () => {
    const svg = renderMdArt(`
type: numbered-list
title: Postulates of quantum mechanics

- **State**: A physical system is described by a state vector \`|ψ⟩\` in a Hilbert space \`ℋ\`
- **Observables**: Every measurable quantity corresponds to a Hermitian operator \`Â\` on \`ℋ\`
`, 'numbered-list')

    expect(svg).toContain('font-weight="700">State</tspan>')
    expect(svg).toContain('font-weight="700">Observables</tspan>')
    expect(svg).toContain(`${FONT_MONO_ATTR}>|ψ⟩</tspan>`)
    expect(svg).toContain(`${FONT_MONO_ATTR}>Â</tspan>`)
    expect(svg).not.toContain('>**State**</tspan>')
    expect(svg).not.toContain('>`|ψ⟩`</tspan>')
  })

  it('applies inline styles through the common SVG text pass', () => {
    const svg = renderMdArt(`
type: block-list
title: **Styled title**

- **Block**: *Value*
  - ~~Child~~ item
`, 'block-list')

    expect(svg).toContain('font-weight="700">Styled title</tspan>')
    expect(svg).toContain('font-weight="700">Block</tspan>')
    expect(svg).toContain('font-style="italic">Value</tspan>')
    expect(svg).toContain('text-decoration="line-through">Child</tspan>')
    expect(svg).not.toContain('>**Styled title**</text>')
    expect(svg).not.toContain('>**Block**</tspan>')
  })

  it('keeps unmatched markers literal and escapes styled text', () => {
    const svg = renderMdArt(`
type: circle-list
- **<script>**
- ψ_A stays literal
- unmatched * marker
`, 'circle-list')

    expect(svg).not.toContain('<script>')
    expect(svg).toContain('&lt;script&gt;')
    expect(svg).toContain('ψ_A stays literal')
    expect(svg).toContain('unmatched * marker')
  })
})
