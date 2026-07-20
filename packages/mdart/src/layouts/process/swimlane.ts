import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, titleEl, renderEmpty, aWrap, itemTitleTag, displayLabel, escapeXml, parseLink, shouldAnimate, seqSpotlightCSS, seqSpotlightTiming, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 560
const LABEL_W = 56
const LANE_H = 52
const STEP_H = 34
const GAP = 1
const TITLE_H_WITH_TITLE = 28
const TITLE_H_NO_TITLE = 8
const ARROW_ID = 'sl-arr'

interface SharedTimeline {
  rankCount: number
  rankFor: (count: number, stepIndex: number) => number
  fracFor: (count: number, stepIndex: number) => number
}

interface SwimlaneTiming {
  totalEntranceMs: number
  enterDur: number
  stepMs: number
  loopCount: number
  totalLoopMs: number
  loopStartMs: number
}

interface StepLayout {
  item: MdArtItem
  index: number
  x: number
  y: number
  width: number
  fill: string
  isDone: boolean
  display: string
  url: string | null
  fit: ReturnType<typeof fitTextToWidthShared>
}

interface LaneLayout {
  item: MdArtItem
  index: number
  y: number
  fill: string
  display: ReturnType<typeof displayLabel>
  labelFit: ReturnType<typeof fitTextToWidthShared>
  steps: StepLayout[]
  stepGap: number
}

interface SwimlaneLayout {
  titleH: number
  height: number
  timeline: SharedTimeline
  timing: SwimlaneTiming
  lanes: LaneLayout[]
}

function svgWrapProcess(height: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${height}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

function lcm(a: number, b: number): number {
  return a / gcd(a, b) * b
}

function numeratorFor(count: number, stepIndex: number, denom: number): number {
  return count > 1 ? stepIndex * (denom / (count - 1)) : denom
}

function resolveSharedTimeline(items: MdArtItem[]): SharedTimeline {
  const counts = items.map(item => item.children.length).filter(count => count > 0)
  const denom = counts.filter(count => count > 1).reduce((acc, count) => lcm(acc, count - 1), 1)
  const allNumerators = new Set<number>()
  counts.forEach(count => {
    for (let stepIndex = 0; stepIndex < count; stepIndex++) allNumerators.add(numeratorFor(count, stepIndex, denom))
  })
  const ranks = Array.from(allNumerators).sort((a, b) => a - b)
  const rankOf = new Map(ranks.map((value, index) => [value, index]))
  const rankCount = ranks.length
  const rankFor = (count: number, stepIndex: number) => rankOf.get(numeratorFor(count, stepIndex, denom)) ?? rankCount - 1
  return {
    rankCount,
    rankFor,
    fracFor: (count, stepIndex) => rankCount > 1 ? rankFor(count, stepIndex) / (rankCount - 1) : 1,
  }
}

function resolveStepWidth(stepCount: number): number {
  return stepCount > 0 ? Math.min(90, (W - LABEL_W - 8) / stepCount - 6) : 0
}

function resolveStepGap(stepCount: number, stepW: number): number {
  return stepCount > 1 ? ((W - LABEL_W - 8) - stepCount * stepW) / (stepCount - 1) : 0
}

function stepDisplay(step: MdArtItem): string {
  const { display } = parseLink(step.label)
  return step.value ? `${display}: ${step.value}` : display
}

function resolveLanes(spec: MdArtSpec, theme: MdArtTheme): LaneLayout[] {
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  return spec.items.map((item, index) => {
    const y = titleH + index * (LANE_H + GAP)
    const t = spec.items.length > 1 ? index / (spec.items.length - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    const display = displayLabel(item, { attrs: true })
    const labelFit = fitTextToWidthShared([display.display], LABEL_W - 8, { maxSize: 9, minSize: 6.5, maxLines: 2 })
    const stepW = resolveStepWidth(item.children.length)
    const stepGap = resolveStepGap(item.children.length, stepW)
    const stepBoxH = STEP_H - 6
    const steps = item.children.map((step, stepIndex) => {
      const x = LABEL_W + 4 + stepIndex * (stepW + stepGap)
      const yStep = y + (LANE_H - STEP_H) / 2
      const isDone = step.attrs.includes('done')
      const stepFill = isDone ? theme.accent : fill
      const { url } = parseLink(step.label)
      const displayText = stepDisplay(step)
      const fit = fitTextToWidthShared([displayText], Math.max(20, stepW - 10), {
        maxSize: 9,
        minSize: 6,
        maxLines: 3,
        boxH: stepBoxH,
      })
      return { item: step, index: stepIndex, x, y: yStep, width: stepW, fill: stepFill, isDone, display: displayText, url, fit }
    })
    return { item, index, y, fill, display, labelFit, steps, stepGap }
  })
}

function resolveLayout(spec: MdArtSpec): SwimlaneLayout {
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const timeline = resolveSharedTimeline(spec.items)
  return {
    titleH,
    height: titleH + spec.items.length * (LANE_H + GAP) + 8,
    timeline,
    timing: seqSpotlightTiming(timeline.rankCount || 1, spec, { scale: false }),
    lanes: [],
  }
}

function renderDefs(theme: MdArtTheme): string {
  return `<defs><marker id="${ARROW_ID}" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><polygon points="0,0 6,3 0,6" fill="${theme.primary}"/></marker></defs>`
}

function renderCenteredLines(opts: {
  x: number
  centerY: number
  lines: string[]
  truncated: boolean
  fullText: string
  fontSize: number
  lineGap: number
  fill: string
  fontWeight: string
}): string {
  const { x, centerY, lines, truncated, fullText, fontSize, lineGap, fill, fontWeight } = opts
  return lines.map((line, index) => {
    const y = centerY + (index - (lines.length - 1) / 2) * lineGap
    const tip = index === 0 && truncated ? `<title>${escapeXml(fullText)}</title>` : ''
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="${fontSize}" fill="${fill}" ${FONT_SANS_ATTR} font-weight="${fontWeight}">${tip}${escapeXml(line)}</text>`
  }).join('')
}

function renderLaneChrome(lane: LaneLayout, theme: MdArtTheme): string[] {
  const parts = [
    `<rect x="0" y="${lane.y.toFixed(1)}" width="${W}" height="${LANE_H}" fill="${lane.fill}0a"/>`,
  ]
  if (lane.index > 0) parts.push(`<line x1="0" y1="${lane.y.toFixed(1)}" x2="${W}" y2="${lane.y.toFixed(1)}" stroke="${theme.border}" stroke-width="0.5"/>`)
  parts.push(`<rect x="2" y="${(lane.y + 2).toFixed(1)}" width="${LABEL_W - 4}" height="${LANE_H - 4}" rx="4" fill="${lane.fill}33" stroke="${lane.fill}66" stroke-width="1">${itemTitleTag(lane.item)}</rect>`)
  return parts
}

function renderLaneLabel(lane: LaneLayout, theme: MdArtTheme): string {
  const { fontSize, results: [label] } = lane.labelFit
  return aWrap(renderCenteredLines({
    x: LABEL_W / 2,
    centerY: lane.y + LANE_H / 2 + 3,
    lines: label.lines,
    truncated: label.truncated,
    fullText: lane.display.display,
    fontSize,
    lineGap: fontSize * (10 / 9),
    fill: theme.text,
    fontWeight: '700',
  }), lane.display.url)
}

function delayFor(step: StepLayout, lane: LaneLayout, layout: SwimlaneLayout): number {
  const frac = layout.timeline.fracFor(lane.steps.length, step.index)
  return Math.round(frac * (layout.timing.totalEntranceMs - layout.timing.enterDur))
}

function loopDelayFor(step: StepLayout, lane: LaneLayout, layout: SwimlaneLayout): number {
  const frac = layout.timeline.fracFor(lane.steps.length, step.index)
  return Math.round(layout.timing.loopStartMs + frac * (layout.timing.loopCount - 1) * layout.timing.stepMs - layout.timing.totalLoopMs)
}

function slotFor(step: StepLayout, lane: LaneLayout, layout: SwimlaneLayout): number {
  return layout.timeline.rankFor(lane.steps.length, step.index)
}

function renderStep(step: StepLayout, lane: LaneLayout, layout: SwimlaneLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const { fontSize, results: [text] } = step.fit
  const rectLoopStyle = animate ? ` style="animation:mdart-bright-loop ${layout.timing.totalLoopMs}ms ease-in-out ${loopDelayFor(step, lane, layout)}ms infinite"` : ''
  let content = `<rect x="${step.x.toFixed(1)}" y="${step.y.toFixed(1)}" width="${step.width.toFixed(1)}" height="${STEP_H}" rx="4" fill="${step.fill}${step.isDone ? '44' : '22'}" stroke="${step.fill}${step.isDone ? '99' : '66'}" stroke-width="1"${rectLoopStyle}>${itemTitleTag(step.item)}</rect>`
  content += aWrap(renderCenteredLines({
    x: step.x + step.width / 2,
    centerY: step.y + STEP_H / 2 + 3,
    lines: text.lines,
    truncated: text.truncated,
    fullText: step.display,
    fontSize,
    lineGap: fontSize * (10 / 9),
    fill: step.isDone ? theme.text : theme.textMuted,
    fontWeight: step.isDone ? '600' : '400',
  }), step.url)

  const group = wrapItem(content, slotFor(step, lane, layout), animate, instrument)
  if (!animate) return group
  const enterStyle = `animation:mdart-enter ${layout.timing.enterDur}ms ease-out ${delayFor(step, lane, layout)}ms 1 both`
  return group.replace('<g ', `<g style="${enterStyle}" `)
}

function renderStepConnector(step: StepLayout, next: StepLayout, lane: LaneLayout, layout: SwimlaneLayout, theme: MdArtTheme, animate: boolean): string {
  const x1 = step.x + step.width + 2
  const x2 = step.x + step.width + lane.stepGap - 4
  const connector = `<line x1="${x1.toFixed(1)}" y1="${(step.y + STEP_H / 2).toFixed(1)}" x2="${x2.toFixed(1)}" y2="${(step.y + STEP_H / 2).toFixed(1)}" stroke="${theme.primary}99" stroke-width="1" marker-end="url(#${ARROW_ID})"/>`
  if (!animate) return connector
  const enterStyle = `animation:mdart-enter ${layout.timing.enterDur}ms ease-out ${delayFor(next, lane, layout)}ms 1 both`
  return `<g class="mdart-arr-n${slotFor(next, lane, layout)}" style="${enterStyle}">${connector}</g>`
}

function renderLane(lane: LaneLayout, layout: SwimlaneLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string[] {
  const parts = [...renderLaneChrome(lane, theme), renderLaneLabel(lane, theme)]
  lane.steps.forEach((step, index) => {
    parts.push(renderStep(step, lane, layout, theme, animate, instrument))
    const next = lane.steps[index + 1]
    if (next) parts.push(renderStepConnector(step, next, lane, layout, theme, animate))
  })
  return parts
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)

  const baseLayout = resolveLayout(spec)
  const layout = { ...baseLayout, lanes: resolveLanes(spec, theme) }
  const animate = shouldAnimate(spec) && layout.timeline.rankCount > 0
  const instrument = shouldInstrument()
  const parts = [
    ...(animate ? [seqSpotlightCSS(layout.timeline.rankCount, spec, { scale: false })] : []),
    spec.title ? titleEl(W, spec.title, theme) : '',
    renderDefs(theme),
    ...layout.lanes.flatMap(lane => renderLane(lane, layout, theme, animate, instrument)),
  ].filter(Boolean)

  return svgWrapProcess(layout.height, theme, parts)
}
