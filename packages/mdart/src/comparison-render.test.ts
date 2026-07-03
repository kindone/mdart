import { describe, expect, it } from 'vitest'
import { renderMdArt } from './renderer'

describe('comparison renderer', () => {
  it('rejects mixed keyed and unkeyed children instead of inventing columns', () => {
    const svg = renderMdArt(`
- Interactive terminal
  - Start: \`claude\`
  - Human TUI
  - Slash commands, resume picker, checkpoint/rewind UX
  - Not a stable machine protocol

- IDE-connected
  - Start: install VS Code / JetBrains extension, then run \`claude --ide\`
  - Adds editor context: open files, selections, diagnostics, diffs
  - Still human-facing
  - Not ideal for Steward automation

- Print / stream-json
  - Start: \`claude -p --output-format=stream-json\`
  - This is the automation surface
  - Supports resume, head fork, MCP, system prompts, permission modes, streaming
`, 'comparison')

    expect(svg).toContain('Invalid comparison diagram syntax')
    expect(svg).toContain('all children keyed or all children unkeyed')
    expect(svg).not.toContain('Human TUI</tspan>')
  })

  it('renders keyed row comparisons with shared fields', () => {
    const svg = renderMdArt(`
- Interactive terminal
  - Start: \`claude\`
  - Interface: Human TUI
  - Automation fit: Not a stable machine protocol

- Print / stream-json
  - Start: \`claude -p --output-format=stream-json\`
  - Interface: JSON event stream
  - Automation fit: Stable automation surface
`, 'comparison')

    expect(svg).toContain('Interactive terminal')
    expect(svg).toContain('Automation fit')
    expect(svg).not.toContain('Invalid comparison diagram syntax')
  })
})
