// @quality: correctness
// @type: example

import { describe, expect, it } from 'vitest'
import { renderMdArt } from './renderer'

describe('planning layout animation', () => {
  it('animates timeline baseline and entries', () => {
    const svg = renderMdArt(`type: timeline
- Kickoff
- Build
- Launch`)

    expect(svg).toMatch(/@keyframes mdart-s[a-z0-9]+-mdart-enter/)
    expect(svg).toMatch(/<g class="mdart-n0"><line/)
    expect(svg).toContain('class="mdart-n1"')
  })

  it('animates gantt task rows with bars', () => {
    const svg = renderMdArt(`type: gantt
- Design [1-2]
- Build [2-4]`)

    expect(svg).toMatch(/<g class="mdart-n0">[\s\S]*<rect[\s\S]*fill="[^"]*88"/)
    expect(svg).toContain('class="mdart-n1"')
  })

  it('animates kanban columns with cards', () => {
    const svg = renderMdArt(`type: kanban
- Todo
  - Spec
- Doing
  - Build`)

    expect(svg).toContain('class="mdart-n0"')
    expect(svg).toContain('class="mdart-n1"')
    expect(svg).toMatch(/<g class="mdart-n0">[\s\S]*Spec/)
  })

  it('animates sprint-board summary after columns', () => {
    const svg = renderMdArt(`type: sprint-board
- Todo
  - Spec: 3
- Done
  - Ship: 5 [done]`)

    expect(svg).toContain('class="mdart-n0"')
    expect(svg).toContain('class="mdart-n1"')
    expect(svg).toContain('class="mdart-n2"')
  })

  it('animates wbs root and work package groups', () => {
    const svg = renderMdArt(`type: wbs
title: Project
- Phase 1
  - Task A
- Phase 2
  - Task B`)

    expect(svg).toMatch(/<g class="mdart-n0">[\s\S]*Project/)
    expect(svg).toContain('class="mdart-n1"')
    expect(svg).toContain('class="mdart-n2"')
    expect(svg).toContain('class="mdart-n4"')
    expect(svg).toMatch(/<g class="mdart-n2">[\s\S]*<path[\s\S]*Task A/)
  })
})
