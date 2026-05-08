import type { MdArtTheme } from '../theme'
import type { MdArtItem } from '../parser'

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

export function tt(s: string, max: number): string {
  const tr = truncate(s, max)
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

import type { MdArtSpec } from '../parser'

export function renderStaircase(spec: MdArtSpec, theme: MdArtTheme, ascending: boolean): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const n = items.length
  const W = 560
  const GAP_X = 6, GAP_Y = 6
  const BOX_W = Math.min(110, Math.floor((W - 16 - (n - 1) * GAP_X) / n))
  const BOX_H = 36
  const titleH = spec.title ? 28 : 8
  const totalDiagH = (n - 1) * (BOX_H + GAP_Y) + BOX_H
  const H = titleH + totalDiagH + 16
  const startX = 8

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

    const { display: staircaseDisplay, url: staircaseUrl } = parseLink(item.label)
    parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${BOX_W}" height="${BOX_H}" rx="5" fill="${fill}33" stroke="${fill}" stroke-width="1.2"/>`)
    parts.push(aWrap(`<text x="${(x + BOX_W / 2).toFixed(1)}" y="${(y + BOX_H / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(staircaseDisplay, Math.floor(BOX_W / 6))}</text>`, staircaseUrl))
    const caption = getCaption(item)
    if (caption) parts.push(`<text x="${(x + BOX_W / 2).toFixed(1)}" y="${(y + BOX_H / 2 + 16).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(caption, Math.floor(BOX_W / 5))}</text>`)

    if (i < n - 1) {
      const nextY = ascending
        ? titleH + 4 + (n - 2 - i) * (BOX_H + GAP_Y)
        : titleH + 4 + (i + 1) * (BOX_H + GAP_Y)
      const x1 = x + BOX_W
      const y1 = ascending ? y : y + BOX_H
      const x2 = x + BOX_W + GAP_X
      const y2 = ascending ? nextY + BOX_H : nextY
      parts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${theme.accent}cc" stroke-width="2.5" marker-end="url(#step-arr)"/>`)
    }
  })
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}
