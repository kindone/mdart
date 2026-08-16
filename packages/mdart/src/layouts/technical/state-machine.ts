import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, renderEmpty, aWrap, itemTitleTag, displayLabelValue, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR, boxEdge } from '../shared'

const W = 580
const H = 380
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 8
const R_MAX = 150
const R_MIN = 90
const R_BASE = 55
const R_PER_STATE = 18
const STATE_W = 100
const STATE_H = 38
const STATE_RX = 6
const STATE_TEXT_W = STATE_W - 8
const STATE_TEXT_H = STATE_H - 6
const EDGE_EXIT_PAD = 2
const EDGE_ENTER_PAD = 3
const CURVE_MAG = 30
const BIDI_CURVE_MAG = 44
const LABEL_CURVE_DELTA = 12
const ENTRY_DOT_OFFSET = 34
const ENTRY_ARROW_GAP = 6
const SELF_LOOP_X = 26
const SELF_LOOP_Y_TOP = 28
const SELF_LOOP_Y_BOTTOM = 12
const SELF_LABEL_MAX = 12
const EDGE_LABEL_MAX = 14
const EDGE_LABEL_PAD = 8
const EDGE_LABEL_CHAR_PX = 5.5

interface Point {
  x: number
  y: number
}

interface StateMachineLayout {
  titleH: number
  cx: number
  cy: number
  radius: number
  positions: Point[]
  stateIndex: Map<string, number>
  transitionSet: Set<string>
}

function resolveLayout(states: MdArtItem[], spec: MdArtSpec): StateMachineLayout {
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const cx = W / 2
  const cy = (H - titleH) / 2 + titleH
  const radius = Math.min(R_MAX, Math.max(R_MIN, R_BASE + states.length * R_PER_STATE))
  const positions = states.map((_, index) => {
    const angle = (2 * Math.PI * index / states.length) - Math.PI / 2
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
  })
  const stateIndex = new Map(states.map((state, index) => [state.label, index]))
  return {
    titleH,
    cx,
    cy,
    radius,
    positions,
    stateIndex,
    transitionSet: collectTransitionSet(states, stateIndex),
  }
}

function collectTransitionSet(states: MdArtItem[], stateIndex: Map<string, number>): Set<string> {
  const transitionSet = new Set<string>()
  states.forEach((state, sourceIndex) => {
    state.flowChildren.forEach(target => {
      const targetIndex = stateIndex.get(target.label) ?? -1
      if (targetIndex >= 0 && sourceIndex !== targetIndex) {
        transitionSet.add(`${sourceIndex}-${targetIndex}`)
      }
    })
  })
  return transitionSet
}

function renderTitle(theme: MdArtTheme, title: string | undefined): string {
  return title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
}

function renderDefs(theme: MdArtTheme): string {
  return `<defs>
    <marker id="sm-a" markerWidth="7" markerHeight="7" refX="7" refY="3.5" orient="auto">
      <path d="M0,0 L7,3.5 L0,7 Z" fill="${theme.accent}99"/>
    </marker>
  </defs>`
}


function renderSelfTransition(src: Point, value: string | undefined, theme: MdArtTheme): string {
  const bx = src.x + STATE_W / 2
  const by = src.y - STATE_H / 2
  return [
    `<path d="M${(bx - 4).toFixed(1)},${by.toFixed(1)} C${(bx + SELF_LOOP_X).toFixed(1)},${(by - SELF_LOOP_Y_TOP).toFixed(1)} ${(bx + SELF_LOOP_X).toFixed(1)},${(by + SELF_LOOP_Y_BOTTOM).toFixed(1)} ${(bx - 4).toFixed(1)},${(by + STATE_H).toFixed(1)}" fill="none" stroke="${theme.accent}66" stroke-width="1.5" marker-end="url(#sm-a)"/>`,
    value ? `<text x="${(bx + 32).toFixed(1)}" y="${(by - 6).toFixed(1)}" font-size="9" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tt(value, SELF_LABEL_MAX)}</text>` : '',
  ].join('')
}

function transitionCurve(layout: StateMachineLayout, sourceIndex: number, targetIndex: number): {
  p1: Point
  p2: Point
  cp: Point
  label: Point
} {
  const src = layout.positions[sourceIndex]
  const dst = layout.positions[targetIndex]
  const dx = dst.x - src.x
  const dy = dst.y - src.y
  const len = Math.sqrt(dx * dx + dy * dy) || 1
  const nx = dx / len
  const ny = dy / len
  const p1 = boxEdge(src.x, src.y, nx, ny, STATE_W / 2, STATE_H / 2, EDGE_EXIT_PAD)
  const p2 = boxEdge(dst.x, dst.y, -nx, -ny, STATE_W / 2, STATE_H / 2, EDGE_ENTER_PAD)
  const midX = (p1.x + p2.x) / 2
  const midY = (p1.y + p2.y) / 2
  const toCenterX = layout.cx - midX
  const toCenterY = layout.cy - midY
  const dot = (-ny) * toCenterX + nx * toCenterY
  const naturalSign = dot < 0 ? 1 : -1
  const isBidi = layout.transitionSet.has(`${targetIndex}-${sourceIndex}`)
  const curveMag = isBidi ? BIDI_CURVE_MAG : CURVE_MAG
  const effectiveSign = (isBidi && sourceIndex > targetIndex) ? -naturalSign : naturalSign
  return {
    p1,
    p2,
    cp: {
      x: midX - ny * curveMag * effectiveSign,
      y: midY + nx * curveMag * effectiveSign,
    },
    label: {
      x: midX - ny * (curveMag - LABEL_CURVE_DELTA) * effectiveSign,
      y: midY + nx * (curveMag - LABEL_CURVE_DELTA) * effectiveSign,
    },
  }
}

function renderCrossTransition(layout: StateMachineLayout, sourceIndex: number, targetIndex: number, value: string | undefined, theme: MdArtTheme): string {
  const { p1, p2, cp, label } = transitionCurve(layout, sourceIndex, targetIndex)
  const labelW = Math.min((value?.length ?? 0) * EDGE_LABEL_CHAR_PX + EDGE_LABEL_PAD, 90)
  return [
    `<path d="M${p1.x.toFixed(1)},${p1.y.toFixed(1)} Q${cp.x.toFixed(1)},${cp.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}" fill="none" stroke="${theme.accent}66" stroke-width="1.5" marker-end="url(#sm-a)"/>`,
    value ? `<rect x="${(label.x - labelW / 2).toFixed(1)}" y="${(label.y - 9).toFixed(1)}" width="${labelW.toFixed(1)}" height="12" rx="3" fill="${theme.surface}" opacity="0.88"/>` : '',
    value ? `<text x="${label.x.toFixed(1)}" y="${label.y.toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tt(value, EDGE_LABEL_MAX)}</text>` : '',
  ].join('')
}

function renderTransition(layout: StateMachineLayout, sourceIndex: number, target: { label: string; value?: string }, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const targetIndex = layout.stateIndex.get(target.label) ?? -1
  if (targetIndex < 0) return ''
  const unit = sourceIndex === targetIndex
    ? renderSelfTransition(layout.positions[sourceIndex], target.value, theme)
    : renderCrossTransition(layout, sourceIndex, targetIndex, target.value, theme)
  const animationIndex = sourceIndex === targetIndex ? sourceIndex : targetIndex
  return wrapItem(unit, animationIndex, animate, instrument)
}

function renderTransitions(layout: StateMachineLayout, states: MdArtItem[], theme: MdArtTheme, animate: boolean, instrument: boolean): string[] {
  return states.flatMap((state, sourceIndex) =>
    state.flowChildren.map(target => renderTransition(layout, sourceIndex, target, theme, animate, instrument)).filter(Boolean),
  )
}

function renderEntryArrow(layout: StateMachineLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const fp = layout.positions[0]
  const dotX = fp.x - STATE_W / 2 - ENTRY_DOT_OFFSET
  const unit = [
    `<circle cx="${dotX.toFixed(1)}" cy="${fp.y.toFixed(1)}" r="7" fill="${theme.text}"/>`,
    `<line x1="${(dotX + 7).toFixed(1)}" y1="${fp.y.toFixed(1)}" x2="${(fp.x - STATE_W / 2 - ENTRY_ARROW_GAP).toFixed(1)}" y2="${fp.y.toFixed(1)}" stroke="${theme.text}" stroke-width="2.5" marker-end="url(#sm-a)"/>`,
  ].join('')
  return wrapItem(unit, 0, animate, instrument)
}

function isFinalState(state: MdArtItem): boolean {
  const label = state.label.toLowerCase()
  return state.attrs.includes('final') || label === 'end' || label === 'final'
}

function renderFinalHalo(pos: Point, theme: MdArtTheme): string {
  return `<rect x="${(pos.x - STATE_W/2 - 4).toFixed(1)}" y="${(pos.y - STATE_H/2 - 4).toFixed(1)}" width="${STATE_W + 8}" height="${STATE_H + 8}" rx="9" fill="none" stroke="${theme.accent}" stroke-width="2"/>`
}

function renderStateBox(state: MdArtItem, pos: Point, index: number, theme: MdArtTheme): string {
  const final = isFinalState(state)
  const stroke = index === 0 ? theme.primary : final ? theme.accent : `${theme.accent}66`
  const fill = final ? `${theme.accent}18` : theme.surface
  return `<rect x="${(pos.x - STATE_W/2).toFixed(1)}" y="${(pos.y - STATE_H/2).toFixed(1)}" width="${STATE_W}" height="${STATE_H}" rx="${STATE_RX}" fill="${fill}" stroke="${stroke}" stroke-width="1.5">${itemTitleTag(state)}</rect>`
}

function renderStateText(state: MdArtItem, pos: Point, theme: MdArtTheme): string {
  const { display, url } = displayLabelValue(state)
  const { fontSize, lineHeight, results: [{ lines, truncated }] } =
    fitTextToWidthShared([display], STATE_TEXT_W, {
      maxSize: 11,
      minSize: 7,
      maxLines: 2,
      boxH: STATE_TEXT_H,
    })
  const tip = truncated ? `<title>${escapeXml(display)}</title>` : ''
  const firstY = pos.y - ((lines.length - 1) * lineHeight) / 2 + lineHeight * 0.35
  const tspans = lines
    .map((line, index) => `<tspan x="${pos.x.toFixed(1)}" dy="${index === 0 ? 0 : lineHeight.toFixed(1)}">${escapeXml(line)}</tspan>`)
    .join('')
  return aWrap(`${tip}<text x="${pos.x.toFixed(1)}" y="${firstY.toFixed(1)}" text-anchor="middle" font-size="${fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR}>${tspans}</text>`, url)
}

function renderStateNode(state: MdArtItem, pos: Point, index: number, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const unit = [
    isFinalState(state) ? renderFinalHalo(pos, theme) : '',
    renderStateBox(state, pos, index, theme),
    renderStateText(state, pos, theme),
  ].join('')
  return wrapItem(unit, index, animate, instrument)
}

function renderStates(layout: StateMachineLayout, states: MdArtItem[], theme: MdArtTheme, animate: boolean, instrument: boolean): string[] {
  return states.map((state, index) =>
    renderStateNode(state, layout.positions[index], index, theme, animate, instrument),
  )
}

function renderSvg(spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${renderTitle(theme, spec.title)}
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const states = spec.items
  if (states.length === 0) return renderEmpty(theme)

  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layout = resolveLayout(states, spec)
  const parts = [
    renderDefs(theme),
    ...renderTransitions(layout, states, theme, animate, instrument),
    renderEntryArrow(layout, theme, animate, instrument),
    ...renderStates(layout, states, theme, animate, instrument),
  ]

  if (animate) parts.unshift(seqSpotlightCSS(states.length, spec, { scale: false }))
  return renderSvg(spec, theme, parts)
}
