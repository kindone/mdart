import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, titleEl, renderEmpty, aWrap, itemTitleTag, displayLabel, escapeXml, parseLink, shouldAnimate, seqSpotlightCSS, seqSpotlightTiming, fitTextToWidthShared } from '../shared'

function svgWrapProcess(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const W = 560
  const LABEL_W = 56, LANE_H = 52, STEP_H = 34, GAP = 1
  const titleH = spec.title ? 28 : 8
  const H = titleH + items.length * (LANE_H + GAP) + 8
  // Merge every lane's own step positions onto one shared, evenly-spaced
  // timeline. Linearly scaling each lane's own fraction (si/(count-1)) onto
  // the same window keeps lanes in sync at the start/end, but leaves uneven
  // real-world gaps between *different* lanes' events whenever their counts
  // don't share a denominator (e.g. a 3-step and a 4-step lane land events
  // 1800/900/900/1800ms apart) — and the shared brightness/enter keyframes
  // assume uniform spacing, so tightly-packed neighbours visually bleed
  // into looking simultaneous. Instead: put every lane's exact fractions on
  // a common integer grid (LCM of each count-1), collect the DISTINCT
  // values that actually occur across all lanes, and rank them — so
  // whatever events actually happen are always uniformly spaced, while
  // every lane's first/last step still ties with every other lane's.
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b)
  const lcm = (a: number, b: number): number => a / gcd(a, b) * b
  const counts = items.map(it => it.children.length).filter(c => c > 0)
  const denom = counts.filter(c => c > 1).reduce((acc, c) => lcm(acc, c - 1), 1)
  const numeratorFor = (c: number, si: number) => c > 1 ? si * (denom / (c - 1)) : denom
  const allNumerators = new Set<number>()
  counts.forEach(c => { for (let si = 0; si < c; si++) allNumerators.add(numeratorFor(c, si)) })
  const ranks = Array.from(allNumerators).sort((a, b) => a - b)
  const rankOf = new Map(ranks.map((v, idx) => [v, idx]))
  const R = ranks.length
  const rankFor = (c: number, si: number) => rankOf.get(numeratorFor(c, si)) ?? R - 1
  const globalPosFor = (c: number, si: number) => R > 1 ? rankFor(c, si) / (R - 1) : 1

  const animate = shouldAnimate(spec) && R > 0
  // Pull the exact numeric timing seqSpotlightCSS(R, spec, {scale:false})
  // will emit as CSS, so the delays below (entrance AND loop) stay in sync
  // with it — R (not the raw max step count) is the true number of
  // distinct events on the merged timeline above.
  const {
    totalEntranceMs, enterDur, stepMs, loopCount, totalLoopMs, loopStartMs,
  } = seqSpotlightTiming(R || 1, spec, { scale: false })
  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))
  parts.push(`<defs><marker id="sl-arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><polygon points="0,0 6,3 0,6" fill="${theme.primary}"/></marker></defs>`)

  // Per-node fitting: every lane label shares LABEL_W, but each is sized
  // independently rather than to the diagram's worst-case label — a short
  // lane name ("Design") stays large instead of being dragged down to
  // match a long neighbor lane, same approach as process.ts/org-chart.ts.
  const laneDisplays = items.map(item => displayLabel(item, { attrs: true }))
  const laneFits = laneDisplays.map(d =>
    fitTextToWidthShared([d.display], LABEL_W - 8, { maxSize: 9, minSize: 6.5, maxLines: 2 }),
  )

  // Per-node fitting: step box width varies per LANE (depends on that
  // lane's own step count — steps within a lane necessarily share a width
  // since they're laid out in a row), but each STEP's label is sized
  // independently within that shared width rather than to its lane's
  // worst-fitting step. A lane with one short step ("Accept") and one long
  // one ("Write spec...") no longer forces the short step down to the long
  // one's font size — same per-node principle as every other process/
  // hierarchy file, just applied one level down (per box, not per lane).
  //
  // maxLines raised 2 → 3, now backed by boxH (STEP_H's real vertical
  // budget) so a smaller font can actually reach that 3rd line instead of
  // just shrinking 2 lines down to the floor before truncating — and,
  // conversely, so 3 lines can't be chosen at a font size large enough to
  // overflow STEP_H.
  const stepBoxH = STEP_H - 6
  const stepWPerLane = items.map(item => {
    const steps = item.children
    return steps.length > 0 ? Math.min(90, (W - LABEL_W - 8) / steps.length - 6) : 0
  })
  const laneStepDisplays = items.map(item => item.children.map(step => {
    const { display: stepLabelDisplay } = parseLink(step.label)
    return step.value ? `${stepLabelDisplay}: ${step.value}` : stepLabelDisplay
  }))
  const laneStepFits = items.map((_, i) =>
    laneStepDisplays[i].map(display =>
      fitTextToWidthShared([display], Math.max(20, stepWPerLane[i] - 10), { maxSize: 9, minSize: 6, maxLines: 3, boxH: stepBoxH }),
    ),
  )

  items.forEach((item, i) => {
    const y = titleH + i * (LANE_H + GAP)
    const t = items.length > 1 ? i / (items.length - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    // Lane chrome (band, divider, label) is static context — the flow that
    // animates is the steps, moving left-to-right in sync across lanes.
    parts.push(`<rect x="0" y="${y.toFixed(1)}" width="${W}" height="${LANE_H}" fill="${fill}0a"/>`)
    if (i > 0) parts.push(`<line x1="0" y1="${y.toFixed(1)}" x2="${W}" y2="${y.toFixed(1)}" stroke="${theme.border}" stroke-width="0.5"/>`)
    const { url: itmUrl, display: itmDisplay } = laneDisplays[i]
    parts.push(`<rect x="2" y="${(y + 2).toFixed(1)}" width="${LABEL_W - 4}" height="${LANE_H - 4}" rx="4" fill="${fill}33" stroke="${fill}66" stroke-width="1">${itemTitleTag(item)}</rect>`)
    const { fontSize: laneFS, results: [laneLabel] } = laneFits[i]
    parts.push(aWrap(renderCenteredLines({
      x: LABEL_W / 2,
      centerY: y + LANE_H / 2 + 3,
      lines: laneLabel.lines,
      truncated: laneLabel.truncated,
      fullText: itmDisplay,
      fontSize: laneFS,
      lineGap: laneFS * (10 / 9),
      fill: theme.text,
      fontWeight: '700',
    }), itmUrl))
    const steps = item.children
    const stepW = steps.length > 0 ? Math.min(90, (W - LABEL_W - 8) / steps.length - 6) : 0
    const stepGap = steps.length > 1 ? ((W - LABEL_W - 8) - steps.length * stepW) / (steps.length - 1) : 0
    // This lane's step si mapped onto the shared, uniformly-spaced rank
    // timeline computed above (0..1). Every lane's first step sits at 0 and
    // its last step at 1, so all lanes start together and finish together;
    // steps that fall on a rank no other lane shares still land evenly
    // between their neighbours instead of drifting to an uneven gap.
    const fracFor = (si: number) => globalPosFor(steps.length, si)
    // delayMs(frac) always lands so that delay + enterDur = totalEntranceMs
    // at frac=1, i.e. every lane's last step finishes its fade at exactly
    // the same moment regardless of how many steps it has.
    const delayFor = (si: number) => Math.round(fracFor(si) * (totalEntranceMs - enterDur))
    // Same idea for the idle loop: each step's peak sits at its shared rank
    // position within the loop cycle, so every distinct event across every
    // lane is evenly spaced, and ties (shared ranks) still fire together.
    const loopDelayFor = (si: number) => Math.round(loopStartMs + fracFor(si) * (loopCount - 1) * stepMs - totalLoopMs)
    // The exact rank — used as the CSS class name; entrance and loop timing
    // are both overridden inline below with the values above, so this only
    // needs to be *a* stable, unique-enough label per event.
    const slotFor = (si: number) => rankFor(steps.length, si)
    steps.forEach((step, si) => {
      const sx = LABEL_W + 4 + si * (stepW + stepGap)
      const sy = y + (LANE_H - STEP_H) / 2
      const isDone = step.attrs.includes('done')
      const stepFill = isDone ? theme.accent : fill
      const { url: stepUrl } = parseLink(step.label)
      const stepDisplay = laneStepDisplays[i][si]
      const { fontSize: stepFS, results: [stepText] } = laneStepFits[i][si]
      // Inline style on the rect itself (not the wrapping <g>) so it beats
      // the class-based shapeRule that seqSpotlightCSS also emits for
      // .mdart-n{slot} rect — same mechanism as the entrance override above,
      // just targeting the descendant element the filter actually lives on.
      const rectLoopStyle = animate ? ` style="animation:mdart-bright-loop ${totalLoopMs}ms ease-in-out ${loopDelayFor(si)}ms infinite"` : ''
      let stepStr = `<rect x="${sx.toFixed(1)}" y="${sy.toFixed(1)}" width="${stepW.toFixed(1)}" height="${STEP_H}" rx="4" fill="${stepFill}${isDone ? '44' : '22'}" stroke="${stepFill}${isDone ? '99' : '66'}" stroke-width="1"${rectLoopStyle}>${itemTitleTag(step)}</rect>`
      stepStr += aWrap(renderCenteredLines({
        x: sx + stepW / 2,
        centerY: sy + STEP_H / 2 + 3,
        lines: stepText.lines,
        truncated: stepText.truncated,
        fullText: stepDisplay,
        fontSize: stepFS,
        lineGap: stepFS * (10 / 9),
        fill: isDone ? theme.text : theme.textMuted,
        fontWeight: isDone ? '600' : '400',
      }), stepUrl)
      // class picks the idle-loop spotlight window (nearest shared slot);
      // the inline style overrides just the entrance so it's continuous
      // per-lane instead of snapped to that slot grid.
      const slot = slotFor(si)
      const stepEnterStyle = `animation:mdart-enter ${enterDur}ms ease-out ${delayFor(si)}ms 1 both`
      parts.push(animate ? `<g class="mdart-n${slot}" style="${stepEnterStyle}">${stepStr}</g>` : stepStr)
      if (si < steps.length - 1) {
        const ax1 = sx + stepW + 2, ax2 = sx + stepW + stepGap - 4
        const connEl = `<line x1="${ax1.toFixed(1)}" y1="${(sy + STEP_H / 2).toFixed(1)}" x2="${ax2.toFixed(1)}" y2="${(sy + STEP_H / 2).toFixed(1)}" stroke="${theme.primary}99" stroke-width="1" marker-end="url(#sl-arr)"/>`
        const connEnterStyle = `animation:mdart-enter ${enterDur}ms ease-out ${delayFor(si + 1)}ms 1 both`
        parts.push(animate ? `<g class="mdart-arr-n${slotFor(si + 1)}" style="${connEnterStyle}">${connEl}</g>` : connEl)
      }
    })
  })

  if (animate) parts.unshift(seqSpotlightCSS(R, spec, { scale: false }))
  return svgWrapProcess(W, H, theme, parts)
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
  return lines.map((line, idx) => {
    const y = centerY + (idx - (lines.length - 1) / 2) * lineGap
    const tip = idx === 0 && truncated ? `<title>${escapeXml(fullText)}</title>` : ''
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="${fontSize}" fill="${fill}" font-family="system-ui,sans-serif" font-weight="${fontWeight}">${tip}${escapeXml(line)}</text>`
  }).join('')
}
