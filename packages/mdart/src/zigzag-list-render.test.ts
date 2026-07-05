// @quality: correctness
// @type: example

import { describe, it, expect } from 'vitest'
import { renderMdArt } from './renderer'

describe('zigzag-list render', () => {
  it('stacks key and value vertically for top-level key-value items', () => {
    const svg = renderMdArt(`type: zigzag-list
- Revenue: 42M
- Retention: 91%`)

    expect(svg).toMatch(/<text[^>]*>(?:(?!<\/text>)[\s\S])*Revenue<\/text>/)
    expect(svg).toMatch(/<text[^>]*>42M<\/text>/)
    expect(svg).toMatch(/<text[^>]*>(?:(?!<\/text>)[\s\S])*Retention<\/text>/)
    expect(svg).toMatch(/<text[^>]*>91%<\/text>/)
  })
})
