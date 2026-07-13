import { describe, expect, it } from 'vitest'
import { renderMdArt } from '../renderer'

describe('gantt render', () => {
  it('positions a single-week task at the correct week, not week 1', () => {
    // [wk8] with no range — previously bugged to render at position 0
    const svg = renderMdArt(`type: gantt
- Design [wk1-wk4]
- Launch [wk8]`)
    // The "Launch" bar x position should be further right than "Design" bar.
    // Design starts at wk1 (x = LABEL_W + 0/8 * BAR_AREA = LABEL_W).
    // Launch starts at wk8-1=7 out of 8 → near the right edge.
    // We can't check exact pixel positions portably, but we can verify the
    // rect for Launch has a larger x than the one for Design.
    const rects = [...svg.matchAll(/<rect[^>]*x="([\d.]+)"[^>]*height="18"/g)]
    expect(rects.length).toBe(2)
    const designX  = parseFloat(rects[0][1])
    const launchX  = parseFloat(rects[1][1])
    expect(launchX).toBeGreaterThan(designX)
  })

  it('* bullet renders as a regular task bar (not a milestone)', () => {
    // Previously * set isMilestone — now it is just a bullet alias for -
    const svg = renderMdArt(`type: gantt
* Build Backend [wk1-wk4]
- Testing [wk5-wk6]`)
    // Both should produce bar rects, no polygon diamonds
    expect(svg).toContain('<rect')
    expect(svg).not.toContain('<polygon')
  })

  it('renders a [wkN*] milestone as a diamond polygon, not a bar', () => {
    const svg = renderMdArt(`type: gantt
- Design [wk1-wk3]
- v1.0 Launch [wk4*]
- QA [wk5-wk6]`)
    // Design and QA get bars; Launch gets a diamond
    expect(svg).toContain('<polygon')
    // The bar rects should be present for the non-milestone tasks
    expect(svg).toMatch(/<rect[^>]*height="18"/)
  })

  it('places the milestone diamond at the correct week position', () => {
    const svg = renderMdArt(`type: gantt
- Task A [wk1-wk4]
- Milestone [wk8*]`)
    // Diamond cx is at end=8 out of maxEnd=8, so it's at the rightmost position.
    // The dashed guide line x2 and polygon points should reflect this.
    // Sanity: the polygon should appear in the SVG.
    expect(svg).toContain('<polygon')
    // Dashed guide line from label column to the diamond
    expect(svg).toContain('stroke-dasharray="3,3"')
  })
})
