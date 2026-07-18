import { describe, expect, it } from 'vitest'
import { renderMdArt } from '../renderer'

function visibleText(svg: string): string {
  return svg.replace(/<title>[\s\S]*?<\/title>/g, '')
}

describe('hierarchy and technical text fitting', () => {
  it('org-chart renders item values visibly instead of an ellipsis cue only', () => {
    const svg = renderMdArt(`
type: org-chart
- Platform Team: owns deployment reliability
  - Runtime Operations: watches release health
`, 'org-chart')

    const text = visibleText(svg)
    expect(text).toContain('Platform Team')
    expect(text).toContain('owns deployment')
    expect(text).not.toContain('Platform Team …')
  })

  it('network wraps labels and renders node values inside larger nodes', () => {
    const svg = renderMdArt(`
type: network
- API Gateway Service: routes customer traffic
  -> Worker Pool
- Worker Pool: handles long running jobs
  -> Result Store
`, 'network')

    const text = visibleText(svg)
    expect(text).toContain('API Gateway')
    expect(text).toContain('routes customer')
    expect(text).toContain('Worker Pool')
    expect(text).toContain('handles long')
    expect(text).not.toContain('API Gateway Service …')
  })
})
