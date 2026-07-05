// @quality: correctness
// @type: example

import { describe, it, expect } from 'vitest'
import { renderMdArt } from './renderer'

const threeItems = `- A
- B
- C`

function arrowGroupClasses(svg: string): string[] {
  return Array.from(svg.matchAll(/<g class="(mdart-arr-n\d+)"/g), m => m[1])
}

describe('animation connector timing', () => {
  it('shrinks spotlighted nodes directly back to their original state', () => {
    const svg = renderMdArt(`type: process\n${threeItems}`)

    expect(svg).not.toContain('scale(1.04)')
    expect(svg).not.toContain('brightness(1.3)')
    expect(svg).toContain('scale(1.03)')
    expect(svg).toContain('scale(1)')
  })

  it.each(['zigzag-list', 'ribbon-list'])(
    '%s uses brightness spotlight without scale so anchored geometry stays aligned',
    type => {
      const svg = renderMdArt(`type: ${type}\n${threeItems}`)

      expect(svg).not.toContain('mdart-loop')
      expect(svg).not.toContain('transform:scale')
      expect(svg).toContain('mdart-bright-loop')
    }
  )

  it.each(['arrow-process', 'waterfall', 'bending-process', 'circle-process', 'step-up', 'step-down'])(
    '%s fades ordinary connectors in with their destination node',
    type => {
      const svg = renderMdArt(`type: ${type}\n${threeItems}`)
      expect(arrowGroupClasses(svg)).toEqual(['mdart-arr-n1', 'mdart-arr-n2'])
    }
  )

  it.each(['cycle', 'block-cycle', 'circular-process', 'loop'])(
    '%s fades the closing arrow in after the last node',
    type => {
      const svg = renderMdArt(`type: ${type}\n${threeItems}`)
      const classes = arrowGroupClasses(svg)

      expect(classes).not.toContain('mdart-arr-n0')
      expect(classes).toContain('mdart-arr-n1')
      expect(classes).toContain('mdart-arr-n2')
      expect(classes).toContain('mdart-arr-n3')
    }
  )

  it('timeline-v animates its spine before rows without scale pulse', () => {
    const svg = renderMdArt(`type: timeline-v
- 2026 Q1: Plan
  - Scope
- 2026 Q2: Build
  - Ship`)

    expect(svg).toContain('@keyframes mdart-enter')
    expect(svg).toContain('<g class="mdart-n0">')
    expect(svg).toContain('<g class="mdart-n1">')
    expect(svg).toContain('<g class="mdart-n2">')
    expect(svg).toMatch(/<g class="mdart-n0">[\s\S]*?<line[\s\S]*?<polygon[\s\S]*?<\/g>/)
    expect(svg).toMatch(/<g class="mdart-n1">[\s\S]*?<circle/)
    expect(svg).not.toContain('transform:scale')
  })
})
