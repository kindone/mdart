// @quality: correctness
// @type: example

import { describe, it, expect } from 'vitest'
import { renderMdArt } from './renderer'

const values = `- Alpha: 75
- Beta: 45
- Gamma: 20`

describe('statistical layout animation', () => {
  it.each([
    'progress-list',
    'bullet-chart',
    'scorecard',
    'treemap',
    'gauge',
    'waffle',
  ])('%s animates item units in sequence without scale pulse', type => {
    const svg = renderMdArt(`type: ${type}\n${values}`)

    expect(svg).toMatch(/@keyframes mdart-s[a-z0-9]+-mdart-enter/)
    expect(svg).toContain('class="mdart-n0"')
    expect(svg).toContain('class="mdart-n1"')
    expect(svg).not.toContain('transform:scale')
  })

  it.each(['progress-list', 'bullet-chart'])(
    '%s grows measured bars from zero to their designated length',
    type => {
      const svg = renderMdArt(`type: ${type}
- Alpha: 75
- Beta: 45`)

      expect(svg).toMatch(/@keyframes mdart-s[a-z0-9]+-mdart-bar-grow/)
      expect(svg).toContain('class="mdart-bar-grow"')
      expect(svg).toContain('transform-origin:left center')
      expect(svg).toContain('<animate attributeName="width" from="0"')
      expect(svg).toContain('fill="freeze"')
    },
  )

  it('gauge grows its measured progress arc after the dial appears', () => {
    const svg = renderMdArt(`type: gauge
- Uptime: 78`)

    expect(svg).toContain('mdart-gauge-arc')
    expect(svg).toContain('mdart-glow-stroke')
    expect(svg).toContain('.mdart-glow-stroke')
    expect(svg).toMatch(/class="mdart-gauge-arc mdart-glow-stroke" opacity="0" visibility="hidden"/)
    expect(svg).toContain('class="mdart-start-tip"')
    expect(svg).toContain('class="mdart-moving-tip"')
    expect(svg).toContain('opacity="0"')
    expect(svg).toContain('visibility="hidden"')
    expect(svg).toContain('stroke-linecap="butt"')
    expect(svg).toContain('stroke-dasharray="1"')
    expect(svg).toContain('<animate attributeName="stroke-dashoffset"')
    expect(svg).toContain('<set attributeName="opacity" to="1"')
    expect(svg).toContain('<animate attributeName="cx"')
    expect(svg).toContain('<animate attributeName="cy"')
    expect(svg).toContain('<set attributeName="visibility" to="visible"')
    expect(svg).toContain('class="mdart-counter-step"')
    expect(svg).toContain('78%')
    expect(svg).toContain('pathLength="1"')
  })

  it('gauge renders a static rounded progress arc when animation is disabled', () => {
    const svg = renderMdArt(`type: gauge
animate: false
- Uptime: 78`)

    expect(svg).not.toContain('class="mdart-gauge-arc')
    expect(svg).not.toContain('<animate attributeName="stroke-dashoffset"')
    expect(svg).toContain('stroke-linecap="round"')
  })

  it('bullet-chart treats bracketed value as the target marker', () => {
    const svg = renderMdArt(`type: bullet-chart
- Revenue: 78 [85]`)

    expect(svg).toContain('to="238.7"')
    expect(svg).toContain('x="424.6"')
    expect(svg).toContain('Revenue: 78 [85]')
  })

  it('bullet-chart limits glow to the actual value bar', () => {
    const svg = renderMdArt(`type: bullet-chart
- Revenue: 78 [85]`)

    expect(svg).toContain('rect:not(.mdart-no-glow)')
    expect(svg).toContain('.mdart-glow-text')
    expect(svg).toContain('class="mdart-glow-text"')
    expect(svg.match(/class="mdart-no-glow"/g)?.length).toBe(4)
    expect(svg).toContain('class="mdart-bar-grow"')
  })

  it('heatmap animates header before rows without scale pulse', () => {
    const svg = renderMdArt(`type: heatmap
- Mon
  - AM: 4
  - PM: 8
- Tue
  - AM: 6
  - PM: 2`)

    expect(svg).toMatch(/@keyframes mdart-s[a-z0-9]+-mdart-enter/)
    expect(svg).toContain('class="mdart-n0"')
    expect(svg).toContain('class="mdart-n1"')
    expect(svg).toMatch(/\.mdart-n0\{animation:mdart-s[a-z0-9]+-mdart-enter/)
    expect(svg).not.toMatch(/\.mdart-n0 rect[^}]+mdart-bright-loop/)
    expect(svg).toMatch(/\.mdart-n1 rect[^}]+mdart-bright-loop/)
    expect(svg).not.toContain('transform:scale')
  })

  it('radar animates the grid before metric points without scale pulse', () => {
    const svg = renderMdArt(`type: radar\n${values}`)

    expect(svg).toMatch(/@keyframes mdart-s[a-z0-9]+-mdart-enter/)
    expect(svg).toContain('class="mdart-n0"')
    expect(svg).toContain('class="mdart-n1"')
    expect(svg).not.toContain('transform:scale')
  })

  it('sankey animates flows with their destination nodes', () => {
    const svg = renderMdArt(`type: sankey
- Source A: 60
  - Target X: 40
  - Target Y: 20
- Source B: 40
  - Target Y: 30
  - Target Z: 10`)

    expect(svg).toMatch(/@keyframes mdart-s[a-z0-9]+-mdart-enter/)
    expect(svg).toContain('class="mdart-n0"')
    expect(svg).toContain('class="mdart-n2"')
    expect(svg).toMatch(/<g class="mdart-n2">[\s\S]*?<path/)
    expect(svg).not.toContain('transform:scale')
  })
})
