// @quality: correctness
// @type: example

import { describe, it, expect } from 'vitest'
import { renderMdArt } from './renderer'

describe('staircase render', () => {
  it.each(['step-up', 'step-down'])(
    '%s stacks key and value vertically for top-level key-value items',
    type => {
      const svg = renderMdArt(`type: ${type}
- Revenue: 42M
- Retention: 91%`)

      expect(svg).toMatch(/<text[^>]*>(?:(?!<\/text>)[\s\S])*Revenue<\/text>/)
      expect(svg).toMatch(/<text[^>]*>42M<\/text>/)
      expect(svg).toMatch(/<text[^>]*>(?:(?!<\/text>)[\s\S])*Retention<\/text>/)
      expect(svg).toMatch(/<text[^>]*>91%<\/text>/)
      expect(svg).toMatch(/<rect[^>]*height="44"/)
    }
  )
})
