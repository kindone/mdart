// @quality: correctness
// @type: example

import { describe, it, expect } from 'vitest'
import { renderMdArt } from '../renderer'

const pyramidItems = `- Strategy: 10%
  - Direction
- Execution: 30%
  - Delivery
- Operations: 60%
  - Support`

describe('pyramid layout animation', () => {
  it.each([
    'pyramid',
    'inverted-pyramid',
    'pyramid-list',
    'segmented-pyramid',
    'diamond-pyramid',
  ])('%s animates tiers in sequence without scale pulse', type => {
    const svg = renderMdArt(`type: ${type}\n${pyramidItems}`)

    expect(svg).toMatch(/@keyframes mdart-s[a-z0-9]+-mdart-enter/)
    expect(svg).toContain('class="mdart-n0"')
    expect(svg).toContain('class="mdart-n1"')
    expect(svg).toContain('class="mdart-n2"')
    expect(svg).not.toContain('transform:scale')
  })

  it('pyramid animates from bottom tier to top tier', () => {
    const svg = renderMdArt(`type: pyramid
- Top
- Middle
- Bottom`)

    expect(svg).toMatch(/<g class="mdart-n0">[\s\S]*?Bottom/)
    expect(svg).toMatch(/<g class="mdart-n2">[\s\S]*?Top/)
  })
})
