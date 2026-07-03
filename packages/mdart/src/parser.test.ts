import { describe, it, expect } from 'vitest'
import { parseMdArt } from './parser'

describe('parseMdArt', () => {
  // ── Arrow chain ──────────────────────────────────────────────────────────

  it('parses flat arrow chain into flat items', () => {
    const spec = parseMdArt('A → B → C')
    expect(spec.items).toHaveLength(3)
    expect(spec.items[0].label).toBe('A')
    expect(spec.items[1].label).toBe('B')
    expect(spec.items[2].label).toBe('C')
    expect(spec.items[0].children).toHaveLength(0)
  })

  it('uses hintType from fence header', () => {
    const spec = parseMdArt('A → B → C', 'process')
    expect(spec.type).toBe('process')
  })

  it('parses root-level leading arrows as process continuations', () => {
    const spec = parseMdArt(`cached snapshot says updating
→ client now does a short follow-up poll
→ fresh snapshot arrives
→ updating badge clears quickly`, 'process')

    expect(spec.items.map(item => item.label)).toEqual([
      'cached snapshot says updating',
      'client now does a short follow-up poll',
      'fresh snapshot arrives',
      'updating badge clears quickly',
    ])
  })

  it('parses arrow chain with value annotations', () => {
    const spec = parseMdArt('Alpha: First → Beta: Second → Gamma: Third')
    expect(spec.items).toHaveLength(3)
    expect(spec.items[0].label).toBe('Alpha')
    expect(spec.items[0].value).toBe('First')
  })

  // ── Front-matter ─────────────────────────────────────────────────────────

  it('extracts type from front-matter', () => {
    const src = 'type: cycle\ntitle: My Cycle\n\n- Step 1\n- Step 2'
    const spec = parseMdArt(src)
    expect(spec.type).toBe('cycle')
    expect(spec.title).toBe('My Cycle')
    expect(spec.items).toHaveLength(2)
  })

  it('extracts theme and direction from front-matter', () => {
    const src = 'type: process\ntheme: mono-light\ndirection: TB\n\n- A\n- B'
    const spec = parseMdArt(src)
    expect(spec.theme).toBe('mono-light')
    expect(spec.direction).toBe('TB')
  })

  it('front-matter stops at first list item', () => {
    const src = 'type: swot\n- First item'
    const spec = parseMdArt(src)
    expect(spec.type).toBe('swot')
    expect(spec.items).toHaveLength(1)
    expect(spec.items[0].label).toBe('First item')
  })

  it('handles missing type in front-matter with hintType fallback', () => {
    const src = 'title: My Chart\n\n- A\n- B'
    const spec = parseMdArt(src, 'bullet-list')
    expect(spec.type).toBe('bullet-list')
    expect(spec.title).toBe('My Chart')
  })

  // ── Prefix chars ─────────────────────────────────────────────────────────

  it('parses + prefix as S quadrant', () => {
    const spec = parseMdArt('+ Strong brand\n+ Good team')
    expect(spec.items).toHaveLength(2)
    expect(spec.items[0].prefix).toBe('+')
    expect(spec.items[0].label).toBe('Strong brand')
  })

  it('parses - prefix as W quadrant in swot context', () => {
    const spec = parseMdArt('type: swot\n\n- High cost\n- Low margin')
    expect(spec.items[0].prefix).toBe('-')
  })

  it('parses ? prefix as O quadrant', () => {
    const spec = parseMdArt('? New markets')
    expect(spec.items[0].prefix).toBe('?')
  })

  it('parses ! prefix as T quadrant', () => {
    const spec = parseMdArt('! Competitor threat')
    expect(spec.items[0].prefix).toBe('!')
  })

  it('parses mixed prefix swot block', () => {
    const src = 'type: swot\n\n+ Strength\n- Weakness\n? Opportunity\n! Threat'
    const spec = parseMdArt(src)
    expect(spec.items).toHaveLength(4)
    expect(spec.items.map(i => i.prefix)).toEqual(['+', '-', '?', '!'])
  })

  // ── Nested indentation → children ────────────────────────────────────────

  it('parses indented children', () => {
    const src = '- Parent\n  - Child 1\n  - Child 2'
    const spec = parseMdArt(src)
    expect(spec.items).toHaveLength(1)
    expect(spec.items[0].label).toBe('Parent')
    expect(spec.items[0].children).toHaveLength(2)
    expect(spec.items[0].children[0].label).toBe('Child 1')
  })

  it('parses deeply nested children', () => {
    const src = '- A\n  - B\n    - C'
    const spec = parseMdArt(src)
    expect(spec.items[0].children[0].children[0].label).toBe('C')
  })

  it('multiple top-level items with children', () => {
    const src = '- Group 1\n  - Item A\n- Group 2\n  - Item B'
    const spec = parseMdArt(src)
    expect(spec.items).toHaveLength(2)
    expect(spec.items[0].children).toHaveLength(1)
    expect(spec.items[1].children).toHaveLength(1)
  })

  it('treats → inside indented key:value child as literal value (not chain)', () => {
    // Regression: the arrow-chain branch used to fire on any line containing
    // " → ", flattening structured comparison columns like the y-protocols
    // sync example. → in a child's value must stay literal.
    const src = [
      'type: comparison',
      '',
      '- SyncStep1',
      '  - direction: A → B',
      '  - payload: state vector',
      '- SyncStep2',
      '  - direction: B → A',
      '  - payload: ops',
    ].join('\n')
    const spec = parseMdArt(src)
    expect(spec.items).toHaveLength(2)
    expect(spec.items[0].label).toBe('SyncStep1')
    expect(spec.items[0].children).toHaveLength(2)
    expect(spec.items[0].children[0].label).toBe('direction')
    expect(spec.items[0].children[0].value).toBe('A → B')
  })

  it('treats single root-level key:value with → in value as one item', () => {
    // "direction: any → any" should NOT split into a chain — only one colon,
    // and it sits before the only arrow.
    const spec = parseMdArt('- direction: any → any')
    expect(spec.items).toHaveLength(1)
    expect(spec.items[0].label).toBe('direction')
    expect(spec.items[0].value).toBe('any → any')
  })

  // ── \: escape ────────────────────────────────────────────────────────────

  it('treats \\: as a literal colon and does not split label:value', () => {
    const spec = parseMdArt('- Note\\: do this later')
    expect(spec.items).toHaveLength(1)
    expect(spec.items[0].label).toBe('Note: do this later')
    expect(spec.items[0].value).toBeUndefined()
  })

  it('still splits on the first unescaped colon when one exists', () => {
    // `Cache\: 5ms : fast` — first `:` is escaped, second one is real.
    const spec = parseMdArt('- Cache\\: 5ms : fast')
    expect(spec.items[0].label).toBe('Cache: 5ms')
    expect(spec.items[0].value).toBe('fast')
  })

  it('unescapes \\: inside the value when it appears after the split', () => {
    const spec = parseMdArt('- key: value with \\: literal colon')
    expect(spec.items[0].label).toBe('key')
    expect(spec.items[0].value).toBe('value with : literal colon')
  })

  it('keeps URL split working alongside the escape', () => {
    const spec = parseMdArt('- Site: https://example.com')
    expect(spec.items[0].label).toBe('Site')
    expect(spec.items[0].value).toBe('https://example.com')
  })

  it('lets agents safely write parenthetical colons via escape', () => {
    // The motivating case: free-text label with an English-style colon in
    // a parenthetical. Author escapes it to keep the whole string as label.
    const spec = parseMdArt('- Check redis (e.g.\\: persistence policy)')
    expect(spec.items[0].label).toBe('Check redis (e.g.: persistence policy)')
    expect(spec.items[0].value).toBeUndefined()
  })

  // ── YAML-strict colon (paren / quote / digit / no-space awareness) ───────

  it('does not split on a colon nested inside parentheses', () => {
    const spec = parseMdArt('- Cache (e.g.: persistence policy)')
    expect(spec.items[0].label).toBe('Cache (e.g.: persistence policy)')
    expect(spec.items[0].value).toBeUndefined()
  })

  it('does not split on a colon nested inside double quotes', () => {
    const spec = parseMdArt('- Says "hello: world"')
    expect(spec.items[0].label).toBe('Says "hello: world"')
    expect(spec.items[0].value).toBeUndefined()
  })

  it('does not split on clock-time colons (digit:digit)', () => {
    const spec = parseMdArt('- Standup at 3:30pm')
    expect(spec.items[0].label).toBe('Standup at 3:30pm')
    expect(spec.items[0].value).toBeUndefined()
  })

  it('does not split on ratio colons (digit:digit)', () => {
    const spec = parseMdArt('- Aspect ratio 16:9')
    expect(spec.items[0].label).toBe('Aspect ratio 16:9')
    expect(spec.items[0].value).toBeUndefined()
  })

  it('does not split on a colon without whitespace after it', () => {
    // YAML-strict: `key:value` (no space) reads as one label, not a kv pair.
    const spec = parseMdArt('- aspect-ratio:16:9')
    expect(spec.items[0].label).toBe('aspect-ratio:16:9')
    expect(spec.items[0].value).toBeUndefined()
  })

  it('still splits when an outer colon escapes the parenthetical scope', () => {
    // Inside-paren colon is skipped, the *outer* colon (with whitespace
    // after) splits as expected.
    const spec = parseMdArt('- Cache (e.g.: redis): in-memory store')
    expect(spec.items[0].label).toBe('Cache (e.g.: redis)')
    expect(spec.items[0].value).toBe('in-memory store')
  })

  it('does not let an apostrophe open a quote scope', () => {
    // Apostrophe is for contractions in English; treating it as a quote
    // delimiter would swallow every following colon. Verify it doesn't.
    const spec = parseMdArt("- it's complicated: but workable")
    expect(spec.items[0].label).toBe("it's complicated")
    expect(spec.items[0].value).toBe('but workable')
  })

  // ── [attr] extraction ─────────────────────────────────────────────────────

  it('extracts single attr', () => {
    const spec = parseMdArt('- My Task [done]')
    expect(spec.items[0].attrs).toEqual(['done'])
    expect(spec.items[0].label).toBe('My Task')
  })

  it('extracts multiple attrs', () => {
    const spec = parseMdArt('- id: uuid [PK, NOT NULL]')
    expect(spec.items[0].attrs).toEqual(['PK', 'NOT NULL'])
    expect(spec.items[0].label).toBe('id')
    expect(spec.items[0].value).toBe('uuid')
  })

  it('handles items without attrs', () => {
    const spec = parseMdArt('- Plain item')
    expect(spec.items[0].attrs).toEqual([])
  })

  // ── ∩ intersection detection ──────────────────────────────────────────────

  it('detects ∩ in label → isIntersection true', () => {
    const spec = parseMdArt('- Engineering ∩ Product')
    expect(spec.items[0].isIntersection).toBe(true)
    expect(spec.items[0].label).toBe('Engineering ∩ Product')
  })

  it('non-intersection labels have isIntersection falsy', () => {
    const spec = parseMdArt('- Plain Item')
    expect(spec.items[0].isIntersection).toBeFalsy()
  })

  // ── Flow children ──────────────────────────────────────────────────────────

  it('parses → flow children', () => {
    const src = '- Source\n  → Target A\n  → Target B'
    const spec = parseMdArt(src)
    expect(spec.items[0].flowChildren).toHaveLength(2)
    expect(spec.items[0].flowChildren[0].label).toBe('Target A')
  })

  it('flow children (→) are also visible as regular children', () => {
    const src = '- Source\n  → Target A\n  → Target B'
    const spec = parseMdArt(src)
    // soft exchangeability: flow children appear in children[] too
    expect(spec.items[0].children).toHaveLength(2)
    expect(spec.items[0].children[0].label).toBe('Target A')
  })

  it('regular children (-) are also visible as flow children', () => {
    const src = '- Source\n  - Target A\n  - Target B'
    const spec = parseMdArt(src)
    // soft exchangeability: regular children appear in flowChildren[] too
    expect(spec.items[0].flowChildren).toHaveLength(2)
    expect(spec.items[0].flowChildren[0].label).toBe('Target A')
  })

  it('+ prefix items are visible to non-SWOT renderers via label', () => {
    const spec = parseMdArt('type: process\n\n+ Step one\n+ Step two')
    expect(spec.items).toHaveLength(2)
    expect(spec.items[0].label).toBe('Step one')
    expect(spec.items[1].label).toBe('Step two')
  })

  // ── Milestone ──────────────────────────────────────────────────────────────

  it('parses * milestone items', () => {
    const src = '- Regular\n* Milestone item'
    const spec = parseMdArt(src)
    const milestone = spec.items.find(i => i.isMilestone)
    expect(milestone).toBeDefined()
    expect(milestone?.label).toBe('Milestone item')
  })

  // ── Nodes/edges sections ──────────────────────────────────────────────────

  it('parses nodes: and edges: sections', () => {
    const src = 'type: network\n\nnodes:\n  - A\n  - B\nedges:\n  - A → B'
    const spec = parseMdArt(src)
    expect(spec.nodes).toEqual(['A', 'B'])
    expect(spec.edges).toEqual([{ from: 'A', to: 'B' }])
  })

  // ── Robustness ────────────────────────────────────────────────────────────

  it('does not throw on empty input', () => {
    expect(() => parseMdArt('')).not.toThrow()
    const spec = parseMdArt('')
    expect(spec.items).toEqual([])
  })

  it('does not throw on malformed input with no colon in front-matter', () => {
    expect(() => parseMdArt('this is not yaml\n\n- item')).not.toThrow()
  })

  it('does not throw on deeply nested items beyond expected depth', () => {
    const src = '- A\n  - B\n    - C\n      - D\n        - E'
    expect(() => parseMdArt(src)).not.toThrow()
  })

  it('does not throw on unicode-heavy input', () => {
    const src = '- 日本語テスト ∩ 中文 → العربية'
    expect(() => parseMdArt(src)).not.toThrow()
  })

  it('returns fallback spec on completely invalid input that throws', () => {
    // Even with weird input, should return a valid MdArtSpec
    const spec = parseMdArt(null as unknown as string, 'process')
    expect(spec).toHaveProperty('items')
    expect(spec.type).toBe('process')
  })

  // ── Key: value parsing ────────────────────────────────────────────────────

  it('splits label: value correctly', () => {
    const spec = parseMdArt('- Storage: 100 GB')
    expect(spec.items[0].label).toBe('Storage')
    expect(spec.items[0].value).toBe('100 GB')
  })

  it('does not split URLs on colon', () => {
    const spec = parseMdArt('- Link: https://example.com')
    expect(spec.items[0].label).toBe('Link')
    // value should be the URL
    expect(spec.items[0].value).toBe('https://example.com')
  })

  it('handles plain items without colon', () => {
    const spec = parseMdArt('- Simple Label')
    expect(spec.items[0].label).toBe('Simple Label')
    expect(spec.items[0].value).toBeUndefined()
  })

  // ── Indent unit auto-detection ────────────────────────────────────────────

  it('parses 2-space indent (classic)', () => {
    const src = '- A\n  - B\n    - C'
    const spec = parseMdArt(src)
    expect(spec.items[0].label).toBe('A')
    expect(spec.items[0].children[0].label).toBe('B')
    expect(spec.items[0].children[0].children[0].label).toBe('C')
  })

  it('parses 4-space indent consistently', () => {
    const src = '- A\n    - B\n        - C'
    const spec = parseMdArt(src)
    expect(spec.items).toHaveLength(1)
    expect(spec.items[0].label).toBe('A')
    expect(spec.items[0].children).toHaveLength(1)
    expect(spec.items[0].children[0].label).toBe('B')
    expect(spec.items[0].children[0].children[0].label).toBe('C')
  })

  it('parses tab indent consistently', () => {
    const src = '- A\n\t- B\n\t\t- C'
    const spec = parseMdArt(src)
    expect(spec.items).toHaveLength(1)
    expect(spec.items[0].children).toHaveLength(1)
    expect(spec.items[0].children[0].label).toBe('B')
    expect(spec.items[0].children[0].children[0].label).toBe('C')
  })

  it('4-space indent: multiple top-level items with children', () => {
    const src = '- Group 1\n    - Item A\n- Group 2\n    - Item B'
    const spec = parseMdArt(src)
    expect(spec.items).toHaveLength(2)
    expect(spec.items[0].children).toHaveLength(1)
    expect(spec.items[0].children[0].label).toBe('Item A')
    expect(spec.items[1].children).toHaveLength(1)
    expect(spec.items[1].children[0].label).toBe('Item B')
  })

  it('4-space indent: → flow children attach to nearest shallower parent', () => {
    const src = '- Source\n    → Target A\n    → Target B'
    const spec = parseMdArt(src)
    expect(spec.items[0].flowChildren).toHaveLength(2)
    expect(spec.items[0].flowChildren[0].label).toBe('Target A')
  })
})
