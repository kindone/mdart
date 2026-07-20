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

  it('refactored hierarchy layouts render short key:value values visibly', () => {
    const cases = ['tree', 'sitemap', 'mind-map', 'hierarchy-list', 'radial-tree']

    for (const type of cases) {
      const svg = renderMdArt(`
type: ${type}
- Root: alpha
  - Child: beta
- Peer: gamma
`, type)
      const text = visibleText(svg)
      expect(text, type).toContain('Root')
      expect(text, type).toContain('alpha')
      expect(text, type).not.toContain('Root …')
    }
  })

  it('technical pipeline renders short key:value values visibly', () => {
    const svg = renderMdArt(`
type: pipeline
- Extract: alpha
- Transform: beta
- Load: gamma
`, 'pipeline')

    const text = visibleText(svg)
    expect(text).toContain('Extract')
    expect(text).toContain('alpha')
    expect(text).not.toContain('Extract …')
  })

  it('remaining technical layouts render short key:value values visibly', () => {
    const sources: Record<string, string> = {
      'layered-arch': `
type: layered-arch
- Root: alpha
  - Child: beta
- Peer: gamma
`,
      entity: `
type: entity
- Root: alpha
  - child: beta
`,
      sequence: `
type: sequence
- Root: alpha
  -> Peer: beta
- Peer: gamma
`,
      'state-machine': `
type: state-machine
- Root: alpha
  -> Peer: beta
- Peer: gamma
`,
      class: `
type: class
- Root: alpha
  - +child: beta
`,
    }

    for (const [type, source] of Object.entries(sources)) {
      const text = visibleText(renderMdArt(source, type))
      expect(text, type).toContain('Root')
      expect(text, type).toContain('alpha')
      expect(text, type).not.toContain('Root …')
    }
  })
})
