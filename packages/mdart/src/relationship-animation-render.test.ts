// @quality: correctness
// @type: example

import { describe, expect, it } from 'vitest'
import { renderMdArt } from './renderer'

describe('relationship layout animation', () => {
  it('animates radial center and spokes without scale distortion', () => {
    const svg = renderMdArt(`type: radial
title: Hub
- Alpha
- Beta
- Gamma`)

    expect(svg).toMatch(/@keyframes mdart-s[a-z0-9]+-mdart-enter/)
    expect(svg).toContain('class="mdart-n0"')
    expect(svg).toContain('class="mdart-n1"')
    expect(svg).not.toContain('mdart-loop')
  })

  it('animates converging hub and source paths as grouped steps', () => {
    const svg = renderMdArt(`type: converging
- Outcome
  - Input A
  - Input B`)

    expect(svg).toContain('class="mdart-n0"')
    expect(svg).toContain('class="mdart-n1"')
    expect(svg).toContain('marker-end="url(#arr-c)"')
  })

  it('animates venn circles and intersections while preserving overlap geometry', () => {
    const svg = renderMdArt(`type: venn
- Product
- Market
- Product ∩ Market: Fit`)

    expect(svg).toMatch(/@keyframes mdart-s[a-z0-9]+-mdart-enter/)
    expect(svg).toContain('class="mdart-n0"')
    expect(svg).toContain('class="mdart-n1"')
    expect(svg).toContain('class="mdart-n2"')
    expect(svg).not.toContain('mdart-loop')
  })

  it('animates plus connector arms with their boxes', () => {
    const svg = renderMdArt(`type: plus
- North
- East
- South
- West
- Center`)

    expect(svg).toMatch(/<g class="mdart-n1"><line[\s\S]*?<rect/)
    expect(svg).toMatch(/<g class="mdart-n2"><line[\s\S]*?<rect/)
    expect(svg).toMatch(/<g class="mdart-n3"><line[\s\S]*?<rect/)
    expect(svg).toMatch(/<g class="mdart-n4"><line[\s\S]*?<rect/)
  })
})
