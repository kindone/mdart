import { describe, it, expect, afterEach } from 'vitest'
import { checkSvg } from '../heuristics'
import type { SvgIssueCode } from '../heuristics'
import { renderMdArtDetailed } from '../renderer'
import { configureMdArt, resetMdArtConfig } from '../config'

// ── helpers ───────────────────────────────────────────────────────────────────

/** Extract just the codes from a checkSvg result */
function codes(svg: string): SvgIssueCode[] {
  return checkSvg(svg).map(i => i.code)
}

/** Minimal valid SVG with 3 items, rendered with instrumentation on */
function instrumentedSvg(type = 'process', items = '- A\n- B\n- C'): string {
  configureMdArt({ instrument: true, animate: false })
  return renderMdArtDetailed(items, type).svg
}

afterEach(() => resetMdArtConfig())

// ── SVG_NO_VIEWBOX ────────────────────────────────────────────────────────────

describe('SVG_NO_VIEWBOX', () => {
  it('flags an SVG without viewBox', () => {
    const svg = '<svg><rect width="100" height="100"/></svg>'
    expect(codes(svg)).toContain('SVG_NO_VIEWBOX')
  })

  it('passes when viewBox is present', () => {
    const svg = '<svg viewBox="0 0 100 100"><rect width="100" height="100"/></svg>'
    expect(codes(svg)).not.toContain('SVG_NO_VIEWBOX')
  })

  it('is an error-level issue', () => {
    const svg = '<svg><rect/></svg>'
    const issue = checkSvg(svg).find(i => i.code === 'SVG_NO_VIEWBOX')
    expect(issue?.level).toBe('error')
  })
})

// ── SVG_EMPTY_CONTENT ─────────────────────────────────────────────────────────

describe('SVG_EMPTY_CONTENT', () => {
  it('flags an SVG with no visible elements', () => {
    const svg = '<svg viewBox="0 0 100 100"></svg>'
    expect(codes(svg)).toContain('SVG_EMPTY_CONTENT')
  })

  it('passes when a <rect> is present', () => {
    const svg = '<svg viewBox="0 0 100 100"><rect width="10" height="10"/></svg>'
    expect(codes(svg)).not.toContain('SVG_EMPTY_CONTENT')
  })

  it('passes when a <text> is present', () => {
    const svg = '<svg viewBox="0 0 100 100"><text x="5" y="15">Hello</text></svg>'
    expect(codes(svg)).not.toContain('SVG_EMPTY_CONTENT')
  })

  it('passes when a <circle>, <path>, or <polygon> is present', () => {
    for (const tag of ['circle', 'path', 'polygon']) {
      const svg = `<svg viewBox="0 0 100 100"><${tag}/></svg>`
      expect(codes(svg)).not.toContain('SVG_EMPTY_CONTENT')
    }
  })

  it('is an error-level issue', () => {
    const svg = '<svg viewBox="0 0 100 100"></svg>'
    const issue = checkSvg(svg).find(i => i.code === 'SVG_EMPTY_CONTENT')
    expect(issue?.level).toBe('error')
  })
})

// ── SVG_NAN_COORD ─────────────────────────────────────────────────────────────

describe('SVG_NAN_COORD', () => {
  it('flags a rect with x="NaN"', () => {
    const svg = '<svg viewBox="0 0 200 200"><rect x="NaN" y="10" width="50" height="50"/></svg>'
    expect(codes(svg)).toContain('SVG_NAN_COORD')
  })

  it('flags a circle with cx="Infinity"', () => {
    const svg = '<svg viewBox="0 0 200 200"><circle cx="Infinity" cy="50" r="20"/></svg>'
    expect(codes(svg)).toContain('SVG_NAN_COORD')
  })

  it('does NOT flag "NaN" appearing inside label text content', () => {
    // NaN in text content (between tags) should not trigger the check
    const svg = '<svg viewBox="0 0 200 200"><text x="10" y="20">value is NaN here</text></svg>'
    expect(codes(svg)).not.toContain('SVG_NAN_COORD')
  })

  it('is an error-level issue', () => {
    const svg = '<svg viewBox="0 0 200 200"><rect x="NaN" y="10" width="50" height="50"/></svg>'
    const issue = checkSvg(svg).find(i => i.code === 'SVG_NAN_COORD')
    expect(issue?.level).toBe('error')
  })
})

// ── SVG_UNDEFINED_ATTR ────────────────────────────────────────────────────────

describe('SVG_UNDEFINED_ATTR', () => {
  it('flags fill="undefined"', () => {
    const svg = '<svg viewBox="0 0 100 100"><rect fill="undefined" width="10" height="10"/></svg>'
    expect(codes(svg)).toContain('SVG_UNDEFINED_ATTR')
  })

  it('flags stroke="undefined"', () => {
    const svg = '<svg viewBox="0 0 100 100"><rect stroke="undefined" width="10" height="10"/></svg>'
    expect(codes(svg)).toContain('SVG_UNDEFINED_ATTR')
  })

  it('does NOT flag fill with a valid hex color', () => {
    const svg = '<svg viewBox="0 0 100 100"><rect fill="#10b981" width="10" height="10"/></svg>'
    expect(codes(svg)).not.toContain('SVG_UNDEFINED_ATTR')
  })

  it('is an error-level issue', () => {
    const svg = '<svg viewBox="0 0 100 100"><rect fill="undefined"/></svg>'
    const issue = checkSvg(svg).find(i => i.code === 'SVG_UNDEFINED_ATTR')
    expect(issue?.level).toBe('error')
  })
})

// ── SVG_ITEM_NO_TITLE ─────────────────────────────────────────────────────────

describe('SVG_ITEM_NO_TITLE', () => {
  it('silently skips when no data-item-index attributes are present', () => {
    // SVG rendered without instrumentation — no data-item-index
    const { svg } = renderMdArtDetailed('- A\n- B', 'process')
    expect(codes(svg)).not.toContain('SVG_ITEM_NO_TITLE')
  })

  it('passes when every item group has a <title>', () => {
    const svg = instrumentedSvg('process')
    expect(codes(svg)).not.toContain('SVG_ITEM_NO_TITLE')
  })

  it('flags an item group that has no <title>', () => {
    // Craft a minimal SVG with instrumented groups, one missing a title
    const svg = `<svg viewBox="0 0 400 200">
      <g data-item-index="0"><rect width="50" height="50"/><title>Item A</title></g>
      <g data-item-index="1"><rect width="50" height="50"/></g>
    </svg>`
    const issues = checkSvg(svg).filter(i => i.code === 'SVG_ITEM_NO_TITLE')
    expect(issues).toHaveLength(1)
    expect(issues[0].itemIndex).toBe(1)
  })

  it('reports the correct itemIndex for each missing title', () => {
    const svg = `<svg viewBox="0 0 400 200">
      <g data-item-index="0"><rect/></g>
      <g data-item-index="1"><rect/><title>ok</title></g>
      <g data-item-index="2"><rect/></g>
    </svg>`
    const issues = checkSvg(svg).filter(i => i.code === 'SVG_ITEM_NO_TITLE')
    expect(issues.map(i => i.itemIndex)).toEqual([0, 2])
  })

  it('is a warning-level issue', () => {
    const svg = `<svg viewBox="0 0 200 200">
      <g data-item-index="0"><rect/></g>
    </svg>`
    const issue = checkSvg(svg).find(i => i.code === 'SVG_ITEM_NO_TITLE')
    expect(issue?.level).toBe('warning')
  })

  it('all items in a real instrumented render have titles', () => {
    for (const type of ['process', 'cycle', 'org-chart', 'checklist', 'kanban']) {
      const src = type === 'kanban'
        ? 'type: kanban\n- To Do\n  - Task A\n- Done\n  - Task B'
        : '- Alpha\n- Beta\n- Gamma'
      const svg = instrumentedSvg(type, src)
      const issues = checkSvg(svg).filter(i => i.code === 'SVG_ITEM_NO_TITLE')
      expect(issues, `${type} should have no missing titles`).toHaveLength(0)
    }
  })
})

// ── SVG_OVERFLOW ──────────────────────────────────────────────────────────────

describe('SVG_OVERFLOW', () => {
  it('flags an element with x coordinate well past the viewBox right edge', () => {
    const svg = `<svg viewBox="0 0 200 200">
      <rect x="250" y="10" width="50" height="50"/>
    </svg>`
    expect(codes(svg)).toContain('SVG_OVERFLOW')
  })

  it('flags an element with y coordinate well below the viewBox bottom', () => {
    const svg = `<svg viewBox="0 0 200 200">
      <rect x="10" y="260" width="50" height="50"/>
    </svg>`
    expect(codes(svg)).toContain('SVG_OVERFLOW')
  })

  it('passes when coordinates are within the viewBox', () => {
    const svg = `<svg viewBox="0 0 200 200">
      <rect x="10" y="10" width="150" height="150"/>
    </svg>`
    expect(codes(svg)).not.toContain('SVG_OVERFLOW')
  })

  it('allows elements within the ±20px tolerance', () => {
    const svg = `<svg viewBox="0 0 200 200">
      <rect x="215" y="10" width="10" height="10"/>
    </svg>`
    expect(codes(svg)).not.toContain('SVG_OVERFLOW')
  })

  it('handles viewBox with non-zero origin (centered coordinate system)', () => {
    // Many radial diagrams use "−W/2 −H/2 W H"
    const svg = `<svg viewBox="-100 -100 200 200">
      <circle cx="-80" cy="-80" r="10"/>
    </svg>`
    expect(codes(svg)).not.toContain('SVG_OVERFLOW')
  })

  it('does not flag <defs> marker coordinates as overflow', () => {
    // Arrowhead markers use their own local coordinate system
    const svg = `<svg viewBox="0 0 400 200">
      <defs>
        <marker id="arr" markerWidth="999" markerHeight="999">
          <polygon points="0,0 999,5 0,10"/>
        </marker>
      </defs>
      <rect x="10" y="10" width="100" height="50"/>
    </svg>`
    expect(codes(svg)).not.toContain('SVG_OVERFLOW')
  })

  it('is a warning-level issue', () => {
    const svg = `<svg viewBox="0 0 100 100">
      <rect x="200" y="10" width="50" height="50"/>
    </svg>`
    const issue = checkSvg(svg).find(i => i.code === 'SVG_OVERFLOW')
    expect(issue?.level).toBe('warning')
  })

  it('real renders of standard diagram types produce no overflow', () => {
    configureMdArt({ animate: false })
    for (const type of ['process', 'chevron-process', 'cycle', 'tree', 'org-chart', 'venn', 'gantt']) {
      const src = type === 'venn'
        ? '- Set A\n- Set B\n- A ∩ B'
        : type === 'gantt'
          ? '- Task A [wk1-wk3]\n- Task B [wk4-wk6]'
          : type === 'tree'
            ? '- Root\n  - Child A\n  - Child B'
            : '- Alpha\n- Beta\n- Gamma'
      const { svg } = renderMdArtDetailed(src, type)
      const issues = checkSvg(svg).filter(i => i.code === 'SVG_OVERFLOW')
      expect(issues, `${type} should not overflow its viewBox`).toHaveLength(0)
    }
  })
})

// ── CheckOptions ──────────────────────────────────────────────────────────────

describe('CheckOptions', () => {
  it('skip suppresses specific checks', () => {
    const svg = '<svg><rect/></svg>'   // triggers NO_VIEWBOX and EMPTY... wait, has rect
    // Let's use one that triggers NO_VIEWBOX only
    const svg2 = '<svg><rect width="10" height="10"/></svg>'
    expect(codes(svg2)).toContain('SVG_NO_VIEWBOX')
    expect(checkSvg(svg2, { skip: ['SVG_NO_VIEWBOX'] }).map(i => i.code))
      .not.toContain('SVG_NO_VIEWBOX')
  })

  it('minLevel: error filters out warnings', () => {
    const svg = `<svg viewBox="0 0 200 200">
      <g data-item-index="0"><rect width="50" height="50"/></g>
    </svg>`
    // Has SVG_ITEM_NO_TITLE (warning) but no errors
    const all = checkSvg(svg)
    const errorsOnly = checkSvg(svg, { minLevel: 'error' })
    expect(all.some(i => i.level === 'warning')).toBe(true)
    expect(errorsOnly.every(i => i.level === 'error')).toBe(true)
  })

  it('results are sorted errors-first', () => {
    // Craft SVG that has both an error (fill=undefined) and a warning (item no title)
    const svg = `<svg viewBox="0 0 200 200">
      <g data-item-index="0"><rect fill="undefined" width="50" height="50"/></g>
    </svg>`
    const result = checkSvg(svg)
    const levels = result.map(i => i.level)
    // All errors before warnings
    const firstWarning = levels.indexOf('warning')
    const lastError    = levels.lastIndexOf('error')
    if (firstWarning !== -1 && lastError !== -1) {
      expect(lastError).toBeLessThan(firstWarning)
    }
  })
})
