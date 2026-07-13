// @quality: correctness
// @type: example

import { describe, it, expect } from 'vitest'
import { renderMdArt } from '../renderer'

describe('zigzag-list render', () => {
  it('stacks key and value vertically for top-level key-value items', () => {
    const svg = renderMdArt(`type: zigzag-list
- Revenue: 42M
- Retention: 91%`)

    // Labels use <tspan> wrappers via fitTextToWidthShared; values render directly in <text>
    expect(svg).toContain('>Revenue</tspan>')
    expect(svg).toMatch(/<text[^>]*>42M<\/text>/)
    expect(svg).toContain('>Retention</tspan>')
    expect(svg).toMatch(/<text[^>]*>91%<\/text>/)
  })
})
