import type { MdArtSpec, MdArtItem } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, shouldAnimate, animateSpeed } from '../shared'

/**
 * X-Y plot family — line-chart, scatter, area-chart, bar-chart.
 *
 * Series syntax (parsed at render time from item.value):
 *   - Label: 12, 18, 24, 32                     // categorical y values
 *   - Label: (1, 12), (3, 18), (7, 24)          // numeric (x,y) pairs
 *   - Label: 12, , 24, null, 32                 // empty / null = gap
 *
 * Per-series attributes (item.attrs):
 *   dashed | dotted              stroke pattern
 *   thin | thick | bold | heavy  stroke-width tier
 *   width=N | w=N                explicit stroke-width
 *   smooth | straight            override chart-level smooth
 *   points | nopoints            force markers on/off
 *
 * Front-matter (already parsed onto MdArtSpec):
 *   xAxis | xLabel | yLabel | smooth | points | lineWidth | stack
 *   shadeY[] | shadeX[]          shaded bands
 *   refY[]   | refX[]            reference lines
 */

export type PlotKind = 'line' | 'scatter' | 'area' | 'bar'

export interface ParsedPoint {
  /** Categorical position (index along xAxis) — null when numericX */
  i: number | null
  /** Numeric x — set when series uses (x,y) pairs */
  x: number | null
  /** y value */
  y: number
}

export interface ParsedSeries {
  item: MdArtItem
  label: string
  attrs: string[]
  numericX: boolean
  /** null entries are gaps; non-null are points */
  points: Array<ParsedPoint | null>
}

// ── Width keyword tiers (must match sandbox) ─────────────────────────────────
const WIDTH_KEYWORDS: Record<string, number> = {
  thin: 1,
  thick: 3.5,
  bold: 5,
  heavy: 7,
  extra: 9,
}

// ── Series value parsing ─────────────────────────────────────────────────────

/** Split a value list respecting parentheses (so (1,2) doesn't split). */
function splitValueTokens(str: string): string[] {
  const tokens: string[] = []
  let depth = 0, cur = ''
  for (const ch of str + ',') {
    if (ch === '(') { depth++; cur += ch }
    else if (ch === ')') { depth--; cur += ch }
    else if (ch === ',' && depth === 0) { tokens.push(cur.trim()); cur = '' }
    else cur += ch
  }
  return tokens
}

function parseToken(t: string): { x?: number; y: number } | null {
  if (!t || t === '-' || t.toLowerCase() === 'null' || t.toLowerCase() === 'na') return null
  const pair = t.match(/^\(\s*(-?[\d.eE]+)\s*,\s*(-?[\d.eE]+)\s*\)$/)
  if (pair) {
    const x = parseFloat(pair[1]), y = parseFloat(pair[2])
    if (isNaN(x) || isNaN(y)) return null
    return { x, y }
  }
  const n = parseFloat(t)
  return isNaN(n) ? null : { y: n }
}

export function parseSeries(items: MdArtItem[]): ParsedSeries[] {
  const out: ParsedSeries[] = []
  for (const item of items) {
    if (!item.value) continue
    const tokens = splitValueTokens(item.value)
    let numericX = false
    const points: Array<ParsedPoint | null> = []
    for (let i = 0; i < tokens.length; i++) {
      const t = parseToken(tokens[i])
      if (t === null) { points.push(null); continue }
      if ('x' in t && t.x !== undefined) {
        numericX = true
        points.push({ i: null, x: t.x, y: t.y })
      } else {
        points.push({ i, x: null, y: t.y })
      }
    }
    out.push({
      item,
      label: item.label,
      attrs: item.attrs ?? [],
      numericX,
      points,
    })
  }
  return out
}

// ── Nice axis ticks ──────────────────────────────────────────────────────────

export function niceTicks(lo: number, hi: number, n = 5): { ticks: number[]; lo: number; hi: number } {
  const range = hi - lo || 1
  const step0 = range / n
  const mag = Math.pow(10, Math.floor(Math.log10(step0)))
  const norm = step0 / mag
  let step: number
  if (norm < 1.5)      step = mag
  else if (norm < 3)   step = 2 * mag
  else if (norm < 7)   step = 5 * mag
  else                 step = 10 * mag
  const niceLo = Math.floor(lo / step) * step
  const niceHi = Math.ceil(hi / step) * step
  const ticks: number[] = []
  for (let v = niceLo; v <= niceHi + 1e-9; v += step) ticks.push(+v.toFixed(10))
  return { ticks, lo: niceLo, hi: niceHi }
}

export function formatNum(n: number): string {
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs >= 10000) return (n / 1000).toFixed(0) + 'k'
  if (abs >= 1000)  return (n / 1000).toFixed(1) + 'k'
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(2).replace(/\.?0+$/, '')
}

// ── Per-series style resolution ──────────────────────────────────────────────

export interface SeriesStyle {
  width: number
  dasharray: string | null
  smooth: boolean
  showPoints: boolean
}

export function resolveStyle(
  s: ParsedSeries,
  spec: MdArtSpec,
  kind: PlotKind,
  totalLen: number,
): SeriesStyle {
  const attrs = s.attrs
  const has = (...names: string[]) => names.some(n => attrs.includes(n))

  // Smooth
  const smooth = has('smooth') ? true
              : has('straight') ? false
              : !!spec.smooth

  // Width: numeric override > keyword > global > default(2)
  let widthOverride: number | null = null
  for (const a of attrs) {
    const m = a.match(/^(?:w|width|stroke|sw)\s*=\s*([\d.]+)$/i)
    if (m) widthOverride = parseFloat(m[1])
  }
  const baseWidth = spec.lineWidth != null ? spec.lineWidth : 2
  const width =
    widthOverride != null ? widthOverride :
    has('heavy') ? WIDTH_KEYWORDS.heavy :
    has('bold')  ? WIDTH_KEYWORDS.bold :
    has('thick') ? WIDTH_KEYWORDS.thick :
    has('thin')  ? WIDTH_KEYWORDS.thin :
    has('extra') ? WIDTH_KEYWORDS.extra :
    baseWidth

  // Dash pattern (scales with width so bold dashed lines don't look ratty)
  const dasharray =
    has('dotted') ? `${Math.max(1, width * 0.6)} ${width * 2.2}` :
    has('dashed') ? `${width * 3} ${width * 2}` :
    null

  // showPoints
  let showPoints: boolean
  if (kind === 'scatter')                 showPoints = true
  else if (has('points', 'markers'))      showPoints = true
  else if (has('nopoints', 'nomarkers'))  showPoints = false
  else if (spec.points === true)          showPoints = true
  else if (spec.points === false)         showPoints = false
  else if (kind === 'area')               showPoints = false
  else                                    showPoints = totalLen <= 30

  return { width, dasharray, smooth, showPoints }
}

// ── Path builder (gap-aware, optional Catmull-Rom smoothing) ─────────────────

/** Build an SVG path d attr from a list of [x, y] points (or null gaps).
 *  closeBaseY: when set, builds a closed area to the given y baseline. */
export function buildPath(
  pts: Array<[number, number] | null>,
  smooth: boolean,
  closeBaseY: number | null = null,
): string {
  // Split on null gaps
  const segments: Array<Array<[number, number]>> = []
  let cur: Array<[number, number]> = []
  for (const p of pts) {
    if (p === null) { if (cur.length) segments.push(cur); cur = [] }
    else cur.push(p)
  }
  if (cur.length) segments.push(cur)

  const parts: string[] = []
  for (const seg of segments) {
    if (!seg.length) continue
    const start = seg[0]
    const end = seg[seg.length - 1]

    if (closeBaseY !== null) parts.push(`M ${start[0]} ${closeBaseY} L ${start[0]} ${start[1]}`)
    else                     parts.push(`M ${start[0]} ${start[1]}`)

    if (smooth && seg.length >= 2) {
      // Catmull-Rom to cubic Bezier (tension 0.5, clamped endpoints)
      for (let i = 0; i < seg.length - 1; i++) {
        const prev = seg[i - 1] || seg[i]
        const p1 = seg[i]
        const p2 = seg[i + 1]
        const next = seg[i + 2] || seg[i + 1]
        const c1x = p1[0] + (p2[0] - prev[0]) / 6
        const c1y = p1[1] + (p2[1] - prev[1]) / 6
        const c2x = p2[0] - (next[0] - p1[0]) / 6
        const c2y = p2[1] - (next[1] - p1[1]) / 6
        parts.push(`C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2[0]} ${p2[1]}`)
      }
    } else {
      for (let i = 1; i < seg.length; i++) parts.push(`L ${seg[i][0]} ${seg[i][1]}`)
    }
    if (closeBaseY !== null) parts.push(`L ${end[0]} ${closeBaseY} Z`)
  }
  return parts.join(' ')
}

// ── Main renderer scaffold ───────────────────────────────────────────────────

export function renderPlot(spec: MdArtSpec, theme: MdArtTheme, kind: PlotKind): string {
  const series = parseSeries(spec.items)
  if (series.length === 0) return renderEmpty(theme)

  const W = 720, H = 460
  const M = {
    top: spec.title ? 50 : 26,
    right: 22,
    bottom: spec.xLabel ? 56 : 40,
    left: spec.yLabel ? 62 : 48,
  }
  const PW = W - M.left - M.right
  const PH = H - M.top - M.bottom

  const palette = theme.palette && theme.palette.length
    ? [theme.primary, ...theme.palette]
    : [theme.primary, theme.secondary, theme.accent, theme.warning, theme.danger]
  // Deliberately NOT theme.palette here even when it's long enough — that's
  // the exact same array `palette` above is built from, so shadeColors[0]
  // would always equal a data series' own color (palette[1]), making a
  // shaded band visually indistinguishable from whichever series happens to
  // share its hue. Annotation bands get their own fixed semantic set instead.
  const shadeColors = [theme.warning, theme.danger, theme.accent, theme.secondary]

  const isBar = kind === 'bar'
  const isStack = isBar && !!spec.stack
  const isScatter = kind === 'scatter'
  const isArea = kind === 'area'

  // Numeric-x mode: any series uses (x,y). Bar charts stay categorical.
  const numericX = !isBar && series.some(s => s.numericX)
  const N = series.reduce((m, s) => Math.max(m, s.points.length), 0)
  const xLabels = spec.xAxis ?? Array.from({ length: N }, (_, i) => String(i + 1))

  // ── Y domain ────────────────────────────────────────────────────────────
  let yMin = 0, yMax = 1
  if (N > 0) {
    const allY: number[] = []
    for (const s of series) for (const p of s.points) if (p) allY.push(p.y)
    if (isStack) {
      let cmax = 0
      for (let i = 0; i < N; i++) {
        let sum = 0
        for (const s of series) {
          const p = s.points[i]
          if (p) sum += Math.max(0, p.y)
        }
        cmax = Math.max(cmax, sum)
      }
      yMax = cmax; yMin = 0
    } else if (allY.length) {
      yMin = Math.min(0, ...allY)
      yMax = Math.max(...allY)
    }
    if (yMin === yMax) yMax += 1
    for (const sh of spec.shadeY ?? []) {
      const a = parseFloat(sh.a), b = parseFloat(sh.b)
      if (!isNaN(a)) { yMin = Math.min(yMin, a); yMax = Math.max(yMax, a) }
      if (!isNaN(b)) { yMin = Math.min(yMin, b); yMax = Math.max(yMax, b) }
    }
    for (const r of spec.refY ?? []) {
      const v = parseFloat(r.at)
      if (!isNaN(v)) { yMin = Math.min(yMin, v); yMax = Math.max(yMax, v) }
    }
  }
  const yScale = niceTicks(yMin, yMax)
  yMin = yScale.lo; yMax = yScale.hi

  // ── X domain (numeric mode) ─────────────────────────────────────────────
  let xMin = 0, xMax = 1, xScale: { ticks: number[]; lo: number; hi: number } | null = null
  if (numericX) {
    const allX: number[] = []
    for (const s of series) if (s.numericX) for (const p of s.points) if (p && p.x !== null) allX.push(p.x)
    if (allX.length) { xMin = Math.min(...allX); xMax = Math.max(...allX) }
    if (xMin === xMax) xMax += 1
    xScale = niceTicks(xMin, xMax)
    xMin = xScale.lo; xMax = xScale.hi
  }

  // ── Positioners ─────────────────────────────────────────────────────────
  const xStep = N > 1 ? (isBar ? PW / N : PW / (N - 1)) : PW
  const xPosCat = (i: number) =>
    isBar ? M.left + xStep * (i + 0.5)
          : M.left + (N === 1 ? PW / 2 : xStep * i)
  const xPosNum = (xv: number) => M.left + ((xv - xMin) / (xMax - xMin)) * PW
  const yPos = (v: number) => M.top + PH - ((v - yMin) / (yMax - yMin)) * PH

  /** Resolve a shade-x or ref-x key (label, numeric, or 1-based index). */
  const resolveX = (s: string): number | null => {
    if (!s) return null
    if (numericX) {
      const n = parseFloat(s)
      return isNaN(n) ? null : xPosNum(n)
    }
    const idx = xLabels.indexOf(s.trim())
    if (idx >= 0) return xPosCat(idx)
    const n = parseFloat(s)
    if (!isNaN(n)) {
      const ii = n - 1
      if (ii >= 0 && ii < N) return xPosCat(ii)
    }
    return null
  }

  // ── Animation ─────────────────────────────────────────────────────────────
  // Charts are one continuous read, not a sequence of discrete nodes, so
  // phase 1 plays once on load rather than reusing the node/loop spotlight
  // system's entrance:
  //   - solid lines draw in via stroke-dashoffset (pathLength="1" normalizes
  //     this to a fixed duration regardless of actual path length — no
  //     measurement needed)
  //   - dashed/dotted lines and area fills just fade in (a decorative dash
  //     pattern and the dash-offset draw-in both need stroke-dasharray, so
  //     they can't combine — fading keeps the pattern intact)
  //   - bars grow upward from the baseline
  //   - point markers pop in staggered along the line's draw progress (or
  //     evenly spread for scatter, which has no line to trail)
  // Axes, grid, legend, shaded bands and reference lines stay static chrome.
  //
  // Phase 2 (after entrance finishes): every mark belonging to a series —
  // its bars, its point markers, its line, its area fill, its legend entry —
  // pulses together on that ONE series' own cadence, offset per series so a
  // multi-series chart reads as each series quietly taking its turn rather
  // than everything flashing in unison. (An earlier version swept bars/points
  // across x-axis positions 0..N-1 instead, independent of the area/line/
  // legend's per-series pulse — that meant a line and its own point markers,
  // or a legend entry and its series, visibly fell out of sync, and multiple
  // series peaking together at a shared index washed their colors toward the
  // same near-white. Keying everything off si alone fixes both.) Lines/areas
  // are continuous regions like a connector in a node diagram and get a
  // milder pulse than the discrete marks (bars/points/legend swatch); the
  // line itself is tuned to stand out as the focal point.
  const animate = shouldAnimate(spec)
  const speed = animateSpeed(spec)
  const lineDrawMs = Math.round(1100 / speed)
  const barRiseMs = Math.round(650 / speed)
  const barStaggerMs = Math.round(45 / speed)
  const pointPopMs = Math.round(240 / speed)
  const scatterSpreadMs = Math.round(900 / speed)
  const seriesDelay = (si: number) => si * Math.round(150 / speed)
  // Fixed, short, symmetric pulse — deliberately independent of category
  // count (N) or point count, so it never turns into a short flash followed
  // by a long dead stretch on wide charts.
  const glowMs = Math.round(2600 / speed)
  // Phase 2 must not start until phase 1 is actually done everywhere — a
  // fixed per-series delay alone still let the glow's peak land while a
  // later series' line/bars were still entering. entranceDone is this
  // chart's worst-case entrance finish time; glowStartMs adds a small
  // breathing gap after it, and every glow delay below is anchored to it.
  const entranceDone = isBar
    ? (N - 1) * barStaggerMs + (series.length - 1) * Math.round(barStaggerMs / 3) + barRiseMs
    : seriesDelay(Math.max(series.length - 1, 0)) + (isScatter ? scatterSpreadMs : lineDrawMs) + pointPopMs
  const glowStartMs = entranceDone + Math.round(400 / speed)
  const glowDelay = (si: number) => glowStartMs + si * Math.round(glowMs / 3)
  // Shaded bands live in their own index space — offset by half a cycle so
  // they never land in phase with any series (series only ever occupy the
  // {0, 1/3, 2/3} fractions of the cycle, however many there are, since the
  // per-series step is exactly glowMs/3; 1/2 is guaranteed distinct from all
  // of those) — with their own stagger increment so multiple bands spread
  // out too instead of converging back onto that same half-cycle point.
  const shadeGlowDelay = (i: number) => glowStartMs + Math.round(glowMs / 2) + i * Math.round(glowMs / 5)
  // Reference lines get their own third index space (1/4-cycle offset, /7
  // stagger) — distinct from both the series' {0, 1/3, 2/3} fractions and
  // the shade bands' half-cycle-anchored ones.
  const refGlowDelay = (i: number) => glowStartMs + Math.round(glowMs / 4) + i * Math.round(glowMs / 7)
  const legendFadeMs = Math.round(350 / speed)
  const refFadeMs = Math.round(350 / speed)
  const refFadeDelay = (i: number) => Math.round(200 / speed) + i * Math.round(120 / speed)

  // ── SVG construction ────────────────────────────────────────────────────
  const out: string[] = []
  out.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px" font-family="system-ui,sans-serif" font-size="11">`)

  if (animate) {
    out.push(`<style>` +
      `@keyframes mdart-plot-draw{to{stroke-dashoffset:0}}` +
      `@keyframes mdart-plot-fade{from{opacity:0}to{opacity:1}}` +
      `@keyframes mdart-plot-rise{from{transform:scaleY(0)}to{transform:scaleY(1)}}` +
      `@keyframes mdart-plot-pop{from{transform:scale(0)}to{transform:scale(1)}}` +
      // Filter-only (not transform/opacity) so it layers onto the entrance
      // animations above without fighting them. Kept deliberately mild —
      // brightness/saturate pushed too far washes a series' own color
      // toward white, which is exactly what made same-colored-looking
      // points confusing in scatter charts with several series.
      //
      // Discrete marks (bars, point markers, legend swatch) — medium tier.
      `@keyframes mdart-plot-bright-loop{` +
        `0%,100%{filter:brightness(1) saturate(1)}` +
        `50%{filter:brightness(1.5) saturate(1.3) drop-shadow(0 0 5px rgba(255,255,255,.45))}` +
      `}` +
      // Area fill — mildest tier; it's a large region, so even a small
      // brightness bump reads clearly without needing much saturation push.
      `@keyframes mdart-plot-area-glow{` +
        `0%,100%{filter:brightness(1) saturate(1)}` +
        `50%{filter:brightness(1.32) saturate(1.18) drop-shadow(0 0 6px rgba(255,255,255,.4))}` +
      `}` +
      // Line — strongest tier so the stroke still reads as the focal point
      // next to its own area/points, but capped well below the old peak.
      `@keyframes mdart-plot-line-glow{` +
        `0%,100%{filter:brightness(1) saturate(1)}` +
        `50%{filter:brightness(1.55) saturate(1.3) drop-shadow(0 0 4px rgba(255,255,255,.55)) drop-shadow(0 0 7px rgba(255,255,255,.3))}` +
      `}` +
      // Reference lines/labels — its own keyframe (not a reuse of
      // mdart-plot-line-glow) at 75% of that keyframe's intensity, so tuning
      // ref annotations doesn't also dim the main data line they share a
      // tier with.
      `@keyframes mdart-plot-ref-glow{` +
        `0%,100%{filter:brightness(1) saturate(1)}` +
        `50%{filter:brightness(1.41) saturate(1.23) drop-shadow(0 0 3px rgba(255,255,255,.41)) drop-shadow(0 0 5px rgba(255,255,255,.23))}` +
      `}` +
    `</style>`)
  }

  if (spec.title) {
    out.push(`<text x="${W / 2}" y="26" text-anchor="middle" fill="${theme.text}" font-size="14" font-weight="600">${escapeXml(spec.title)}</text>`)
  }

  // Shaded Y bands — same mild "area" tier glow as a series' own area fill,
  // but on shadeGlowDelay's own half-cycle-offset index space rather than
  // glowDelay's — reusing glowDelay with just an index offset still landed
  // back in phase with a series periodically (offsetting by a whole number
  // of glowMs/3 steps wraps right back to the same point in the cycle).
  // Y/X bands share one numbering (matching the shadeColors convention) so
  // they stagger against each other too, not just against the series.
  ;(spec.shadeY ?? []).forEach((sh, i) => {
    const a = parseFloat(sh.a), b = parseFloat(sh.b)
    if (isNaN(a) || isNaN(b)) return
    const y1 = yPos(Math.max(a, b))
    const y2 = yPos(Math.min(a, b))
    const c = shadeColors[i % shadeColors.length]
    const glowStyle = animate
      ? ` style="animation:mdart-plot-area-glow ${glowMs}ms ease-in-out ${shadeGlowDelay(i)}ms infinite"`
      : ''
    out.push(`<rect x="${M.left}" y="${y1.toFixed(2)}" width="${PW}" height="${(y2 - y1).toFixed(2)}" fill="${c}" fill-opacity="0.10"${glowStyle}/>`)
    if (sh.label) out.push(`<text x="${M.left + PW - 6}" y="${(y1 + 12).toFixed(2)}" text-anchor="end" fill="${c}" font-size="10" font-style="italic">${escapeXml(sh.label)}</text>`)
  })

  // Shaded X bands
  ;(spec.shadeX ?? []).forEach((sh, i) => {
    const x1 = resolveX(sh.a), x2 = resolveX(sh.b)
    if (x1 === null || x2 === null) return
    const lo = Math.min(x1, x2), hi = Math.max(x1, x2)
    const bandIdx = (spec.shadeY?.length ?? 0) + i
    const c = shadeColors[bandIdx % shadeColors.length]
    const glowStyle = animate
      ? ` style="animation:mdart-plot-area-glow ${glowMs}ms ease-in-out ${shadeGlowDelay(bandIdx)}ms infinite"`
      : ''
    out.push(`<rect x="${lo.toFixed(2)}" y="${M.top}" width="${(hi - lo).toFixed(2)}" height="${PH}" fill="${c}" fill-opacity="0.10"${glowStyle}/>`)
    if (sh.label) out.push(`<text x="${((lo + hi) / 2).toFixed(2)}" y="${M.top + 12}" text-anchor="middle" fill="${c}" font-size="10" font-style="italic">${escapeXml(sh.label)}</text>`)
  })

  const showGrid  = spec.grid  !== false   // default true
  const showTicks = spec.ticks !== false   // default true

  // Y grid + tick labels
  for (const t of yScale.ticks) {
    const y = yPos(t)
    const isZero = Math.abs(t) < 1e-9 && yMin < 0
    if (showGrid || isZero) {
      out.push(`<line x1="${M.left}" y1="${y.toFixed(2)}" x2="${M.left + PW}" y2="${y.toFixed(2)}" stroke="${isZero ? theme.textMuted : theme.border}" stroke-width="1"/>`)
    }
    if (showTicks) {
      out.push(`<text x="${M.left - 8}" y="${(y + 3).toFixed(2)}" text-anchor="end" fill="${theme.textMuted}">${formatNum(t)}</text>`)
    }
  }

  // Numeric X grid (only when continuous x)
  if (showGrid && numericX && xScale) {
    for (const t of xScale.ticks) {
      const x = xPosNum(t)
      out.push(`<line x1="${x.toFixed(2)}" y1="${M.top}" x2="${x.toFixed(2)}" y2="${M.top + PH}" stroke="${theme.border}" stroke-width="1"/>`)
    }
  }

  // Axes
  out.push(`<line x1="${M.left}" y1="${M.top + PH}" x2="${M.left + PW}" y2="${M.top + PH}" stroke="${theme.textMuted}" stroke-width="1"/>`)
  out.push(`<line x1="${M.left}" y1="${M.top}" x2="${M.left}" y2="${M.top + PH}" stroke="${theme.textMuted}" stroke-width="1"/>`)

  // X tick labels
  if (showTicks && numericX && xScale) {
    for (const t of xScale.ticks) {
      out.push(`<text x="${xPosNum(t).toFixed(2)}" y="${M.top + PH + 18}" text-anchor="middle" fill="${theme.textMuted}">${formatNum(t)}</text>`)
    }
  } else if (showTicks) {
    const stride = N > 24 ? Math.ceil(N / 12) : 1
    for (let i = 0; i < N; i++) {
      if (i % stride !== 0 && i !== N - 1) continue
      out.push(`<text x="${xPosCat(i).toFixed(2)}" y="${M.top + PH + 18}" text-anchor="middle" fill="${theme.textMuted}">${escapeXml(xLabels[i] || '')}</text>`)
    }
  }

  if (spec.xLabel) out.push(`<text x="${M.left + PW / 2}" y="${H - 12}" text-anchor="middle" fill="${theme.textMuted}" font-size="11">${escapeXml(spec.xLabel)}</text>`)
  if (spec.yLabel) out.push(`<text x="14" y="${M.top + PH / 2}" text-anchor="middle" fill="${theme.textMuted}" font-size="11" transform="rotate(-90 14 ${M.top + PH / 2})">${escapeXml(spec.yLabel)}</text>`)

  // ── Series ──────────────────────────────────────────────────────────────
  const stacks = isStack ? new Array(N).fill(0) : null

  // Track resolved per-series widths for the legend.
  const seriesWidths: number[] = []

  for (let si = 0; si < series.length; si++) {
    const s = series[si]
    const color = palette[si % palette.length]
    const style = resolveStyle(s, spec, kind, N)
    seriesWidths.push(style.width)

    // ── Bars ────────────────────────────────────────────────────────────
    if (isBar) {
      const groupW = xStep * 0.72
      const bcount = series.length
      const barW = isStack ? groupW : groupW / bcount
      for (let i = 0; i < s.points.length; i++) {
        const p = s.points[i]
        if (!p) continue
        const v = p.y
        let bx: number, by: number, bh: number
        if (isStack && stacks) {
          const vv = Math.max(0, v)
          const baseV = stacks[i]
          bx = xPosCat(i) - barW / 2
          by = yPos(baseV + vv)
          bh = yPos(baseV) - by
          stacks[i] = baseV + vv
        } else {
          bx = xPosCat(i) - groupW / 2 + si * barW
          by = yPos(Math.max(0, v))
          bh = Math.abs(yPos(v) - yPos(0))
        }
        // Grows from its own bottom edge — for stacked segments that's the
        // attachment point on the segment below, which reads correctly as
        // each stack builds upward. Category index drives the main stagger;
        // the small si offset just keeps grouped bars in the same category
        // from popping in perfect unison. Phase 2 glow is keyed off si
        // alone (not category index), so every bar in a series pulses
        // together — same cadence its line/area/legend entry use.
        const enterDelay = i * barStaggerMs + si * Math.round(barStaggerMs / 3)
        const barStyle = animate
          ? ` style="transform-box:fill-box;transform-origin:center bottom;animation:mdart-plot-rise ${barRiseMs}ms cubic-bezier(.2,.8,.3,1) ${enterDelay}ms both, mdart-plot-bright-loop ${glowMs}ms ease-in-out ${glowDelay(si)}ms infinite"`
          : ''
        out.push(`<rect x="${bx.toFixed(2)}" y="${by.toFixed(2)}" width="${Math.max(0, barW - 1.5).toFixed(2)}" height="${bh.toFixed(2)}"${barStyle} fill="${color}" fill-opacity="0.85" rx="2"><title>${escapeXml(s.label)}: ${v} @ ${escapeXml(xLabels[i] || '')}</title></rect>`)
      }
      continue
    }

    // ── Lines / scatter / areas ─────────────────────────────────────────
    const pts: Array<[number, number] | null> = []
    const tooltips: Array<{ x: number; y: number; label: string; xs: string } | null> = []
    if (s.numericX) {
      for (const p of s.points) {
        if (p === null || p.x === null) { pts.push(null); tooltips.push(null); continue }
        const px = xPosNum(p.x), py = yPos(p.y)
        pts.push([px, py])
        tooltips.push({ x: px, y: py, label: `${s.label}: ${p.y}`, xs: formatNum(p.x) })
      }
    } else if (numericX) {
      // Categorical series in numericX chart — promote index to numeric
      for (let i = 0; i < s.points.length; i++) {
        const p = s.points[i]
        if (!p) { pts.push(null); tooltips.push(null); continue }
        const px = xPosNum(i + 1), py = yPos(p.y)
        pts.push([px, py])
        tooltips.push({ x: px, y: py, label: `${s.label}: ${p.y}`, xs: String(i + 1) })
      }
    } else {
      for (let i = 0; i < s.points.length; i++) {
        const p = s.points[i]
        if (!p) { pts.push(null); tooltips.push(null); continue }
        const px = xPosCat(i), py = yPos(p.y)
        pts.push([px, py])
        tooltips.push({ x: px, y: py, label: `${s.label}: ${p.y}`, xs: xLabels[i] || '' })
      }
    }

    if (isArea) {
      const baseY = yPos(Math.max(yMin, 0))
      const d = buildPath(pts, style.smooth, baseY)
      // The area is one continuous region, not a discrete mark, so it gets
      // the mildest tier — same si-based cadence as its own line and legend
      // entry, offset a bit so overlapping areas don't pulse in unison.
      const areaStyle = animate
        ? ` style="opacity:0;animation:mdart-plot-fade ${lineDrawMs}ms ease-out ${seriesDelay(si)}ms forwards, mdart-plot-area-glow ${glowMs}ms ease-in-out ${glowDelay(si)}ms infinite"`
        : ''
      if (d) out.push(`<path d="${d}" fill="${color}" fill-opacity="0.25" stroke="none"${areaStyle}/>`)
    }

    if (!isScatter) {
      const d = buildPath(pts, style.smooth)
      const dashAttr = style.dasharray ? ` stroke-dasharray="${style.dasharray}"` : ''
      // Dashed/dotted series keep their real dasharray and just fade in —
      // the draw-in trick below also needs stroke-dasharray, so the two
      // can't combine. Solid series get the nicer progressive draw.
      let plAttr = ''
      let lineStyle = ''
      if (animate) {
        // Same cadence/offset as the area glow and legend swatch (si-based),
        // so a series' line, area, points and legend entry all pulse together.
        const glowAnim = `, mdart-plot-line-glow ${glowMs}ms ease-in-out ${glowDelay(si)}ms infinite`
        lineStyle = style.dasharray
          ? ` style="opacity:0;animation:mdart-plot-fade ${lineDrawMs}ms ease-out ${seriesDelay(si)}ms forwards${glowAnim}"`
          : ` style="stroke-dasharray:1;stroke-dashoffset:1;animation:mdart-plot-draw ${lineDrawMs}ms ease-out ${seriesDelay(si)}ms forwards${glowAnim}"`
        if (!style.dasharray) plAttr = ` pathLength="1"`
      }
      if (d) out.push(`<path${plAttr} d="${d}" fill="none" stroke="${color}" stroke-width="${style.width}" stroke-linejoin="round" stroke-linecap="round"${dashAttr}${lineStyle}/>`)
    }

    if (style.showPoints && !isArea) {
      const r = isScatter
        ? Math.min(8, Math.max(3, style.width * 1.4))
        : Math.min(8, Math.max(3, style.width * 1.5))
      const ringW = isScatter ? 0 : Math.max(1, style.width * 0.6)
      // tooltips has exactly one slot per point position (nulls included
      // for gaps), so its array index gives a clean phase-1 stagger
      // fraction. Phase 2 glow is keyed off si alone (like bars/area/line),
      // so all of a series' points pulse together, in step with that
      // series' own line and legend entry — not swept across categories.
      for (let idx = 0; idx < tooltips.length; idx++) {
        const t = tooltips[idx]
        if (!t) continue
        // Line markers pop in as the draw reaches their position; scatter
        // (no line to trail) spreads evenly across its own fixed window.
        const frac = tooltips.length > 1 ? idx / (tooltips.length - 1) : 0
        const enterDelay = seriesDelay(si) + Math.round(frac * (isScatter ? scatterSpreadMs : lineDrawMs))
        const ptStyle = animate
          ? ` style="transform-box:fill-box;transform-origin:center;animation:mdart-plot-pop ${pointPopMs}ms cubic-bezier(.34,1.56,.64,1) ${enterDelay}ms both, mdart-plot-bright-loop ${glowMs}ms ease-in-out ${glowDelay(si)}ms infinite"`
          : ''
        out.push(`<circle cx="${t.x.toFixed(2)}" cy="${t.y.toFixed(2)}" r="${r.toFixed(2)}"${ptStyle} fill="${color}" stroke="${theme.bg}" stroke-width="${ringW}"><title>${escapeXml(t.label)} @ ${escapeXml(t.xs)}</title></circle>`)
      }
    }
  }

  // Reference lines (drawn on top). Each line+label fades in together (like
  // the legend), then both the line AND its label join the stronger "line"
  // glow tier (not the mild "area" one — these are thin/small elements that
  // need more contrast to read as glowing at all) on their own index space
  // (refGlowDelay) shared across refY-then-refX, matching the
  // shadeColors/shade-band numbering convention used above.
  let refIdx = 0
  ;(spec.refY ?? []).forEach(ref => {
    const v = parseFloat(ref.at)
    if (isNaN(v)) return
    const y = yPos(v)
    const i = refIdx++
    const fadeStyle = animate ? ` style="opacity:0;animation:mdart-plot-fade ${refFadeMs}ms ease-out ${refFadeDelay(i)}ms forwards"` : ''
    const glowStyle = animate ? ` style="animation:mdart-plot-ref-glow ${glowMs}ms ease-in-out ${refGlowDelay(i)}ms infinite"` : ''
    out.push(`<g${fadeStyle}>`)
    out.push(`<line x1="${M.left}" y1="${y.toFixed(2)}" x2="${M.left + PW}" y2="${y.toFixed(2)}" stroke="${theme.text}" stroke-width="1" stroke-dasharray="5 3" opacity="0.55"${glowStyle}/>`)
    if (ref.label) {
      // Default label position: top-right of the line. `@ <x>` overrides
      // the x with a data-coords value (resolved like shade-x: numeric in
      // numeric-x mode, label or 1-based index in categorical mode).
      let lx = M.left + PW - 4
      let anchor: 'start' | 'middle' | 'end' = 'end'
      if (ref.atLabel) {
        const x = resolveX(ref.atLabel)
        if (x !== null) { lx = x; anchor = 'middle' }
      }
      // Bold + paint-order halo so the label punches through the dashed line.
      out.push(`<text x="${lx.toFixed(2)}" y="${(y - 4).toFixed(2)}" text-anchor="${anchor}" fill="${theme.text}" font-size="10" font-weight="600" paint-order="stroke" stroke="${theme.bg}" stroke-width="3" stroke-linejoin="round"${glowStyle}>${escapeXml(ref.label)}</text>`)
    }
    out.push(`</g>`)
  })
  ;(spec.refX ?? []).forEach(ref => {
    const x = resolveX(ref.at)
    if (x === null) return
    const i = refIdx++
    const fadeStyle = animate ? ` style="opacity:0;animation:mdart-plot-fade ${refFadeMs}ms ease-out ${refFadeDelay(i)}ms forwards"` : ''
    const glowStyle = animate ? ` style="animation:mdart-plot-ref-glow ${glowMs}ms ease-in-out ${refGlowDelay(i)}ms infinite"` : ''
    out.push(`<g${fadeStyle}>`)
    out.push(`<line x1="${x.toFixed(2)}" y1="${M.top}" x2="${x.toFixed(2)}" y2="${M.top + PH}" stroke="${theme.text}" stroke-width="1" stroke-dasharray="5 3" opacity="0.55"${glowStyle}/>`)
    if (ref.label) {
      // Default label position: top of the line, anchored to its right.
      // `@ <y>` overrides with a data-coords y, centred on the line.
      let ly = M.top + 12
      let lx = x + 4
      let anchor: 'start' | 'middle' | 'end' = 'start'
      if (ref.atLabel) {
        const yv = parseFloat(ref.atLabel)
        if (!isNaN(yv)) { ly = yPos(yv); lx = x; anchor = 'middle' }
      }
      // Bold + paint-order halo so the label punches through the dashed line.
      out.push(`<text x="${lx.toFixed(2)}" y="${ly.toFixed(2)}" text-anchor="${anchor}" fill="${theme.text}" font-size="10" font-weight="600" paint-order="stroke" stroke="${theme.bg}" stroke-width="3" stroke-linejoin="round"${glowStyle}>${escapeXml(ref.label)}</text>`)
    }
    out.push(`</g>`)
  })

  // ── Legend ──────────────────────────────────────────────────────────────
  if (series.some(s => s.label)) {
    let lx = M.left + 6, ly = M.top + 4
    for (let si = 0; si < series.length; si++) {
      const s = series[si]
      const color = palette[si % palette.length]
      const label = s.label || ''
      const w = Math.max(20, label.length * 6.5) + 26
      if (lx + w > M.left + PW - 6) { lx = M.left + 6; ly += 18 }
      const a = s.attrs
      const dash = a.includes('dotted') ? '1.5 3' : a.includes('dashed') ? '4 3' : null
      const sw = Math.min(5, seriesWidths[si] || 2)
      // Fades in alongside its own series' entrance (same seriesDelay used
      // for that series' line/area/bars), so the legend reads as arriving
      // with the data it labels rather than as separate static chrome.
      const legendStyle = animate
        ? ` style="opacity:0;animation:mdart-plot-fade ${legendFadeMs}ms ease-out ${seriesDelay(si)}ms forwards"`
        : ''
      // Swatch is a discrete mark like a bar/point, so it uses that same
      // tier and the same si-keyed cadence as the rest of this series —
      // in step with its bars/points/line, not a separate rhythm. Applied
      // to the swatch shape itself, not the wrapping <g>, so the
      // drop-shadow halo doesn't bleed onto the label text.
      const swatchGlow = animate
        ? ` style="animation:mdart-plot-bright-loop ${glowMs}ms ease-in-out ${glowDelay(si)}ms infinite"`
        : ''
      out.push(`<g transform="translate(${lx.toFixed(2)},${ly.toFixed(2)})"${legendStyle}>`)
      if (dash || sw > 2) {
        const dashAttr = dash ? ` stroke-dasharray="${dash}"` : ''
        out.push(`<line x1="0" y1="5" x2="16" y2="5" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"${dashAttr}${swatchGlow}/>`)
        out.push(`<text x="22" y="9" fill="${theme.text}">${escapeXml(label)}</text>`)
      } else {
        out.push(`<rect x="0" y="0" width="10" height="10" fill="${color}" rx="2"${swatchGlow}/>`)
        out.push(`<text x="14" y="9" fill="${theme.text}">${escapeXml(label)}</text>`)
      }
      out.push(`</g>`)
      lx += w
    }
  }

  out.push(`</svg>`)
  return out.join('')
}
