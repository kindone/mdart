// @quality: correctness
// @type: instrument

import { describe, it, expect, afterEach } from 'vitest'
import { renderMdArtDetailed } from '../renderer'
import { configureMdArt, resetMdArtConfig } from '../config'

afterEach(() => {
  resetMdArtConfig()
})

describe('instrument flag', () => {
  // ── Form-1 renderer (process) — <g> always present, class conditional ──────

  it('emits data-item-index on a Form-1 renderer (process) when instrument:true', () => {
    configureMdArt({ instrument: true, animate: false })
    const { svg } = renderMdArtDetailed('- A\n- B\n- C', 'process')
    expect(svg).toContain('data-item-index="0"')
    expect(svg).toContain('data-item-index="1"')
    expect(svg).toContain('data-item-index="2"')
  })

  it('does NOT emit data-item-index on a Form-1 renderer when instrument is off (default)', () => {
    configureMdArt({ animate: false })
    const { svg } = renderMdArtDetailed('- A\n- B', 'process')
    expect(svg).not.toContain('data-item-index')
  })

  it('emits both mdart-n class AND data-item-index when animate+instrument both true (Form-1)', () => {
    configureMdArt({ instrument: true, animate: true })
    const { svg } = renderMdArtDetailed('- A\n- B', 'process')
    // animation class
    expect(svg).toMatch(/class="mdart-n0"/)
    // instrumentation attr
    expect(svg).toContain('data-item-index="0"')
    expect(svg).toContain('data-item-index="1"')
  })

  // ── Form-2 renderer (chevron-process) — <g> only present when animate ──────

  it('emits data-item-index on a Form-2 renderer (chevron-process) when instrument:true', () => {
    configureMdArt({ instrument: true, animate: false })
    const { svg } = renderMdArtDetailed('- Alpha\n- Beta\n- Gamma', 'chevron-process')
    expect(svg).toContain('data-item-index="0"')
    expect(svg).toContain('data-item-index="1"')
    expect(svg).toContain('data-item-index="2"')
  })

  it('does NOT emit data-item-index on a Form-2 renderer when instrument is off', () => {
    configureMdArt({ animate: false })
    const { svg } = renderMdArtDetailed('- Alpha\n- Beta', 'chevron-process')
    expect(svg).not.toContain('data-item-index')
  })

  it('emits both class and data-item-index on a Form-2 renderer when both flags true', () => {
    configureMdArt({ instrument: true, animate: true })
    const { svg } = renderMdArtDetailed('- Alpha\n- Beta', 'chevron-process')
    expect(svg).toMatch(/class="mdart-n0"/)
    expect(svg).toContain('data-item-index="0"')
  })

  // ── wrapItem behaviour — no extra wrappers when both flags are off ──────────

  it('adds NO wrapper groups when neither animate nor instrument is set', () => {
    configureMdArt({ animate: false })
    const { svg } = renderMdArtDetailed('- X\n- Y', 'bullet-list')
    // No mdart-n* class groups and no data-item-index
    expect(svg).not.toMatch(/class="mdart-n\d+"/)
    expect(svg).not.toContain('data-item-index')
  })

  // ── renderStaircase (step-up / step-down) ───────────────────────────────────

  it('emits data-item-index in renderStaircase (step-up) when instrument:true', () => {
    configureMdArt({ instrument: true, animate: false })
    const { svg } = renderMdArtDetailed('- One\n- Two\n- Three', 'step-up')
    expect(svg).toContain('data-item-index="0"')
    expect(svg).toContain('data-item-index="2"')
  })

  // ── Cross-renderer spot checks ───────────────────────────────────────────────

  it.each([
    'cycle',
    'donut-cycle',
    'org-chart',
    'kanban',
    'bullet-list',
    'tree',
  ])('%s emits data-item-index when instrument:true', (type) => {
    configureMdArt({ instrument: true, animate: false })
    const src = type === 'kanban'
      ? 'type: kanban\n- To Do\n  - Task A\n- In Progress\n  - Task B'
      : type === 'tree'
        ? '- Root\n  - Child A\n  - Child B'
        : '- Item 1\n- Item 2\n- Item 3'
    const { svg } = renderMdArtDetailed(src, type)
    expect(svg).toContain('data-item-index="0"')
  })
})
