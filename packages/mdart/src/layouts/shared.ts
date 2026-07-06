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
    }
    lines.push(line)
  }

  const truncated = wordIdx < words.length
  if (truncated && lines.length > 0) {
    const last = lines[lines.length - 1]
    if (!last.endsWith('…'))
      lines[lines.length - 1] = last.length < perLineChars
        ? last + '…'
        : last.slice(0, perLineChars - 1) + '…'
  }

  return { lines: lines.length > 0 ? lines : [''], truncated, url }
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
function animateSpeed(spec: MdArtSpec): number {
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
interface SeqSpotlightOptions {
  scale?: boolean
  scalePeak?: number
  trailingArrowSlot?: boolean
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

export function seqSpotlightCSS(n: number, spec: MdArtSpec, options: SeqSpotlightOptions = {}): string {
  const speed = animateSpeed(spec)

  // ── Phase 1: entrance — fixed total time ÷ n ────────────────────────────
  const totalEntranceMs = Math.round(3200 / speed)
  const slotMs   = totalEntranceMs / n              // time slot per node
  const enterDur = Math.round(slotMs * 0.72)        // fade occupies 72% of slot
  const enterGap = Math.round(slotMs)               // next node starts one slot later

  // ── Phase 2: loop — fixed per-node spotlight ─────────────────────────────
  // Resting nodes stay at FULL natural opacity (no dim).
  // Emphasis is filter-only: brightness + saturation + glow.
  // enterDur animates opacity; mdart-loop animates scale; mdart-bright-loop
  // animates filter on child shapes. Different properties → no priority
  // conflict. The `both` fill-mode on enter keeps every node at opacity:1
  // after it enters, forever.
  const stepMs      = Math.round(1800 / speed)  // fixed spotlight per node
  const pauseMs     = Math.round(1800 / speed)  // one-beat silence at cycle end
  const totalLoopMs = n * stepMs + pauseMs
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
  const dimEndPct   = Math.min(maxDimPct, minDimPct * 1.25).toFixed(1)
  // Rise window starts riseMs before the cycle end (= node 0's next peak)
  const risingPct = ((totalLoopMs - riseMs) / totalLoopMs * 100).toFixed(1)

  const classes = Array.from({ length: n }, (_, i) => {
    // Correct formula: node i peaks at clock time loopStartMs + i*stepMs.
    // subtracting totalLoopMs (= n*stepMs + pauseMs) gives the right negative
    // delay so the CSS pre-advances each node into the correct phase.
    const loopDelay  = loopStartMs + i * stepMs - totalLoopMs
    const enterDelay = i * enterGap
    // Scale pulse lives on the <g> (reliable on all browsers), but some
    // directional layouts opt out so their geometry stays anchored.
    const nodeRule = scaleEnabled
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
    const shapeRule = `.mdart-n${i} rect:not(.mdart-no-glow),.mdart-n${i} circle:not(.mdart-no-glow),.mdart-n${i} polygon:not(.mdart-no-glow),.mdart-n${i} ellipse:not(.mdart-no-glow){` +
      `animation:mdart-bright-loop ${totalLoopMs}ms ease-in-out ${loopDelay}ms infinite` +
      `}`
    const textRule = `.mdart-n${i} .mdart-glow-text{` +
      `animation:mdart-bright-loop ${totalLoopMs}ms ease-in-out ${loopDelay}ms infinite` +
      `}`
    const strokeRule = `.mdart-n${i} .mdart-glow-stroke{` +
      `animation:mdart-bright-loop ${totalLoopMs}ms ease-in-out ${loopDelay}ms infinite` +
      `}`
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
    `@keyframes mdart-bright-loop{` +
      `0%,100%{filter:brightness(1.9) saturate(1.6) drop-shadow(0 0 10px rgba(255,255,255,.65))}` +
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

  items.forEach((item, i) => {
    const x = startX + i * (BOX_W + GAP_X)
    const y = ascending
      ? titleH + 4 + (n - 1 - i) * (BOX_H + GAP_Y)
      : titleH + 4 + i * (BOX_H + GAP_Y)
    const t = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)

    const caption = captions[i]
    const secondary = item.value ?? caption
    const { display: staircaseDisplay, url: staircaseUrl } = displayLabel(item, { value: true })
    const cy = y + BOX_H / 2
    let nodeStr = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${BOX_W}" height="${BOX_H}" rx="5" fill="${fill}33" stroke="${fill}" stroke-width="1.2">${itemTitleTag(item)}</rect>`
    const labelY = secondary ? cy - 3 : cy + 4
    nodeStr += aWrap(`<text x="${(x + BOX_W / 2).toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(staircaseDisplay, Math.floor(BOX_W / 6), item)}</text>`, staircaseUrl)
    if (secondary) nodeStr += `<text x="${(x + BOX_W / 2).toFixed(1)}" y="${(cy + 11).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(secondary, Math.floor(BOX_W / 5))}</text>`
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
