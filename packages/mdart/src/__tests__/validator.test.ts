import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseMdArt } from '../parser'
import { validateMdArt } from '../validator'
import { renderMdArt, renderMdArtDetailed } from '../renderer'
import { configureMdArt, resetMdArtConfig } from '../config'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse then validate a raw string with the given hint type. */
function validate(raw: string, type: string) {
  return validateMdArt(parseMdArt(raw, type))
}

/** Return only the issue codes for a given raw + type. */
function codes(raw: string, type: string): string[] {
  return validate(raw, type).map(i => i.code)
}

/** Build an N-item raw string for a given type (one item per line). */
function nItems(n: number, prefix = 'Step'): string {
  return Array.from({ length: n }, (_, i) => `- ${prefix} ${i + 1}`).join('\n')
}

// ── validateMdArt ─────────────────────────────────────────────────────────────

describe('validateMdArt', () => {
  // ── Structural errors (level: error) ────────────────────────────────────────

  describe('STRUCT_UNKNOWN_TYPE', () => {
    it('emits an error for an unrecognised diagram type', () => {
      const issues = validate('- Item A\n- Item B', 'nonexistent-diagram')
      expect(issues).toHaveLength(1)
      expect(issues[0].code).toBe('STRUCT_UNKNOWN_TYPE')
      expect(issues[0].level).toBe('error')
    })

    it('stops further checks once the type is unknown', () => {
      // Even with more potential problems (empty body), only one issue comes back
      const issues = validate('', 'bad-type')
      expect(issues.every(i => i.code === 'STRUCT_UNKNOWN_TYPE')).toBe(true)
    })
  })

  describe('STRUCT_EMPTY_DIAGRAM', () => {
    it('emits a warning when a diagram has no items', () => {
      expect(codes('', 'process')).toContain('STRUCT_EMPTY_DIAGRAM')
    })

    it('does not emit for a diagram with at least one item', () => {
      expect(codes('- Only Item', 'process')).not.toContain('STRUCT_EMPTY_DIAGRAM')
    })
  })

  describe('STRUCT_INSUFFICIENT_ITEMS', () => {
    it('emits an error for cycle with only one item (minItems: 2)', () => {
      const issues = validate('- Lone Step', 'cycle')
      const target = issues.find(i => i.code === 'STRUCT_INSUFFICIENT_ITEMS')
      expect(target).toBeDefined()
      expect(target!.level).toBe('error')
    })

    it('emits an error for venn-3 with the wrong item count (exactItems: 3)', () => {
      // 2 items when exactly 3 are required
      const issues = validate('- A\n- B', 'venn-3')
      expect(issues.some(i => i.code === 'STRUCT_INSUFFICIENT_ITEMS')).toBe(true)
    })

    it('does not emit for venn with exactly 2 items (minItems: 2)', () => {
      expect(codes('- Circle A\n- Circle B', 'venn')).not.toContain('STRUCT_INSUFFICIENT_ITEMS')
    })
  })

  describe('STRUCT_MISSING_REQUIRED_STRUCTURE', () => {
    it('emits a warning for swot with no quadrant prefixes', () => {
      // '-' at depth 0 in swot is always a weakness marker, so use '*' bullets
      // to get items with no SWOT quadrant prefix.
      const raw = '* Plain A\n* Plain B'
      expect(codes(raw, 'swot')).toContain('STRUCT_MISSING_REQUIRED_STRUCTURE')
    })

    it('does not emit for swot when every item has a prefix', () => {
      const raw = '+ Strength\n- Weakness\n? Opportunity\n! Threat'
      expect(codes(raw, 'swot')).not.toContain('STRUCT_MISSING_REQUIRED_STRUCTURE')
    })

    it('emits a warning for sankey with no flow edges (→ Target (value))', () => {
      expect(codes('- Source A\n- Source B', 'sankey')).toContain('STRUCT_MISSING_REQUIRED_STRUCTURE')
    })

    it('emits a warning for sequence with no → transition arrows', () => {
      expect(codes('- Actor A\n- Actor B', 'sequence')).toContain('STRUCT_MISSING_REQUIRED_STRUCTURE')
    })

    it('emits a warning for gantt items that have no date range', () => {
      expect(codes('- Task One\n- Task Two', 'gantt')).toContain('STRUCT_MISSING_REQUIRED_STRUCTURE')
    })

    it('does not emit for gantt items that include a date range', () => {
      const raw = '- Task One [wk1-wk3]\n- Task Two [wk4-wk6]'
      expect(codes(raw, 'gantt')).not.toContain('STRUCT_MISSING_REQUIRED_STRUCTURE')
    })

    it('does not emit for a gantt milestone using [wkN*] syntax', () => {
      const raw = '- Task One [wk1-wk3]\n- v1.0 Launch [wk4*]'
      expect(codes(raw, 'gantt')).not.toContain('STRUCT_MISSING_REQUIRED_STRUCTURE')
    })
  })

  // Note: STRUCT_INVALID_ATTRIBUTE_VALUE is declared in the ValidationCode union
  // but not yet emitted by any check. It is a placeholder for future attribute
  // validators (e.g. unknown direction value, invalid theme name).

  // ── Layout warnings (level: warning) ────────────────────────────────────────

  describe('LAYOUT_NODE_COUNT_EXCEEDS_RANGE', () => {
    it('emits a warning when cycle exceeds softMaxItems (8)', () => {
      expect(codes(nItems(9), 'cycle')).toContain('LAYOUT_NODE_COUNT_EXCEEDS_RANGE')
    })

    it('does not emit for cycle at exactly softMaxItems (8)', () => {
      expect(codes(nItems(8), 'cycle')).not.toContain('LAYOUT_NODE_COUNT_EXCEEDS_RANGE')
    })
  })

  describe('LAYOUT_EXCESS_DEPTH', () => {
    it('emits a warning for a tree that is 6 levels deep (max is 5)', () => {
      const raw = '- L1\n  - L2\n    - L3\n      - L4\n        - L5\n          - L6'
      expect(codes(raw, 'tree')).toContain('LAYOUT_EXCESS_DEPTH')
    })

    it('does not emit for a tree that is exactly 5 levels deep', () => {
      const raw = '- L1\n  - L2\n    - L3\n      - L4\n        - L5'
      expect(codes(raw, 'tree')).not.toContain('LAYOUT_EXCESS_DEPTH')
    })
  })

  describe('LAYOUT_UNBALANCED_TREE', () => {
    it('emits a warning when branch depths differ by more than 3', () => {
      // Branch A: 5 levels deep; Branch B: 1 level → difference = 4 > 3
      const raw = [
        '- Branch A',
        '  - A2',
        '    - A3',
        '      - A4',
        '        - A5',
        '- Branch B',
      ].join('\n')
      expect(codes(raw, 'tree')).toContain('LAYOUT_UNBALANCED_TREE')
    })

    it('does not emit for branches that are balanced', () => {
      const raw = '- A\n  - A1\n    - A2\n- B\n  - B1\n    - B2'
      expect(codes(raw, 'tree')).not.toContain('LAYOUT_UNBALANCED_TREE')
    })
  })

  describe('LAYOUT_FLAT_HIERARCHY', () => {
    it('emits a warning for a tree with multiple root items and no children', () => {
      expect(codes('- Alpha\n- Beta\n- Gamma', 'tree')).toContain('LAYOUT_FLAT_HIERARCHY')
    })

    it('does not emit when at least one item has children', () => {
      expect(codes('- Root\n  - Child\n- Sibling', 'tree')).not.toContain('LAYOUT_FLAT_HIERARCHY')
    })
  })

  describe('LAYOUT_IGNORED_CHILDREN', () => {
    it('emits a warning for waffle when items have nested children', () => {
      // Waffle ignores nested children; the validator warns about this
      const raw = '- 80\n  - Segment A\n  - Segment B'
      const issues = validate(raw, 'waffle')
      expect(issues.some(i => i.code === 'LAYOUT_IGNORED_CHILDREN')).toBe(true)
    })

    it('does not emit for waffle with no children', () => {
      const issues = validate('- 75', 'waffle')
      expect(issues.some(i => i.code === 'LAYOUT_IGNORED_CHILDREN')).toBe(false)
    })
  })

  describe('LAYOUT_MISMATCHED_KEYS', () => {
    it('does not emit for a comparison column that mixes keyed and unkeyed rows', () => {
      // Keyed rows form named fields; unkeyed rows align positionally with an empty header.
      const raw = [
        '- Column A',
        '  - Row 1: 95',
        '  - Row 2',
        '- Column B',
        '  - Row 1: 90',
        '  - Row 2: good',
      ].join('\n')
      expect(codes(raw, 'comparison')).not.toContain('LAYOUT_MISMATCHED_KEYS')
    })

    it('does not emit when all children in every column use the same key style', () => {
      const raw = [
        '- Col A',
        '  - Feature: fast',
        '  - Price: cheap',
        '- Col B',
        '  - Feature: slow',
        '  - Price: expensive',
      ].join('\n')
      expect(codes(raw, 'comparison')).not.toContain('LAYOUT_MISMATCHED_KEYS')
    })
  })

  // ── Content warnings (level: warning) ────────────────────────────────────────

  describe('CONTENT_VERY_LONG_LABEL', () => {
    it('emits a warning for a label that exceeds the type-specific character limit', () => {
      // cycle labelMaxLen: 25; this label is 30 chars
      const raw = `- ${'X'.repeat(30)}\n- Short`
      expect(codes(raw, 'cycle')).toContain('CONTENT_VERY_LONG_LABEL')
    })

    it('does not emit for a label within the character limit', () => {
      // cycle labelMaxLen: 25; label is exactly 25 chars
      const raw = `- ${'X'.repeat(25)}\n- Short`
      expect(codes(raw, 'cycle')).not.toContain('CONTENT_VERY_LONG_LABEL')
    })
  })

  describe('CONTENT_EMPTY_LABEL', () => {
    it('emits a warning when an item has a whitespace-only label', () => {
      // Mutate spec post-parse since the parser strips trailing whitespace from raw lines
      const spec = parseMdArt('- Normal Item\n- Another Item', 'process')
      spec.items[0].label = '   '
      const issues = validateMdArt(spec)
      expect(issues.some(i => i.code === 'CONTENT_EMPTY_LABEL')).toBe(true)
    })
  })

  describe('CONTENT_DUPLICATE_SIBLING_LABELS', () => {
    it('emits a warning when two sibling items share the same label', () => {
      expect(codes('- Alpha\n- Beta\n- Alpha', 'process')).toContain('CONTENT_DUPLICATE_SIBLING_LABELS')
    })

    it('does not emit when sibling labels are all distinct', () => {
      expect(codes('- Alpha\n- Beta\n- Gamma', 'process')).not.toContain('CONTENT_DUPLICATE_SIBLING_LABELS')
    })
  })

  describe('CONTENT_NUMERIC_VALUE_EXPECTED', () => {
    it('emits a warning when a statistical item has a non-numeric value', () => {
      // radar requires numeric values and minItems: 3
      const raw = '- Speed: fast\n- Power: 75\n- Range: 80'
      expect(codes(raw, 'radar')).toContain('CONTENT_NUMERIC_VALUE_EXPECTED')
    })

    it('does not emit when all values are numeric', () => {
      const raw = '- Speed: 90\n- Power: 75\n- Range: 80'
      expect(codes(raw, 'radar')).not.toContain('CONTENT_NUMERIC_VALUE_EXPECTED')
    })
  })

  describe('CONTENT_MISSING_NUMERIC_VALUE', () => {
    it('emits a warning when a statistical item has no value at all', () => {
      const raw = '- Speed\n- Power\n- Range'
      expect(codes(raw, 'radar')).toContain('CONTENT_MISSING_NUMERIC_VALUE')
    })
  })

  // ── ValidationOptions ──────────────────────────────────────────────────────

  describe('options.minLevel', () => {
    it('returns only error-level issues when minLevel is "error"', () => {
      // Unknown type is always an error
      const spec = parseMdArt('- Item A', 'not-a-type')
      const errors = validateMdArt(spec, { minLevel: 'error' })
      expect(errors.length).toBeGreaterThan(0)
      expect(errors.every(i => i.level === 'error')).toBe(true)
    })

    it('returns both warnings and errors when minLevel is not set', () => {
      // flat tree: LAYOUT_FLAT_HIERARCHY (warning)
      const spec = parseMdArt('- Alpha\n- Beta\n- Gamma', 'tree')
      const all = validateMdArt(spec)
      expect(all.some(i => i.level === 'warning')).toBe(true)
    })

    it('never returns fewer issues at minLevel "warning" than at minLevel "error"', () => {
      const spec = parseMdArt('- Only Step', 'cycle')
      const all    = validateMdArt(spec)
      const errors = validateMdArt(spec, { minLevel: 'error' })
      expect(all.length).toBeGreaterThanOrEqual(errors.length)
    })
  })

  // ── Valid inputs produce no issues ─────────────────────────────────────────

  describe('valid inputs', () => {
    it('returns no issues for a well-formed process diagram', () => {
      expect(validate('- Step A\n- Step B\n- Step C', 'process')).toHaveLength(0)
    })

    it('returns no issues for a well-formed tree with nested hierarchy', () => {
      const raw = '- Root\n  - Child A\n    - Grandchild\n  - Child B'
      expect(validate(raw, 'tree')).toHaveLength(0)
    })

    it('returns no issues for a swot with all four quadrant prefixes', () => {
      const raw = '+ Strength One\n- Weakness One\n? Opportunity One\n! Threat One'
      expect(validate(raw, 'swot')).toHaveLength(0)
    })

    it('returns no issues for a valid radar chart with numeric values', () => {
      const raw = '- Speed: 80\n- Power: 65\n- Range: 90'
      expect(validate(raw, 'radar')).toHaveLength(0)
    })

    it('returns no issues for a venn with exactly 2 items', () => {
      expect(validate('- Set A\n- Set B', 'venn')).toHaveLength(0)
    })
  })
})

// ── renderMdArtDetailed ───────────────────────────────────────────────────────

describe('renderMdArtDetailed', () => {
  afterEach(() => {
    resetMdArtConfig()
  })

  it('returns an SVG string and an empty issues array for valid input', () => {
    const { svg, issues } = renderMdArtDetailed('- A\n- B\n- C', 'process')
    expect(svg).toContain('<svg')
    expect(issues).toHaveLength(0)
  })

  it('validate: warning (default) — collects issues but still renders', () => {
    // flat tree → LAYOUT_FLAT_HIERARCHY warning, but rendering still proceeds
    const { svg, issues } = renderMdArtDetailed(
      '- Alpha\n- Beta\n- Gamma',
      'tree',
      { validate: 'warning' },
    )
    expect(svg).toContain('<svg')
    expect(issues.some(i => i.code === 'LAYOUT_FLAT_HIERARCHY')).toBe(true)
  })

  it('validate: error — aborts with an error SVG when error-level issues exist', () => {
    // cycle with 1 item → STRUCT_INSUFFICIENT_ITEMS (error)
    const { svg, issues } = renderMdArtDetailed('- Only Step', 'cycle', { validate: 'error' })
    expect(svg).toContain('MdArt error')
    expect(issues.some(i => i.level === 'error')).toBe(true)
  })

  it('validate: error — still renders normally when only warning-level issues exist', () => {
    // flat tree has only warnings
    const { svg, issues } = renderMdArtDetailed(
      '- Alpha\n- Beta\n- Gamma',
      'tree',
      { validate: 'error' },
    )
    expect(svg).toContain('<svg')
    expect(issues.every(i => i.level === 'warning')).toBe(true)
  })

  it('validate: silent — returns an empty issues array regardless of diagram validity', () => {
    // cycle with 1 item would normally emit an error, but silent skips all validation
    const { svg, issues } = renderMdArtDetailed('- Only Step', 'cycle', { validate: 'silent' })
    expect(issues).toHaveLength(0)
    // rendering still proceeds — the renderer gets the spec even with 1 item
    expect(svg).toContain('<svg')
  })

  it('calls onIssue once per validation issue', () => {
    const onIssue = vi.fn()
    // flat tree → at least one warning
    renderMdArtDetailed('- Alpha\n- Beta\n- Gamma', 'tree', { validate: 'warning', onIssue })
    expect(onIssue).toHaveBeenCalled()
    expect(onIssue.mock.calls[0][0]).toMatchObject({ code: expect.any(String), level: expect.any(String) })
  })

  it('does not call onIssue when validate is silent', () => {
    const onIssue = vi.fn()
    renderMdArtDetailed('- Alpha\n- Beta\n- Gamma', 'tree', { validate: 'silent', onIssue })
    expect(onIssue).not.toHaveBeenCalled()
  })

  it('respects the global validate mode set via configureMdArt', () => {
    configureMdArt({ validate: 'error' })
    // cycle with 1 item → error → error SVG (no pluginConfig to override)
    const { svg, issues } = renderMdArtDetailed('- Only Step', 'cycle')
    expect(svg).toContain('MdArt error')
    expect(issues.some(i => i.level === 'error')).toBe(true)
  })

  it('pluginConfig.validate overrides the global validate setting', () => {
    configureMdArt({ validate: 'error' })
    // Plugin says silent → no issues collected, rendering proceeds normally
    const { svg, issues } = renderMdArtDetailed('- Only Step', 'cycle', { validate: 'silent' })
    expect(issues).toHaveLength(0)
    expect(svg).toContain('<svg')
  })

  it('respects global onIssue callback set via configureMdArt', () => {
    const globalOnIssue = vi.fn()
    configureMdArt({ validate: 'warning', onIssue: globalOnIssue })
    renderMdArtDetailed('- Alpha\n- Beta\n- Gamma', 'tree')
    expect(globalOnIssue).toHaveBeenCalled()
  })

  it('pluginConfig.onIssue overrides the global onIssue callback', () => {
    const globalOnIssue  = vi.fn()
    const pluginOnIssue  = vi.fn()
    configureMdArt({ validate: 'warning', onIssue: globalOnIssue })
    renderMdArtDetailed('- Alpha\n- Beta\n- Gamma', 'tree', { onIssue: pluginOnIssue })
    expect(pluginOnIssue).toHaveBeenCalled()
    expect(globalOnIssue).not.toHaveBeenCalled()
  })

  // ── renderMdArt wrapper ────────────────────────────────────────────────────

  it('renderMdArt returns the same SVG as renderMdArtDetailed', () => {
    const raw  = '- A\n- B\n- C'
    const type = 'process'
    const { svg } = renderMdArtDetailed(raw, type)
    expect(renderMdArt(raw, type)).toBe(svg)
  })
})
