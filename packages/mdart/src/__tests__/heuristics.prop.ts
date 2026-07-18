// Feature:     checkSvg heuristic checker
// Arch/Design: All checks operate on the raw SVG string. Results are sorted
//              errors-first.
//              Per-item checks require instrumentation (data-item-index) to fire;
//              without it SVG_ITEM_NO_TITLE is silently skipped.
// Spec:        ∀ svg with viewBox: SVG_NO_VIEWBOX not flagged
//              ∀ svg without viewBox: SVG_NO_VIEWBOX always flagged
//              ∀ svg with ≥1 visible element: SVG_EMPTY_CONTENT not flagged
//              ∀ svg with no visible elements: SVG_EMPTY_CONTENT flagged
//              ∀ coord attr="NaN|Infinity": SVG_NAN_COORD flagged
//              ∀ NaN inside text content (not attr): SVG_NAN_COORD NOT flagged
//              ∀ visual attr="undefined": SVG_UNDEFINED_ATTR flagged
//              ∀ visual attr with valid value: SVG_UNDEFINED_ATTR not flagged
//              ∀ coord within viewBox ±20px: SVG_OVERFLOW not flagged
//              ∀ coord > viewBox + 20px: SVG_OVERFLOW flagged
//              ∀ debug shape/text pairs: escaping text and underfilled layout
//                budgets are flagged
//              ∀ skip=[codes]: none of those codes appear in results
//              ∀ spec: |warning| ≥ |error| (minLevel monotonicity)
//              ∀ results: all errors appear before all warnings
// @quality:    correctness
// @type:       property
// @mode:       verification

import { describe, it, afterEach, expect } from 'vitest'
import { forAll, Gen } from 'jsproptest'
import { checkSvg } from '../heuristics'
import type { SvgIssueCode } from '../heuristics'
import { configureMdArt, resetMdArtConfig } from '../config'

afterEach(() => resetMdArtConfig())

// ── SVG builders ──────────────────────────────────────────────────────────────

function svgWith(viewBox: string | null, content: string): string {
  const vb = viewBox ? ` viewBox="${viewBox}"` : ''
  return `<svg${vb}>${content}</svg>`
}

const VISIBLE_TAGS = ['rect', 'circle', 'text', 'path', 'polygon', 'ellipse', 'polyline']
const COORD_ATTRS  = ['x', 'y', 'cx', 'cy', 'x1', 'y1', 'x2', 'y2']
const VISUAL_ATTRS = ['fill', 'stroke']

// ── SVG_NO_VIEWBOX ────────────────────────────────────────────────────────────

describe('SVG_NO_VIEWBOX', () => {

  it('∀ svg with viewBox: not flagged', { timeout: 15000 }, () => {
    forAll(
      (w: number, h: number) => {
        const svg = svgWith(`0 0 ${w} ${h}`, '<rect width="10" height="10"/>')
        return !checkSvg(svg).some(i => i.code === 'SVG_NO_VIEWBOX')
      },
      Gen.inRange(100, 800),
      Gen.inRange(80, 600),
    )
  })

  it('∀ svg without viewBox: always flagged at error level', { timeout: 15000 }, () => {
    forAll(
      (content: string) => {
        const svg = svgWith(null, `<rect width="10" height="10"/>${content}`)
        const issues = checkSvg(svg)
        return issues.some(i => i.code === 'SVG_NO_VIEWBOX' && i.level === 'error')
      },
      Gen.asciiString(0, 20),
    )
  })

})

// ── SVG_EMPTY_CONTENT ─────────────────────────────────────────────────────────

describe('SVG_EMPTY_CONTENT', () => {

  it('∀ svg containing any visible tag: not flagged', { timeout: 15000 }, () => {
    forAll(
      (tagIdx: number, w: number, h: number) => {
        const tag = VISIBLE_TAGS[tagIdx % VISIBLE_TAGS.length]
        const svg = svgWith(`0 0 ${w} ${h}`, `<${tag}/>`)
        return !checkSvg(svg).some(i => i.code === 'SVG_EMPTY_CONTENT')
      },
      Gen.inRange(0, VISIBLE_TAGS.length - 1),
      Gen.inRange(100, 400),
      Gen.inRange(80, 300),
    )
  })

  it('∀ svg with no visible elements: always flagged at error level', { timeout: 15000 }, () => {
    forAll(
      (comment: string) => {
        // Only whitelisted tags trigger content detection; <defs>, <style>, text nodes don't
        const svg = svgWith('0 0 100 100', `<!-- ${comment.replace(/--/g, '__')} -->`)
        return checkSvg(svg).some(i => i.code === 'SVG_EMPTY_CONTENT' && i.level === 'error')
      },
      Gen.asciiString(0, 30),
    )
  })

})

// ── SVG_NAN_COORD ─────────────────────────────────────────────────────────────

describe('SVG_NAN_COORD', () => {

  it('∀ coordinate attr = "NaN": always flagged at error level', { timeout: 15000 }, () => {
    forAll(
      (attrIdx: number) => {
        const attr = COORD_ATTRS[attrIdx % COORD_ATTRS.length]
        const svg = svgWith('0 0 200 200', `<rect ${attr}="NaN" width="10" height="10"/>`)
        return checkSvg(svg).some(i => i.code === 'SVG_NAN_COORD' && i.level === 'error')
      },
      Gen.inRange(0, COORD_ATTRS.length - 1),
    )
  })

  it('∀ coordinate attr = "Infinity": always flagged', { timeout: 15000 }, () => {
    forAll(
      (attrIdx: number) => {
        const attr = COORD_ATTRS[attrIdx % COORD_ATTRS.length]
        const svg = svgWith('0 0 200 200', `<circle ${attr}="Infinity" r="5"/>`)
        return checkSvg(svg).some(i => i.code === 'SVG_NAN_COORD')
      },
      Gen.inRange(0, COORD_ATTRS.length - 1),
    )
  })

  it('∀ NaN inside text content (not an attribute value): NOT flagged', { timeout: 15000 }, () => {
    forAll(
      (prefix: string, suffix: string) => {
        const text = `${prefix.replace(/</g, '').replace(/>/g, '')}NaN${suffix.replace(/</g, '').replace(/>/g, '')}`
        const svg = svgWith('0 0 200 200', `<text x="10" y="20">${text}</text>`)
        return !checkSvg(svg).some(i => i.code === 'SVG_NAN_COORD')
      },
      Gen.asciiString(0, 10),
      Gen.asciiString(0, 10),
    )
  })

  it('∀ valid numeric coordinates: SVG_NAN_COORD not flagged', { timeout: 15000 }, () => {
    forAll(
      (x: number, y: number, w: number, h: number) => {
        // Keep coords within viewBox to avoid SVG_OVERFLOW interference
        const cx = Math.abs(x) % 180
        const cy = Math.abs(y) % 180
        const cw = (Math.abs(w) % 40) + 5
        const ch = (Math.abs(h) % 40) + 5
        const svg = svgWith('0 0 200 200', `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}"/>`)
        return !checkSvg(svg).some(i => i.code === 'SVG_NAN_COORD')
      },
      Gen.inRange(0, 200),
      Gen.inRange(0, 200),
      Gen.inRange(5, 50),
      Gen.inRange(5, 50),
    )
  })

})

// ── SVG_UNDEFINED_ATTR ────────────────────────────────────────────────────────

describe('SVG_UNDEFINED_ATTR', () => {

  it('∀ visual attr = "undefined": always flagged at error level', { timeout: 15000 }, () => {
    forAll(
      (attrIdx: number) => {
        const attr = VISUAL_ATTRS[attrIdx % VISUAL_ATTRS.length]
        const svg = svgWith('0 0 100 100', `<rect ${attr}="undefined" width="10" height="10"/>`)
        return checkSvg(svg).some(i => i.code === 'SVG_UNDEFINED_ATTR' && i.level === 'error')
      },
      Gen.inRange(0, VISUAL_ATTRS.length - 1),
    )
  })

  it('∀ fill with valid hex color: SVG_UNDEFINED_ATTR not flagged', { timeout: 15000 }, () => {
    forAll(
      (r: number, g: number, b: number) => {
        const hex = `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
        const svg = svgWith('0 0 100 100', `<rect fill="${hex}" width="10" height="10"/>`)
        return !checkSvg(svg).some(i => i.code === 'SVG_UNDEFINED_ATTR')
      },
      Gen.inRange(0, 255),
      Gen.inRange(0, 255),
      Gen.inRange(0, 255),
    )
  })

  it('∀ stroke with named color: SVG_UNDEFINED_ATTR not flagged', { timeout: 15000 }, () => {
    forAll(
      (colorIdx: number) => {
        const colors = ['none', 'black', 'white', 'red', 'green', 'blue', 'transparent']
        const color = colors[colorIdx % colors.length]
        const svg = svgWith('0 0 100 100', `<rect stroke="${color}" width="10" height="10"/>`)
        return !checkSvg(svg).some(i => i.code === 'SVG_UNDEFINED_ATTR')
      },
      Gen.inRange(0, 6),
    )
  })

})

// ── SVG_OVERFLOW ──────────────────────────────────────────────────────────────

describe('SVG_OVERFLOW', () => {

  it('∀ coordinate within viewBox: not flagged', { timeout: 15000 }, () => {
    forAll(
      (w: number, h: number, x: number, y: number) => {
        // Keep coords safely within the viewBox
        const cx = x % w
        const cy = y % h
        const svg = svgWith(`0 0 ${w} ${h}`, `<rect x="${cx}" y="${cy}" width="5" height="5"/>`)
        return !checkSvg(svg).some(i => i.code === 'SVG_OVERFLOW')
      },
      Gen.inRange(200, 800),
      Gen.inRange(100, 600),
      Gen.inRange(0, 199),
      Gen.inRange(0, 99),
    )
  })

  it('∀ x coordinate > viewBox.maxX + 20: always flagged', { timeout: 15000 }, () => {
    forAll(
      (w: number, excess: number) => {
        const overflowX = w + 20 + excess   // guaranteed > viewBox + 20
        const svg = svgWith(`0 0 ${w} 200`, `<rect x="${overflowX}" y="10" width="5" height="5"/>`)
        return checkSvg(svg).some(i => i.code === 'SVG_OVERFLOW')
      },
      Gen.inRange(200, 600),
      Gen.inRange(1, 100),
    )
  })

  it('∀ y coordinate > viewBox.maxY + 20: always flagged', { timeout: 15000 }, () => {
    forAll(
      (h: number, excess: number) => {
        const overflowY = h + 20 + excess
        const svg = svgWith(`0 0 400 ${h}`, `<rect x="10" y="${overflowY}" width="5" height="5"/>`)
        return checkSvg(svg).some(i => i.code === 'SVG_OVERFLOW')
      },
      Gen.inRange(100, 400),
      Gen.inRange(1, 100),
    )
  })

  it('∀ coord within ±20px tolerance: not flagged (anti-alias margin)', { timeout: 15000 }, () => {
    forAll(
      (w: number, margin: number) => {
        // Coords between w and w+20 are within tolerance
        const borderX = w + margin   // 0 ≤ margin ≤ 20
        const svg = svgWith(`0 0 ${w} 200`, `<rect x="${borderX}" y="10" width="5" height="5"/>`)
        return !checkSvg(svg).some(i => i.code === 'SVG_OVERFLOW')
      },
      Gen.inRange(200, 600),
      Gen.inRange(0, 20),
    )
  })

  it('coordinates inside <defs> are never flagged', { timeout: 15000 }, () => {
    forAll(
      (w: number, bigCoord: number) => {
        // Large coord inside <defs> (local coordinate space) — must not trigger overflow
        const svg = svgWith(
          `0 0 ${w} 200`,
          `<defs><marker><polygon points="0,0 ${bigCoord},5 0,10"/></marker></defs><rect x="10" y="10" width="5" height="5"/>`,
        )
        return !checkSvg(svg).some(i => i.code === 'SVG_OVERFLOW')
      },
      Gen.inRange(200, 400),
      Gen.inRange(500, 9999),
    )
  })

})

// ── SVG_TEXT_BOX_* ───────────────────────────────────────────────────────────

describe('SVG_TEXT_BOX debug bounds', () => {

  it('flags text boxes that escape their debug shape container', () => {
    const svg = svgWith('0 0 200 120', `
      <rect data-mdart-debug="shape-bounds" data-mdart-debug-label="node" x="40" y="20" width="100" height="60"/>
      <rect data-mdart-debug="text-bounds" data-mdart-debug-label="fit-block" x="30" y="30" width="80" height="30"/>
      <rect x="40" y="20" width="100" height="60"/>
    `)

    expect(checkSvg(svg).some(i => i.code === 'SVG_TEXT_BOX_ESCAPES_SHAPE' && i.level === 'error')).toBe(true)
  })

  it('warns when layout text budget is much smaller than the shape container', () => {
    const svg = svgWith('0 0 200 120', `
      <rect data-mdart-debug="shape-bounds" data-mdart-debug-label="node" x="40" y="20" width="100" height="60"/>
      <rect data-mdart-debug="text-bounds" data-mdart-debug-label="fit-block" x="75" y="42" width="20" height="10"/>
      <rect x="40" y="20" width="100" height="60"/>
    `)

    expect(checkSvg(svg).some(i => i.code === 'SVG_TEXT_BOX_UNDERFILLS_SHAPE' && i.level === 'warning')).toBe(true)
  })

  it('does not warn for a reasonable text budget inside the shape container', () => {
    const svg = svgWith('0 0 200 120', `
      <rect data-mdart-debug="shape-bounds" data-mdart-debug-label="node" x="40" y="20" width="100" height="60"/>
      <rect data-mdart-debug="text-bounds" data-mdart-debug-label="fit-block" x="52" y="28" width="76" height="44"/>
      <rect x="40" y="20" width="100" height="60"/>
    `)

    const issues = checkSvg(svg)
    expect(issues.some(i => i.code === 'SVG_TEXT_BOX_ESCAPES_SHAPE')).toBe(false)
    expect(issues.some(i => i.code === 'SVG_TEXT_BOX_UNDERFILLS_SHAPE')).toBe(false)
  })

})

// ── CheckOptions: skip and minLevel ───────────────────────────────────────────

describe('CheckOptions', () => {

  it('∀ skip list: none of the skipped codes appear in results', { timeout: 15000 }, () => {
    const ALL_CODES: SvgIssueCode[] = [
      'SVG_NO_VIEWBOX', 'SVG_EMPTY_CONTENT', 'SVG_NAN_COORD',
      'SVG_UNDEFINED_ATTR', 'SVG_ITEM_NO_TITLE', 'SVG_OVERFLOW',
      'SVG_TEXT_BOX_ESCAPES_SHAPE', 'SVG_TEXT_BOX_UNDERFILLS_SHAPE',
    ]
    // SVG that could trigger many checks
    const svg = '<svg><rect x="NaN" fill="undefined"/></svg>'

    forAll(
      (skipMask: number) => {
        const skip = ALL_CODES.filter((_, i) => (skipMask >> i) & 1) as SvgIssueCode[]
        const issues = checkSvg(svg, { skip })
        const skipSet = new Set(skip)
        return issues.every(i => !skipSet.has(i.code))
      },
      Gen.inRange(0, (1 << ALL_CODES.length) - 1),
    )
  })

  it('∀ spec: |minLevel:warning| ≥ |minLevel:error|', { timeout: 15000 }, () => {
    // Use SVG that triggers both error (NaN) and warning (item-no-title)
    forAll(
      (nItems: number) => {
        const items = Array.from({ length: nItems }, (_, i) =>
          `<g data-item-index="${i}"><rect x="10" y="10"/></g>`
        ).join('')
        const svg = `<svg viewBox="0 0 200 200"><rect x="NaN"/>${items}</svg>`
        const all    = checkSvg(svg)
        const errors = checkSvg(svg, { minLevel: 'error' })
        return all.length >= errors.length
      },
      Gen.inRange(0, 5),
    )
  })

  it('∀ results: all errors appear before all warnings', { timeout: 15000 }, () => {
    forAll(
      (nItems: number, hasUndef: number) => {
        const undefAttr = hasUndef % 2 === 0 ? ' fill="undefined"' : ''
        const items = Array.from({ length: nItems }, (_, i) =>
          `<g data-item-index="${i}"><rect${undefAttr}/></g>`
        ).join('')
        const svg = `<svg viewBox="0 0 200 200">${items}</svg>`
        const results = checkSvg(svg)
        const levels = results.map(i => i.level)
        const firstWarning = levels.indexOf('warning')
        const lastError = levels.lastIndexOf('error')
        // If both exist, last error must come before first warning
        if (firstWarning === -1 || lastError === -1) return true
        return lastError < firstWarning
      },
      Gen.inRange(0, 4),
      Gen.inRange(0, 1),
    )
  })

})
