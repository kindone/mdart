import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import {
  escapeXml, tt, wrapLabel, renderEmpty, parseLink, aWrap,
  itemTitleTag, displayLabelValue, shouldAnimate, seqSpotlightCSS,
  wrapItem, shouldInstrument, FONT_SANS_ATTR, truncate, renderInlineMarkdown,
} from '../shared'

// ── Layout constants ──────────────────────────────────────────────────────────
const BASE_W               = 600
const MIN_COL_W            = 110
const TITLE_H_WITH_TITLE   = 30
const TITLE_H_NO_TITLE     = 8
const MSG_GAP              = 36
const PAD_V                = 16
const ACTOR_LH             = 13
const ACTOR_VPAD           = 7
const ACTOR_MAX_LINES      = 2
const ACTOR_MAX_W          = 96
const ACTOR_SIDE_PAD       = 16
const ACTOR_TEXT_PAD       = 10
const ACTOR_FONT_SIZE      = 11
const ACTOR_BOX_TOP_GAP    = 8
const LIFE_BOTTOM_PAD      = 16
const SELF_LOOP_EXT_RATIO  = 0.38
const SELF_LOOP_DROP_RATIO = 0.55
const SELF_LABEL_CHAR_PX   = 5
const MESSAGE_LABEL_CHAR_PX = 7
const ACTIVATION_BAR_W     = 10
// Region box constants
const REGION_BOX_MARGIN    = 6    // left/right margin from canvas edge
const REGION_PAD_TOP       = 20   // space from box top to first event (≥ tag height 14)
const REGION_PAD_BOTTOM    = 8    // space from last event to box bottom
const BRANCH_DIV_H         = 22   // total height of branch-divider transition
const REGION_MIN_BRANCH_H  = MSG_GAP  // min event area for an empty branch
const REGION_TAG_H         = 14
const REGION_TAG_CHAR_PX   = 5.5

// ── SeqEvent model ────────────────────────────────────────────────────────────

interface MessageEvent {
  kind: 'message'
  from: string
  to: string
  msg: string
  activateTarget?: boolean
  deactivateSender?: boolean
}

interface DividerEvent {
  kind: 'divider'
  label: string
}

interface RegionBranch {
  label: string       // condition / branch label (may be empty)
  events: SeqEvent[]
}

interface RegionEvent {
  kind: 'region'
  regionType: 'alt' | 'opt' | 'loop' | 'par'
  branches: RegionBranch[]
}

type SeqEvent = MessageEvent | DividerEvent | RegionEvent

// ── Layout types ──────────────────────────────────────────────────────────────

interface LayoutMsg    { kind: 'message'; event: MessageEvent; y: number }
interface LayoutDiv    { kind: 'divider'; event: DividerEvent; y: number }
interface LayoutRegion {
  kind: 'region'
  event: RegionEvent
  y: number
  h: number
  branches: LayoutBranch[]
}
type LayoutEvent = LayoutMsg | LayoutDiv | LayoutRegion

interface LayoutBranch {
  label: string
  dividerY?: number   // undefined for the first branch
  events: LayoutEvent[]
}

interface Activation { y1: number; y2: number }

interface ActorRender {
  actor: string
  display: string
  lines: string[]
  url: string | null
  tip: string
  truncated: boolean
}

interface SequenceLayout {
  actors: string[]
  laidEvents: LayoutEvent[]
  actorRenders: ActorRender[]
  titleH: number
  colW: number
  actorW: number
  actorH: number
  actorBoxY: number
  lifeY1: number
  lifeY2: number
  h: number
  w: number
}

// ── Keyword sets ──────────────────────────────────────────────────────────────

const REGION_OPENERS = new Set(['alt', 'opt', 'loop', 'par'])
const REGION_CONTS   = new Set(['else', 'elif', 'and'])
const DIVIDER_KEYS   = new Set(['divider', 'section'])

// ── Event collection ──────────────────────────────────────────────────────────

function addActor(actors: string[], name: string): void {
  if (name && !actors.includes(name)) actors.push(name)
}

function parseFlatMessage(item: MdArtItem, actors: string[]): MessageEvent | null {
  const arrowIdx = item.label.indexOf('→')
  if (arrowIdx < 0) return null
  const from = item.label.slice(0, arrowIdx).trim()
  const to   = item.label.slice(arrowIdx + 1).trim()
  if (!from || !to) return null
  addActor(actors, from)
  addActor(actors, to)
  return {
    kind: 'message',
    from, to,
    msg: item.value ?? '',
    activateTarget:   item.attrs.includes('+') || item.attrs.includes('activate') || undefined,
    deactivateSender: item.attrs.includes('-') || item.attrs.includes('deactivate') || undefined,
  }
}

/**
 * Build region branches from a region item's children.
 * Continuation keywords (else/elif/and) that appear as children of the region
 * item split its body into branches — this is the indented form:
 *
 *   - alt: condition
 *     - A → B: msg
 *     - else:
 *       - A → C: fallback
 */
function buildBranches(
  regionItem: MdArtItem,
  actors: string[],
  itemByActor: Map<string, MdArtItem>,
): RegionBranch[] {
  const branches: RegionBranch[] = [{ label: regionItem.value ?? '', events: [] }]
  for (const child of regionItem.children) {
    const lkey = child.label.toLowerCase()
    if (REGION_CONTS.has(lkey)) {
      // Continuation as child: start a new branch whose events come from this child's children
      branches.push({
        label: child.value ?? '',
        events: collectItemEvents(child.children, actors, itemByActor),
      })
    } else {
      // Normal event: add to the current (last) branch
      const evs = collectItemEvents([child], actors, itemByActor)
      branches[branches.length - 1].events.push(...evs)
    }
  }
  return branches
}

function collectItemEvents(
  items: MdArtItem[],
  actors: string[],
  itemByActor: Map<string, MdArtItem>,
): SeqEvent[] {
  const events: SeqEvent[] = []
  let i = 0
  while (i < items.length) {
    const item = items[i]
    const lkey = item.label.toLowerCase()

    if (REGION_OPENERS.has(lkey)) {
      const regionType = lkey as RegionEvent['regionType']
      const branches = buildBranches(item, actors, itemByActor)
      i++
      // Absorb sibling continuations (the flat form: alt and else as top-level siblings)
      while (i < items.length && REGION_CONTS.has(items[i].label.toLowerCase())) {
        const cont = items[i]
        branches.push({
          label: cont.value ?? '',
          events: collectItemEvents(cont.children, actors, itemByActor),
        })
        i++
      }
      events.push({ kind: 'region', regionType, branches })

    } else if (REGION_CONTS.has(lkey)) {
      // Orphan continuation — already consumed by a preceding region opener, skip
      i++

    } else if (DIVIDER_KEYS.has(lkey) || item.label.startsWith('---')) {
      const label = DIVIDER_KEYS.has(lkey) ? (item.value ?? '') : item.label.slice(3).trim()
      events.push({ kind: 'divider', label })
      i++

    } else if (item.label.includes('→')) {
      // Flat message: "A → B" with optional ": message" value
      const msg = parseFlatMessage(item, actors)
      if (msg) events.push(msg)
      i++

    } else {
      // Actor with children (old nested form) OR bare actor ordering hint
      const actor = item.label
      if (actor) {
        addActor(actors, actor)
        itemByActor.set(actor, item)
      }
      // Emit messages from old-form flow children (→-prefixed children have no → in label)
      for (const fc of item.children) {
        if (fc.label.includes('→')) {
          // Nested flat message (e.g. "A → B" as a child of an actor block)
          const msg = parseFlatMessage(fc, actors)
          if (msg) events.push(msg)
        } else if (
          actor &&
          !REGION_OPENERS.has(fc.label.toLowerCase()) &&
          !REGION_CONTS.has(fc.label.toLowerCase())
        ) {
          // Old-form: → Target: msg  (fc.label = target, fc.value = message text)
          const to = fc.label.trim()
          if (!to) continue
          addActor(actors, to)
          events.push({
            kind: 'message',
            from: actor, to,
            msg: fc.value ?? '',
            activateTarget:   fc.attrs.includes('+') || fc.attrs.includes('activate') || undefined,
            deactivateSender: fc.attrs.includes('-') || fc.attrs.includes('deactivate') || undefined,
          })
        }
      }
      i++
    }
  }
  return events
}

function collectSequence(spec: MdArtSpec): {
  actors: string[]
  events: SeqEvent[]
  itemByActor: Map<string, MdArtItem>
} {
  const actors: string[] = []
  const itemByActor = new Map<string, MdArtItem>()
  const events = collectItemEvents(spec.items, actors, itemByActor)
  return { actors, events, itemByActor }
}

// ── Layout computation ────────────────────────────────────────────────────────

function layoutEventsAt(events: SeqEvent[], y0: number): { laid: LayoutEvent[]; endY: number } {
  const laid: LayoutEvent[] = []
  let y = y0

  for (const ev of events) {
    if (ev.kind === 'message') {
      laid.push({ kind: 'message', event: ev, y })
      y += MSG_GAP
    } else if (ev.kind === 'divider') {
      laid.push({ kind: 'divider', event: ev, y })
      y += MSG_GAP
    } else {
      // Region: pad top, lay out each branch, pad bottom
      const regionStartY = y
      y += REGION_PAD_TOP
      const laidBranches: LayoutBranch[] = []

      for (let bi = 0; bi < ev.branches.length; bi++) {
        const br = ev.branches[bi]
        const dividerY = bi === 0 ? undefined : y
        if (bi > 0) y += BRANCH_DIV_H

        const branchStartY = y
        const { laid: branchEvents, endY: branchEnd } = layoutEventsAt(br.events, y)
        // Ensure minimum height even for empty branches
        y = branchStartY + Math.max(branchEnd - branchStartY, REGION_MIN_BRANCH_H)

        laidBranches.push({ label: br.label, dividerY, events: branchEvents })
      }

      y += REGION_PAD_BOTTOM
      laid.push({
        kind: 'region',
        event: ev,
        y: regionStartY,
        h: y - regionStartY,
        branches: laidBranches,
      })
    }
  }

  return { laid, endY: y }
}

function countLayoutEvents(laid: LayoutEvent[]): number {
  let n = 0
  for (const lev of laid) {
    n++
    if (lev.kind === 'region') {
      for (const br of lev.branches) n += countLayoutEvents(br.events)
    }
  }
  return n
}

function actorX(colW: number, index: number): number {
  return (index + 0.5) * colW
}

function buildActorRenders(
  actors: string[],
  itemByActor: Map<string, MdArtItem>,
  actorW: number,
): ActorRender[] {
  const charBudget = Math.max(8, Math.floor((actorW - ACTOR_TEXT_PAD) / 6.5))
  return actors.map(actor => {
    const sourceItem = itemByActor.get(actor)
    const fallback   = parseLink(actor)
    const visible    = sourceItem ? displayLabelValue(sourceItem) : fallback
    const { lines, truncated } = wrapLabel(visible.display, charBudget, ACTOR_MAX_LINES)
    return {
      actor,
      display: visible.display,
      lines,
      url: visible.url,
      tip: sourceItem ? itemTitleTag(sourceItem) : '',
      truncated,
    }
  })
}

function resolveLayout(spec: MdArtSpec): SequenceLayout | null {
  const { actors, events, itemByActor } = collectSequence(spec)
  if (actors.length === 0) return null

  const titleH   = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const colW     = Math.max(MIN_COL_W, BASE_W / actors.length)
  const w        = colW * actors.length
  const actorW   = Math.min(colW - ACTOR_SIDE_PAD, ACTOR_MAX_W)
  const actorRenders = buildActorRenders(actors, itemByActor, actorW)
  const maxActorLines = actorRenders.reduce((m, a) => Math.max(m, a.lines.length), 1)
  const actorH   = ACTOR_VPAD * 2 + maxActorLines * ACTOR_LH
  const actorBoxY = titleH + ACTOR_BOX_TOP_GAP
  const lifeY1   = titleH + actorH + PAD_V

  const { laid: laidEvents, endY } = layoutEventsAt(events, lifeY1 + PAD_V)
  const lifeY2 = Math.max(endY + PAD_V, lifeY1 + MSG_GAP + PAD_V * 2)
  const h      = lifeY2 + LIFE_BOTTOM_PAD

  return {
    actors, laidEvents, actorRenders,
    titleH, colW, actorW, actorH, actorBoxY,
    lifeY1, lifeY2, h, w,
  }
}

// ── Activation bar computation ────────────────────────────────────────────────

interface FlatMsg { event: MessageEvent; y: number; regionBottomY?: number }

/**
 * Flatten all messages in layout order, annotating each with the bottom y
 * of its immediately containing region (if any).  Used by computeActivations
 * so that a [-] deactivation inside a region extends the bar to the region
 * boundary rather than ending it at the arrow's own y — which is the correct
 * UML semantic: the caller is active for the whole duration of the fragment.
 */
function flattenLaidMessages(laid: LayoutEvent[], regionBottomY?: number): FlatMsg[] {
  const result: FlatMsg[] = []
  for (const lev of laid) {
    if (lev.kind === 'message') {
      result.push({ event: lev.event, y: lev.y, regionBottomY })
    } else if (lev.kind === 'region') {
      const bottom = lev.y + lev.h
      for (const br of lev.branches) result.push(...flattenLaidMessages(br.events, bottom))
    }
  }
  return result
}

function computeActivations(layout: SequenceLayout): Map<string, Activation[]> {
  const result = new Map<string, Activation[]>()
  const open   = new Map<string, number>()

  for (const { event: msg, y, regionBottomY } of flattenLaidMessages(layout.laidEvents)) {
    if (msg.activateTarget) open.set(msg.to, y)
    if (msg.deactivateSender) {
      const y1 = open.get(msg.from)
      if (y1 !== undefined) {
        // If deactivating inside a region, extend to the region bottom so the
        // bar spans the whole fragment (either branch may execute at runtime).
        const y2 = regionBottomY !== undefined ? Math.max(y, regionBottomY) : y
        const list = result.get(msg.from) ?? []
        list.push({ y1, y2 })
        result.set(msg.from, list)
        open.delete(msg.from)
      }
    }
  }

  open.forEach((y1, actor) => {
    const list = result.get(actor) ?? []
    list.push({ y1, y2: layout.lifeY2 - 4 })
    result.set(actor, list)
  })

  return result
}

// ── SVG rendering ─────────────────────────────────────────────────────────────

function renderTitle(theme: MdArtTheme, title: string | undefined, w: number): string {
  return title
    ? `<text x="${w / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
}

function renderMarkers(theme: MdArtTheme): string {
  return `<defs>
    <marker id="sq-a" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
      <path d="M0,0 L7,3.5 L0,7 Z" fill="${theme.accent}"/>
    </marker>
    <marker id="sq-b" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
      <path d="M0,0 L7,3.5 L0,7 Z" fill="${theme.textMuted}"/>
    </marker>
  </defs>`
}

function renderActor(
  layout: SequenceLayout,
  actor: ActorRender,
  index: number,
  theme: MdArtTheme,
  animate: boolean,
  instrument: boolean,
): string {
  const x = actorX(layout.colW, index)
  const textBlockH = actor.lines.length * ACTOR_LH
  const textStartY = layout.actorBoxY + (layout.actorH - textBlockH) / 2 + ACTOR_LH - 2
  const fullTip = actor.truncated ? `<title>${escapeXml(actor.display)}</title>` : ''
  const spans = actor.lines
    .map((line, li) => `<tspan x="${x.toFixed(1)}" dy="${li === 0 ? 0 : ACTOR_LH}">${escapeXml(line)}</tspan>`)
    .join('')
  const unit = [
    `<rect x="${(x - layout.actorW / 2).toFixed(1)}" y="${layout.actorBoxY.toFixed(1)}" width="${layout.actorW.toFixed(1)}" height="${layout.actorH}" rx="5" fill="${theme.accent}22" stroke="${theme.accent}aa" stroke-width="1.5">${actor.tip}</rect>`,
    aWrap(`<text x="${x.toFixed(1)}" y="${textStartY.toFixed(1)}" text-anchor="middle" font-size="${ACTOR_FONT_SIZE}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${fullTip}${spans}</text>`, actor.url),
    `<line x1="${x.toFixed(1)}" y1="${layout.lifeY1.toFixed(1)}" x2="${x.toFixed(1)}" y2="${layout.lifeY2.toFixed(1)}" stroke="${theme.textMuted}9a" stroke-width="1" stroke-dasharray="4,4"/>`,
  ].join('')
  return wrapItem(unit, index, animate, instrument)
}

function renderActivationBars(
  layout: SequenceLayout,
  activations: Map<string, Activation[]>,
  theme: MdArtTheme,
): string {
  if (activations.size === 0) return ''
  const bars: string[] = []
  for (const [actor, intervals] of activations) {
    const actorIdx = layout.actors.indexOf(actor)
    if (actorIdx < 0) continue
    const cx = actorX(layout.colW, actorIdx)
    for (const { y1, y2 } of intervals) {
      bars.push(
        `<rect x="${(cx - ACTIVATION_BAR_W / 2).toFixed(1)}" y="${y1.toFixed(1)}" width="${ACTIVATION_BAR_W}" height="${(y2 - y1).toFixed(1)}" rx="2" fill="${theme.accent}22" stroke="${theme.accent}" stroke-width="1.5"/>`,
      )
    }
  }
  return bars.join('')
}

function renderDivider(layout: SequenceLayout, y: number, label: string, theme: MdArtTheme): string {
  const lineY = y + MSG_GAP / 4
  const w = layout.w
  const parts: string[] = [
    `<line x1="8" y1="${lineY.toFixed(1)}" x2="${(w - 8).toFixed(1)}" y2="${lineY.toFixed(1)}" stroke="${theme.textMuted}55" stroke-width="1" stroke-dasharray="4,2"/>`,
  ]
  if (label) {
    const tw = label.length * 5.5 + 12
    parts.push(
      `<rect x="${((w - tw) / 2).toFixed(1)}" y="${(lineY - 9).toFixed(1)}" width="${tw.toFixed(1)}" height="11" rx="2" fill="${theme.bg}"/>`,
      `<text x="${(w / 2).toFixed(1)}" y="${(lineY - 1).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-style="italic">${escapeXml(label)}</text>`,
    )
  }
  return parts.join('')
}

function renderSelfMessage(
  layout: SequenceLayout,
  message: MessageEvent,
  actorIndex: number,
  y: number,
  theme: MdArtTheme,
): string {
  const x1 = actorX(layout.colW, actorIndex)
  const loopExt = layout.colW * SELF_LOOP_EXT_RATIO
  const lx = x1 + loopExt
  const nextLifeline = actorIndex < layout.actors.length - 1
    ? actorX(layout.colW, actorIndex + 1)
    : layout.w - 8
  const maxCharsLoop = Math.max(12, Math.floor((nextLifeline - x1 - 8) / SELF_LABEL_CHAR_PX))
  return [
    `<path d="M${x1.toFixed(1)},${y.toFixed(1)} C${lx.toFixed(1)},${(y - 10).toFixed(1)} ${lx.toFixed(1)},${(y + 10).toFixed(1)} ${x1.toFixed(1)},${(y + MSG_GAP * SELF_LOOP_DROP_RATIO).toFixed(1)}" fill="none" stroke="${theme.accent}cc" stroke-width="1.5" marker-end="url(#sq-a)"/>`,
    message.msg ? `<text x="${(x1 + 4).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="start" font-size="9" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tt(message.msg, maxCharsLoop)}</text>` : '',
  ].join('')
}

function renderCrossMessage(
  layout: SequenceLayout,
  message: MessageEvent,
  fromIndex: number,
  toIndex: number,
  y: number,
  theme: MdArtTheme,
): string {
  const x1 = actorX(layout.colW, fromIndex)
  const x2 = actorX(layout.colW, toIndex)
  const isReturn = toIndex < fromIndex
  const dir = x2 > x1 ? 1 : -1
  const ex1 = x1 + dir * 4
  const ex2 = x2 - dir * 8
  const midX = (ex1 + ex2) / 2
  const maxChars = Math.max(8, Math.floor(Math.abs(ex2 - ex1) / MESSAGE_LABEL_CHAR_PX))
  const parts: string[] = [
    `<line x1="${ex1.toFixed(1)}" y1="${y.toFixed(1)}" x2="${ex2.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${isReturn ? theme.textMuted : theme.accent}" stroke-width="1.5"${isReturn ? ' stroke-dasharray="5,3"' : ''} marker-end="${isReturn ? 'url(#sq-b)' : 'url(#sq-a)'}"/>`,
  ]
  if (message.msg) {
    if (message.msg.length <= maxChars) {
      parts.push(`<text x="${midX.toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tt(message.msg, maxChars)}</text>`)
    } else {
      // Find word boundary for line break
      let splitIdx = message.msg.lastIndexOf(' ', maxChars)
      if (splitIdx <= 0) splitIdx = maxChars // No space found, fall back to char split
      const line1 = message.msg.slice(0, splitIdx)
      const line2 = message.msg.slice(splitIdx).trimStart()
      parts.push(`<text x="${midX.toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.textMuted}" ${FONT_SANS_ATTR}><title>${escapeXml(message.msg)}</title>${renderInlineMarkdown(truncate(line1, maxChars))}</text>`)
      // Line 2 is a separate <text> element — an SVG <title> only covers the
      // element it's nested in, so line1's title doesn't extend hover
      // coverage down to line2's glyphs. Duplicate it here so the full
      // message tooltips regardless of which line the pointer is over.
      parts.push(`<text x="${midX.toFixed(1)}" y="${(y + 12).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.textMuted}" ${FONT_SANS_ATTR}><title>${escapeXml(message.msg)}</title>${renderInlineMarkdown(truncate(line2, maxChars))}</text>`)
    }
  }
  return parts.join('')
}

function renderMessage(
  layout: SequenceLayout,
  message: MessageEvent,
  y: number,
  animIdx: number,
  theme: MdArtTheme,
  animate: boolean,
  instrument: boolean,
): string {
  const fromIndex = layout.actors.indexOf(message.from)
  const toIndex   = layout.actors.indexOf(message.to)
  if (fromIndex < 0 || toIndex < 0) return ''
  const unit = fromIndex === toIndex
    ? renderSelfMessage(layout, message, fromIndex, y, theme)
    : renderCrossMessage(layout, message, fromIndex, toIndex, y, theme)
  return wrapItem(unit, animIdx, animate, instrument)
}

// ── Region box rendering ──────────────────────────────────────────────────────

function regionTagText(regionType: string, branchLabel: string): string {
  return branchLabel ? `${regionType} [${branchLabel}]` : regionType
}

function contTagText(regionType: string, branchLabel: string): string {
  if (regionType === 'par') return branchLabel ? `and [${branchLabel}]` : 'and'
  // alt / opt
  return branchLabel ? `elif [${branchLabel}]` : 'else'
}

function renderRegionTag(
  x: number,
  y: number,
  text: string,
  theme: MdArtTheme,
  alignRight = false,
): string {
  const tw = Math.min(text.length * REGION_TAG_CHAR_PX + 10, 200)
  const rx = alignRight ? x - tw : x
  return [
    `<rect x="${rx.toFixed(1)}" y="${y.toFixed(1)}" width="${tw.toFixed(1)}" height="${REGION_TAG_H}" rx="2" fill="${theme.accent}33" stroke="${theme.accent}88" stroke-width="1"/>`,
    `<text x="${(rx + 5).toFixed(1)}" y="${(y + REGION_TAG_H - 4).toFixed(1)}" font-size="${REGION_TAG_H - 5}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(text)}</text>`,
  ].join('')
}

function renderRegionBox(
  lev: LayoutRegion,
  layout: SequenceLayout,
  theme: MdArtTheme,
  animIdx: number,
  animate: boolean,
  instrument: boolean,
): string {
  const boxX = REGION_BOX_MARGIN
  const boxW = layout.w - 2 * REGION_BOX_MARGIN
  const parts: string[] = []

  // Main dashed border — stronger opacity so it's legible on dark backgrounds
  parts.push(
    `<rect x="${boxX}" y="${lev.y.toFixed(1)}" width="${boxW.toFixed(1)}" height="${lev.h.toFixed(1)}" rx="4" fill="${theme.accent}0d" stroke="${theme.accent}aa" stroke-width="1.5" stroke-dasharray="6,3"/>`,
  )

  // First-branch label tag — top-left corner, overlaps the border (standard UML fragment style)
  const mainTag = regionTagText(lev.event.regionType, lev.branches[0]?.label ?? '')
  parts.push(renderRegionTag(boxX, lev.y, mainTag, theme))

  // Branch dividers + tags for subsequent branches
  for (let bi = 1; bi < lev.branches.length; bi++) {
    const br = lev.branches[bi]
    if (br.dividerY === undefined) continue
    const lineY = br.dividerY + Math.round(BRANCH_DIV_H / 2)
    parts.push(
      `<line x1="${boxX}" y1="${lineY}" x2="${(boxX + boxW).toFixed(1)}" y2="${lineY}" stroke="${theme.accent}99" stroke-width="1.5" stroke-dasharray="6,3"/>`,
    )
    const tagText = contTagText(lev.event.regionType, br.label)
    // Tag sits above the divider line, left-aligned — consistent with the main tag
    const tagY = lineY - REGION_TAG_H
    parts.push(renderRegionTag(boxX, tagY, tagText, theme))
  }

  return wrapItem(parts.join(''), animIdx, animate, instrument)
}

// ── Recursive layout renderer ─────────────────────────────────────────────────

function renderLaidEvents(
  laid: LayoutEvent[],
  layout: SequenceLayout,
  theme: MdArtTheme,
  animate: boolean,
  instrument: boolean,
  counter: { idx: number },
): string[] {
  const parts: string[] = []
  for (const lev of laid) {
    if (lev.kind === 'message') {
      const svg = renderMessage(layout, lev.event, lev.y, counter.idx++, theme, animate, instrument)
      if (svg) parts.push(svg)
    } else if (lev.kind === 'divider') {
      const unit = renderDivider(layout, lev.y, lev.event.label, theme)
      parts.push(wrapItem(unit, counter.idx++, animate, instrument))
    } else {
      // Region box first (renders behind messages)
      parts.push(renderRegionBox(lev, layout, theme, counter.idx++, animate, instrument))
      // Then contained events recursively
      for (const br of lev.branches) {
        parts.push(...renderLaidEvents(br.events, layout, theme, animate, instrument, counter))
      }
    }
  }
  return parts
}

function renderSvg(layout: SequenceLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${layout.w} ${layout.h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${renderTitle(theme, spec.title, layout.w)}
  ${parts.join('\n  ')}
</svg>`
}

// ── Entry point ───────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const layout = resolveLayout(spec)
  if (!layout) return renderEmpty(theme)

  const animate    = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const activations = computeActivations(layout)

  const totalItems = layout.actors.length + countLayoutEvents(layout.laidEvents)
  const counter    = { idx: layout.actors.length }

  const parts: string[] = [
    renderMarkers(theme),
    ...layout.actorRenders.map((actor, i) =>
      renderActor(layout, actor, i, theme, animate, instrument),
    ),
    renderActivationBars(layout, activations, theme),
    ...renderLaidEvents(layout.laidEvents, layout, theme, animate, instrument, counter),
  ]

  if (animate) parts.unshift(seqSpotlightCSS(totalItems, spec, { scale: false }))
  return renderSvg(layout, spec, theme, parts)
}
