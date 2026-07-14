import { describe, expect, it } from 'vitest'
import { renderMdArt } from '../renderer'

function visibleTextIncludes(svg: string, text: string): boolean {
  return svg
    .replace(/<title>[\s\S]*?<\/title>/g, '')
    .includes(text)
}

function textYFor(svg: string, text: string): number {
  const nodes = [...svg.matchAll(/<text x="360\.0" y="([\d.]+)"[^>]*>[\s\S]*?<\/text>/g)]
  const match = nodes.find(node => node[0].includes(text))
  expect(match?.[1]).toBeDefined()
  return Number(match![1])
}

describe('relationship layout text fitting', () => {
  it('balance renders value text instead of replacing it with an ellipsis cue', () => {
    const svg = renderMdArt(`
type: balance
- Wave aspect: Interference pattern visible
- Particle aspect: Which-path detection active
`, 'balance')

    expect(visibleTextIncludes(svg, 'Interference')).toBe(true)
    expect(visibleTextIncludes(svg, 'Which-path')).toBe(true)
    expect(visibleTextIncludes(svg, 'Wave aspect …')).toBe(false)
    expect(visibleTextIncludes(svg, 'Particle aspect …')).toBe(false)
  })

  it('opposing-arrows renders value text inside the arrow bodies', () => {
    const svg = renderMdArt(`
type: opposing-arrows
- Wave description: Broad spread of wavelengths
- Particle description: Localized detection event
`, 'opposing-arrows')

    expect(visibleTextIncludes(svg, 'Broad spread')).toBe(true)
    expect(visibleTextIncludes(svg, 'Localized detection')).toBe(true)
    expect(visibleTextIncludes(svg, 'Wave description …')).toBe(false)
  })

  it('converging and diverging fit multi-word labels over multiple lines', () => {
    const converging = renderMdArt(`
type: converging
- Complementarity principle
  - Experimental setup: determines observed aspect
  - Measurement context selects the description
`, 'converging')

    const diverging = renderMdArt(`
type: diverging
- Quantum state preparation: defines initial conditions
  - Interference pattern prediction
  - Which-path information channel
`, 'diverging')

    expect(visibleTextIncludes(converging, 'Experimental')).toBe(true)
    expect(visibleTextIncludes(converging, 'determines')).toBe(true)
    expect(converging).toMatch(/font-size="7\.5" fill="#fda4af"[^>]*>[\s\S]*determines/)
    expect(visibleTextIncludes(diverging, 'Interference')).toBe(true)
    expect(visibleTextIncludes(diverging, 'information')).toBe(true)
    expect(visibleTextIncludes(diverging, 'defines initial')).toBe(true)
  })

  it('h-org-chart centers multi-line text within fixed-height nodes', () => {
    const svg = renderMdArt(`
type: h-org-chart
- Alpha Beta Gamma Delta
  - Child Node
`, 'h-org-chart')

    const rect = svg.match(/<rect x="[^"]+" y="(?<y>[\d.]+)" width="120" height="44"/)
    const text = svg.match(/<text x="[^"]+" y="(?<y>[\d.]+)" text-anchor="middle" font-size="(?<fs>[\d.]+)"/)
    expect(rect?.groups?.y).toBeDefined()
    expect(text?.groups?.y).toBeDefined()

    const rectY = Number(rect!.groups!.y)
    const textY = Number(text!.groups!.y)
    expect(textY).toBeGreaterThan(rectY + 10)
    expect(textY).toBeLessThan(rectY + 34)
  })

  it('concentric and target render key-value details in side text lanes', () => {
    const concentric = renderMdArt(`
type: concentric
title: Scope Layers
- Vision: 10yr north star
- Strategy: 3yr directional bets
- Goals: annual OKRs
`, 'concentric')

    const target = renderMdArt(`
type: target
title: Focus Areas
- Core Goal: north-star outcome
- Must Have: required for launch
- Should Have: important but negotiable
`, 'target')

    expect(visibleTextIncludes(concentric, '10yr north star')).toBe(true)
    expect(visibleTextIncludes(concentric, '3yr directional bets')).toBe(true)
    expect(visibleTextIncludes(target, 'north-star outcome')).toBe(true)
    expect(visibleTextIncludes(target, 'required for launch')).toBe(true)
    expect(visibleTextIncludes(concentric, 'Vision …')).toBe(false)
    expect(visibleTextIncludes(target, 'Core Goal …')).toBe(false)
    expect(concentric).toMatch(/<path d="M[\d.]+,([\d.]+) L342\.0,\1"/)
    expect(target).toMatch(/<path d="M[\d.]+,([\d.]+) L342\.0,\1"/)
    expect(concentric).toMatch(/<text x="[\d.]+" y="[\d.]+" text-anchor="middle"[^>]*>[\s\S]*Vision/)
    expect(target).toMatch(/<text x="170\.0" y="[\d.]+" text-anchor="middle"[^>]*>[\s\S]*Core Goal/)
  })

  it('concentric maps list order from outer ring to inner ring without reordering value rows', () => {
    const svg = renderMdArt(`
type: concentric
title: Scope Layers
- Vision: 10yr north star
- Strategy: 3yr directional bets
- Goals: annual OKRs
- Initiatives: quarterly projects
- Tasks
`, 'concentric')

    const visionY = textYFor(svg, '10yr north star')
    const strategyY = textYFor(svg, '3yr directional bets')
    const goalsY = textYFor(svg, 'annual OKRs')
    const initiativesY = textYFor(svg, 'quarterly projects')
    expect(visionY).toBeLessThan(strategyY)
    expect(strategyY).toBeLessThan(goalsY)
    expect(goalsY).toBeLessThan(initiativesY)

    const radii = [...svg.matchAll(/<circle cx="170\.0" cy="[\d.]+" r="([\d.]+)"/g)].map(match => Number(match[1]))
    expect(radii.slice(0, 5)).toEqual([...radii.slice(0, 5)].sort((a, b) => b - a))
    expect(visibleTextIncludes(svg, 'Vision')).toBe(true)
    expect(visibleTextIncludes(svg, 'Tasks')).toBe(true)
  })

  it('target maps list order from inner ring to outer ring without reordering value rows', () => {
    const svg = renderMdArt(`
type: target
title: Launch Focus
- Core: primary outcome
- Near Ring: immediate constraints
- Middle Ring: supporting work
- Outer Ring: broader context
`, 'target')

    const coreY = textYFor(svg, 'primary outcome')
    const nearY = textYFor(svg, 'immediate constraints')
    const middleY = textYFor(svg, 'supporting work')
    const outerY = textYFor(svg, 'broader context')
    expect(coreY).toBeLessThan(nearY)
    expect(nearY).toBeLessThan(middleY)
    expect(middleY).toBeLessThan(outerY)
  })

  it('concentric and target animate from innermost ring to outermost ring', () => {
    const concentric = renderMdArt(`
type: concentric
- Outer
- Middle
- Inner
`, 'concentric')
    const target = renderMdArt(`
type: target
- Inner
- Middle
- Outer
`, 'target')

    expect(concentric).toMatch(/<g class="mdart-n0">[\s\S]*Inner/)
    expect(target).toMatch(/<g class="mdart-n0">[\s\S]*Inner/)
  })

  it('target remains visually distinct from concentric', () => {
    const concentric = renderMdArt('type: concentric\n- Inner\n- Outer', 'concentric')
    const target = renderMdArt('type: target\n- Inner\n- Outer', 'target')

    expect(target).toContain('stroke-width="1"')
    expect(target).toContain('x2="321"')
    expect(concentric).not.toContain('x2="321"')
  })
})
