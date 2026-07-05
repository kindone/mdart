// @quality: correctness
// @type: example

import { describe, expect, it } from 'vitest'
import { renderMdArt } from './renderer'

describe('technical layout animation', () => {
  it('animates pipeline arrows with their destination stage', () => {
    const svg = renderMdArt(`type: pipeline
- Parse
- Validate
- Render`)

    expect(svg).toContain('@keyframes mdart-enter')
    expect(svg).toMatch(/<g class="mdart-n1"><path[\s\S]*?<rect/)
    expect(svg).toMatch(/<g class="mdart-n2"><path[\s\S]*?<rect/)
  })

  it('animates sequence actors and message rows', () => {
    const svg = renderMdArt(`type: sequence
- Client
  -> Server: request
- Server
  -> Client: response`)

    expect(svg).toContain('class="mdart-n0"')
    expect(svg).toContain('class="mdart-n1"')
    expect(svg).toContain('class="mdart-n2"')
    expect(svg).toContain('marker-end="url(#sq-a)"')
  })

  it('animates state-machine transitions with destination states', () => {
    const svg = renderMdArt(`type: state-machine
- Idle
  -> Running: start
- Running
  -> Idle: stop`)

    expect(svg).toContain('@keyframes mdart-enter')
    expect(svg).toContain('class="mdart-n0"')
    expect(svg).toContain('class="mdart-n1"')
    expect(svg).toContain('marker-end="url(#sm-a)"')
  })

  it('animates network mesh and nodes', () => {
    const svg = renderMdArt(`type: network
- API
  -> DB
- Worker`)

    expect(svg).toContain('id="net-arr"')
    expect(svg).toContain('class="mdart-n1"')
    expect(svg).toContain('class="mdart-n2"')
    expect(svg).toMatch(/<g class="mdart-n2"><line[\s\S]*?marker-end="url\(#net-arr\)"/)
  })
})
