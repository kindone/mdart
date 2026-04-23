import { parseMdArt } from './parser'
import { getTheme } from './theme'
import { getGlobalConfig } from './config'
import type { MdArtConfig } from './config'
import type { MdArtSpec } from './parser'
import type { MdArtTheme } from './theme'

// process family
import { render as renderProcess } from './layouts/process/process'
import { render as renderChevronProcess } from './layouts/process/chevron-process'
import { render as renderArrowProcess } from './layouts/process/arrow-process'
import { render as renderCircularProcess } from './layouts/process/circular-process'
import { render as renderFunnel } from './layouts/process/funnel'
import { render as renderRoadmap } from './layouts/process/roadmap'
import { render as renderWaterfall } from './layouts/process/waterfall'
import { render as renderSnakeProcess } from './layouts/process/snake-process'
import { render as renderStepDown } from './layouts/process/step-down'
import { render as renderStepUp } from './layouts/process/step-up'
import { render as renderCircleProcess } from './layouts/process/circle-process'
import { render as renderEquation } from './layouts/process/equation'
import { render as renderBendingProcess } from './layouts/process/bending-process'
import { render as renderSegmentedBar } from './layouts/process/segmented-bar'
import { render as renderPhaseProcess } from './layouts/process/phase-process'
import { render as renderTimelineH } from './layouts/process/timeline-h'
import { render as renderTimelineV } from './layouts/process/timeline-v'
import { render as renderSwimlane } from './layouts/process/swimlane'

// list family
import { render as renderBulletList } from './layouts/list/bullet-list'
import { render as renderNumberedList } from './layouts/list/numbered-list'
import { render as renderChecklist } from './layouts/list/checklist'
import { render as renderTwoColumnList } from './layouts/list/two-column-list'
import { render as renderTimelineList } from './layouts/list/timeline-list'
import { render as renderBlockList } from './layouts/list/block-list'
import { render as renderChevronList } from './layouts/list/chevron-list'
import { render as renderCardList } from './layouts/list/card-list'
import { render as renderZigzagList } from './layouts/list/zigzag-list'
import { render as renderRibbonList } from './layouts/list/ribbon-list'
import { render as renderHexagonList } from './layouts/list/hexagon-list'
import { render as renderTrapezoidList } from './layouts/list/trapezoid-list'
import { render as renderTabList } from './layouts/list/tab-list'
import { render as renderCircleList } from './layouts/list/circle-list'
import { render as renderIconList } from './layouts/list/icon-list'

// cycle family
import { render as renderCycle } from './layouts/cycle/cycle'
import { render as renderDonutCycle } from './layouts/cycle/donut-cycle'
import { render as renderGearCycle } from './layouts/cycle/gear-cycle'
import { render as renderSpiral } from './layouts/cycle/spiral'
import { render as renderBlockCycle } from './layouts/cycle/block-cycle'
import { render as renderSegmentedCycle } from './layouts/cycle/segmented-cycle'
import { render as renderNondirectionalCycle } from './layouts/cycle/nondirectional-cycle'
import { render as renderMultidirectionalCycle } from './layouts/cycle/multidirectional-cycle'
import { render as renderLoop } from './layouts/cycle/loop'

// matrix family
import { render as renderSwot } from './layouts/matrix/swot'
import { render as renderProsCons } from './layouts/matrix/pros-cons'
import { render as renderComparison } from './layouts/matrix/comparison'
import { render as renderMatrix2x2 } from './layouts/matrix/matrix-2x2'
import { render as renderBcg } from './layouts/matrix/bcg'
import { render as renderAnsoff } from './layouts/matrix/ansoff'
import { render as renderMatrixNxm } from './layouts/matrix/matrix-nxm'

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
import { render as renderClass } from './layouts/technical/class'

type LayoutRenderer = (spec: MdArtSpec, theme: MdArtTheme) => string

const LAYOUT_RENDERERS: Record<string, LayoutRenderer> = {
  // process family
  process: renderProcess,
  'chevron-process': renderChevronProcess,
  'arrow-process': renderArrowProcess,
  'circular-process': renderCircularProcess,
  funnel: renderFunnel,
  roadmap: renderRoadmap,
  waterfall: renderWaterfall,
  'snake-process': renderSnakeProcess,
  'step-down': renderStepDown,
  'step-up': renderStepUp,
  'circle-process': renderCircleProcess,
  equation: renderEquation,
  'bending-process': renderBendingProcess,
  'segmented-bar': renderSegmentedBar,
  'phase-process': renderPhaseProcess,
  'timeline-h': renderTimelineH,
  'timeline-v': renderTimelineV,
  swimlane: renderSwimlane,

  // list family
  'bullet-list': renderBulletList,
  'numbered-list': renderNumberedList,
  checklist: renderChecklist,
  'two-column-list': renderTwoColumnList,
  'timeline-list': renderTimelineList,
  'block-list': renderBlockList,
  'chevron-list': renderChevronList,
  'card-list': renderCardList,
  'zigzag-list': renderZigzagList,
  'ribbon-list': renderRibbonList,
  'hexagon-list': renderHexagonList,
  'trapezoid-list': renderTrapezoidList,
  'tab-list': renderTabList,
  'circle-list': renderCircleList,
  'icon-list': renderIconList,

  // cycle family
  cycle: renderCycle,
  'donut-cycle': renderDonutCycle,
  'gear-cycle': renderGearCycle,
  spiral: renderSpiral,
  'block-cycle': renderBlockCycle,
  'segmented-cycle': renderSegmentedCycle,
  'nondirectional-cycle': renderNondirectionalCycle,
  'multidirectional-cycle': renderMultidirectionalCycle,
  loop: renderLoop,

  // matrix family
  swot: renderSwot,
  'pros-cons': renderProsCons,
  comparison: renderComparison,
  'matrix-2x2': renderMatrix2x2,
  bcg: renderBcg,
  ansoff: renderAnsoff,
  'matrix-nxm': renderMatrixNxm,

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
  class: renderClass,
}

/**
 * Render an MdArt source string to SVG.
 *
 * @param raw          - Raw mdart source (front-matter + items)
 * @param hintType     - Optional layout type hint from the fence header
 * @param pluginConfig - Optional plugin-level config (merged on top of global,
 *                       below per-fence front-matter)
 */
export function renderMdArt(raw: string, hintType?: string, pluginConfig?: MdArtConfig): string {
  try {
    const spec      = parseMdArt(raw, hintType)
    const globalCfg = getGlobalConfig()

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
    if (!renderer) return renderFallback(spec, theme)
    return renderer(spec, theme)
  } catch (e) {
    return renderError(String(e))
  }
}

function renderFallback(spec: MdArtSpec, theme: MdArtTheme): string {
  const W = 360
  const H = 80
  const label = spec.type ? `${spec.type} (${spec.items.length} items)` : `MdArt (${spec.items.length} items)`
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8" stroke="${theme.border}" stroke-width="1"/>
    <text x="${W / 2}" y="34" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${label}</text>
    <text x="${W / 2}" y="52" text-anchor="middle" font-size="10" fill="${theme.muted}" font-family="system-ui,sans-serif">layout not yet implemented</text>
  </svg>`
}

function renderError(msg: string): string {
  return `<svg viewBox="0 0 300 60" xmlns="http://www.w3.org/2000/svg">
    <rect width="300" height="60" fill="#1a0a0a" rx="4"/>
    <text x="150" y="28" text-anchor="middle" font-size="11" fill="#f87171" font-family="system-ui,sans-serif">MdArt error</text>
    <text x="150" y="44" text-anchor="middle" font-size="9" fill="#7f1d1d" font-family="system-ui,sans-serif">${msg.slice(0, 60).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>
  </svg>`
}
