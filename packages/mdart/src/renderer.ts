import { parseMdArt } from './parser'
import { getTheme } from './theme'
import { getGlobalConfig, getTextBoundsDebugMode, withMdArtRenderConfig } from './config'
import { validateMdArt } from './validator'
import { escapeXml, estimateTextWidth, renderInlineMarkdown, FONT_SANS_ATTR } from './layouts/shared'
import type { MdArtConfig } from './config'
import type { MdArtSpec } from './parser'
import type { MdArtTheme } from './theme'
import type { ValidationIssue } from './validator'

// process family
// Phase 1 of the type/shape consolidation plan: process/chevron/arrow/
// circle/ring/bending/step-up/step-down now live behind one `type: process`
// dispatcher (./layouts/process/process-shapes.ts). Old flat type names are
// registered below as hard aliases that force `shape` before delegating to
// the same dispatcher. `funnel` stays standalone (numeric/conversion logic,
// not a pure reskin).
import { render as renderProcessType } from './layouts/process/process-shapes'
import { render as renderFunnel } from './layouts/process/funnel'
import { render as renderRoadmap } from './layouts/process/roadmap'
import { render as renderWaterfall } from './layouts/process/waterfall'
import { render as renderEquation } from './layouts/process/equation'
import { render as renderSegmentedBar } from './layouts/process/segmented-bar'
import { render as renderPhaseProcess } from './layouts/process/phase-process'
import { render as renderTimelineH } from './layouts/process/timeline-h'
import { render as renderTimelineV } from './layouts/process/timeline-v'
import { render as renderSwimlane } from './layouts/process/swimlane'

// list family
// Phase 0a of the type/shape consolidation plan: bullet/numbered/circle/
// icon/chevron/ribbon/trapezoid/two-column/block/hexagon now live behind
// one `type: list` dispatcher (./layouts/list/list.ts). The old flat type
// names below are kept as hard aliases that force `shape` before
// delegating to the same dispatcher — see LAYOUT_RENDERERS below.
import { render as renderList } from './layouts/list/list'
import { render as renderChecklist } from './layouts/list/checklist'
import { render as renderTimelineList } from './layouts/list/timeline-list'
// Phase 0b renames: card-list → card-deck, zigzag-list → zigzag-timeline,
// tab-list → tabs. Old names kept as hard aliases, same render function.
import { render as renderCardList } from './layouts/list/card-list'
import { render as renderZigzagList } from './layouts/list/zigzag-list'
import { render as renderTabList } from './layouts/list/tab-list'

// cycle family
// Phase 2 of the type/shape consolidation plan: default/donut/segmented/
// orbit/mesh/spiral now live behind one `type: cycle` dispatcher
// (./layouts/cycle/cycle-shapes.ts). Old flat type names registered below
// as hard aliases. gear-cycle/block-cycle/loop stay standalone.
import { render as renderCycleType } from './layouts/cycle/cycle-shapes'
import { render as renderGearCycle } from './layouts/cycle/gear-cycle'
import { render as renderBlockCycle } from './layouts/cycle/block-cycle'
import { render as renderLoop } from './layouts/cycle/loop'

// matrix family
import { render as renderSwot } from './layouts/matrix/swot'
import { render as renderProsCons } from './layouts/matrix/pros-cons'
import { render as renderComparison } from './layouts/matrix/comparison'
import { render as renderMatrix2x2 } from './layouts/matrix/matrix-2x2'
import { render as renderBcg } from './layouts/matrix/bcg'
import { render as renderAnsoff } from './layouts/matrix/ansoff'
import { render as renderMatrixNxm } from './layouts/matrix/matrix-nxm'
import { render as renderTable } from './layouts/matrix/table'

// hierarchy family
import { render as renderOrgChart } from './layouts/hierarchy/org-chart'
import { render as renderTree } from './layouts/hierarchy/tree'
import { render as renderHOrgChart } from './layouts/hierarchy/h-org-chart'
import { render as renderHierarchyList } from './layouts/hierarchy/hierarchy-list'
import { render as renderRadialTree } from './layouts/hierarchy/radial-tree'
import { render as renderDecisionTree } from './layouts/hierarchy/decision-tree'
import { render as renderSitemap } from './layouts/hierarchy/sitemap'
import { render as renderBracket } from './layouts/hierarchy/bracket'
import { render as renderBracketTree } from './layouts/hierarchy/bracket-tree'
import { render as renderMindMap } from './layouts/hierarchy/mind-map'

// pyramid family
import { render as renderPyramid } from './layouts/pyramid/pyramid'
import { render as renderInvertedPyramid } from './layouts/pyramid/inverted-pyramid'
import { render as renderPyramidList } from './layouts/pyramid/pyramid-list'
import { render as renderSegmentedPyramid } from './layouts/pyramid/segmented-pyramid'
import { render as renderDiamondPyramid } from './layouts/pyramid/diamond-pyramid'

// relationship family
import { render as renderVenn } from './layouts/relationship/venn'
import { render as renderVenn3 } from './layouts/relationship/venn-3'
import { render as renderVenn4 } from './layouts/relationship/venn-4'
import { render as renderConcentric } from './layouts/relationship/concentric'
import { render as renderBalance } from './layouts/relationship/balance'
import { render as renderCounterbalance } from './layouts/relationship/counterbalance'
import { render as renderOpposingArrows } from './layouts/relationship/opposing-arrows'
import { render as renderWeb } from './layouts/relationship/web'
import { render as renderCluster } from './layouts/relationship/cluster'
import { render as renderTarget } from './layouts/relationship/target'
import { render as renderRadial } from './layouts/relationship/radial'
import { render as renderConverging } from './layouts/relationship/converging'
import { render as renderDiverging } from './layouts/relationship/diverging'
import { render as renderPlus } from './layouts/relationship/plus'

// statistical family
import { render as renderProgressList } from './layouts/statistical/progress-list'
import { render as renderBulletChart } from './layouts/statistical/bullet-chart'
import { render as renderScorecard } from './layouts/statistical/scorecard'
import { render as renderTreemap } from './layouts/statistical/treemap'
import { render as renderSankey } from './layouts/statistical/sankey'
import { render as renderWaffle } from './layouts/statistical/waffle'
import { render as renderGauge } from './layouts/statistical/gauge'
import { render as renderRadar } from './layouts/statistical/radar'
import { render as renderHeatmap } from './layouts/statistical/heatmap'

// planning family
import { render as renderKanban } from './layouts/planning/kanban'
import { render as renderGantt } from './layouts/planning/gantt'
import { render as renderGanttLite } from './layouts/planning/gantt-lite'
import { render as renderSprintBoard } from './layouts/planning/sprint-board'
import { render as renderTimeline } from './layouts/planning/timeline'
import { render as renderMilestone } from './layouts/planning/milestone'
import { render as renderWbs } from './layouts/planning/wbs'

// technical family
import { render as renderLayeredArch } from './layouts/technical/layered-arch'
import { render as renderEntity } from './layouts/technical/entity'
import { render as renderNetwork } from './layouts/technical/network'
import { render as renderPipeline } from './layouts/technical/pipeline'
import { render as renderSequence } from './layouts/technical/sequence'
import { render as renderStateMachine } from './layouts/technical/state-machine'
import { render as renderFlowchart } from './layouts/technical/flowchart'
import { render as renderClass } from './layouts/technical/class'

// plot family (x-y plots)
import { render as renderLineChart } from './layouts/plot/line-chart'
import { render as renderScatter } from './layouts/plot/scatter'
import { render as renderAreaChart } from './layouts/plot/area-chart'
import { render as renderBarChart } from './layouts/plot/bar-chart'

type LayoutRenderer = (spec: MdArtSpec, theme: MdArtTheme) => string

const LAYOUT_RENDERERS: Record<string, LayoutRenderer> = {
  // process family
  process: renderProcessType,
  // Phase 1 hard aliases — force the corresponding shape, same dispatcher/
  // renderer as `type: process, shape: <x>`, so these pick up the unified
  // (reconciled) fallback behavior rather than a frozen duplicate.
  'chevron-process': (spec, theme) => renderProcessType({ ...spec, shape: 'chevron' }, theme),
  'arrow-process': (spec, theme) => renderProcessType({ ...spec, shape: 'arrow' }, theme),
  'circle-process': (spec, theme) => renderProcessType({ ...spec, shape: 'circle' }, theme),
  'circular-process': (spec, theme) => renderProcessType({ ...spec, shape: 'ring' }, theme),
  'bending-process': (spec, theme) => renderProcessType({ ...spec, shape: 'bending' }, theme),
  'snake-process': (spec, theme) => renderProcessType({ ...spec, shape: 'bending' }, theme),
  'step-up': (spec, theme) => renderProcessType({ ...spec, shape: 'step-up' }, theme),
  'step-down': (spec, theme) => renderProcessType({ ...spec, shape: 'step-down' }, theme),
  funnel: renderFunnel,
  roadmap: renderRoadmap,
  waterfall: renderWaterfall,
  equation: renderEquation,
  'segmented-bar': renderSegmentedBar,
  'phase-process': renderPhaseProcess,
  'timeline-h': renderTimelineH,
  'timeline-v': renderTimelineV,
  swimlane: renderSwimlane,

  // list family
  list: renderList,
  // Phase 0a hard aliases — force the corresponding shape, same dispatcher/
  // renderer as `type: list, shape: <x>`, so these pick up the unified
  // (reconciled) behavior rather than a frozen duplicate.
  'bullet-list': (spec, theme) => renderList({ ...spec, shape: 'bullet' }, theme),
  'numbered-list': (spec, theme) => renderList({ ...spec, shape: 'numbered' }, theme),
  'circle-list': (spec, theme) => renderList({ ...spec, shape: 'circle' }, theme),
  'icon-list': (spec, theme) => renderList({ ...spec, shape: 'icon' }, theme),
  'chevron-list': (spec, theme) => renderList({ ...spec, shape: 'chevron' }, theme),
  'ribbon-list': (spec, theme) => renderList({ ...spec, shape: 'ribbon' }, theme),
  'trapezoid-list': (spec, theme) => renderList({ ...spec, shape: 'trapezoid' }, theme),
  'two-column-list': (spec, theme) => renderList({ ...spec, shape: 'two-column' }, theme),
  'block-list': (spec, theme) => renderList({ ...spec, shape: 'block' }, theme),
  'hexagon-list': (spec, theme) => renderList({ ...spec, shape: 'hexagon' }, theme),
  checklist: renderChecklist,
  'timeline-list': renderTimelineList,
  // Phase 0b renames — canonical name + permanent alias, unchanged behavior.
  'card-deck': renderCardList,
  'card-list': renderCardList,
  'zigzag-timeline': renderZigzagList,
  'zigzag-list': renderZigzagList,
  tabs: renderTabList,
  'tab-list': renderTabList,

  // cycle family
  cycle: renderCycleType,
  'donut-cycle': (spec, theme) => renderCycleType({ ...spec, shape: 'donut' }, theme),
  'segmented-cycle': (spec, theme) => renderCycleType({ ...spec, shape: 'segmented' }, theme),
  'nondirectional-cycle': (spec, theme) => renderCycleType({ ...spec, shape: 'orbit' }, theme),
  'multidirectional-cycle': (spec, theme) => renderCycleType({ ...spec, shape: 'mesh' }, theme),
  spiral: (spec, theme) => renderCycleType({ ...spec, shape: 'spiral' }, theme),
  'gear-cycle': renderGearCycle,
  'block-cycle': renderBlockCycle,
  loop: renderLoop,

  // matrix family
  swot: renderSwot,
  'pros-cons': renderProsCons,
  comparison: renderComparison,
  'matrix-2x2': renderMatrix2x2,
  bcg: renderBcg,
  ansoff: renderAnsoff,
  'matrix-nxm': renderMatrixNxm,
  table: renderTable,

  // hierarchy family
  'org-chart': renderOrgChart,
  tree: renderTree,
  'h-org-chart': renderHOrgChart,
  'hierarchy-list': renderHierarchyList,
  'radial-tree': renderRadialTree,
  'decision-tree': renderDecisionTree,
  sitemap: renderSitemap,
  bracket: renderBracket,
  'bracket-tree': renderBracketTree,
  'mind-map': renderMindMap,

  // pyramid family
  pyramid: renderPyramid,
  'inverted-pyramid': renderInvertedPyramid,
  'pyramid-list': renderPyramidList,
  'segmented-pyramid': renderSegmentedPyramid,
  'diamond-pyramid': renderDiamondPyramid,

  // relationship family
  venn: renderVenn,
  'venn-3': renderVenn3,
  'venn-4': renderVenn4,
  concentric: renderConcentric,
  balance: renderBalance,
  counterbalance: renderCounterbalance,
  'opposing-arrows': renderOpposingArrows,
  web: renderWeb,
  cluster: renderCluster,
  target: renderTarget,
  radial: renderRadial,
  converging: renderConverging,
  diverging: renderDiverging,
  plus: renderPlus,

  // statistical family
  'progress-list': renderProgressList,
  'bullet-chart': renderBulletChart,
  scorecard: renderScorecard,
  treemap: renderTreemap,
  sankey: renderSankey,
  waffle: renderWaffle,
  gauge: renderGauge,
  radar: renderRadar,
  heatmap: renderHeatmap,

  // planning family
  kanban: renderKanban,
  gantt: renderGantt,
  'gantt-lite': renderGanttLite,
  'sprint-board': renderSprintBoard,
  timeline: renderTimeline,
  milestone: renderMilestone,
  wbs: renderWbs,

  // technical family
  'layered-arch': renderLayeredArch,
  entity: renderEntity,
  network: renderNetwork,
  pipeline: renderPipeline,
  sequence: renderSequence,
  'state-machine': renderStateMachine,
  flowchart: renderFlowchart,
  class: renderClass,

  // plot family
  'line-chart': renderLineChart,
  scatter: renderScatter,
  'area-chart': renderAreaChart,
  'bar-chart': renderBarChart,
}

/** All valid diagram type names. Derived from LAYOUT_RENDERERS at module load. */
export const KNOWN_TYPES: ReadonlySet<string> = new Set(Object.keys(LAYOUT_RENDERERS))

/**
 * The return value of `renderMdArtDetailed`: the rendered SVG plus any
 * validation issues found during rendering (empty when `validate: 'silent'`).
 */
export interface RenderResult {
  /** The rendered SVG string (may be an error SVG if `validate: 'error'` triggered) */
  svg: string
  /** Validation issues collected during this render. Empty when validate is 'silent'. */
  issues: ValidationIssue[]
}

/**
 * Render an MdArt source string to SVG, returning the SVG together with any
 * validation issues found.
 *
 * Validation is controlled by the `validate` field in `pluginConfig` (or the
 * global config set via `configureMdArt()`):
 *
 * - `'silent'`  — skip validation; `issues` is always `[]`.
 * - `'warning'` — (default) validate and collect issues; rendering always proceeds.
 * - `'error'`   — validate; abort and return an error SVG if any error-level issue exists.
 *
 * @param raw          - Raw mdart source (front-matter + items)
 * @param hintType     - Optional layout type hint from the fence header
 * @param pluginConfig - Optional plugin-level config (merged on top of global,
 *                       below per-fence front-matter)
 */
export function renderMdArtDetailed(
  raw: string,
  hintType?: string,
  pluginConfig?: MdArtConfig,
): RenderResult {
  const issues: ValidationIssue[] = []

  try {
    const spec      = parseMdArt(raw, hintType)
    const globalCfg = getGlobalConfig()

    // Validation
    const validateMode = pluginConfig?.validate ?? globalCfg.validate ?? 'warning'
    const onIssue      = pluginConfig?.onIssue  ?? globalCfg.onIssue

    if (validateMode !== 'silent') {
      for (const issue of validateMdArt(spec)) {
        issues.push(issue)
        onIssue?.(issue)
      }
      if (validateMode === 'error' && issues.some(i => i.level === 'error')) {
        const msg = issues
          .filter(i => i.level === 'error')
          .map(i => i.message)
          .join('; ')
        return { svg: renderError(msg), issues }
      }
    }

    // Theme resolution: per-fence > plugin > global > category default
    const themeKey = spec.theme ?? pluginConfig?.theme ?? globalCfg.theme
    const mode     = spec.mode  ?? pluginConfig?.mode  ?? globalCfg.mode  ?? 'dark'
    let theme = getTheme(spec.type, themeKey, mode)

    // Color overrides: global < plugin < per-fence (each layer spreads on top)
    if (globalCfg.colors)                          theme = { ...theme, ...globalCfg.colors }
    if (pluginConfig?.colors)                      theme = { ...theme, ...pluginConfig.colors }
    if (spec.colors && Object.keys(spec.colors).length > 0) {
      theme = { ...theme, ...spec.colors } as typeof theme
    }

    const renderer = LAYOUT_RENDERERS[spec.type]
    const effectiveCfg = { ...globalCfg, ...pluginConfig }
    const svg = withMdArtRenderConfig(effectiveCfg, () =>
      renderer ? renderer(spec, theme) : renderFallback(spec, theme)
    )
    const styledSvg = applyInlineMarkdownToSvgText(svg)
    const boundsMode = getTextBoundsDebugMode(effectiveCfg)
    let debugSvg = boundsMode === 'blue' || boundsMode === 'both'
      ? addTextBoundsOverlay(styledSvg, 'blue')
      : styledSvg
    if (boundsMode === 'red' || boundsMode === 'both') {
      const lifted = liftLayoutTextBoundsOverlay(debugSvg)
      debugSvg = lifted.count === 0
        ? addTextBoundsOverlay(debugSvg, 'red')
        : lifted.svg
    }
    return { svg: scopeSvgAnimation(debugSvg, raw, hintType, spec.type), issues }
  } catch (e) {
    return { svg: renderError(String(e)), issues }
  }
}

/**
 * Render an MdArt source string to SVG.
 *
 * This is a thin wrapper around `renderMdArtDetailed` for backward
 * compatibility. For access to validation issues, use `renderMdArtDetailed`.
 *
 * @param raw          - Raw mdart source (front-matter + items)
 * @param hintType     - Optional layout type hint from the fence header
 * @param pluginConfig - Optional plugin-level config (merged on top of global,
 *                       below per-fence front-matter)
 */
export function renderMdArt(raw: string, hintType?: string, pluginConfig?: MdArtConfig): string {
  return renderMdArtDetailed(raw, hintType, pluginConfig).svg
}

function applyInlineMarkdownToSvgText(svg: string): string {
  return svg.replace(
    /<(text|tspan)\b([^>]*)>([^<]*[*~`][^<]*)<\/\1>/g,
    (match, tag: string, attrs: string, content: string) => {
      const decoded = decodeXmlText(content)
      const rendered = renderInlineMarkdown(decoded)
      return rendered === content ? match : `<${tag}${attrs}>${rendered}</${tag}>`
    },
  )
}

function decodeXmlText(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

function addTextBoundsOverlay(svg: string, color: 'red' | 'blue'): string {
  if (!svg.startsWith('<svg') || !svg.includes('</svg>')) return svg

  const style = color === 'red'
    ? {
        fill: 'rgba(236,72,153,0.08)',
        stroke: '#ec4899',
        dash: '3 2',
      }
    : {
        fill: 'rgba(14,165,233,0.06)',
        stroke: '#0ea5e9',
        dash: '2 2',
      }
  const rects: string[] = []
  for (const match of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const box = estimateSvgTextBox(match[1], match[2])
    if (!box) continue
    rects.push(
      `<rect data-mdart-debug="text-bounds" data-mdart-debug-label="text-element" ` +
      `x="${box.x.toFixed(1)}" y="${box.y.toFixed(1)}" ` +
      `width="${box.w.toFixed(1)}" height="${box.h.toFixed(1)}" ` +
      `fill="${style.fill}" stroke="${style.stroke}" stroke-width="1" ` +
      `stroke-dasharray="${style.dash}" pointer-events="none"><title>${escapeXml(box.label)}</title></rect>`,
    )
  }

  if (rects.length === 0) return svg
  const layer = `<g data-mdart-debug-layer="${color}-text-bounds" pointer-events="none">${rects.join('')}</g>`
  return svg.replace('</svg>', `${layer}</svg>`)
}

function liftLayoutTextBoundsOverlay(svg: string): { svg: string; count: number } {
  if (!svg.includes('data-mdart-debug="text-bounds"') || !svg.includes('</svg>')) return { svg, count: 0 }

  const rects: string[] = []
  const withoutLayoutRects = svg.replace(
    /<rect\b(?=[^>]*\bdata-mdart-debug="text-bounds")[^>]*\/>/g,
    (rect) => {
      if (rect.includes('data-mdart-debug-label="text-element"')) return rect
      rects.push(rect)
      return ''
    },
  )

  if (rects.length === 0) return { svg, count: 0 }
  const layer = `<g data-mdart-debug-layer="layout-text-bounds" pointer-events="none">${rects.join('')}</g>`
  return { svg: withoutLayoutRects.replace('</svg>', `${layer}</svg>`), count: rects.length }
}

function estimateSvgTextBox(attrs: string, content: string): { x: number; y: number; w: number; h: number; label: string } | null {
  const x = numberAttr(attrs, 'x') ?? firstNumberAttr(content, 'x')
  const y = numberAttr(attrs, 'y') ?? firstNumberAttr(content, 'y')
  if (x === null || y === null) return null

  const fontSize = numberAttr(attrs, 'font-size') ?? firstNumberAttr(content, 'font-size') ?? 12
  const lineHeight = Math.max(1, fontSize * 1.25)
  const lines = svgTextLines(content)
  if (lines.length === 0) return null

  const w = Math.max(1, ...lines.map(line => estimateTextWidth(line, fontSize)))
  const h = Math.max(fontSize, lines.length * lineHeight)
  const anchor = stringAttr(attrs, 'text-anchor') ?? 'start'
  const left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x
  const top = y - fontSize * 0.9

  return { x: left, y: top, w, h, label: lines.join(' ') }
}

function svgTextLines(content: string): string[] {
  const body = content.replace(/<title\b[^>]*>[\s\S]*?<\/title>/g, '')
  const tspans = Array.from(body.matchAll(/<tspan\b([^>]*)>([\s\S]*?)<\/tspan>/g))
  if (tspans.length === 0) {
    const text = decodeXmlText(body.replace(/<[^>]+>/g, '').trim())
    return text ? [text] : []
  }

  const lines: string[] = []
  let current = ''
  for (const [, attrs, tspanBody] of tspans) {
    const text = decodeXmlText(tspanBody.replace(/<[^>]+>/g, ''))
    const dy = numberAttr(attrs, 'dy') ?? 0
    if (current && Math.abs(dy) > 0.01) {
      lines.push(current.trim())
      current = ''
    }
    current += text
  }
  if (current.trim()) lines.push(current.trim())
  return lines.filter(Boolean)
}

function numberAttr(attrs: string, name: string): number | null {
  const raw = stringAttr(attrs, name)
  if (raw === null) return null
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : null
}

function firstNumberAttr(svg: string, name: string): number | null {
  for (const match of svg.matchAll(new RegExp(`\\b${escapeRegExp(name)}=(["'])(.*?)\\1`, 'g'))) {
    const n = Number.parseFloat(match[2])
    if (Number.isFinite(n)) return n
  }
  return null
}

function stringAttr(attrs: string, name: string): string | null {
  const escaped = escapeRegExp(name)
  const quoted = attrs.match(new RegExp(`\\b${escaped}=(["'])(.*?)\\1`))
  if (quoted) return quoted[2]
  const unquoted = attrs.match(new RegExp(`\\b${escaped}=([^\\s>]+)`))
  return unquoted?.[1] ?? null
}

function scopeSvgAnimation(svg: string, raw: string, hintType: string | undefined, type: string): string {
  if (!svg.includes('<style>') || !svg.startsWith('<svg')) return svg

  const scope = `mdart-s${stableHash(`${type}\n${hintType ?? ''}\n${raw}`)}`
  const keyframeNames = Array.from(new Set(
    Array.from(svg.matchAll(/@keyframes\s+(mdart-[A-Za-z0-9_-]+)/g), match => match[1]),
  ))

  let scoped = renameKeyframes(svg, keyframeNames, scope)

  scoped = scoped.replace(/<style>([\s\S]*?)<\/style>/g, (_match, css: string) => {
    return `<style>${scopeCssRules(css, scope)}</style>`
  })

  return scoped.replace('<svg ', `<svg data-mdart-scope="${scope}" `)
}

function stableHash(input: string): string {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function renameKeyframes(svg: string, keyframeNames: string[], scope: string): string {
  let out = svg
  for (const name of keyframeNames) {
    const scopedName = `${scope}-${name}`
    out = out.replace(
      new RegExp(`(@keyframes\\s+)${escapeRegExp(name)}\\b`, 'g'),
      `$1${scopedName}`,
    )
  }
  return out.replace(/animation:[^;"'}]+/g, decl => {
    let renamed = decl
    for (const name of keyframeNames) {
      renamed = renamed.replace(
        new RegExp(`\\b${escapeRegExp(name)}\\b`, 'g'),
        `${scope}-${name}`,
      )
    }
    return renamed
  })
}

function scopeCssRules(css: string, scope: string): string {
  let out = ''
  let i = 0
  while (i < css.length) {
    const open = css.indexOf('{', i)
    if (open === -1) {
      out += css.slice(i)
      break
    }

    const selector = css.slice(i, open)
    const close = findMatchingBrace(css, open)
    if (close === -1) {
      out += css.slice(i)
      break
    }

    const block = css.slice(open, close + 1)
    if (selector.trim().startsWith('@keyframes')) {
      out += selector + block
    } else if (selector.trim().startsWith('@')) {
      out += selector + block
    } else {
      out += prefixSelectorList(selector, scope) + block
    }
    i = close + 1
  }
  return out
}

function findMatchingBrace(css: string, open: number): number {
  let depth = 0
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++
    if (css[i] === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function prefixSelectorList(selector: string, scope: string): string {
  return selector
    .split(',')
    .map(part => {
      const trimmed = part.trim()
      if (!trimmed) return part
      const leading = part.match(/^\s*/)?.[0] ?? ''
      const trailing = part.match(/\s*$/)?.[0] ?? ''
      return `${leading}[data-mdart-scope="${scope}"] ${trimmed}${trailing}`
    })
    .join(',')
}

function renderFallback(spec: MdArtSpec, theme: MdArtTheme): string {
  const W = 360
  const H = 80
  const label = spec.type ? `${spec.type} (${spec.items.length} items)` : `MdArt (${spec.items.length} items)`
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8" stroke="${theme.border}" stroke-width="1"/>
    <text x="${W / 2}" y="34" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${label}</text>
    <text x="${W / 2}" y="52" text-anchor="middle" font-size="10" fill="${theme.muted}" ${FONT_SANS_ATTR}>layout not yet implemented</text>
  </svg>`
}

function renderError(msg: string): string {
  return `<svg viewBox="0 0 300 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="300" height="60" fill="#1a0a0a" rx="4"/>
    <text x="150" y="28" text-anchor="middle" font-size="11" fill="#f87171" ${FONT_SANS_ATTR}>MdArt error</text>
    <text x="150" y="44" text-anchor="middle" font-size="9" fill="#7f1d1d" ${FONT_SANS_ATTR}>${msg.slice(0, 60).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>
  </svg>`
}
