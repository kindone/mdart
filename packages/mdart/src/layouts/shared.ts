import type { MdArtTheme } from '../theme'
import type { MdArtItem, MdArtSpec } from '../parser'
import { getGlobalConfig } from '../config'

// ── XML / text helpers ────────────────────────────────────────────────────────

export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Parse a markdown-style link from a label string.
 * Supports full-label links `[display](url)` and inline links embedded in text.
 * Returns the plain display string and the URL (or null if no link found).
 */
export function parseLink(label: string): { display: string; url: string | null } {
  // Full label is a single link: [display text](url)
  const full = label.match(/^\s*\[([^\]]+)\]\(([^)\s]+)\)\s*$/)
  if (full) return { display: full[1].trim(), url: full[2].trim() }
  // Label contains one or more inline links — strip syntax, keep first URL
  if (/\[[^\]]+\]\([^)]+\)/.test(label)) {
    const first = label.match(/\[([^\]]+)\]\(([^)\s]+)\)/)
    const url   = first?.[2]?.trim() ?? null
    const display = label.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1').trim()
    return { display, url }
  }
  return { display: label, url: null }
}

/**
 * Wrap SVG element(s) in an `<a>` for a clickable link.
 * Returns `content` unchanged when `url` is null.
 * Visual cues applied automatically:
 *   - underline on all <text> elements inside the link
 *   - pointer cursor on the whole anchor
 *   - URL shown as a native tooltip on hover
 */
export function aWrap(content: string, url: string | null): string {
  if (!url) return content
  // Inject underline into every <text> element inside this link.
  // CSS style attribute wins over SVG presentation attributes (fill, font-size …)
  // so the underline appears regardless of which renderer built the text.
  const styled = content.replace(/<text(?=[\s>])/g, '<text style="text-decoration:underline"')
  return `<a href="${escapeXml(url)}" target="_blank" style="cursor:pointer"><title>${escapeXml(url)}</title>${styled}</a>`
}

export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

/**
 * Word-wrap `label` into at most `maxLines` lines of `perLineChars` characters.
 * Automatically strips markdown-link syntax `[text](url)` — `url` is returned
 * separately so callers can wrap the rendered element with `aWrap(el, url)`.
 * Returns raw (unescaped) lines, whether content was dropped, and the URL.
 * When truncated === true, callers should emit a <title> child on the <text>
 * element so the full display string is visible as an SVG tooltip on hover.
 */
export function wrapLabel(
  label: string,
  perLineChars: number,
  maxLines = 2
): { lines: string[]; truncated: boolean; url: string | null } {
  const { display, url } = parseLink(label)
  const trimmed = display.trim()
  if (!trimmed) return { lines: [''], truncated: false, url }

  const words = trimmed.split(/\s+/)
  const lines: string[] = []
  let wordIdx = 0
  // Tracks the single-word-too-long case separately from "leftover words
  // that didn't fit": that branch already advances wordIdx past the word
  // it just character-sliced, so `wordIdx < words.length` alone would
  // wrongly read as "nothing was lost" whenever the truncated word happens
  // to be the last one — silently reporting truncated:false on a line that
  // visibly ends in "…", which both skips the <title> tooltip fallback and
  // (via fitTextToWidthShared's search) tricks the fit search into locking
  // in the largest font size instead of trying a smaller one that might
  // have avoided truncation entirely.
  let hardTruncated = false

  while (wordIdx < words.length && lines.length < maxLines) {
    let line = ''
    while (wordIdx < words.length) {
      const next = line ? `${line} ${words[wordIdx]}` : words[wordIdx]
      if (next.length <= perLineChars) { line = next; wordIdx++ }
      else break
    }
    if (!line) {
      // Single word too long — hard-truncate it
      line = words[wordIdx].slice(0, perLineChars - 1) + '…'
      wordIdx++
      hardTruncated = true
    }
    lines.push(line)
  }

  // Leftover words that never got placed at all (ran out of maxLines) are a
  // separate condition from hardTruncated (a word mid-way through DID get
  // placed, just character-sliced) — only the former means the LAST line
  // itself is incomplete and needs a forced "…" stamped onto it. Using the
  // combined flag here would incorrectly re-truncate a last line that
  // finished cleanly, just because an EARLIER line had to hard-truncate a
  // too-long word (e.g. "Supportability of" → line 1 hard-truncates
  // "Supportability", line 2 "of" fits with room to spare and shouldn't
  // gain an ellipsis it doesn't need).
  const leftoverWords = wordIdx < words.length
  if (leftoverWords && lines.length > 0) {
    const last = lines[lines.length - 1]
    if (!last.endsWith('…'))
      lines[lines.length - 1] = last.length < perLineChars
        ? last + '…'
        : last.slice(0, perLineChars - 1) + '…'
  }

  // The value returned to callers still needs to reflect BOTH ways content
  // was lost — leftover words never placed, or a word hard-truncated along
  // the way — so tooltips/fit-search still trigger for either.
  const truncated = leftoverWords || hardTruncated
  return { lines: lines.length > 0 ? lines : [''], truncated, url }
}

// ── Text-fit helpers (font-size adapts to box, no DOM/canvas needed) ─────────
//
// This library has zero dependencies and no DOM access — it renders
// identically in a browser and in plain Node. Real text measurement
// (canvas measureText) isn't available on that basis, so instead of one
// flat "average px per char" constant (the pattern most renderers use
// today, e.g. `boxW / 6.5`), estimate width per character-width *class*.
// Still an approximation, but a run of 'W'/'M' and a run of 'i'/'l' at the
// same character count no longer get treated as the same width — which is
// what let long, wide-character labels overflow boxes sized for the
// "average" case.

const CHAR_W_NARROW  = 0.30  // i l j . , ' | ! t f
const CHAR_W_WIDE    = 0.82  // M W m w @ % Q
const CHAR_W_UPPER   = 0.64  // other A-Z
const CHAR_W_DIGIT   = 0.56  // 0-9 (usually tabular)
const CHAR_W_SPACE   = 0.28
const CHAR_W_DEFAULT = 0.52  // lowercase / other, average case

const NARROW_CHARS = new Set('iljI.,\'|!tf;:')
const WIDE_CHARS   = new Set('MWmw@%Q')

/** Estimated rendered width of `s` at `fontSize`, in the same units as fontSize. */
export function estimateTextWidth(s: string, fontSize: number): number {
  let units = 0
  for (const ch of s) {
    if (ch === ' ')             units += CHAR_W_SPACE
    else if (NARROW_CHARS.has(ch)) units += CHAR_W_NARROW
    else if (WIDE_CHARS.has(ch))   units += CHAR_W_WIDE
    else if (ch >= 'A' && ch <= 'Z') units += CHAR_W_UPPER
    else if (ch >= '0' && ch <= '9') units += CHAR_W_DIGIT
    else units += CHAR_W_DEFAULT
  }
  return units * fontSize
}

/** Max characters per line at `fontSize` that fit within `boxW`. */
function charsPerLine(boxW: number, fontSize: number): number {
  return Math.max(1, Math.floor(boxW / estimateTextWidth('n', fontSize)))
}

export interface FitTextResult {
  lines: string[]
  truncated: boolean
  url: string | null
}

/**
 * Pick ONE shared font size (within [minSize, maxSize], stepping down by 1)
 * for every label in `labels`, sized to the worst-fitting label at
 * `boxW` — not a font size per label. A box of boxes (chips in a row,
 * nodes in a diagram) should read as one consistent size; picking each
 * label's own best-fit size independently would make short labels balloon
 * next to a shrunk-down long one. Falls back to minSize (accepting
 * truncation on whatever still doesn't fit) if nothing fits within maxLines
 * even at the smallest size.
 *
 * `maxLines` may be a single number applied to every label, or a per-label
 * array (same length as `labels`) for cases where line budget varies per
 * item — e.g. a node whose value is rendered as a second line only gets 1
 * line for its label, while a node with no value gets 2.
 *
 * `maxLines` alone is a hard cap that doesn't move as the font shrinks —
 * but a smaller font's lines are also shorter, so a fixed-height box can
 * often fit MORE of them once the font gives a little. Passing `boxH` (the
 * usable text height) turns `maxLines` into a ceiling rather than a fixed
 * target: at each candidate font size the actual line budget used is
 * `min(maxLines, floor(boxH / lineHeight))`, so trying a smaller font can
 * unlock an extra line instead of just shrinking within the same old cap.
 * `lineHeight` (font size × lineHeightRatio, default 1.3) for whichever
 * size was chosen is returned so callers don't have to re-derive it.
 */
export function fitTextToWidthShared(
  labels: string[],
  boxW: number,
  opts: { maxSize?: number; minSize?: number; maxLines?: number | number[]; boxH?: number; lineHeightRatio?: number } = {},
): { fontSize: number; lineHeight: number; results: FitTextResult[] } {
  const { maxSize = 12, minSize = 8, maxLines = 2, boxH, lineHeightRatio = 1.3 } = opts
  const maxLinesFor = (idx: number) => Array.isArray(maxLines) ? maxLines[idx] : maxLines
  const tryAt = (fontSize: number) => {
    const perLine = charsPerLine(boxW, fontSize)
    const lineHeight = fontSize * lineHeightRatio
    const linesAtSize = boxH !== undefined ? Math.max(1, Math.floor(boxH / lineHeight)) : Infinity
    const results = labels.map((l, idx) => wrapLabel(l, perLine, Math.min(maxLinesFor(idx), linesAtSize)))
    return { fontSize, lineHeight, results }
  }
  // Decrementing maxSize by 1 each step doesn't necessarily land exactly on
  // minSize (e.g. maxSize=10.5, minSize=8 steps 10.5, 9.5, 8.5, then 7.5
  // fails the >= check — minSize itself is never tried). Stop strictly
  // before minSize in the loop, then always evaluate minSize explicitly as
  // the guaranteed-correct last resort, instead of assuming the loop's
  // final iteration happened to be exactly minSize.
  for (let fontSize = maxSize; fontSize > minSize; fontSize--) {
    const attempt = tryAt(fontSize)
    if (attempt.results.every(r => !r.truncated)) return attempt
  }
  return tryAt(minSize)
}

// ── Label + value block: the pattern repeated across ~15 renderers ──────────
//
// A very common node shape across process/cycle/hierarchy diagrams is "one
// primary label, one optional secondary value, sharing one box" — a circle
// in circle-process.ts, a rect in cycle.ts, a wedge in donut-cycle.ts, a
// gear's flat centre disc in gear-cycle.ts, etc. Each of those files used to
// hand-roll the same ~15-20 lines: fit the value first into a minority share
// of boxH, reserve whatever's left for the label, then centre both blocks
// vertically. Consolidated here so that logic (and its floor-guard fix,
// found and re-derived by hand three separate times while migrating
// individual files) lives in exactly one place.

export interface FitBlockResult {
  labelFS: number
  labelLH: number
  labelLines: string[]
  labelTruncated: boolean
  labelUrl: string | null
  hasValue: boolean
  valueFS: number
  valueLH: number
  valueLines: string[]
  valueTruncated: boolean
  /** Total block height (label lines + value line, plus the gap between them if both are present) — use to vertically centre the whole block on a node's cy. */
  totalH: number
}

export function fitLabelValueBlock(
  label: string,
  value: string | null | undefined,
  boxW: number,
  boxH: number,
  opts: {
    /**
     * The label's link URL, if any — pass this through explicitly from your
     * own displayLabel()/parseLink() call rather than relying on this
     * function to discover it. `label` here is expected to already be a
     * plain display string (e.g. displayLabel's `.display`, with markdown
     * link syntax already stripped), so re-parsing it internally would
     * always find nothing and silently drop the link.
     */
    labelUrl?: string | null
    labelMaxSize?: number; labelMinSize?: number
    /** Label line ceiling when a value is present (value takes some of boxH, so less room for the label). */
    labelMaxLines?: number
    /** Label line ceiling when there's no value (defaults to labelMaxLines + 1, since the label then gets the full boxH). */
    labelMaxLinesNoValue?: number
    valueMaxSize?: number; valueMinSize?: number
    valueMaxLines?: number
    /** Fraction of boxH the value gets first, before the label reserves what's left. Value is the secondary text, so this should stay a minority share. */
    valueShare?: number
    /** Vertical gap between the label block and the value line. */
    gap?: number
    lineHeightRatio?: number
  } = {},
): FitBlockResult {
  const {
    labelUrl = null,
    labelMaxSize = 10, labelMinSize = 6.5,
    labelMaxLines = 2, labelMaxLinesNoValue = labelMaxLines + 1,
    valueMaxSize = 8, valueMinSize = 6,
    valueMaxLines = 1,
    valueShare = 0.4,
    gap = 3,
    lineHeightRatio = 1.3,
  } = opts
  const hasValue = !!value

  let valueFS = valueMaxSize, valueLH = valueMaxSize * lineHeightRatio
  let valueLines: string[] = [], valueTruncated = false
  if (hasValue) {
    // valueShare of boxH can land under the room 'valueMaxLines' lines
    // actually need at valueMinSize, which would silently make that ceiling
    // unreachable no matter how long the value is (it'd just keep shrinking
    // to the floor and truncating) — guarantee at least that floor-line
    // count's worth of room, same fix applied by hand in circular-process.ts/
    // decision-tree.ts/h-org-chart.ts/loop.ts before this was centralised.
    const minValueBoxH = valueMinSize * lineHeightRatio * valueMaxLines
    const valueBoxH = Math.max(minValueBoxH, boxH * valueShare)
    const vf = fitTextToWidthShared([value as string], boxW, {
      maxSize: valueMaxSize, minSize: valueMinSize, maxLines: valueMaxLines, boxH: valueBoxH, lineHeightRatio,
    })
    valueFS = vf.fontSize; valueLH = vf.lineHeight
    valueLines = vf.results[0].lines; valueTruncated = vf.results[0].truncated
  }
  const valueBlockH = hasValue ? valueLines.length * valueLH + gap : 0
  const reservedBoxH = Math.max(10, boxH - valueBlockH)

  const lf = fitTextToWidthShared([label], boxW, {
    maxSize: labelMaxSize, minSize: labelMinSize,
    maxLines: hasValue ? labelMaxLines : labelMaxLinesNoValue,
    boxH: reservedBoxH, lineHeightRatio,
  })
  const labelFS = lf.fontSize, labelLH = lf.lineHeight
  const { lines: labelLines, truncated: labelTruncated } = lf.results[0]
  const totalH = labelLines.length * labelLH + valueBlockH

  return { labelFS, labelLH, labelLines, labelTruncated, labelUrl, hasValue, valueFS, valueLH, valueLines, valueTruncated, totalH }
}

/**
 * Render a fitLabelValueBlock() result as centred <text> markup at (cx, cy).
 * Label is wrapped in aWrap with its own link (if any); the value line is
 * appended after, unlinked, matching every hand-rolled version of this
 * pattern across the individual renderer files.
 */
export function renderFitBlock(
  cx: number, cy: number,
  fit: FitBlockResult,
  opts: {
    labelFullText: string
    valueFullText?: string
    labelFill: string
    valueFill: string
    labelWeight?: string
    valueWeight?: string
    /** Extra attributes spliced into both <text> tags verbatim, e.g. a white-halo stroke for text drawn over a filled shape. Overridden per-tag by labelExtraAttrs/valueExtraAttrs when those differ (e.g. a dimmed opacity that should only apply to the value line). */
    extraAttrs?: string
    labelExtraAttrs?: string
    valueExtraAttrs?: string
    anchor?: 'start' | 'middle' | 'end'
  },
): string {
  const {
    labelFullText, valueFullText, labelFill, valueFill,
    labelWeight = '700', valueWeight = '400', extraAttrs = '',
    labelExtraAttrs = extraAttrs, valueExtraAttrs = extraAttrs, anchor = 'middle',
  } = opts
  const { labelFS, labelLH, labelLines, labelTruncated, labelUrl, hasValue, valueFS, valueLH, valueLines, valueTruncated, totalH } = fit

  const labelTip = labelTruncated ? `<title>${escapeXml(labelFullText)}</title>` : ''
  let labelOut = labelTip
  labelLines.forEach((line, li) => {
    const ty = cy - totalH / 2 + li * labelLH + labelLH * 0.8
    labelOut += `<text x="${cx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="${anchor}" font-size="${labelFS}" fill="${labelFill}" ${labelExtraAttrs} font-family="system-ui,sans-serif" font-weight="${labelWeight}">${escapeXml(line)}</text>`
  })
  let out = aWrap(labelOut, labelUrl)

  if (hasValue) {
    const valueTip = valueTruncated ? `<title>${escapeXml(valueFullText ?? '')}</title>` : ''
    out += valueTip
    valueLines.forEach((line, li) => {
      const ty = cy - totalH / 2 + labelLines.length * labelLH + li * valueLH + valueLH * 0.8
      out += `<text x="${cx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="${anchor}" font-size="${valueFS}" fill="${valueFill}" ${valueExtraAttrs} font-family="system-ui,sans-serif" font-weight="${valueWeight}">${escapeXml(line)}</text>`
    })
  }
  return out
}

/**
 * Usable text-box budget (width, height) for a round node (circle or the
 * flat centre disc of a gear) of radius `r` — widest at the vertical
 * centre, narrowing toward the top/bottom silhouette. Same heuristic used
 * by hand across circle-process.ts, nondirectional-cycle.ts,
 * multidirectional-cycle.ts, loop.ts, and gear-cycle.ts before being
 * centralised here.
 */
export function roundTextBox(r: number, opts: { wRatio?: number; wMargin?: number; hRatio?: number; hMin?: number } = {}): { w: number; h: number } {
  const { wRatio = 1.6, wMargin = 4, hRatio = 1.4, hMin = 14 } = opts
  return { w: Math.max(20, r * wRatio - wMargin), h: Math.max(hMin, r * hRatio) }
}

// ── Animation helpers ─────────────────────────────────────────────────────────

/**
 * Returns true when animation should be emitted for this spec.
 * Default is ON; disable with `animate: false` in front-matter or globalConfig.
 */
export function shouldAnimate(spec: MdArtSpec): boolean {
  if (spec.animate === false) return false
  if (getGlobalConfig().animate === false) return false
  return true
}

/**
 * Effective animation speed multiplier (spec > global > 1.0).
 */
export function animateSpeed(spec: MdArtSpec): number {
  return spec.animateSpeed ?? getGlobalConfig().animateSpeed ?? 1.0
}

/**
 * Two-phase sequential animation for N nodes. Stamp `class="mdart-n{i}"` on
 * each animated element (wrapping both the shape and its label in a `<g>`).
 *
 * Phase 1 — Entrance (plays once, completion-timed):
 *   Total entrance time is fixed (~3.2 s). That budget is divided equally by n,
 *   giving each node a time slot. Each node fades in during the first 72% of its
 *   slot, leaving a visible gap before the next node starts — the accumulation
 *   effect (1 → 1,2 → 1,2,3). Fewer nodes = slower, more dramatic entrances;
 *   more nodes = brisk staircase, same total time.
 *
 * Phase 2 — Loop (infinite after entrance, node-timed):
 *   Each node gets a fixed spotlight window (stepMs), regardless of n. The loop
 *   total scales naturally with the count. One extra step of silence (pauseMs =
 *   stepMs) follows the last node — a clean "breath" before the cycle restarts.
 *   All nodes stay at full natural opacity; emphasis is filter-only (brightness +
 *   saturation + glow) so there is no opacity conflict with the entrance animation.
 *
 * @param n     number of nodes
 * @param spec  MdArtSpec (reads animate-speed)
 */
export interface SeqSpotlightOptions {
  scale?: boolean
  scalePeak?: number
  trailingArrowSlot?: boolean
  loopStartIndex?: number
}

export function seqMeasureTiming(n: number, spec: MdArtSpec, i: number): { delayMs: number; durationMs: number } {
  const speed = animateSpeed(spec)
  const totalEntranceMs = Math.round(3200 / speed)
  const slotMs = totalEntranceMs / n
  const enterDur = Math.round(slotMs * 0.72)
  const enterGap = Math.round(slotMs)
  const enterDelay = i * enterGap
  return {
    delayMs: enterDelay + Math.round(enterDur * 0.75),
    durationMs: Math.max(Math.round(900 / speed), enterDur),
  }
}

/**
 * The numeric building blocks behind seqSpotlightCSS's two-phase timing,
 * factored out so callers that need a *continuous* (non-slot-quantized)
 * position within the same entrance/loop windows — e.g. grouping items of
 * uneven per-group counts that must still start and end together — can
 * derive their own delays while staying perfectly in sync with the CSS
 * that seqSpotlightCSS(n, spec, options) emits for the same (n, spec, options).
 */
export function seqSpotlightTiming(n: number, spec: MdArtSpec, options: SeqSpotlightOptions = {}) {
  const speed = animateSpeed(spec)

  // ── Phase 1: entrance — fixed total time ÷ n ────────────────────────────
  const totalEntranceMs = Math.round(3200 / speed)
  const slotMs   = totalEntranceMs / n              // time slot per node
  const enterDur = Math.round(slotMs * 0.72)        // fade occupies 72% of slot
  const enterGap = Math.round(slotMs)               // next node starts one slot later

  // ── Phase 2: loop — fixed per-node spotlight ─────────────────────────────
  const stepMs      = Math.round(1800 / speed)  // fixed spotlight per node
  const pauseMs     = Math.round(1800 / speed)  // one-beat silence at cycle end
  const loopStartIndex = Math.min(Math.max(options.loopStartIndex ?? 0, 0), Math.max(0, n - 1))
  const loopCount = Math.max(1, n - loopStartIndex)
  const totalLoopMs = loopCount * stepMs + pauseMs
  const lastEntranceSlot = options.trailingArrowSlot ? n : n - 1
  const entranceDone = lastEntranceSlot * enterGap + enterDur
  const loopStartMs  = entranceDone + Math.round(900 / speed)  // breath before loop
  const scaleEnabled = options.scale !== false
  const scalePeak = options.scalePeak ?? 1.03

  // ── Crossfade keyframe percentages ───────────────────────────────────────
  // dimEndPct must satisfy two constraints:
  //   (a) ≥ (stepMs - riseMs) / totalLoopMs  → dim-out overlaps next node's rise (no blink)
  //   (b) ≤ (stepMs + pauseMs) / totalLoopMs → node N-1's dim completes before cycle end
  // We pick a value between those bounds, closer to (a) to maximise the pause zone.
  const riseMs    = Math.round(500 / speed)
  const minDimPct = (stepMs - riseMs) / totalLoopMs * 100
  const maxDimPct = (stepMs + pauseMs * 0.65) / totalLoopMs * 100
  const dimEndPct   = Math.min(maxDimPct, minDimPct * 1.25)
  // Rise window starts riseMs before the cycle end (= node 0's next peak)
  const risingPct = (totalLoopMs - riseMs) / totalLoopMs * 100

  return {
    speed, totalEntranceMs, slotMs, enterDur, enterGap,
    stepMs, pauseMs, loopStartIndex, loopCount, totalLoopMs,
    entranceDone, loopStartMs, scaleEnabled, scalePeak,
    riseMs, dimEndPct, risingPct,
  }
}

export function seqSpotlightCSS(n: number, spec: MdArtSpec, options: SeqSpotlightOptions = {}): string {
  const {
    speed, enterDur, enterGap,
    stepMs, loopStartIndex, totalLoopMs,
    loopStartMs, scaleEnabled, scalePeak,
    dimEndPct: dimEndPctNum, risingPct: risingPctNum,
  } = seqSpotlightTiming(n, spec, options)
  const dimEndPct = dimEndPctNum.toFixed(1)
  const risingPct = risingPctNum.toFixed(1)

  const classes = Array.from({ length: n }, (_, i) => {
    // Node i peaks (the 0%/100% keyframe) at clock time loopStartMs + i*stepMs.
    // An earlier version subtracted totalLoopMs here to get a negative
    // animation-delay, pre-phase-shifting the infinite loop so it looked
    // correctly synced from t=0 instead of each node "popping" the first
    // time its own delay elapsed. That's mathematically equivalent in
    // steady state (a negative delay just relabels which cycle is "first"),
    // but negative animation-delay on a filter animation targeting SVG
    // shape elements is a known trouble spot on mobile WebKit/Android
    // WebView — some engines never paint it at all. A non-negative delay
    // gives up only the pre-sync on the very first cycle (each node's
    // first peak is a brief "pop" instead of already mid-loop) in exchange
    // for actually rendering everywhere.
    const participatesInLoop = i >= loopStartIndex
    const loopOrder = i - loopStartIndex
    const loopDelay  = loopStartMs + loopOrder * stepMs
    const enterDelay = i * enterGap
    // Scale pulse lives on the <g> (reliable on all browsers), but some
    // directional layouts opt out so their geometry stays anchored.
    const nodeRule = scaleEnabled && participatesInLoop
      ? `.mdart-n${i}{` +
        `transform-box:fill-box;transform-origin:50% 50%;` +
        `animation:` +
        `mdart-loop ${totalLoopMs}ms ease-in-out ${loopDelay}ms infinite,` +
        `mdart-enter ${enterDur}ms ease-out ${enterDelay}ms 1 both` +
        `}`
      : `.mdart-n${i}{animation:mdart-enter ${enterDur}ms ease-out ${enterDelay}ms 1 both}`
    // Brightness filter lives on child shape elements.
    // CSS filter on <g> can be silently ignored in some SVG rendering contexts;
    // filter on concrete shape elements (rect/circle/polygon/ellipse) is
    // universally supported. Using a separate keyframe (mdart-bright-loop)
    // so the two animations never collide.
    const shapeRule = participatesInLoop
      ? `.mdart-n${i} rect:not(.mdart-no-glow),.mdart-n${i} circle:not(.mdart-no-glow),.mdart-n${i} polygon:not(.mdart-no-glow),.mdart-n${i} ellipse:not(.mdart-no-glow){` +
        `animation:mdart-bright-loop ${totalLoopMs}ms ease-in-out ${loopDelay}ms infinite` +
        `}`
      : ''
    const textRule = participatesInLoop
      ? `.mdart-n${i} .mdart-glow-text{` +
        `animation:mdart-bright-loop ${totalLoopMs}ms ease-in-out ${loopDelay}ms infinite` +
        `}`
      : ''
    const strokeRule = participatesInLoop
      ? `.mdart-n${i} .mdart-glow-stroke{` +
        `animation:mdart-bright-loop ${totalLoopMs}ms ease-in-out ${loopDelay}ms infinite` +
        `}`
      : ''
    const { delayMs: measureDelay, durationMs: measureDur } = seqMeasureTiming(n, spec, i)
    const markerDelay = measureDelay + measureDur
    const markerDur = Math.round(180 / speed)
    const barRule = `.mdart-n${i} .mdart-bar-grow{` +
      `transform-box:fill-box;transform-origin:left center;` +
      `animation:mdart-bar-grow ${measureDur}ms ease-out ${measureDelay}ms 1 both` +
      `}` +
      `.mdart-n${i} .mdart-stroke-grow{` +
      `stroke-dasharray:1;stroke-dashoffset:1;` +
      `animation:mdart-stroke-grow ${measureDur}ms ease-out ${measureDelay}ms 1 both` +
      `}` +
      `.mdart-n${i} .mdart-marker-pop{` +
      `opacity:0;animation:mdart-marker-pop ${markerDur}ms ease-out ${markerDelay}ms 1 both` +
      `}`
    // Connector reveal slots: use the destination node's index for ordinary
    // i → i+1 connectors so the arrow appears with the node it points to.
    // Closing cycle arrows should use n-1 so the cycle closes with the last node.
    const arrRule = `.mdart-arr-n${i}{animation:mdart-enter ${enterDur}ms ease-out ${enterDelay}ms 1 both}`
    return nodeRule + shapeRule + textRule + strokeRule + barRule + arrRule
  }).join('')
  const trailingArrowRule = options.trailingArrowSlot
    ? `.mdart-arr-n${n}{animation:mdart-enter ${enterDur}ms ease-out ${n * enterGap}ms 1 both}`
    : ''

  return `<style>` +
    // Entrance: opacity only — 0 → 1, held by forwards fill forever.
    `@keyframes mdart-enter{from{opacity:0}to{opacity:1}}` +
    `@keyframes mdart-bar-grow{from{transform:matrix(0,0,0,1,0,0)}to{transform:matrix(1,0,0,1,0,0)}}` +
    `@keyframes mdart-stroke-grow{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}` +
    `@keyframes mdart-marker-pop{from{opacity:0}to{opacity:1}}` +
    (scaleEnabled
      ? `@keyframes mdart-loop{` +
        `0%,100%{transform:scale(${scalePeak})}` +
        `${dimEndPct}%{transform:scale(1)}` +
        `${risingPct}%{transform:scale(1)}` +
      `}`
      : '') +
    // Brightness filter on child shapes. Identity values (brightness(1) saturate(1))
    // instead of filter:none so browsers can smoothly interpolate — none→brightness(X)
    // is a discrete snap in many implementations; identity→brightness(X) is smooth.
    // Peak is deliberately capped well short of washing a fill toward white —
    // many shapes carry bold white/light label text on top (card headers,
    // process boxes, etc.), and a stronger multiplier here can lighten the
    // fill enough at its peak to blow out contrast against that text.
    `@keyframes mdart-bright-loop{` +
      `0%,100%{filter:brightness(1.4) saturate(1.25) drop-shadow(0 0 6px rgba(255,255,255,.4))}` +
      `${dimEndPct}%{filter:brightness(1) saturate(1)}` +
      `${risingPct}%{filter:brightness(1) saturate(1)}` +
    `}` +
    classes + trailingArrowRule +
    `</style>`
}

/**
 * Visible-truncate text with a hover-revealed full version.
 *
 * - When `item` is provided, the SVG `<title>` always carries `itemSummary(item)`
 *   so label + value + attrs are surfaced on hover (no silent drops).
 * - Otherwise, falls back to the legacy behaviour: emit a title only when the
 *   string was actually truncated, using the original raw `s` inside.
 */
export function tt(s: string, max: number, item?: ItemLike): string {
  const tr = truncate(s, max)
  if (item) return `<title>${escapeXml(itemSummary(item))}</title>${escapeXml(tr)}`
  if (tr === s) return escapeXml(s)
  return `<title>${escapeXml(s)}</title>${escapeXml(tr)}`
}

// ── Item-tooltip helpers ──────────────────────────────────────────────────────
//
// Every renderer should expose ALL of an item's data — label, value, attrs —
// at minimum via a tooltip. Geometric constraints can prevent visible
// rendering of value or attrs, but they should never silently disappear.
//
// Use `itemSummary` to build the textual form and `itemTitleTag` to emit the
// SVG <title> element. Wrap the per-item primary shape (rect/circle/polygon/
// path) or its parent <g> with this tag to make the full data hover-revealed.
//
// `ellipsisIfDropped` appends a trailing " …" to a label when the renderer
// is about to omit visible value/attrs — a visual cue that "there's more,
// hover to see it" so authors notice the silent drop and check.

export interface ItemLike {
  label: string
  value?: string
  attrs?: string[]
}

/** Human-readable single-line summary: "Label: value [attr1, attr2]" */
export function itemSummary(item: ItemLike): string {
  let s = item.label || ''
  if (item.value)                      s += `: ${item.value}`
  if (item.attrs && item.attrs.length) s += ` [${item.attrs.join(', ')}]`
  return s
}

/** SVG <title> element bearing the full item summary, ready to embed
 *  inside any graphical element (rect, circle, polygon, path, g, …). */
export function itemTitleTag(item: ItemLike): string {
  const s = itemSummary(item)
  return s ? `<title>${escapeXml(s)}</title>` : ''
}

/** Append " …" when the renderer is about to drop value or attrs from the
 *  visible label. Caller passes flags for what *will* render visibly. */
export function ellipsisIfDropped(
  label: string,
  item: ItemLike,
  shows: { value?: boolean; attrs?: boolean } = {},
): string {
  const hasVal   = !!(item.value && item.value.length > 0)
  const hasAttrs = !!(item.attrs && item.attrs.length > 0)
  const dropVal  = hasVal   && !shows.value
  const dropAttr = hasAttrs && !shows.attrs
  return (dropVal || dropAttr) ? `${label} …` : label
}

/** Combined parseLink + ellipsisIfDropped: extracts URL from a markdown-style
 *  label and tags the visible string with " …" when value or attrs would
 *  otherwise be invisible. The trailing " …" is a visual signal that more
 *  data is recoverable on hover (where itemTitleTag emits the full summary).
 *
 *  Drop-in replacement for `parseLink(item.label)` — same return shape,
 *  but takes the whole item so it can read value/attrs. */
export function displayLabel(
  item: ItemLike,
  shows: { value?: boolean; attrs?: boolean } = {},
): { display: string; url: string | null } {
  const { display: raw, url } = parseLink(item.label)
  return { display: ellipsisIfDropped(raw, item, shows), url }
}

/**
 * Resolve a single-line description for an item, preferring `value` (explicit
 * inline `: desc` form) and falling back to a summary of `children` labels
 * (nested `  - child` form). Used by renderers that have only one description
 * slot, so authors can use either syntax interchangeably.
 *
 * Returns null when neither is present.
 */
export function getCaption(item: MdArtItem, maxChildren = 3, sep = ' · '): string | null {
  if (item.value) return item.value
  if (!item.children || item.children.length === 0) return null
  return item.children.slice(0, maxChildren).map(c => c.label).join(sep)
}

// ── Color helpers ─────────────────────────────────────────────────────────────

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function lerpColor(c1: string, c2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(c1)
  const [r2, g2, b2] = hexToRgb(c2)
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t)
  return '#' + [lerp(r1, r2), lerp(g1, g2), lerp(b1, b2)].map(v => v.toString(16).padStart(2, '0')).join('')
}

// ── SVG wrappers ──────────────────────────────────────────────────────────────

export function renderEmpty(theme: MdArtTheme): string {
  return `<svg viewBox="0 0 400 80" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="80" fill="${theme.bg}" rx="6"/>
    <text x="200" y="44" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif">No items</text>
  </svg>`
}

export function svgWrap(W: number, H: number, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

export function titleEl(W: number, title: string, theme: MdArtTheme): string {
  return `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(title)}</text>`
}

// ── Staircase helper (shared by step-up and step-down) ────────────────────────

export function renderStaircase(spec: MdArtSpec, theme: MdArtTheme, ascending: boolean): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const n = items.length
  const W = 560
  const GAP_X = 6, GAP_Y = 6
  const BOX_W = Math.min(110, Math.floor((W - 16 - (n - 1) * GAP_X) / n))
  const captions = items.map(item => getCaption(item))
  const hasSecondary = items.some((item, i) => !!item.value || !!captions[i])
  const BOX_H = hasSecondary ? 44 : 36
  const titleH = spec.title ? 28 : 8
  const totalDiagH = (n - 1) * (BOX_H + GAP_Y) + BOX_H
  const H = titleH + totalDiagH + 16
  const startX = 8

  const animate = shouldAnimate(spec)
  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))
  parts.push(`<defs><marker id="step-arr" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto"><polygon points="0,0 5,2.5 0,5" fill="${theme.accent}"/></marker></defs>`)

  // Per-node fitting: every box shares BOX_W, but each label/secondary pair
  // is sized independently rather than to the diagram's worst-case label —
  // a short label stays large instead of being dragged down to match a
  // long neighbor, same approach as process.ts/circular-process.ts.
  //
  // The label fit was also capped at a flat maxLines: 1 with no boxH — so
  // a smaller font never unlocked a second line, it just kept shrinking a
  // single line down to the floor before truncating. staircaseBoxH below
  // gives fitTextToWidthShared the real vertical budget to grow the line
  // count as the font shrinks, same mechanism as circle-process/waterfall/
  // chevron-process/funnel/arrow-process.
  const displays = items.map(item => displayLabel(item, { value: true }))
  const secondaries = items.map((item, i) => item.value ?? captions[i])
  const staircaseBoxH = BOX_H - 8

  items.forEach((item, i) => {
    const x = startX + i * (BOX_W + GAP_X)
    const y = ascending
      ? titleH + 4 + (n - 1 - i) * (BOX_H + GAP_Y)
      : titleH + 4 + i * (BOX_H + GAP_Y)
    const t = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)

    const secondary = secondaries[i]
    const { url: staircaseUrl, display: itmDisplay } = displays[i]
    const secFitFull = secondary
      ? fitTextToWidthShared([secondary], BOX_W - 8, { maxSize: 8, minSize: 6, maxLines: 1 })
      : null
    const secFS = secFitFull?.fontSize ?? 8
    const secLH = secFitFull?.lineHeight ?? 8 * 1.3
    const secFit = secFitFull?.results[0] ?? null
    const reservedBoxH = secFit ? Math.max(10, staircaseBoxH - secLH - 3) : staircaseBoxH
    const { fontSize: labelFS, lineHeight: labelLH, results: [{ lines: labelLines, truncated: labelTruncated }] } =
      fitTextToWidthShared([itmDisplay], BOX_W - 8, {
        maxSize: 10, minSize: 6.5, maxLines: secFit ? 2 : 3, boxH: reservedBoxH,
      })
    const cy = y + BOX_H / 2
    // Centre the whole block (label lines + optional secondary line) on cy
    // — generalized so it works for any line-count combination the fit
    // above lands on, instead of assuming exactly 1 label line.
    const totalH = labelLines.length * labelLH + (secFit ? secLH + 3 : 0)
    let nodeStr = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${BOX_W}" height="${BOX_H}" rx="5" fill="${fill}33" stroke="${fill}" stroke-width="1.2">${itemTitleTag(item)}</rect>`
    const labelTip = labelTruncated ? `<title>${escapeXml(itmDisplay)}</title>` : ''
    let lblContent = labelTip
    labelLines.forEach((line, li) => {
      const ty = cy - totalH / 2 + li * labelLH + labelLH * 0.8
      lblContent += `<text x="${(x + BOX_W / 2).toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="${labelFS}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(line)}</text>`
    })
    nodeStr += aWrap(lblContent, staircaseUrl)
    if (secFit) {
      const ty = cy - totalH / 2 + labelLines.length * labelLH + secLH * 0.8
      const secTip = secFit.truncated ? `<title>${escapeXml(secondary!)}</title>` : ''
      nodeStr += `${secTip}<text x="${(x + BOX_W / 2).toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="${secFS}" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(secFit.lines[0])}</text>`
    }
    parts.push(animate ? `<g class="mdart-n${i}">${nodeStr}</g>` : nodeStr)

    // Arrow fades in with the destination step it points to.
    if (i < n - 1) {
      const nextY = ascending
        ? titleH + 4 + (n - 2 - i) * (BOX_H + GAP_Y)
        : titleH + 4 + (i + 1) * (BOX_H + GAP_Y)
      const x1 = x + BOX_W
      const y1 = ascending ? y : y + BOX_H
      const x2 = x + BOX_W + GAP_X
      const y2 = ascending ? nextY + BOX_H : nextY
      const arrEl = `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${theme.accent}cc" stroke-width="2.5" marker-end="url(#step-arr)"/>`
      parts.push(animate ? `<g class="mdart-arr-n${i + 1}">${arrEl}</g>` : arrEl)
    }
  })
  if (animate) parts.unshift(seqSpotlightCSS(n, spec))
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}
