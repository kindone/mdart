// @quality: correctness
// @type: example

import { describe, it, expect } from 'vitest'
import { renderMdArt } from './renderer'
import { getTheme } from './theme'

describe('loop layout render', () => {
  it('uses theme.bg for node labels so they contrast against the coloured circle fills', () => {
    const src = `type: loop
title: Feedback
- Build
- Measure
`
    const svg = renderMdArt(src)
    const theme = getTheme('loop')
    // New pipeline-loop design places labels inside circles; readability comes
    // from painting them in the theme's bg colour on top of the primary fills.
    expect(svg).toContain(`fill="${theme.bg}"`)
  })

  it('points the return arrow into the first node from outside its lower-left edge', () => {
    const svg = renderMdArt(`type: loop
- Build
- Measure
- Learn`)

    expect(svg).toContain('<marker id="lp-ret" markerWidth="8" markerHeight="8" refX="0" refY="4" orient="auto">')
    expect(svg).toMatch(/C[\d.]+,[\d.]+ 45\.7,120\.8 46\.8,85\.6/)
    expect(svg).not.toContain('24.0,48.0')
  })
})
