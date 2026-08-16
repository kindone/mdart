import { KNOWN_TYPES } from 'mdart'
import { generatePropertyMdart } from '../../../packages/mdart/src/__tests__/sample-generator'

export type GenerateKind = 'any' | string
export type GenerateStrategy = 'curated' | 'property'

const FAMILIES: Record<string, string[]> = {
  process: ['process', 'chevron-process', 'arrow-process', 'circular-process', 'funnel', 'roadmap', 'waterfall', 'snake-process', 'step-up', 'step-down', 'circle-process', 'equation', 'bending-process', 'segmented-bar', 'phase-process', 'timeline-h', 'timeline-v', 'swimlane'],
  list: ['bullet-list', 'numbered-list', 'checklist', 'two-column-list', 'timeline-list', 'block-list', 'chevron-list', 'card-list', 'zigzag-list', 'ribbon-list', 'hexagon-list', 'trapezoid-list', 'tab-list', 'circle-list', 'icon-list'],
  cycle: ['cycle', 'donut-cycle', 'gear-cycle', 'spiral', 'block-cycle', 'segmented-cycle', 'nondirectional-cycle', 'multidirectional-cycle', 'loop'],
  matrix: ['swot', 'pros-cons', 'comparison', 'matrix-2x2', 'bcg', 'ansoff', 'matrix-nxm', 'table'],
  hierarchy: ['org-chart', 'tree', 'h-org-chart', 'hierarchy-list', 'radial-tree', 'decision-tree', 'sitemap', 'bracket', 'bracket-tree', 'mind-map'],
  pyramid: ['pyramid', 'inverted-pyramid', 'pyramid-list', 'segmented-pyramid', 'diamond-pyramid'],
  relationship: ['venn', 'venn-3', 'venn-4', 'concentric', 'balance', 'counterbalance', 'opposing-arrows', 'web', 'cluster', 'target', 'radial', 'converging', 'diverging', 'plus'],
  statistical: ['progress-list', 'bullet-chart', 'scorecard', 'treemap', 'sankey', 'waffle', 'gauge', 'radar', 'heatmap'],
  planning: ['kanban', 'gantt', 'gantt-lite', 'sprint-board', 'timeline', 'milestone', 'wbs'],
  technical: ['layered-arch', 'entity', 'network', 'pipeline', 'sequence', 'state-machine', 'flowchart', 'class'],
  plot: ['line-chart', 'scatter', 'area-chart', 'bar-chart'],
}

export const GENERATOR_FAMILIES = FAMILIES

const TYPES = [...KNOWN_TYPES]
const WORDS = [
  'Alpha', 'Beta', 'Cache', 'Delta', 'Edge', 'Flux', 'Gateway', 'Harbor',
  'Index', 'Kernel', 'Ledger', 'Matrix', 'Nimbus', 'Orbit', 'Pulse', 'Queue',
  'Relay', 'Signal', 'Trace', 'Vector', 'Workflow', 'Zenith',
]
const PHRASES = [
  'cross region rollout dependency',
  'customer migration readiness checkpoint',
  'multi tenant billing reconciliation',
  'streaming parser backpressure window',
  'operator approval before deployment',
  'fallback cache invalidation strategy',
  'regression suite coverage expansion',
  'workspace permission inheritance edge case',
]
const VALUES = [
  'stable',
  '42%',
  'high priority',
  'phase 2',
  'blocked by API',
  'owner review',
  '3.14',
  '100 ms',
  'requires manual verification before release',
  'pending contract test fixture coverage',
  'depends on upstream schema migration',
  'watch for noisy retry behavior under load',
]
const ATTRS = ['active', 'done', 'risk', 'critical', 'w=4', 'dashed', 'smooth']

function pick<T>(xs: readonly T[]): T {
  return xs[Math.floor(Math.random() * xs.length)]
}

function int(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function label(i = 0): string {
  if (Math.random() < 0.35) {
    const phrase = pick(PHRASES)
    return Math.random() < 0.3 ? `${phrase} ${pick(WORDS)} ${i + 1}` : phrase
  }
  const parts = Array.from({ length: int(2, 8) }, () => pick(WORDS))
  if (Math.random() < 0.25) parts.push(String(i + 1))
  return parts.join(' ')
}

function value(): string {
  return pick(VALUES)
}

function attrs(): string {
  const n = int(0, 2)
  if (n === 0) return ''
  const chosen = Array.from({ length: n }, () => pick(ATTRS))
  return ` [${[...new Set(chosen)].join(', ')}]`
}

function item(i: number, withValue = true): string {
  const v = withValue && Math.random() < 0.65 ? `: ${value()}` : ''
  return `- ${label(i)}${v}${attrs()}`
}

function flat(type: string, n = int(4, 7), withValue = true): string {
  return [`type: ${type}`, `title: Generated ${type}`, '', ...Array.from({ length: n }, (_, i) => item(i, withValue))].join('\n')
}

function nested(type: string, parents = int(3, 5), children = int(2, 4)): string {
  const lines = [`type: ${type}`, `title: Generated ${type}`, '']
  for (let i = 0; i < parents; i++) {
    lines.push(item(i, Math.random() < 0.6))
    for (let j = 0; j < children; j++) lines.push(`  - ${label(j)}${Math.random() < 0.45 ? `: ${value()}` : ''}${attrs()}`)
  }
  return lines.join('\n')
}

function keyed(type: string, rows = int(3, 5), cols = int(3, 4)): string {
  const keys = Array.from({ length: cols }, (_, i) => pick(['Cost', 'Speed', 'Risk', 'Owner', 'Status', 'Fit']) + ` ${i + 1}`)
  const lines = [`type: ${type}`, `title: Generated ${type}`, '']
  for (let r = 0; r < rows; r++) {
    lines.push(`- ${label(r)}`)
    for (const key of keys) lines.push(`  - ${key}: ${value()}`)
  }
  return lines.join('\n')
}

function plot(type: string): string {
  const lines = [
    `type: ${type}`,
    `title: Generated ${type}`,
    'x-label: Iteration',
    'y-label: Score',
    'smooth: true',
    '',
  ]
  for (const series of ['Baseline', 'Variant', 'Target']) {
    const pts = Array.from({ length: 7 }, (_, i) => `(${i + 1}, ${int(10, 95)})`).join(', ')
    lines.push(`- ${series}: ${pts}`)
  }
  return lines.join('\n')
}

export function generateMdart(
  kind: GenerateKind = 'any',
  strategy: GenerateStrategy = 'curated',
): { type: string; source: string; domain?: string } {
  if (strategy === 'property') return generatePropertyMdart(kind)

  const requested = kind === 'any' ? pick(TYPES) : kind
  const type = TYPES.includes(requested) ? requested : pick(TYPES)

  if (['kanban', 'sprint-board', 'swimlane', 'wbs', 'org-chart', 'tree', 'h-org-chart', 'hierarchy-list', 'radial-tree', 'decision-tree', 'sitemap', 'bracket', 'bracket-tree', 'mind-map', 'layered-arch', 'pipeline'].includes(type)) {
    return { type, source: nested(type) }
  }
  if (['comparison', 'matrix-nxm', 'heatmap', 'table'].includes(type)) return { type, source: keyed(type) }
  if (['line-chart', 'scatter', 'area-chart', 'bar-chart'].includes(type)) return { type, source: plot(type) }
  if (type === 'swot') {
    return { type, source: [`type: swot`, 'title: Generated swot', '', `+ ${label(0)}: ${value()}`, `- ${label(1)}: ${value()}`, `? ${label(2)}: ${value()}`, `! ${label(3)}: ${value()}`].join('\n') }
  }
  if (type === 'pros-cons') {
    return { type, source: [`type: pros-cons`, 'title: Generated pros-cons', '', '- Pros', `  - ${label(0)}: ${value()}`, `  - ${label(1)}: ${value()}`, '- Cons', `  - ${label(2)}: ${value()}`, `  - ${label(3)}: ${value()}`].join('\n') }
  }
  if (type === 'gantt' || type === 'gantt-lite') {
    const lines = [`type: ${type}`, `title: Generated ${type}`, '']
    for (let i = 0; i < 5; i++) {
      const s = int(1, 8)
      lines.push(`${i === 4 ? '*' : '-'} ${label(i)} [wk${s}-wk${s + int(1, 3)}]`)
    }
    return { type, source: lines.join('\n') }
  }
  if (type === 'sequence') {
    return { type, source: ['type: sequence', 'title: Generated sequence', '', '- Browser', '  -> API: submit request', '  -> Worker: enqueue job', '- Worker', '  -> Database: persist result', '  -> Browser: stream update'].join('\n') }
  }
  if (type === 'state-machine') {
    return { type, source: ['type: state-machine', 'title: Generated state-machine', '', '- Idle', '  -> Running: start', '- Running', '  -> Done: success', '  -> Failed: error', '- Failed', '  -> Idle: retry'].join('\n') }
  }
  if (type === 'entity') {
    return { type, source: ['type: entity', 'title: Generated entity', '', '- users', '  - id: uuid [PK]', '  - email: text', '  - org_id: uuid [FK->orgs]', '- orgs', '  - id: uuid [PK]', '  - name: text'].join('\n') }
  }
  if (type === 'class') {
    return { type, source: ['type: class', 'title: Generated class', '', '- Renderer', '  - [+] render(): SVG', '  - [-] cache: Map', '- Parser', '  - [+] parse(): Spec', '  - [#] normalize(): void'].join('\n') }
  }
  return { type, source: flat(type) }
}
