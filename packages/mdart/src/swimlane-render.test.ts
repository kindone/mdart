// @quality: correctness
// @type: example

import { describe, it, expect } from 'vitest'
import { renderMdArt } from './renderer'

describe('swimlane render', () => {
  it('wraps long step labels across two visible lines instead of forcing one-line truncation', () => {
    const src = `type: swimlane
title: Unified go() execution model

- go()
  - for each run: invoke(rand)
  - on success: repeat for numRuns
  - on failure: handleShrink(savedRand)
- invoke(rand)
  - initialGen(rand) → obj, model
  - front loop: factory → action → execute
  - if concurrent: pregenerate, spawn threads, join
  - postCheck(obj, model)
`
    const svg = renderMdArt(src)
    expect(svg).toContain('>for each run:</text>')
    expect(svg).toContain('>invoke(rand)</text>')
    expect(svg).toContain('>initialGen(rand)</text>')
    expect(svg).toContain('>→ obj, model</text>')
    expect(svg).toContain('viewBox="0 0 560 142"')
  })
})
