// Feature:     MdArt metamorphic properties — relationships between inputs/outputs
// Arch/Design: A metamorphic relation (MR) is a property that holds between two or
//              more inputs and their respective outputs, even when we can't know the
//              *exact* correct output. For example, adding a `title:` line should not
//              change the number of rendered items; swapping themes should not change
//              the viewBox geometry; the animate:false flag should eliminate @keyframes
//              without affecting layout coordinates.
//              These relations catch bugs that single-input oracle-free tests miss.
// Spec:
//   MR-1 (Title transparent):
//     ∀ (type, items): parseMdArt(src).items.length === parseMdArt('title: T\n\n' + src).items.length
//   MR-2 (hintType ≡ front-matter type):
//     ∀ (type, src): parseMdArt(src, type).items.length === parseMdArt('type: ' + type + '\n\n' + src).items.length
//     AND both parseMdArt calls yield the same spec.type
//   MR-3 (Item count additive):
//     ∀ (type, labels, newLabel): spec(labels + newLabel).items.length === spec(labels).items.length + 1
//   MR-4 (Permutation invariant count):
//     ∀ (type, [a,b,c]): spec([a,b,c]).items.length === spec([b,c,a]).items.length
//   MR-5 (Animate-off eliminates keyframes, preserves viewBox):
//     ∀ (type, src): viewBox(animate:true) === viewBox(animate:false)
//                   AND animated SVG has @keyframes, static SVG does not
//   MR-6 (Theme switch preserves geometry):
//     ∀ (type, src): viewBox(light) === viewBox(dark)
//                   AND itemGroupCount(light) === itemGroupCount(dark)
//                   AND bgRects differ between themes
//   MR-7 (Config-reset idempotency):
//     ∀ (cfg, type, src): render(src) === [configure(cfg); reset(); render(src)]
// @quality:    correctness
// @type:       property
// @mode:       verification

import { describe, it, afterEach } from 'vitest'
import { forAll, Gen } from 'jsproptest'
import { parseMdArt } from '../parser'
import { renderMdArt } from '../renderer'
import { configureMdArt, resetMdArtConfig } from '../config'
import { buildFlatSource, genLabelPlain } from './domains'

afterEach(() => resetMdArtConfig())

// Types useful for metamorphic testing — process family parses flat items
// predictably, and list family does too. We avoid types with complex syntax
// (gantt, comparison) where a plain flat source renders empty by design.
const FLAT_TYPES = [
  'process', 'chevron-process', 'arrow-process', 'waterfall',
  'bullet-list', 'numbered-list', 'checklist', 'card-list',
  'cycle', 'block-cycle',
  'pyramid', 'inverted-pyramid', 'pyramid-list',
  'org-chart', 'tree',
] as const

// ── MR-1: Title transparency ──────────────────────────────────────────────────
//
// `title:` is front-matter — it names the diagram but does not add a rendered
// item. Adding it to any source must leave spec.items.length unchanged.

describe('MR-1 (title transparent): adding title: line does not change item count', () => {

  it('∀ (type, 1–5 items): parseMdArt(src).items.length === parseMdArt(title+src).items.length', { timeout: 20000 }, () => {
    forAll(
      (typeIdx: number, labels: string[]) => {
        const type = FLAT_TYPES[typeIdx % FLAT_TYPES.length]
        const safLabels = labels.map(l => l.replace(/\n/g, ' ').replace(/^\s*$/, 'x'))
        const itemsBody = buildFlatSource(safLabels)
        const srcBase    = `type: ${type}\n${itemsBody}`
        const srcTitled  = `type: ${type}\ntitle: My Diagram\n\n${itemsBody}`

        const specBase   = parseMdArt(srcBase)
        const specTitled = parseMdArt(srcTitled)

        return specBase.items.length === specTitled.items.length
      },
      Gen.inRange(0, FLAT_TYPES.length - 1),
      Gen.array(genLabelPlain, 1, 5),
    )
  })

  it('∀ (type, title with spaces/unicode): item count still unchanged', { timeout: 20000 }, () => {
    forAll(
      (typeIdx: number, titleLabel: string, n: number) => {
        const type = FLAT_TYPES[typeIdx % FLAT_TYPES.length]
        const safeTitle = titleLabel.replace(/\n/g, ' ').replace(/^\s*$/, 'x')
        const items = Array.from({ length: n }, (_, i) => `- Step ${i}`).join('\n')
        const srcBase   = `type: ${type}\n${items}`
        const srcTitled = `type: ${type}\ntitle: ${safeTitle}\n\n${items}`

        return parseMdArt(srcBase).items.length === parseMdArt(srcTitled).items.length
      },
      Gen.inRange(0, FLAT_TYPES.length - 1),
      Gen.printableAsciiString(1, 30),
      Gen.inRange(1, 5),
    )
  })

})

// ── MR-2: hintType ≡ front-matter type ───────────────────────────────────────
//
// Passing `type` as the second argument to parseMdArt (hintType) must produce
// the same parsed result as embedding `type: X` in the source front-matter.
// The two code paths must be symmetric.

describe('MR-2 (hintType ≡ front-matter): both paths give same type and item count', () => {

  it('∀ (type, 1–6 flat items): hintType and front-matter type yield same spec', { timeout: 20000 }, () => {
    forAll(
      (typeIdx: number, labels: string[]) => {
        const type = FLAT_TYPES[typeIdx % FLAT_TYPES.length]
        const safLabels = labels.map(l => l.replace(/\n/g, ' ').replace(/^\s*$/, 'x'))
        const itemsOnly  = buildFlatSource(safLabels)   // no `type:` line
        const withFront  = `type: ${type}\n${itemsOnly}` // type in front-matter

        const specHint  = parseMdArt(itemsOnly, type)    // type as hintType
        const specFront = parseMdArt(withFront)           // type in source

        return specHint.type === specFront.type
          && specHint.items.length === specFront.items.length
      },
      Gen.inRange(0, FLAT_TYPES.length - 1),
      Gen.array(genLabelPlain, 1, 6),
    )
  })

})

// ── MR-3: Item count additive ─────────────────────────────────────────────────
//
// For a flat list source (no hierarchy), appending one label must increase the
// parsed item count by exactly 1. The parser must not drop, merge, or
// re-interpret the extra item.

describe('MR-3 (count additive): appending one item increases spec.items.length by 1', () => {

  it('∀ (type, labels, extra label): count(labels + extra) === count(labels) + 1', { timeout: 20000 }, () => {
    forAll(
      (typeIdx: number, labels: string[], extra: string) => {
        const type = FLAT_TYPES[typeIdx % FLAT_TYPES.length]
        const clean = (s: string) => s.replace(/\n/g, ' ').replace(/^\s*$/, 'x')
        const safLabels = labels.map(clean)
        const safExtra  = `Extra ${clean(extra)}`   // unique prefix to avoid dedup

        const srcN  = `type: ${type}\n${buildFlatSource(safLabels)}`
        const srcN1 = `type: ${type}\n${buildFlatSource([...safLabels, safExtra])}`

        const n  = parseMdArt(srcN).items.length
        const n1 = parseMdArt(srcN1).items.length

        return n1 === n + 1
      },
      Gen.inRange(0, FLAT_TYPES.length - 1),
      Gen.array(genLabelPlain, 0, 5),
      genLabelPlain,
    )
  })

})

// ── MR-4: Permutation invariant count ────────────────────────────────────────
//
// Reordering the items in a flat source must not change how many items the
// parser produces. The count is a structural property, not order-dependent.
// We test two specific permutations (original and reversed).

describe('MR-4 (permutation invariant): shuffling items does not change item count', () => {

  it('∀ (type, labels): count(labels) === count(reversed labels)', { timeout: 20000 }, () => {
    forAll(
      (typeIdx: number, labels: string[]) => {
        const type = FLAT_TYPES[typeIdx % FLAT_TYPES.length]
        const clean = (s: string) => s.replace(/\n/g, ' ').replace(/^\s*$/, 'x')
        const safLabels = labels.map(clean)
        const reversed  = [...safLabels].reverse()

        const srcFwd = `type: ${type}\n${buildFlatSource(safLabels)}`
        const srcRev = `type: ${type}\n${buildFlatSource(reversed)}`

        return parseMdArt(srcFwd).items.length === parseMdArt(srcRev).items.length
      },
      Gen.inRange(0, FLAT_TYPES.length - 1),
      Gen.array(genLabelPlain, 1, 6),
    )
  })

})

// ── MR-5: Animate-off eliminates keyframes, preserves viewBox ─────────────────
//
// The `animate: false` config flag must:
//   (a) Remove all @keyframes rules from the SVG output (no CSS animation overhead)
//   (b) Leave the SVG geometry (viewBox) identical to the animated version
//
// This proves that animation is purely additive CSS and does not affect layout.

describe('MR-5 (animate toggle): animate:false removes keyframes but preserves viewBox', () => {

  const ANIM_TYPES = ['process', 'cycle', 'bullet-list', 'org-chart', 'pyramid', 'radar']

  it('∀ (type, 2–4 items): viewBox unchanged; animated has @keyframes, static does not', { timeout: 20000 }, () => {
    forAll(
      (typeIdx: number, n: number) => {
        const type = ANIM_TYPES[typeIdx % ANIM_TYPES.length]
        const src  = Array.from({ length: n }, (_, i) => `- Item ${i}`).join('\n')
        const full = `type: ${type}\n${src}`

        configureMdArt({ animate: true })
        const svgAnim = renderMdArt(full)
        resetMdArtConfig()

        configureMdArt({ animate: false })
        const svgStatic = renderMdArt(full)
        resetMdArtConfig()

        const vbAnim   = svgAnim.match(/viewBox="([^"]+)"/)?.[1]
        const vbStatic = svgStatic.match(/viewBox="([^"]+)"/)?.[1]

        return vbAnim === vbStatic          // geometry preserved
          && svgAnim.includes('@keyframes') // animated version has CSS
          && !svgStatic.includes('@keyframes') // static version does NOT
      },
      Gen.inRange(0, ANIM_TYPES.length - 1),
      Gen.inRange(2, 4),
    )
  })

  it('∀ type: animate:false SVG has neither @keyframes nor data-mdart-scope', { timeout: 15000 }, () => {
    // When animation is disabled, the renderer skips all CSS — both the @keyframes
    // rules AND the data-mdart-scope attribute (which only exists to namespace those
    // rules). Neither should appear in a fully static render.
    forAll(
      (typeIdx: number) => {
        const type = ANIM_TYPES[typeIdx % ANIM_TYPES.length]
        const full = `type: ${type}\n- A\n- B\n- C`

        configureMdArt({ animate: false })
        const svgStatic = renderMdArt(full)
        resetMdArtConfig()

        return !svgStatic.includes('@keyframes')
          && !svgStatic.includes('data-mdart-scope=')
      },
      Gen.inRange(0, ANIM_TYPES.length - 1),
    )
  })

  it('∀ type: scope presence and @keyframes presence are coupled (both or neither)', { timeout: 15000 }, () => {
    // data-mdart-scope and @keyframes are always emitted together. The scope token
    // namespaces the CSS rules; if there are no CSS rules, there is no scope.
    // We verify this coupling in both the animated (have both) and static (have neither) cases.
    forAll(
      (typeIdx: number, n: number) => {
        const type = ANIM_TYPES[typeIdx % ANIM_TYPES.length]
        const src  = `type: ${type}\n${Array.from({ length: n }, (_, i) => `- Item ${i}`).join('\n')}`

        configureMdArt({ animate: true })
        const svgAnim = renderMdArt(src)
        resetMdArtConfig()

        configureMdArt({ animate: false })
        const svgStatic = renderMdArt(src)
        resetMdArtConfig()

        const animHasScope = svgAnim.includes('data-mdart-scope=')
        const animHasKf    = svgAnim.includes('@keyframes')
        const statHasScope = svgStatic.includes('data-mdart-scope=')
        const statHasKf    = svgStatic.includes('@keyframes')

        // animated: both present; static: neither present
        return animHasScope === animHasKf  // coupled in animated render
          && statHasScope === statHasKf    // coupled in static render
          && animHasKf && !statHasKf       // animated has them; static doesn't
      },
      Gen.inRange(0, ANIM_TYPES.length - 1),
      Gen.inRange(2, 5),
    )
  })

})

// ── MR-6: Theme switch preserves geometry ─────────────────────────────────────
//
// Switching between 'mono-light' and 'mono-dark' themes must:
//   (a) Preserve the viewBox (layout is theme-independent)
//   (b) Preserve the number of animated item groups (same structural item count)
//   (c) Produce different background-rect fill colors (the theme is actually applied)

describe('MR-6 (theme switch): same geometry, different colors', () => {

  const THEME_TEST_TYPES = ['process', 'bullet-list', 'cycle', 'org-chart']

  it('∀ (type, 2–4 items): viewBox and mdart-n group count identical across themes', { timeout: 20000 }, () => {
    forAll(
      (typeIdx: number, n: number) => {
        const type = THEME_TEST_TYPES[typeIdx % THEME_TEST_TYPES.length]
        const src  = `type: ${type}\n${Array.from({ length: n }, (_, i) => `- Item ${i}`).join('\n')}`

        const svgLight = renderMdArt(src, undefined, { theme: 'mono-light' })
        const svgDark  = renderMdArt(src, undefined, { theme: 'mono-dark'  })

        const vbLight = svgLight.match(/viewBox="([^"]+)"/)?.[1]
        const vbDark  = svgDark.match( /viewBox="([^"]+)"/)?.[1]

        // Count <g class="mdart-n{i}"> groups (animated item groups)
        const countGroups = (svg: string) =>
          (svg.match(/<g class="mdart-n\d+"/g) ?? []).length

        return vbLight === vbDark
          && countGroups(svgLight) === countGroups(svgDark)
      },
      Gen.inRange(0, THEME_TEST_TYPES.length - 1),
      Gen.inRange(2, 4),
    )
  })

  it('∀ (type, items): light and dark background rect fills are distinct', { timeout: 15000 }, () => {
    // The background rect (rx="8") carries theme.bg. Light bg is #ffffff, dark is
    // #111827. If they were ever the same, the theme would not be applied.
    forAll(
      (typeIdx: number) => {
        const type = THEME_TEST_TYPES[typeIdx % THEME_TEST_TYPES.length]
        const src  = `type: ${type}\n- Alpha\n- Beta\n- Gamma`

        const svgLight = renderMdArt(src, undefined, { theme: 'mono-light' })
        const svgDark  = renderMdArt(src, undefined, { theme: 'mono-dark'  })

        const lightBg = svgLight.match(/fill="(#[0-9a-fA-F]{6})" rx="8"/)?.[1]
        const darkBg  = svgDark.match( /fill="(#[0-9a-fA-F]{6})" rx="8"/)?.[1]

        return !!lightBg && !!darkBg && lightBg !== darkBg
      },
      Gen.inRange(0, THEME_TEST_TYPES.length - 1),
    )
  })

})

// ── MR-7: Config-reset idempotency ───────────────────────────────────────────
//
// After calling configureMdArt(cfg) followed by resetMdArtConfig(), the next
// render must produce the exact same SVG as a fresh render with no config set.
// This proves that reset fully purges the previous configuration.

describe('MR-7 (config-reset idempotency): render after reset === fresh render', () => {

  it('∀ (theme, type, src): configure+reset+render === fresh render', { timeout: 20000 }, () => {
    const RESET_TYPES = ['process', 'bullet-list', 'cycle', 'pyramid']
    forAll(
      (typeIdx: number, themeIdx: number, n: number) => {
        const type  = RESET_TYPES[typeIdx % RESET_TYPES.length]
        const theme = (['mono-light', 'mono-dark'] as const)[themeIdx % 2]
        const src   = `type: ${type}\n${Array.from({ length: n }, (_, i) => `- Item ${i}`).join('\n')}`

        // Fresh render (no config)
        const svgFresh = renderMdArt(src)

        // Configure with a specific theme, then reset
        configureMdArt({ theme })
        resetMdArtConfig()

        // Render after reset — must match fresh render
        const svgAfterReset = renderMdArt(src)

        return svgFresh === svgAfterReset
      },
      Gen.inRange(0, RESET_TYPES.length - 1),
      Gen.inRange(0, 1),
      Gen.inRange(2, 4),
    )
  })

  it('∀ (animate:false then reset): post-reset render has @keyframes (default on)', { timeout: 15000 }, () => {
    // The default is animate:true. After setting animate:false and resetting, the
    // next render must go back to the default (animated with @keyframes).
    forAll(
      (typeIdx: number) => {
        const TYPES = ['process', 'cycle', 'bullet-list']
        const type = TYPES[typeIdx % TYPES.length]
        const src  = `type: ${type}\n- A\n- B\n- C`

        const svgFreshBefore = renderMdArt(src)
        configureMdArt({ animate: false })
        const svgStatic = renderMdArt(src)
        resetMdArtConfig()
        const svgFreshAfter = renderMdArt(src)

        return svgFreshBefore === svgFreshAfter         // same as before configure
          && !svgStatic.includes('@keyframes')          // static had no keyframes
          && svgFreshAfter.includes('@keyframes')       // restored to animated
      },
      Gen.inRange(0, 2),
    )
  })

})
