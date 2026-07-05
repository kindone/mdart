// @quality: correctness
// @type: example

import { describe, it, expect } from 'vitest'
import { renderMdArt } from './renderer'

describe('matrix layout animation', () => {
  it.each(['matrix-2x2', 'swot', 'bcg', 'ansoff'])(
    '%s animates its quadrant units without scale pulse',
    type => {
      const source = type === 'swot'
        ? `type: swot
+ Strength
- Weakness
? Opportunity
! Threat`
        : `type: ${type}
- Alpha
  - One
- Beta
  - Two
- Gamma
  - Three
- Delta
  - Four`
      const svg = renderMdArt(source)

      expect(svg).toContain('@keyframes mdart-enter')
      expect(svg).toContain('class="mdart-n0"')
      expect(svg).toContain('class="mdart-n3"')
      expect(svg).not.toContain('transform:scale')
    },
  )

  it.each(['pros-cons', 'comparison', 'matrix-nxm'])(
    '%s animates header before data rows without scale pulse',
    type => {
      const source = type === 'pros-cons'
        ? `type: pros-cons
+ Fast
+ Cheap
- Risky`
        : `type: ${type}
- Feature
  - A
  - B
- Option 1
  - Yes
  - No
- Option 2
  - No
  - Yes`
      const svg = renderMdArt(source)

      expect(svg).toContain('@keyframes mdart-enter')
      expect(svg).toContain('class="mdart-n0"')
      expect(svg).toContain('class="mdart-n1"')
      expect(svg).not.toContain('transform:scale')
    },
  )
})
