// @quality: correctness
// @type: example
//
// Regression: SWOT and pros-cons header detection used to use loose substring
// matching (`label.includes('pro')`, `label.startsWith('threat')`), which
// silently misrouted innocuous labels like "Proposal" or "Threatening factors".
// These tests pin the new strict-match + attr-override behaviour.

import { describe, it, expect } from 'vitest'
import { renderMdArt } from '../renderer'

// The pros-cons renderer column-aligns the marker (✓/✗) and the label by
// putting them in separate <tspan>s at distinct x-coords inside one <text>.
// These helpers assert that within a single row's <text>, the right marker
// and label co-occur. Pros column text uses fill="#6ee7b7" (green),
// cons column uses fill="#fda4af" (red). The `(?:(?!</text>)[\s\S])*?`
// pattern is "any char except a </text> close tag" — it pins the match
// to one text element so a marker in row 1 can't pair with a label in row 2.
const inText = (color: string, marker: string, label: string) =>
  new RegExp(
    `<text[^>]*fill="${color}"[^>]*>(?:(?!</text>)[\\s\\S])*?${marker}(?:(?!</text>)[\\s\\S])*?${label}(?:(?!</text>)[\\s\\S])*?</text>`,
  )
const prosRow = (label: string) => inText('#6ee7b7', '✓', label)
const consRow = (label: string) => inText('#fda4af', '✗', label)

describe('pros-cons header matching', () => {
  it('routes children of "Pros" / "Cons" headers correctly', () => {
    const svg = renderMdArt(`type: pros-cons
- Pros
  - Fast
- Cons
  - Risky
`)
    expect(svg).toContain('Fast')
    expect(svg).toContain('Risky')
    // Pros row uses ✓ marker, Cons row uses ✗ marker
    expect(svg).toMatch(prosRow('Fast'))
    expect(svg).toMatch(consRow('Risky'))
  })

  it('does NOT misroute labels containing "pro" or "con" as substrings', () => {
    // "Proposal" used to match the old `lower.includes('pro')` test.
    // It must not be treated as a header now — its child should not appear
    // in the pros column.
    const svg = renderMdArt(`type: pros-cons
- Proposal
  - Some detail
- Pros
  - Real pro
- Cons
  - Real con
`)
    // Real values still appear
    expect(svg).toMatch(prosRow('Real pro'))
    expect(svg).toMatch(consRow('Real con'))
    // The Proposal child does NOT appear (item gets dropped, not misrouted)
    expect(svg).not.toContain('Some detail')
  })

  it('accepts [pros] / [cons] attr override for unusual headings', () => {
    const svg = renderMdArt(`type: pros-cons
- Upside [pros]
  - Big win
- Downside [cons]
  - Big risk
`)
    expect(svg).toMatch(prosRow('Big win'))
    expect(svg).toMatch(consRow('Big risk'))
  })
})

describe('swot header matching', () => {
  it('routes group-heading children to the right quadrant by exact label', () => {
    const svg = renderMdArt(`type: swot
- Strengths
  - Strong team
- Weaknesses
  - Limited budget
- Opportunities
  - New market
- Threats
  - Competitor X
`)
    expect(svg).toContain('Strong team')
    expect(svg).toContain('Limited budget')
    expect(svg).toContain('New market')
    expect(svg).toContain('Competitor X')
  })

  it('does NOT match "Threatening factors" as the Threats header', () => {
    const svg = renderMdArt(`type: swot
- Threatening factors
  - Should not appear in T
- Threats
  - Real threat
`)
    expect(svg).toContain('Real threat')
    expect(svg).not.toContain('Should not appear in T')
  })

  it('accepts [strengths] / [w] / [o] / [t] attrs as opt-in overrides', () => {
    const svg = renderMdArt(`type: swot
- Internal positives [strengths]
  - Brand loyalty
- Internal negatives [w]
  - Old codebase
- External upside [o]
  - APAC market
- External downside [t]
  - New regulation
`)
    expect(svg).toContain('Brand loyalty')
    expect(svg).toContain('Old codebase')
    expect(svg).toContain('APAC market')
    expect(svg).toContain('New regulation')
  })
})
