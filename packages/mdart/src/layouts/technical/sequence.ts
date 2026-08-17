import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, wrapLabel, renderEmpty, parseLink, aWrap, itemTitleTag, displayLabelValue, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

// ── Layout constants ──────────────────────────────────────────────────────────
const BASE_W = 600          // minimum canvas width; expands when actors need more room
const MIN_COL_W = 110       // narrowest a single column can be
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 8
const MSG_GAP = 36
const PAD_V = 16
const ACTOR_LH = 13
const ACTOR_VPAD = 7
const ACTOR_MAX_LINES = 2
const ACTOR_MAX_W = 96
const ACTOR_SIDE_PAD = 16
const ACTOR_TEXT_PAD = 10
const ACTOR_FONT_SIZE = 11
const ACTOR_BOX_TOP_GAP = 8
const LIFE_BOTTOM_PAD = 16
const SELF_LOOP_EXT_RATIO = 0.38
const SELF_LOOP_DROP_RATIO = 0.55
const SELF_LABEL_CHAR_PX = 5
const MESSAGE_LABEL_CHAR_PX = 7
const ACTIVATION_BAR_W = 10

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  from: string
  to: string
  msg: string
  isDivider?: boolean
  dividerLabel?: string
  activateTarget?: boolean   // [+] or [activate] on the arrow — bar starts on `to`
  deactivateSender?: boolean // [-] or [deactivate] on the arrow — bar ends on `from`
}

interface Activation {
  y1: number
  y2: number
}

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
  messages: Message[]
  actorRenders: ActorRender[]
  titleH: number
  colW: number
  actorW: number
  actorH: number
  actorBoxY: number
  lifeY1: number
  lifeY2: number
  h: number
  w: number   // dynamic total canvas width
}

// ── Data collection ───────────────────────────────────────────────────────────

function collectSequence(spec: MdArtSpec): { actors: string[]; messages: Message[]; itemByActor: Map<string, MdArtItem> } {
  const messages: Message[] = []
  const actors: string[] = []
  const itemByActor = new Map<string, MdArtItem>()
  const addActor = (name: string) => {
    if (!actors.includes(name)) actors.push(name)
  }

  spec.items.forEach(item => {
    // Divider: top-level item whose label starts with --- and has no flow-children
    if (item.label.startsWith('---') && item.flowChildren.length === 0) {
      const dividerLabel = item.label.slice(3).trim()
      messages.push({ from: '', to: '', msg: '', isDivider: true, dividerLabel })
      return
    }

    addActor(item.label)
    itemByActor.set(item.label, item)
    item.flowChildren.forEach(fc => {
      addActor(fc.label)
      const activate = fc.attrs.includes('+') || fc.attrs.includes('activate')
      const deactivate = fc.attrs.includes('-') || fc.attrs.includes('deactivate')
      messages.push({
        from: item.label,
        to: fc.label,
        msg: fc.value ?? '',
        activateTarget: activate || undefined,
        deactivateSender: deactivate || undefined,
      })
    })
  })

  return { actors, messages, itemByActor }
}

// ── Layout resolution ─────────────────────────────────────────────────────────

function actorX(layout: SequenceLayout, index: number): number {
  return (index + 0.5) * layout.colW
}

function buildActorRenders(actors: string[], itemByActor: Map<string, MdArtItem>, actorW: number): ActorRender[] {
  const charBudget = Math.max(8, Math.floor((actorW - ACTOR_TEXT_PAD) / 6.5))
  return actors.map(actor => {
    const sourceItem = itemByActor.get(actor)
    const fallback = parseLink(actor)
    const visible = sourceItem ? displayLabelValue(sourceItem) : fallback
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
  const { actors, messages, itemByActor } = collectSequence(spec)
  if (actors.length === 0) return null

  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const colW = Math.max(MIN_COL_W, BASE_W / actors.length)
  const w = colW * actors.length
  const actorW = Math.min(colW - ACTOR_SIDE_PAD, ACTOR_MAX_W)
  const actorRenders = buildActorRenders(actors, itemByActor, actorW)
  const maxActorLines = actorRenders.reduce((m, actor) => Math.max(m, actor.lines.length), 1)
  const actorH = ACTOR_VPAD * 2 + maxActorLines * ACTOR_LH
  const h = titleH + actorH + PAD_V + Math.max(messages.length, 1) * MSG_GAP + PAD_V + LIFE_BOTTOM_PAD
  const actorBoxY = titleH + ACTOR_BOX_TOP_GAP
  const lifeY1 = titleH + actorH + PAD_V
  const lifeY2 = h - LIFE_BOTTOM_PAD

  return { actors, messages, actorRenders, titleH, colW, actorW, actorH, actorBoxY, lifeY1, lifeY2, h, w }
}

// ── Activation bar computation ────────────────────────────────────────────────

function computeActivations(layout: SequenceLayout): Map<string, Activation[]> {
  const result = new Map<string, Activation[]>()
  const open = new Map<string, number>() // actor name → y where its bar started

  layout.messages.forEach((msg, idx) => {
    if (msg.isDivider) return
    const y = layout.lifeY1 + PAD_V + idx * MSG_GAP

    if (msg.activateTarget) {
      open.set(msg.to, y)
    }
    if (msg.deactivateSender) {
      const y1 = open.get(msg.from)
      if (y1 !== undefined) {
        const list = result.get(msg.from) ?? []
        list.push({ y1, y2: y })
        result.set(msg.from, list)
        open.delete(msg.from)
      }
    }
  })

  // Auto-close any still-open bars at the bottom of the lifeline
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

function renderActor(layout: SequenceLayout, actor: ActorRender, index: number, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const x = actorX(layout, index)
  const textBlockH = actor.lines.length * ACTOR_LH
  const textStartY = layout.actorBoxY + (layout.actorH - textBlockH) / 2 + ACTOR_LH - 2
  const fullTip = actor.truncated ? `<title>${escapeXml(actor.display)}</title>` : ''
  const spans = actor.lines
    .map((line, li) => `<tspan x="${x.toFixed(1)}" dy="${li === 0 ? 0 : ACTOR_LH}">${escapeXml(line)}</tspan>`)
    .join('')
  const unit = [
    `<rect x="${(x - layout.actorW/2).toFixed(1)}" y="${layout.actorBoxY.toFixed(1)}" width="${layout.actorW.toFixed(1)}" height="${layout.actorH}" rx="5" fill="${theme.accent}22" stroke="${theme.accent}aa" stroke-width="1.5">${actor.tip}</rect>`,
    aWrap(`<text x="${x.toFixed(1)}" y="${textStartY.toFixed(1)}" text-anchor="middle" font-size="${ACTOR_FONT_SIZE}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${fullTip}${spans}</text>`, actor.url),
    `<line x1="${x.toFixed(1)}" y1="${layout.lifeY1.toFixed(1)}" x2="${x.toFixed(1)}" y2="${layout.lifeY2.toFixed(1)}" stroke="${theme.textMuted}9a" stroke-width="1" stroke-dasharray="4,4"/>`,
  ].join('')
  return wrapItem(unit, index, animate, instrument)
}

function renderActivationBars(layout: SequenceLayout, activations: Map<string, Activation[]>, theme: MdArtTheme): string {
  if (activations.size === 0) return ''
  const bars: string[] = []
  for (const [actor, intervals] of activations) {
    const actorIdx = layout.actors.indexOf(actor)
    if (actorIdx < 0) continue
    const cx = actorX(layout, actorIdx)
    for (const { y1, y2 } of intervals) {
      bars.push(
        `<rect x="${(cx - ACTIVATION_BAR_W / 2).toFixed(1)}" y="${y1.toFixed(1)}" width="${ACTIVATION_BAR_W}" height="${(y2 - y1).toFixed(1)}" rx="2" fill="${theme.accent}22" stroke="${theme.accent}" stroke-width="1.5"/>`
      )
    }
  }
  return bars.join('')
}

function renderDivider(layout: SequenceLayout, y: number, label: string, theme: MdArtTheme): string {
  const lineY = y - MSG_GAP / 4   // sit above the mid-gap point
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

function renderSelfMessage(layout: SequenceLayout, message: Message, actorIndex: number, y: number, theme: MdArtTheme): string {
  const x1 = actorX(layout, actorIndex)
  const loopExt = layout.colW * SELF_LOOP_EXT_RATIO
  const lx = x1 + loopExt
  const nextLifeline = actorIndex < layout.actors.length - 1 ? actorX(layout, actorIndex + 1) : layout.w - 8
  const maxCharsLoop = Math.max(12, Math.floor((nextLifeline - x1 - 8) / SELF_LABEL_CHAR_PX))
  return [
    `<path d="M${x1.toFixed(1)},${y.toFixed(1)} C${lx.toFixed(1)},${(y - 10).toFixed(1)} ${lx.toFixed(1)},${(y + 10).toFixed(1)} ${x1.toFixed(1)},${(y + MSG_GAP * SELF_LOOP_DROP_RATIO).toFixed(1)}" fill="none" stroke="${theme.accent}cc" stroke-width="1.5" marker-end="url(#sq-a)"/>`,
    message.msg ? `<text x="${(x1 + 4).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="start" font-size="9" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tt(message.msg, maxCharsLoop)}</text>` : '',
  ].join('')
}

function renderCrossMessage(layout: SequenceLayout, message: Message, fromIndex: number, toIndex: number, y: number, theme: MdArtTheme): string {
  const x1 = actorX(layout, fromIndex)
  const x2 = actorX(layout, toIndex)
  const isReturn = toIndex < fromIndex
  const dir = x2 > x1 ? 1 : -1
  const ex1 = x1 + dir * 4
  const ex2 = x2 - dir * 8
  const midX = (ex1 + ex2) / 2
  const maxChars = Math.max(8, Math.floor(Math.abs(ex2 - ex1) / MESSAGE_LABEL_CHAR_PX))
  return [
    `<line x1="${ex1.toFixed(1)}" y1="${y.toFixed(1)}" x2="${ex2.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${isReturn ? theme.textMuted : theme.accent}" stroke-width="1.5"${isReturn ? ' stroke-dasharray="5,3"' : ''} marker-end="${isReturn ? 'url(#sq-b)' : 'url(#sq-a)'}"/>`,
    message.msg ? `<text x="${midX.toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tt(message.msg, maxChars)}</text>` : '',
  ].join('')
}

function renderMessage(layout: SequenceLayout, message: Message, index: number, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const y = layout.lifeY1 + PAD_V + index * MSG_GAP

  if (message.isDivider) {
    const unit = renderDivider(layout, y, message.dividerLabel ?? '', theme)
    return wrapItem(unit, layout.actors.length + index, animate, instrument)
  }

  const fromIndex = layout.actors.indexOf(message.from)
  const toIndex = layout.actors.indexOf(message.to)
  if (fromIndex < 0 || toIndex < 0) return ''
  const unit = fromIndex === toIndex
    ? renderSelfMessage(layout, message, fromIndex, y, theme)
    : renderCrossMessage(layout, message, fromIndex, toIndex, y, theme)
  return wrapItem(unit, layout.actors.length + index, animate, instrument)
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

  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const activations = computeActivations(layout)

  const parts = [
    renderMarkers(theme),
    ...layout.actorRenders.map((actor, index) => renderActor(layout, actor, index, theme, animate, instrument)),
    renderActivationBars(layout, activations, theme),
    ...layout.messages.map((message, index) => renderMessage(layout, message, index, theme, animate, instrument)).filter(Boolean),
  ]

  if (animate) parts.unshift(seqSpotlightCSS(layout.actors.length + layout.messages.length, spec, { scale: false }))
  return renderSvg(layout, spec, theme, parts)
}
