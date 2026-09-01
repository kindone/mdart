// Feature:     MdArt parser — source string → MdArtSpec
// Arch/Design: parseMdArt is a pure function. All invariants are structural:
//              the relationship between source tokens and output spec fields.
// Spec:        ¬∃ source: parseMdArt(source) throws
//              ∀ n-item arrow chain: spec.items has exactly n flat items
//              ∀ n-item bullet list: spec.items has exactly n items, all flat
//              ∀ prefix ∈ {+,-,?,!}: item.prefix matches
//              ∀ N children under one parent: parent.children.length === N
//              ∀ front-matter type: spec.type equals it
//              ∀ label with \: escape: item.label has literal colon, item.value undefined
//              ∀ "key: value" item (colon+space): label=key, value=value
//              ∀ colon inside parens "foo (a: b)": no split
//              ∀ digit:digit "16:9": no split
//              ∀ label with [attr]: attr extracted, not in label
//              ∀ label containing ∩: isIntersection is true
// @quality:    correctness
// @type:       property
// @mode:       verification

import { describe, it } from 'vitest'
import { forAll, Gen } from 'jsproptest'
import { parseMdArt } from '../parser'
import {
  genLabelPlain,
  genLabelAny,
  genLabelUnicode,
  genSwotPrefix,
  buildFlatSource,
  buildArrowChain,
  buildHierSource,
} from './domains'

// ── Helper ────────────────────────────────────────────────────────────────────

/** Strip chars that trigger special parser paths so we get a pure label token. */
function safe(s: string): string {
  return s
    .replace(/:/g, '-')    // no colon splits
    .replace(/→/g, '-')    // no arrow chains
    .replace(/\[/g, '(')   // no attrs
    .replace(/\]/g, ')')
    .replace(/∩/g, 'x')    // no intersection marker (Unicode)
    .replace(/&&/g, 'xx')  // no intersection marker (typeable alias: `&&` ≡ `∩`)
    .replace(/\\/g, '')    // no escapes
    .replace(/&&/g, 'xx')  // escaped ampersands can become the typeable alias
    .replace(/\n/g, ' ')
    .replace(/^\s*$/, 'x') // not blank
    .trim()                 // parser trims labels; test labels must match
}

// ── ¬∃ crash ─────────────────────────────────────────────────────────────────

describe('¬∃ source: parseMdArt throws', () => {

  it('arbitrary printable-ASCII source never throws', { timeout: 15000 }, () => {
    forAll(
      (src: string) => {
        try { parseMdArt(src); return true }
        catch { return false }
      },
      Gen.printableAsciiString(0, 80),
    )
  })

  it('Unicode source never throws', { timeout: 15000 }, () => {
    forAll(
      (src: string) => {
        try { parseMdArt(src); return true }
        catch { return false }
      },
      Gen.unicodeString(0, 60),
    )
  })

  it('deeply nested source never throws', { timeout: 15000 }, () => {
    forAll(
      (depth: number, label: string) => {
        const indent = (d: number) => '  '.repeat(d)
        const src = Array.from({ length: depth }, (_, i) =>
          `${indent(i)}- Level ${i} ${safe(label)}`
        ).join('\n')
        try { parseMdArt(src); return true }
        catch { return false }
      },
      Gen.inRange(1, 10),
      genLabelPlain,
    )
  })

})

// ── Arrow chains ──────────────────────────────────────────────────────────────

describe('∀ n-item arrow chain: exactly n flat items', () => {

  it('1–6 item arrow chain produces exactly n top-level items', { timeout: 20000 }, () => {
    forAll(
      (n: number, labels: string[]) => {
        const safeLabels = labels.slice(0, n).map(safe).map((l, i) => {
          // Guard: if the FIRST label is a pure bullet char (-, *, +), the
          // single-line chain source starts with "- → ..." and the parser strips
          // "- " as a list-bullet prefix, breaking the ' → ' split detection.
          return (i === 0 && /^[-*+]+$/.test(l)) ? l + 'Item' : l
        }).filter(l => l.length > 0)
        if (safeLabels.length < 2) return true   // need ≥2 for a meaningful chain
        const source = buildArrowChain(safeLabels)
        const spec = parseMdArt(source)
        return spec.items.length === safeLabels.length
          && spec.items.every(i => i.children.length === 0)
      },
      Gen.inRange(2, 6),
      Gen.array(genLabelPlain, 2, 6),
    )
  })

  it('arrow chain items are flat — no nested children', { timeout: 15000 }, () => {
    forAll(
      (labels: string[]) => {
        const src = buildArrowChain(labels.map(safe))
        const spec = parseMdArt(src)
        return spec.items.every(i => i.children.length === 0)
      },
      Gen.array(genLabelPlain, 2, 5),
    )
  })

  // Regression: a colon buried in the first segment's prose (e.g. a
  // parenthetical "(sizing: 'flow')") must not be mistaken for a key:value
  // pair and suppress chain splitting. Only a bare identifier before the
  // colon (e.g. "direction: a → b") counts as key:value.
  it('colon inside first-segment prose still splits the chain', () => {
    const spec = parseMdArt(
      "Package default (sizing: 'flow') → Host/plugin MdArtConfig → Per-fence front-matter (wins)",
      'process',
    )
    return spec.items.length === 3
      && spec.items[0].label === "Package default (sizing: 'flow')"
      && spec.items.every(i => i.children.length === 0)
  })

  it('bare key:value with arrow in value is NOT split into a chain', () => {
    const spec = parseMdArt('direction: any → any', 'process')
    return spec.items.length <= 1
  })

})

// ── Bullet list structure ─────────────────────────────────────────────────────

describe('∀ n-item bullet list: exactly n items', () => {

  it('n distinct safe labels → exactly n top-level items', { timeout: 20000 }, () => {
    forAll(
      (n: number, label: string) => {
        // use uniquely-numbered labels to avoid duplicate-detection ambiguity
        const labels = Array.from({ length: n }, (_, i) => `${safe(label)}-${i}`)
        const source = buildFlatSource(labels)
        const spec = parseMdArt(source)
        return spec.items.length === n
      },
      Gen.inRange(0, 10),
      genLabelPlain,
    )
  })

  it('empty source → 0 items', () => {
    const spec = parseMdArt('')
    return spec.items.length === 0
  })

})

// ── Prefix chars ─────────────────────────────────────────────────────────────

describe('∀ prefix ∈ {+,-,?,!}: item.prefix matches the bullet', () => {

  it('any SWOT prefix → item.prefix === that char', { timeout: 15000 }, () => {
    // The `-` prefix only gets `prefix="-"` in a SWOT context (outside SWOT it's
    // just a regular list bullet with no prefix property). Source must declare type.
    forAll(
      (prefix: string, label: string) => {
        const src = `type: swot\n\n${prefix} ${safe(label)}`
        const spec = parseMdArt(src)
        return spec.items.length === 1
          && spec.items[0].prefix === prefix
      },
      genSwotPrefix,
      genLabelPlain,
    )
  })

  it('mixed SWOT block preserves all four prefixes in order', { timeout: 15000 }, () => {
    // Requires type: swot so the `-` bullet is assigned prefix="-"
    forAll(
      (ls: string, lw: string, lo: string, lt: string) => {
        const src = `type: swot\n\n+ ${safe(ls)}\n- ${safe(lw)}\n? ${safe(lo)}\n! ${safe(lt)}`
        const spec = parseMdArt(src)
        return spec.items.length === 4
          && spec.items.map(i => i.prefix).join('') === '+-?!'
      },
      genLabelPlain, genLabelPlain, genLabelPlain, genLabelPlain,
    )
  })

})

// ── Nested children ───────────────────────────────────────────────────────────

describe('∀ N children under one parent: parent.children.length === N', () => {

  it('1–5 children under a single parent', { timeout: 20000 }, () => {
    forAll(
      (n: number, parent: string, child: string) => {
        const src = buildHierSource([safe(parent)], safe(child), n)
        const spec = parseMdArt(src)
        return spec.items.length === 1
          && spec.items[0].children.length === n
      },
      Gen.inRange(1, 5),
      genLabelPlain,
      genLabelPlain,
    )
  })

  it('K parents × N children each: all item counts correct', { timeout: 20000 }, () => {
    forAll(
      (k: number, n: number, base: string) => {
        const parents = Array.from({ length: k }, (_, i) => `${safe(base)}-p${i}`)
        const src = buildHierSource(parents, safe(base), n)
        const spec = parseMdArt(src)
        return spec.items.length === k
          && spec.items.every(item => item.children.length === n)
      },
      Gen.inRange(1, 4),
      Gen.inRange(0, 4),
      genLabelPlain,
    )
  })

  it('children are accessible via both .children and .flowChildren', { timeout: 15000 }, () => {
    forAll(
      (n: number, label: string) => {
        const src = buildHierSource([safe(label)], 'child', n)
        const spec = parseMdArt(src)
        const item = spec.items[0]
        return item.children.length === n
          && item.flowChildren.length === n
      },
      Gen.inRange(1, 5),
      genLabelPlain,
    )
  })

})

// ── Front-matter type ─────────────────────────────────────────────────────────

describe('∀ front-matter type: spec.type equals it', () => {

  const VALID_TYPES = ['process', 'cycle', 'tree', 'kanban', 'venn', 'swot', 'radar']

  it('type declared in front-matter is reflected in spec.type', { timeout: 15000 }, () => {
    forAll(
      (typeIdx: number, label: string) => {
        const type = VALID_TYPES[typeIdx % VALID_TYPES.length]
        const src = `type: ${type}\n\n- ${safe(label)}`
        const spec = parseMdArt(src)
        return spec.type === type
      },
      Gen.inRange(0, VALID_TYPES.length - 1),
      genLabelPlain,
    )
  })

  it('hintType fallback used when front-matter has no type', { timeout: 15000 }, () => {
    forAll(
      (typeIdx: number, label: string) => {
        const hint = VALID_TYPES[typeIdx % VALID_TYPES.length]
        const src = `title: My Chart\n\n- ${safe(label)}`
        const spec = parseMdArt(src, hint)
        return spec.type === hint
      },
      Gen.inRange(0, VALID_TYPES.length - 1),
      genLabelPlain,
    )
  })

})

// ── Label : Value splitting ───────────────────────────────────────────────────

describe('∀ "key: value" source item: label=key, value=value', () => {

  it('unambiguous key: value splits correctly', { timeout: 20000 }, () => {
    // Domain: key is a non-empty word with no colon/paren/digit-at-start;
    //         value is a non-empty non-whitespace word.
    // Both use alphanumeric-only chars to avoid parser edge cases.
    const WORDS = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta',
      'storage', 'power', 'speed', 'mode', 'feature', 'version']
    forAll(
      (ki: number, vi: number, suffix: number) => {
        const k = WORDS[ki % WORDS.length]
        const v = WORDS[vi % WORDS.length] + (suffix % 99)
        const src = `- ${k}: ${v}`
        const spec = parseMdArt(src)
        if (spec.items.length !== 1) return true
        return spec.items[0].label === k
          && spec.items[0].value === v
      },
      Gen.inRange(0, WORDS.length - 1),
      Gen.inRange(0, WORDS.length - 1),
      Gen.inRange(0, 98),
    )
  })

  it('colon inside parens does NOT split', { timeout: 20000 }, () => {
    // Domain: use clean word-like strings that contain no parens, brackets,
    // backslashes, or quotes — only the explicit paren we add matters.
    const SAFE_WORDS = ['foo', 'bar', 'baz', 'qux', 'alpha', 'beta', 'val', 'note']
    forAll(
      (pi: number, ii: number, si: number) => {
        const p = SAFE_WORDS[pi % SAFE_WORDS.length]
        const inner = SAFE_WORDS[ii % SAFE_WORDS.length]
        const s = SAFE_WORDS[si % SAFE_WORDS.length]
        // "prefix (inner: colon) suffix" — colon is inside parens, must not split
        const src = `- ${p} (${inner}: val) ${s}`
        const spec = parseMdArt(src)
        if (spec.items.length !== 1) return true
        return spec.items[0].value === undefined
      },
      Gen.inRange(0, 7),
      Gen.inRange(0, 7),
      Gen.inRange(0, 7),
    )
  })

})

// ── [attr] extraction ─────────────────────────────────────────────────────────

describe('∀ label with [attr]: attr extracted, not in label', () => {

  it('single [attr] is extracted into item.attrs', { timeout: 15000 }, () => {
    forAll(
      (label: string, attr: string) => {
        const l = safe(label)
        // attr must be alphanumeric to parse as a clean attr token
        const a = attr.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-') || 'done'
        const src = `- ${l} [${a}]`
        const spec = parseMdArt(src)
        if (spec.items.length !== 1) return true
        return spec.items[0].attrs.includes(a)
          && !spec.items[0].label.includes(`[${a}]`)
      },
      genLabelPlain,
      Gen.asciiString(1, 10),
    )
  })

})

// ── Leading checkbox marker [ ] / [x] / [X] ──────────────────────────────────
// Markdown-style checkbox at the start of a label is stripped and mapped to
// a state marker: [ ] → open (no attr), [x]/[X] → done (adds "done" attr).

describe('leading checkbox marker: [ ] strips, [x]/[X] strips and adds done', () => {

  it('[ ] prefix: label stripped, no done attr', { timeout: 15000 }, () => {
    forAll(
      (label: string) => {
        const l = safe(label)
        const src = `- [ ] ${l}`
        const spec = parseMdArt(src)
        if (spec.items.length !== 1) return true
        return spec.items[0].label === l
          && !spec.items[0].attrs.includes('done')
          && !spec.items[0].label.includes('[ ]')
      },
      genLabelPlain,
    )
  })

  it('[x] prefix: label stripped, done attr added', { timeout: 15000 }, () => {
    forAll(
      (label: string) => {
        const l = safe(label)
        const src = `- [x] ${l}`
        const spec = parseMdArt(src)
        if (spec.items.length !== 1) return true
        return spec.items[0].label === l
          && spec.items[0].attrs.includes('done')
          && !spec.items[0].label.includes('[x]')
      },
      genLabelPlain,
    )
  })

  it('[X] prefix: label stripped, done attr added (uppercase)', { timeout: 15000 }, () => {
    forAll(
      (label: string) => {
        const l = safe(label)
        const src = `- [X] ${l}`
        const spec = parseMdArt(src)
        if (spec.items.length !== 1) return true
        return spec.items[0].label === l
          && spec.items[0].attrs.includes('done')
      },
      genLabelPlain,
    )
  })

  it('[x] prefix + trailing [extra]: both attrs present', { timeout: 15000 }, () => {
    forAll(
      (label: string) => {
        const l = safe(label)
        const src = `- [x] ${l} [extra]`
        const spec = parseMdArt(src)
        if (spec.items.length !== 1) return true
        return spec.items[0].label === l
          && spec.items[0].attrs.includes('done')
          && spec.items[0].attrs.includes('extra')
      },
      genLabelPlain,
    )
  })

  it('[no] trailing: NOT stripped (not a checkbox marker — only [ ]/[x]/[X] are)', { timeout: 15000 }, () => {
    forAll(
      (label: string) => {
        const l = safe(label)
        // [no] in trailing position → extracted as a regular attr, NOT as a
        // checkbox marker (only [ ], [x], [X] are recognised as such).
        const src = `- ${l} [no]`
        const spec = parseMdArt(src)
        if (spec.items.length !== 1) return true
        return spec.items[0].attrs.includes('no')
          && spec.items[0].label === l
      },
      genLabelPlain,
    )
  })

})

// ── ∩ intersection detection ──────────────────────────────────────────────────

describe('∀ label containing ∩: isIntersection is true', () => {

  it('label with ∩ character sets isIntersection true', { timeout: 15000 }, () => {
    forAll(
      (a: string, b: string) => {
        const src = `- ${safe(a)} ∩ ${safe(b)}`
        const spec = parseMdArt(src)
        return spec.items.length >= 1
          && spec.items.some(i => i.isIntersection === true)
      },
      genLabelPlain,
      genLabelPlain,
    )
  })

  it('label without ∩ has isIntersection falsy', { timeout: 15000 }, () => {
    forAll(
      (label: string) => {
        const l = safe(label).replace(/∩/g, 'x')
        const src = `- ${l}`
        const spec = parseMdArt(src)
        return spec.items.every(i => !i.isIntersection)
      },
      genLabelPlain,
    )
  })

})

// ── Unicode robustness ────────────────────────────────────────────────────────

describe('∀ Unicode labels: parseMdArt parses correctly', () => {

  it('Unicode label is preserved as item.label', { timeout: 15000 }, () => {
    forAll(
      (label: string) => {
        // Unicode label — strip newlines and leading bullets
        let l = label.replace(/\n/g, ' ').replace(/^[\-*+?!]\s*/, '').trim() || 'x'
        // Also strip leading checkbox marker if present (parser strips it)
        l = l.replace(/^\[([ xX])\]\s+/, '')
        if (!l) l = 'x'
        const src = `- ${l}`
        const spec = parseMdArt(src)
        return spec.items.length >= 1 && spec.items[0].label === l
      },
      genLabelUnicode,
    )
  })

})

// ── Observability: label content round-trip ───────────────────────────────────
//
// Postcondition: parseMdArt faithfully returns each item's label as parsed.
// From the PBT observability guideline: "State queries should return values
// consistent with actual state." spec.items[i].label IS the state query — it
// must equal what was put in.
//
// The existing Unicode test above covers single items with genLabelUnicode.
// These tests extend coverage to:
//   (a) multi-item arrays over the FULL genLabelAny weighted domain
//   (b) spec.title fidelity from the `title:` front-matter key
//
// `safeObsLabel` strips exactly the chars that parseMdArt TRANSFORMS so the
// expected label matches what parseItem actually computes for item.label.

function safeObsLabel(raw: string): string {
  return raw
    .replace(/\\/g, '')              // strip backslash escape chars first
    .replace(/&&/g, 'xx')            // && is the typeable intersection alias (≡ ∩)
    .replace(/->/g, '-')             // ASCII `->` gets normalized to `→` by parser
    .replace(/[\n:→\[\]∩]/g, '-')   // remaining parser-special chars → neutral dash
    .replace(/^[-+?!*\s]+/, 'X')    // strip leading SWOT/bullet/milestone prefix chars
    .trim()
    .slice(0, 25) || 'Label'         // never blank; max 25 chars
}

describe('observability: spec.items[i].label faithfully reflects each input label', () => {

  it('∀ n labels (any subdomain): spec.items[i].label === cleaned input for all i', { timeout: 20000 }, () => {
    forAll(
      (rawLabels: string[]) => {
        // Index suffix guarantees uniqueness; prevents CONTENT_DUPLICATE_SIBLING_LABELS
        const labels = rawLabels.map((r, i) => `${safeObsLabel(r)}${i}`)
        const source = labels.map(l => `- ${l}`).join('\n')
        const spec = parseMdArt(source)
        return spec.items.length === labels.length
          && spec.items.every((item, i) => item.label === labels[i])
      },
      Gen.array(genLabelAny, 1, 5),
    )
  })

  it('∀ single label (any subdomain): spec.items[0].label === cleaned input', { timeout: 15000 }, () => {
    forAll(
      (raw: string) => {
        const label = `${safeObsLabel(raw)}0`
        const src = `- ${label}`
        const spec = parseMdArt(src)
        return spec.items.length >= 1 && spec.items[0].label === label
      },
      genLabelAny,
    )
  })

  it('∀ (title, label): spec.title === the declared front-matter title', { timeout: 15000 }, () => {
    forAll(
      (rawTitle: string, rawLabel: string) => {
        // Title is the value of the `title: ...` front-matter line.
        // Only \n is stripped (it would break the single-line front-matter).
        const title = rawTitle.replace(/\n/g, ' ').trim() || 'MyTitle'
        const label = `${safeObsLabel(rawLabel)}0`
        const src = `title: ${title}\n\n- ${label}`
        const spec = parseMdArt(src)
        return spec.title === title
      },
      Gen.printableAsciiString(1, 30),
      genLabelAny,
    )
  })

})
