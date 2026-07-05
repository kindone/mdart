// @quality: correctness
// @type: example

import { describe, it, expect } from 'vitest'
import { renderMdArt } from './renderer'

const hierarchy = `- Root
  - Left
    - Left leaf
  - Right
    - Right leaf`

describe('hierarchy layout animation', () => {
  it.each([
    'org-chart',
    'tree',
    'h-org-chart',
    'hierarchy-list',
    'radial-tree',
    'decision-tree',
    'sitemap',
    'mind-map',
  ])('%s animates hierarchy units in sequence without scale pulse', type => {
    const svg = renderMdArt(`type: ${type}\n${hierarchy}`)

    expect(svg).toContain('@keyframes mdart-enter')
    expect(svg).toContain('class="mdart-n0"')
    expect(svg).toContain('class="mdart-n1"')
    expect(svg).not.toContain('transform:scale')
  })

  it.each(['bracket', 'bracket-tree'])('%s animates rounds in sequence without scale pulse', type => {
    const svg = renderMdArt(`type: ${type}
- Alpha [w2]
- Beta
- Gamma [w1]
- Delta`)

    expect(svg).toContain('@keyframes mdart-enter')
    expect(svg).toContain('class="mdart-n0"')
    expect(svg).toContain('class="mdart-n1"')
    expect(svg).toMatch(/<g class="mdart-n1">[\s\S]*?<polyline/)
    expect(svg).not.toMatch(/<g class="mdart-n0">[\s\S]*?<polyline/)
    expect(svg).not.toContain('transform:scale')
  })

  it('mind-map paints node shapes after connector lines so nodes cover spokes', () => {
    const svg = renderMdArt(`type: mind-map
- Root
  - Branch
    - Child`)

    const branchGroup = svg.match(/<g class="mdart-n1">([\s\S]*?)<\/g>/)?.[1] ?? ''
    expect(branchGroup.indexOf('<line ')).toBeGreaterThanOrEqual(0)
    expect(branchGroup.indexOf('<ellipse ')).toBeGreaterThan(branchGroup.indexOf('<line '))
    expect(svg.lastIndexOf('class="mdart-n0"')).toBeGreaterThan(svg.lastIndexOf('class="mdart-n1"'))
  })
})
