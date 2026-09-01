import { describe, expect, it } from 'vitest'
import { renderMdArt } from '../renderer'

function visibleText(svg: string): string {
  return svg.replace(/<title>[\s\S]*?<\/title>/g, '')
}

describe('state-machine implied target states', () => {
  const source = `
type: state-machine
- running
  → waiting: ctx.control()
  → blocked: recoverable failure
  → complete: success
- blocked
  → running: retry / skip
  → failed: abort
  → cancelled: cancel
`

  it('draws a node for every transition target, even undeclared ones', () => {
    const text = visibleText(renderMdArt(source, 'state-machine'))
    for (const state of ['running', 'blocked', 'waiting', 'complete', 'failed', 'cancelled']) {
      expect(text, state).toContain(state)
    }
  })

  it('keeps the first declared item as the entry state', () => {
    const svg = renderMdArt(source, 'state-machine')
    // entry marker: a lone circle + line feeding the first state box
    expect(svg).toContain('<circle')
  })

  it('does not synthesise duplicates for already-declared states', () => {
    const svg = renderMdArt(source, 'state-machine')
    const runningBoxes = (svg.match(/<title>running<\/title>/g) || []).length
    expect(runningBoxes).toBe(1)
  })
})
