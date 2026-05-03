// @quality: correctness
// @type: example
//
// Regression: SWOT and pros-cons header detection used to use loose substring
// matching (`label.includes('pro')`, `label.startsWith('threat')`), which
// silently misrouted innocuous labels like "Proposal" or "Threatening factors".
// These tests pin the new strict-match + attr-override behaviour.

import { describe, it, expect } from 'vitest'
import { renderMdArt } from './renderer'

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
    expect(svg).toMatch(/✓\s*Fast/)
    expect(svg).toMatch(/✗\s*Risky/)
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
    expect(svg).toMatch(/✓\s*Real pro/)
    expect(svg).toMatch(/✗\s*Real con/)
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
    expect(svg).toMatch(/✓\s*Big win/)
    expect(svg).toMatch(/✗\s*Big risk/)
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
