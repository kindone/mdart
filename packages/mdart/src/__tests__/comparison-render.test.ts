import { describe, expect, it } from 'vitest'
import { renderMdArt } from '../renderer'

describe('comparison renderer', () => {
  it('renders mixed keyed and unkeyed children by aligning unkeyed rows positionally', () => {
    const svg = renderMdArt(`
- Product state (not entangled)
  - Form: |ψ⟩_A ⊗ |φ⟩_B
  - Example: |↑⟩_A ⊗ |↓⟩_B
  - Each particle has its own definite state
  - Correlations are classical

- Entangled state
  - Form: Cannot be factored
  - Example: (1/√2)(|↑⟩_A|↓⟩_B - |↓⟩_A|↑⟩_B)
  - Neither particle has its own definite state
  - Correlations are quantum (non-classical)
`, 'comparison')

    expect(svg).not.toContain('Invalid comparison diagram syntax')
    expect(svg).toContain('Product state')
    expect(svg).toContain('Entangled state')
    expect(svg).toContain('Form')
    expect(svg).toContain('Example')
    expect(svg).toContain('Each particle has its own definite state')
    expect(svg).toContain('Neither particle has its own definite state')
    expect(svg).toContain('Correlations are quantum')
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
