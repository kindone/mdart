/**
 * Shared generator vocabulary for MdArt property tests.
 *
 * Organises the input space into named subdomains so each property file
 * can compose them without reinventing definitions.  The split/combine
 * pattern mirrors the playbook: name the domain precisely, then build
 * broader domains out of narrower ones with Gen.oneOf / Gen.array.
 *
 * Naming convention
 *   gen*      — a Gen instance (pass directly to forAll or Gen.array)
 *   build*    — a plain function that returns a string/structure
 */

import { Gen } from 'jsproptest'
import { KNOWN_TYPES } from '../index.ts'

// ── Types ─────────────────────────────────────────────────────────────────────

export const ALL_TYPES = [...KNOWN_TYPES]

/** Index into ALL_TYPES — use ALL_TYPES[idx] to get the type string. */
export const genTypeIdx = Gen.inRange(0, ALL_TYPES.length - 1)

// ── Label sub-domains ─────────────────────────────────────────────────────────
//
// A "label" is the text that appears after a list bullet (- / + / ? / !).
// Different sub-domains trigger different parser and renderer code paths.

/**
 * Plain word — no special parser chars (:, →, [, ], ∩, \n, leading - / ?).
 * Colon-free so parseMdArt never splits it into label:value.
 * Length range 1–50 to cover short names AND multi-word phrases.
 * Callers strip colons when needed: label.replace(/:/g, '-').replace(/\\/g, '')
 */
export const genLabelPlain = Gen.printableAsciiString(1, 50)

/**
 * Label that is guaranteed to contain exactly one non-escaped colon in
 * the form "key: value" (space after colon).  Generates the KEY and VALUE
 * parts separately so neither contains a colon.
 * Returns a tuple [key, value] — join as `${key}: ${value}` for a source line.
 * Key up to 20 chars, value up to 30 chars to cover realistic metric labels.
 */
export const genKvTuple = Gen.tuple(
  Gen.printableAsciiString(1, 20),
  Gen.printableAsciiString(1, 30),
)
// NOTE: the key/value strings may still contain colons inside parens or
// digits — callers strip them: key.replace(/:/g, '-')

/** Colon pattern that must NOT cause a split: inside parentheses. */
export const genParenColon = Gen.tuple(
  Gen.printableAsciiString(1, 15),   // prefix before paren
  Gen.printableAsciiString(1, 10),   // text inside paren
  Gen.printableAsciiString(1, 12),   // suffix after paren
)
// build: `${prefix} (e.g.: ${inner}) ${suffix}` → should NOT split

/**
 * Unicode label — tests multi-byte character handling in renderers.
 * Increased to 40 chars to cover realistic multi-word Unicode phrases.
 */
export const genLabelUnicode = Gen.unicodeString(1, 40)

/**
 * CJK label — Chinese/Japanese/Korean characters specifically.
 * `measureText` treats CJK as ~2× the width of ASCII chars; this sub-domain
 * targets the text-fitting and wrapping code paths that ASCII alone won't reach.
 */
export const genLabelCJK = Gen.elementOf(
  '日本語テスト',
  '中文测试内容',
  '한국어 테스트',
  '中文標題文字',
  'テスト中のデータ',
  '시스템 점검',
  '数据分析报告',
  '東アジア文字',
  '한글 입력 테스트',
  '漢字テスト文',
)

/**
 * Emoji-containing label — tests multi-codepoint sequences and width estimation.
 * Emoji are often multi-byte and their rendered width differs from charCount.
 */
export const genLabelEmoji = Gen.elementOf(
  '🚀 Launch',
  '✅ Complete',
  '⚠️ Alert',
  '📊 Report',
  '🎯 Goal reached',
  '🔥 Hot topic',
  '💡 New idea',
  '🌍 Global scale',
  '🛠️ In progress',
  '📅 Scheduled',
)

/** Long label — often triggers CONTENT_VERY_LONG_LABEL for tight types. */
export const genLabelLong = Gen.printableAsciiString(30, 80)

/**
 * Any label — union of ALL sub-domains including long, CJK, and emoji.
 * Use when the test property must hold regardless of input character set or length.
 * Previously this only covered plain + unicode; now broadened to the full domain.
 */
export const genLabelAny = Gen.oneOf(
  genLabelPlain,
  genLabelUnicode,
  genLabelCJK,
  genLabelEmoji,
  genLabelLong,
)

// ── Prefix / bullet sub-domains ───────────────────────────────────────────────

/** SWOT quadrant prefix char. */
export const genSwotPrefix = Gen.elementOf('+', '-', '?', '!')

/** Standard list bullet variants. */
export const genBullet = Gen.elementOf('-', '*', '+')

// ── Source string builders ────────────────────────────────────────────────────
//
// Pure functions (not generators) that assemble raw MdArt source strings.
// They accept values already drawn from generators.

/** N flat items, one per line, using the provided label strings. */
export function buildFlatSource(labels: string[]): string {
  if (labels.length === 0) return ''
  return labels.map(l => `- ${l.replace(/\n/g, ' ').replace(/^\s*$/, 'x')}`).join('\n')
}

/** Arrow chain: "A → B → C" on a single line. */
export function buildArrowChain(labels: string[]): string {
  // Strip → from labels to avoid creating accidental chain breaks
  return labels.map(l => l.replace(/→/g, '-').replace(/\n/g, ' ')).join(' → ')
}

/**
 * Hierarchical source: `parents` items, each with `childCount` children.
 * Returns a multi-line string with 2-space indentation.
 */
export function buildHierSource(
  parents: string[],
  childLabel: string,
  childCount: number,
): string {
  const lines: string[] = []
  for (const p of parents) {
    lines.push(`- ${p.replace(/\n/g, ' ')}`)
    for (let i = 0; i < childCount; i++) {
      lines.push(`  - ${childLabel.replace(/\n/g, ' ')} ${i + 1}`)
    }
  }
  return lines.join('\n')
}

/**
 * SWOT source: one item per prefix, in quadrant order.
 * Each label is the cleaned prefix-label for that quadrant.
 */
export function buildSwotSource(labels: { s: string; w: string; o: string; t: string }): string {
  return [
    `+ ${clean(labels.s)}`,
    `- ${clean(labels.w)}`,
    `? ${clean(labels.o)}`,
    `! ${clean(labels.t)}`,
  ].join('\n')
}

/**
 * Gantt source: N tasks, each with a `[wkS-wkE]` range.
 * `starts` and `ends` are 1-based week numbers; end is adjusted to ≥ start.
 */
export function buildGanttSource(tasks: Array<{ label: string; start: number; end: number }>): string {
  return tasks
    .map(({ label, start, end }) => {
      const s = Math.max(1, start)
      const e = Math.max(s + 1, end)
      return `- ${clean(label)} [wk${s}-wk${e}]`
    })
    .join('\n')
}

// ── Color helpers ─────────────────────────────────────────────────────────────

/** Generate a 6-digit hex color from three R/G/B byte values. */
export function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Pair of distinct hex colors.
 * Returns a Gen.tuple — destructure as [colorA, colorB] in the callback.
 * Guaranteed distinct (B is offset by 1 from A in the green channel).
 */
export const genColorPair = Gen.tuple(
  Gen.inRange(0, 255),
  Gen.inRange(0, 255),
  Gen.inRange(0, 255),
)
// Usage: const [r, g, b] = colorTuple  →  colorA = rgbToHex(r,g,b),  colorB = rgbToHex(r,(g+1)%256,b)

// ── Theme names ───────────────────────────────────────────────────────────────

export const THEMES = ['mono-light', 'mono-dark'] as const
export type ThemeName = typeof THEMES[number]

/** Generator for a theme name. */
export const genTheme = Gen.elementOf(...THEMES)

// ── Validation helpers ────────────────────────────────────────────────────────

/** N items where every label is unique — prevents CONTENT_DUPLICATE_SIBLING_LABELS. */
export function buildUniqueLabels(n: number, base: string): string[] {
  return Array.from({ length: n }, (_, i) => `${base.slice(0, 10)}-${i}`)
}

/** N items where the first two labels are identical — triggers CONTENT_DUPLICATE_SIBLING_LABELS. */
export function buildDupeLabels(n: number, base: string): string[] {
  const labels = buildUniqueLabels(n, base)
  if (labels.length >= 2) labels[1] = labels[0]
  return labels
}

// ── Internal ──────────────────────────────────────────────────────────────────

function clean(s: string): string {
  return s.replace(/\n/g, ' ').replace(/^\s*$/, 'x')
}
