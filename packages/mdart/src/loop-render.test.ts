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
})
