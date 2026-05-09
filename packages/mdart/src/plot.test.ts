import { describe, it, expect } from 'vitest'
import { parseMdArt } from './parser'
import { renderMdArt } from './renderer'

describe('plot family — parser', () => {
  // ── Front-matter parsing ──────────────────────────────────────────────────

  it('parses x-axis tick labels', () => {
    const src = `type: line-chart
x: Q1, Q2, Q3, Q4

- Revenue: 12, 18, 24, 32`
    const spec = parseMdArt(src)
    expect(spec.xAxis).toEqual(['Q1', 'Q2', 'Q3', 'Q4'])
    expect(spec.items).toHaveLength(1)
    expect(spec.items[0].label).toBe('Revenue')
    expect(spec.items[0].value).toBe('12, 18, 24, 32')
  })

  it('parses x-label and y-label', () => {
    const src = `type: line-chart
x-label: Time (s)
y-label: Voltage (V)

- A: 1, 2, 3`
    const spec = parseMdArt(src)
    expect(spec.xLabel).toBe('Time (s)')
    expect(spec.yLabel).toBe('Voltage (V)')
  })

  it('parses smooth/points/stack booleans', () => {
    const spec = parseMdArt(`type: line-chart
smooth: true
points: false
stack: yes

- A: 1, 2, 3`)
    expect(spec.smooth).toBe(true)
    expect(spec.points).toBe(false)
    expect(spec.stack).toBe(true)
  })

  it('parses line-width as a number', () => {
    const spec = parseMdArt(`type: line-chart
line-width: 4

- A: 1, 2, 3`)
    expect(spec.lineWidth).toBe(4)
  })

  it('accumulates multiple shade-y bands', () => {
    const src = `type: line-chart
shade-y: 0..100 [healthy]
shade-y: 100..300 [warning]
shade-y: 300..600 [critical]

- p50: 50, 200, 400`
    const spec = parseMdArt(src)
    expect(spec.shadeY).toHaveLength(3)
    expect(spec.shadeY?.[0]).toEqual({ a: '0', b: '100', label: 'healthy' })
    expect(spec.shadeY?.[1]).toEqual({ a: '100', b: '300', label: 'warning' })
    expect(spec.shadeY?.[2]).toEqual({ a: '300', b: '600', label: 'critical' })
  })

  it('accumulates shade-x bands with categorical labels', () => {
    const src = `type: line-chart
x: Jan, Feb, Mar, Apr
shade-x: Mar..Apr [campaign]

- A: 1, 2, 3, 4`
    const spec = parseMdArt(src)
    expect(spec.shadeX).toEqual([{ a: 'Mar', b: 'Apr', label: 'campaign' }])
  })

  it('parses ref-y and ref-x reference lines', () => {
    const src = `type: line-chart
ref-y: 250 [SLA]
ref-y: 500 [hard SLO]
ref-x: 25m [deploy]

- p50: 100, 200, 300`
    const spec = parseMdArt(src)
    expect(spec.refY).toHaveLength(2)
    expect(spec.refY?.[0]).toEqual({ at: '250', label: 'SLA' })
    expect(spec.refY?.[1]).toEqual({ at: '500', label: 'hard SLO' })
    expect(spec.refX).toEqual([{ at: '25m', label: 'deploy' }])
  })

  it('handles ref-y without label', () => {
    const spec = parseMdArt(`type: line-chart
ref-y: 0

- A: -1, 0, 1`)
    expect(spec.refY).toEqual([{ at: '0', label: '' }])
  })

  it('parses ref-x with @ <y> for manual label position', () => {
    const spec = parseMdArt(`type: line-chart
ref-x: 12 @ 65 [Plateau]
ref-x: 3 [Peak]

- A: 1, 2, 3`)
    expect(spec.refX).toHaveLength(2)
    expect(spec.refX?.[0]).toEqual({ at: '12', atLabel: '65', label: 'Plateau' })
    // Without @, atLabel stays undefined (back-compat).
    expect(spec.refX?.[1]).toEqual({ at: '3', label: 'Peak' })
    expect(spec.refX?.[1].atLabel).toBeUndefined()
  })

  it('parses ref-y with @ <x> for manual label position', () => {
    const spec = parseMdArt(`type: line-chart
ref-y: 250 @ 5 [SLA]

- A: 100, 200, 300`)
    expect(spec.refY?.[0]).toEqual({ at: '250', atLabel: '5', label: 'SLA' })
  })

  it('accepts label-x / label-y as aliases for x-label / y-label', () => {
    const spec = parseMdArt(`type: line-chart
label-x: Time (s)
label-y: Voltage (V)

- A: 1, 2, 3`)
    expect(spec.xLabel).toBe('Time (s)')
    expect(spec.yLabel).toBe('Voltage (V)')
  })

  it('parses grid and ticks boolean front-matter', () => {
    const spec = parseMdArt(`type: line-chart
grid: false
ticks: false

- A: 1, 2, 3`)
    expect(spec.grid).toBe(false)
    expect(spec.ticks).toBe(false)
  })

  it('tolerates blank lines inside front-matter (does not terminate)', () => {
    // Regression: a blank line used to end front-matter outright, so any
    // keys after a visual separator were silently parsed as series — and
    // ended up in the chart legend.
    const spec = parseMdArt(`type: line-chart
title: T

grid: false
ticks: false

label-x: Time
label-y: Y

- A: 1, 2, 3`)
    expect(spec.title).toBe('T')
    expect(spec.grid).toBe(false)
    expect(spec.ticks).toBe(false)
    expect(spec.xLabel).toBe('Time')
    expect(spec.yLabel).toBe('Y')
    // Only the real series should land as items, not the blank-separated keys.
    expect(spec.items).toHaveLength(1)
    expect(spec.items[0].label).toBe('A')
  })

  // ── Series value parsing (renderer-side, but verified end-to-end) ─────────

  it('per-series attributes survive parse', () => {
    const src = `type: line-chart

- Revenue [bold, smooth]: 12, 18
- Forecast [dashed, w=4]: 11, 17`
    const spec = parseMdArt(src)
    expect(spec.items[0].label).toBe('Revenue')
    expect(spec.items[0].attrs).toEqual(['bold', 'smooth'])
    expect(spec.items[1].label).toBe('Forecast')
    expect(spec.items[1].attrs).toEqual(['dashed', 'w=4'])
  })

  it('value with (x,y) pairs survives label/value split', () => {
    const spec = parseMdArt(`type: scatter

- Team A: (1.2, 22), (2.5, 18), (1.8, 26)`)
    expect(spec.items[0].label).toBe('Team A')
    expect(spec.items[0].value).toBe('(1.2, 22), (2.5, 18), (1.8, 26)')
  })

  it('does not treat plot front-matter as body start', () => {
    // Regression: previously unrecognized keys terminated front-matter.
    // The new keys must be recognized so subsequent keys still parse.
    const spec = parseMdArt(`type: line-chart
x: Q1, Q2
shade-y: 0..50 [low]
ref-y: 25 [target]
title: My Chart

- A: 10, 40`)
    expect(spec.title).toBe('My Chart')
    expect(spec.xAxis).toEqual(['Q1', 'Q2'])
    expect(spec.shadeY).toHaveLength(1)
    expect(spec.refY).toHaveLength(1)
    expect(spec.items).toHaveLength(1)
  })
})

describe('plot family — renderer', () => {
  // Smoke tests: SVG should render without throwing and contain key elements.

  it('renders a basic line-chart with axes, series path, and legend', () => {
    const svg = renderMdArt(`type: line-chart
x: Q1, Q2, Q3, Q4
title: Revenue

- Revenue: 12, 18, 24, 32`)
    expect(svg).toContain('<svg')
    expect(svg).toContain('Revenue')
    expect(svg).toContain('Q1')
    expect(svg).toContain('Q4')
    // a non-empty <path> with d= for the line
    expect(svg).toMatch(/<path d="M [\d. ]+L /)
  })

  it('renders smooth lines with cubic Bezier path commands', () => {
    const svg = renderMdArt(`type: line-chart
smooth: true

- A: 1, 5, 2, 8, 3, 9`)
    // Smooth path uses 'C' (cubic Bezier), not 'L'
    expect(svg).toMatch(/<path d="M [\d. ]+C /)
  })

  it('renders scatter plot as circles only (no connecting path)', () => {
    const svg = renderMdArt(`type: scatter

- Pts: 1, 2, 3, 4`)
    // Should have circles for each point but no series path element
    expect(svg).toContain('<circle')
    // Series path uses M/L; only the circle <stroke> attribute may appear,
    // but no actual `<path d="M ... L ..."` for the series itself.
    expect(svg).not.toMatch(/<path d="M [\d. ]+L /)
  })

  it('renders area-chart with closed filled path', () => {
    const svg = renderMdArt(`type: area-chart

- A: 1, 5, 3, 8`)
    // closed area path ends in Z
    expect(svg).toMatch(/<path d="[^"]*Z"/)
  })

  it('renders bar-chart with rect bars', () => {
    const svg = renderMdArt(`type: bar-chart

- 2024: 10, 20, 30
- 2025: 15, 25, 35`)
    // count <rect> elements: at least 6 bars + 1 background
    const bars = svg.match(/<rect /g) ?? []
    expect(bars.length).toBeGreaterThanOrEqual(6)
  })

  it('renders gaps in lines (null/empty between commas)', () => {
    const svg = renderMdArt(`type: line-chart

- A: 12, 14, , null, 18, 22`)
    // Path should have two M commands (two contiguous segments split by gaps)
    const ms = (svg.match(/M /g) ?? []).length
    expect(ms).toBeGreaterThanOrEqual(2)
  })

  it('renders shaded Y band rectangle', () => {
    const svg = renderMdArt(`type: line-chart
shade-y: 0..50 [low]

- A: 10, 40, 80`)
    // band rendered with fill-opacity 0.10
    expect(svg).toContain('fill-opacity="0.10"')
    expect(svg).toContain('low')
  })

  it('renders ref-y as a dashed line with label', () => {
    const svg = renderMdArt(`type: line-chart
ref-y: 100 [target]

- A: 50, 100, 150`)
    expect(svg).toContain('stroke-dasharray="5 3"')
    expect(svg).toContain('target')
  })

  it('renders numeric (x,y) pairs with auto-scaled x-axis ticks', () => {
    const svg = renderMdArt(`type: scatter

- Pts: (1, 10), (5, 20), (10, 30)`)
    // x-axis should have numeric tick labels (e.g. 0, 2, 4...)
    expect(svg).toContain('<svg')
    expect(svg).toContain('<circle')
  })

  it('honors per-series stroke width attributes', () => {
    const svg = renderMdArt(`type: line-chart

- Bold series [bold]: 1, 2, 3, 4`)
    expect(svg).toContain('stroke-width="5"')
  })

  it('honors numeric width=N attribute', () => {
    const svg = renderMdArt(`type: line-chart

- Custom [w=6]: 1, 2, 3`)
    expect(svg).toContain('stroke-width="6"')
  })

  it('honors global line-width front-matter', () => {
    const svg = renderMdArt(`type: line-chart
line-width: 4

- A: 1, 2, 3
- B: 2, 3, 4`)
    // Two series at width 4
    const m = svg.match(/stroke-width="4"/g) ?? []
    expect(m.length).toBeGreaterThanOrEqual(2)
  })

  it('omits gridlines and tick labels when grid:false and ticks:false', () => {
    const full = renderMdArt(`type: line-chart

- A: 10, 20, 30, 40`)
    const minimal = renderMdArt(`type: line-chart
grid: false
ticks: false

- A: 10, 20, 30, 40`)
    // Tick labels (numbers) appear in `full` but not in `minimal`
    expect(full).toMatch(/>40</)
    expect(minimal).not.toMatch(/>40</)
    // The full render has more <line> elements (gridlines) than the minimal one
    const fullLines    = (full    .match(/<line /g) ?? []).length
    const minimalLines = (minimal .match(/<line /g) ?? []).length
    expect(fullLines).toBeGreaterThan(minimalLines)
  })

  it('stacks bar series when stack: true', () => {
    const groupSvg = renderMdArt(`type: bar-chart

- A: 10, 20
- B: 30, 40`)
    const stackSvg = renderMdArt(`type: bar-chart
stack: true

- A: 10, 20
- B: 30, 40`)
    // SVG output should differ between stack/group modes
    expect(groupSvg).not.toBe(stackSvg)
  })
})
