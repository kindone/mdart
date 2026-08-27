/**
 * MdArt validator — semantic validation of parsed MdArtSpec structures.
 *
 * Deliberately free of renderer imports so it can be used in validate-only
 * contexts (IDEs, test harnesses, CLIs) without pulling in the full layout tree.
 * KNOWN_TYPES is therefore defined inline and must be kept in sync with the
 * LAYOUT_RENDERERS registry in renderer.ts.
 */

import type { MdArtItem, MdArtSpec } from './parser'

// ── Public types ──────────────────────────────────────────────────────────────

export type ValidationLevel = 'error' | 'warning'

export interface ValidationLocation {
  /** 0-based index into spec.items (or into the relevant children array) */
  itemIndex: number
  /** Human-readable label of the offending item */
  label: string
  /** Dotted path for nested locations, e.g. "items[0].children[2]" */
  path?: string
}

export interface ValidationIssue {
  level: ValidationLevel
  /** Machine-readable code — use in test assertions, never match on message strings */
  code: ValidationCode
  message: string
  location?: ValidationLocation
  /** Actionable hint for fixing the issue */
  suggestion?: string
}

export interface ValidationOptions {
  /**
   * Return only issues at or above this level.
   * Default: 'warning' (returns both warnings and errors).
   * Pass 'error' to suppress warnings entirely.
   */
  minLevel?: ValidationLevel
}

export type ValidationCode =
  // Structural errors — renderer should not be called
  | 'STRUCT_UNKNOWN_TYPE'               // type not in KNOWN_TYPES
  | 'STRUCT_EMPTY_DIAGRAM'              // no items for a type that needs at least one
  | 'STRUCT_INSUFFICIENT_ITEMS'         // below type minimum (venn < 2, matrix-2x2 ≠ 4, …)
  | 'STRUCT_MISSING_REQUIRED_STRUCTURE' // comparison mixed keys, gantt no ranges, swot no prefixes, …
  | 'STRUCT_INVALID_ATTRIBUTE_VALUE'    // direction: "DIAGONAL", unknown theme, …

  // Layout warnings — renders but likely looks wrong
  | 'LAYOUT_NODE_COUNT_EXCEEDS_RANGE'   // more items than the type handles gracefully
  | 'LAYOUT_EXCESS_DEPTH'               // hierarchy depth > 5
  | 'LAYOUT_UNBALANCED_TREE'            // max branch depth − min branch depth > 3
  | 'LAYOUT_FLAT_HIERARCHY'             // tree/org-chart/mind-map with no children
  | 'LAYOUT_IGNORED_CHILDREN'           // waffle, gauge given children they don't use
  | 'LAYOUT_MISMATCHED_KEYS'            // comparison column mixes keyed / unkeyed children

  // Content warnings — data quality issues
  | 'CONTENT_VERY_LONG_LABEL'           // label exceeds type-specific threshold
  | 'CONTENT_EMPTY_LABEL'               // item with empty or whitespace-only label
  | 'CONTENT_DUPLICATE_SIBLING_LABELS'  // two siblings share the same label text
  | 'CONTENT_NUMERIC_VALUE_EXPECTED'    // statistical type item has non-numeric value
  | 'CONTENT_MISSING_NUMERIC_VALUE'     // statistical type item has no value at all

// ── Known type registry ───────────────────────────────────────────────────────
// Keep in sync with LAYOUT_RENDERERS in renderer.ts.

const KNOWN_TYPES = new Set([
  // process
  'process', 'chevron-process', 'arrow-process', 'circular-process', 'funnel',
  'roadmap', 'waterfall', 'snake-process', 'bending-process', 'step-down', 'step-up',
  'circle-process', 'equation', 'segmented-bar', 'phase-process',
  'timeline-h', 'timeline-v', 'swimlane',
  // list
  'list',
  'bullet-list', 'numbered-list', 'checklist', 'two-column-list', 'timeline-list',
  'block-list', 'chevron-list', 'card-list', 'zigzag-list', 'ribbon-list',
  'hexagon-list', 'trapezoid-list', 'tab-list', 'circle-list', 'icon-list',
  'card-deck', 'zigzag-timeline', 'tabs',
  // cycle
  'cycle', 'donut-cycle', 'gear-cycle', 'spiral', 'block-cycle', 'segmented-cycle',
  'nondirectional-cycle', 'multidirectional-cycle', 'loop',
  // matrix
  'swot', 'pros-cons', 'comparison', 'matrix-2x2', 'bcg', 'ansoff', 'matrix-nxm', 'table',
  // hierarchy
  'org-chart', 'tree', 'h-org-chart', 'hierarchy-list', 'radial-tree',
  'decision-tree', 'sitemap', 'bracket', 'bracket-tree', 'mind-map',
  // pyramid
  'pyramid', 'inverted-pyramid', 'pyramid-list', 'segmented-pyramid', 'diamond-pyramid',
  // relationship
  'venn', 'venn-3', 'venn-4', 'concentric', 'balance', 'counterbalance',
  'opposing-arrows', 'web', 'cluster', 'target', 'radial',
  'converging', 'diverging', 'plus',
  // statistical
  'progress-list', 'bullet-chart', 'scorecard', 'treemap', 'sankey',
  'waffle', 'gauge', 'radar', 'heatmap',
  // planning
  'kanban', 'gantt', 'gantt-lite', 'sprint-board', 'timeline', 'milestone', 'wbs',
  // technical
  'layered-arch', 'entity', 'network', 'pipeline', 'sequence', 'state-machine', 'flowchart', 'class',
  // plot
  'line-chart', 'scatter', 'area-chart', 'bar-chart',
])

// Valid `shape:` values for `type: list`. Kept in sync with LIST_SHAPES in
// layouts/list/list.ts (validator.ts is deliberately renderer-free, see
// header comment, so this can't be a shared import).
const LIST_SHAPES = new Set([
  'bullet', 'numbered', 'circle', 'icon', 'chevron', 'ribbon', 'trapezoid',
  'two-column', 'block', 'hexagon',
])

// Valid `shape:` values for `type: process`. Kept in sync with
// PROCESS_SHAPES in layouts/process/process-shapes.ts.
const PROCESS_SHAPES = new Set([
  'process', 'chevron', 'arrow', 'circle', 'ring', 'bending', 'step-up', 'step-down',
])

// ── Family mapping ────────────────────────────────────────────────────────────

const TYPE_FAMILY: Record<string, string> = {
  // process
  process: 'process', 'chevron-process': 'process', 'arrow-process': 'process',
  'circular-process': 'process', funnel: 'process', roadmap: 'process',
  waterfall: 'process', 'snake-process': 'process', 'bending-process': 'process',
  'step-down': 'process', 'step-up': 'process', 'circle-process': 'process',
  equation: 'process', 'segmented-bar': 'process', 'phase-process': 'process',
  'timeline-h': 'process', 'timeline-v': 'process', swimlane: 'process',
  // list
  list: 'list',
  'bullet-list': 'list', 'numbered-list': 'list', checklist: 'list',
  'two-column-list': 'list', 'timeline-list': 'list', 'block-list': 'list',
  'chevron-list': 'list', 'card-list': 'list', 'zigzag-list': 'list',
  'ribbon-list': 'list', 'hexagon-list': 'list', 'trapezoid-list': 'list',
  'tab-list': 'list', 'circle-list': 'list', 'icon-list': 'list',
  'card-deck': 'list', 'zigzag-timeline': 'list', tabs: 'list',
  // cycle
  cycle: 'cycle', 'donut-cycle': 'cycle', 'gear-cycle': 'cycle',
  spiral: 'cycle', 'block-cycle': 'cycle', 'segmented-cycle': 'cycle',
  'nondirectional-cycle': 'cycle', 'multidirectional-cycle': 'cycle', loop: 'cycle',
  // matrix
  swot: 'matrix', 'pros-cons': 'matrix', comparison: 'matrix',
  'matrix-2x2': 'matrix', bcg: 'matrix', ansoff: 'matrix', 'matrix-nxm': 'matrix', table: 'matrix',
  // hierarchy
  'org-chart': 'hierarchy', tree: 'hierarchy', 'h-org-chart': 'hierarchy',
  'hierarchy-list': 'hierarchy', 'radial-tree': 'hierarchy',
  'decision-tree': 'hierarchy', sitemap: 'hierarchy',
  bracket: 'hierarchy', 'bracket-tree': 'hierarchy', 'mind-map': 'hierarchy',
  // pyramid
  pyramid: 'pyramid', 'inverted-pyramid': 'pyramid', 'pyramid-list': 'pyramid',
  'segmented-pyramid': 'pyramid', 'diamond-pyramid': 'pyramid',
  // relationship
  venn: 'relationship', 'venn-3': 'relationship', 'venn-4': 'relationship',
  concentric: 'relationship', balance: 'relationship', counterbalance: 'relationship',
  'opposing-arrows': 'relationship', web: 'relationship', cluster: 'relationship',
  target: 'relationship', radial: 'relationship',
  converging: 'relationship', diverging: 'relationship', plus: 'relationship',
  // statistical
  'progress-list': 'statistical', 'bullet-chart': 'statistical', scorecard: 'statistical',
  treemap: 'statistical', sankey: 'statistical', waffle: 'statistical',
  gauge: 'statistical', radar: 'statistical', heatmap: 'statistical',
  // planning
  kanban: 'planning', gantt: 'planning', 'gantt-lite': 'planning',
  'sprint-board': 'planning', timeline: 'planning', milestone: 'planning', wbs: 'planning',
  // technical
  'layered-arch': 'technical', entity: 'technical', network: 'technical',
  pipeline: 'technical', sequence: 'technical', 'state-machine': 'technical', flowchart: 'technical', class: 'technical',
  // plot
  'line-chart': 'plot', scatter: 'plot', 'area-chart': 'plot', 'bar-chart': 'plot',
}

// ── Per-type constraint table ─────────────────────────────────────────────────

interface TypeConstraints {
  /** STRUCT_INSUFFICIENT_ITEMS (error) if count < this */
  minItems?: number
  /** LAYOUT_NODE_COUNT_EXCEEDS_RANGE (warning) if count > this */
  softMaxItems?: number
  /** STRUCT_INSUFFICIENT_ITEMS (error) if count ≠ this */
  exactItems?: number
  /** CONTENT_MISSING_NUMERIC_VALUE / CONTENT_NUMERIC_VALUE_EXPECTED on top-level items */
  requiresNumericValues?: boolean
  /** LAYOUT_IGNORED_CHILDREN if any item has children */
  ignoresChildren?: boolean
  /** STRUCT_MISSING_REQUIRED_STRUCTURE if no flow children exist at all */
  requiresFlowChildren?: boolean
  /** Override for CONTENT_VERY_LONG_LABEL threshold (chars) */
  labelMaxLen?: number
}

const DEFAULT_LABEL_MAX = 60

const TYPE_CONSTRAINTS: Record<string, TypeConstraints> = {
  // ── cycle ──
  cycle:                   { minItems: 2, softMaxItems: 8,  labelMaxLen: 25 },
  'donut-cycle':           { minItems: 2, softMaxItems: 8,  labelMaxLen: 25 },
  'gear-cycle':            { minItems: 2, softMaxItems: 8,  labelMaxLen: 20 },
  'block-cycle':           { minItems: 2, softMaxItems: 8,  labelMaxLen: 25 },
  'segmented-cycle':       { minItems: 2, softMaxItems: 10, labelMaxLen: 20 },
  'nondirectional-cycle':  { minItems: 2, softMaxItems: 8,  labelMaxLen: 25 },
  'multidirectional-cycle':{ minItems: 2, softMaxItems: 8,  labelMaxLen: 25 },
  spiral:                  { minItems: 2, softMaxItems: 12, labelMaxLen: 30 },
  loop:                    { minItems: 2, softMaxItems: 6,  labelMaxLen: 30 },
  // ── process ──
  funnel:                  { minItems: 2, softMaxItems: 7,  labelMaxLen: 30 },
  process:                 { minItems: 1, softMaxItems: 15 },
  'chevron-process':       { minItems: 1, softMaxItems: 10, labelMaxLen: 30 },
  'arrow-process':         { minItems: 1, softMaxItems: 10 },
  'circular-process':      { minItems: 2, softMaxItems: 8,  labelMaxLen: 20 },
  'circle-process':        { minItems: 2, softMaxItems: 8,  labelMaxLen: 20 },
  'segmented-bar':         { minItems: 2, softMaxItems: 10, labelMaxLen: 20 },
  equation:                { minItems: 2, softMaxItems: 6,  labelMaxLen: 20 },
  // ── relationship ──
  venn:                    { minItems: 2,                   labelMaxLen: 25 },
  'venn-3':                { exactItems: 3,                 labelMaxLen: 20 },
  'venn-4':                { exactItems: 4,                 labelMaxLen: 15 },
  balance:                 { minItems: 2 },
  counterbalance:          { minItems: 2 },
  'pros-cons':             { minItems: 2 },
  concentric:              { minItems: 2, softMaxItems: 6,  labelMaxLen: 30 },
  target:                  { minItems: 2, softMaxItems: 6,  labelMaxLen: 20 },
  radial:                  { minItems: 3, softMaxItems: 10, labelMaxLen: 25 },
  converging:              { minItems: 2, softMaxItems: 8 },
  diverging:               { minItems: 2, softMaxItems: 8 },
  web:                     { minItems: 3, softMaxItems: 12 },
  cluster:                 { minItems: 2, softMaxItems: 20 },
  // ── matrix ──
  'matrix-2x2':            { exactItems: 4,                 labelMaxLen: 40 },
  bcg:                     { exactItems: 4,                 labelMaxLen: 30 },
  ansoff:                  { exactItems: 4,                 labelMaxLen: 30 },
  // ── statistical ──
  gauge:          { minItems: 1, softMaxItems: 8,  requiresNumericValues: true, labelMaxLen: 30 },
  waffle:         { minItems: 1, softMaxItems: 1,  requiresNumericValues: true, ignoresChildren: true },
  radar:          { minItems: 3, softMaxItems: 10, requiresNumericValues: true, labelMaxLen: 20 },
  'progress-list':{ minItems: 1,                  requiresNumericValues: true },
  'bullet-chart': { minItems: 1,                  requiresNumericValues: true },
  scorecard:      { minItems: 1,                  requiresNumericValues: true },
  treemap:        { minItems: 2,                  requiresNumericValues: true },
  // ── technical ──
  sequence:       { minItems: 2, requiresFlowChildren: true },
  'state-machine':{ minItems: 1, requiresFlowChildren: true },
  network:        { minItems: 2 },
}

// Types that check depth / balance (hierarchy family + wbs from planning)
const HIERARCHY_TYPES = new Set([
  'tree', 'org-chart', 'h-org-chart', 'hierarchy-list', 'radial-tree',
  'decision-tree', 'sitemap', 'bracket', 'bracket-tree', 'mind-map', 'wbs',
])

// Statistical types where top-level items need numeric values
const NUMERIC_STAT_TYPES = new Set([
  'progress-list', 'bullet-chart', 'scorecard', 'treemap', 'waffle', 'gauge', 'radar',
])

// ── Entry point ───────────────────────────────────────────────────────────────

/**
 * Validate a parsed MdArtSpec for structural correctness and rendering suitability.
 * Does not call the renderer.
 *
 * @example
 * ```ts
 * const spec   = parseMdArt(raw, hintType)
 * const issues = validateMdArt(spec)
 * const errors = issues.filter(i => i.level === 'error')
 * if (errors.length === 0) {
 *   const svg = renderMdArt(raw, hintType)
 * }
 * ```
 *
 * In a jsproptest property, use as a precondition:
 * ```ts
 * precond(validateMdArt(spec, { minLevel: 'error' }).length === 0)
 * ```
 */
export function validateMdArt(
  spec: MdArtSpec,
  options?: ValidationOptions,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  runCommonChecks(spec, issues)

  // If the type is unknown there is no family/type knowledge to apply — stop early.
  if (!issues.some(i => i.code === 'STRUCT_UNKNOWN_TYPE')) {
    runFamilyChecks(spec, issues)
    runTypeChecks(spec, issues)
  }

  return options?.minLevel === 'error'
    ? issues.filter(i => i.level === 'error')
    : issues
}

// ── Common checks (every type) ────────────────────────────────────────────────

function runCommonChecks(spec: MdArtSpec, issues: ValidationIssue[]): void {
  // Unknown type
  if (!KNOWN_TYPES.has(spec.type)) {
    issues.push({
      level: 'error',
      code: 'STRUCT_UNKNOWN_TYPE',
      message: `Unknown diagram type "${spec.type}".`,
      suggestion: `Valid types include: process, tree, comparison, venn, cycle, kanban, sequence, and 90+ others. See the MdArt documentation.`,
    })
    return
  }

  // Unknown shape — only meaningful for consolidated types
  if (spec.type === 'list' && spec.shape && !LIST_SHAPES.has(spec.shape)) {
    issues.push({
      level: 'error',
      code: 'STRUCT_INVALID_ATTRIBUTE_VALUE',
      message: `Unknown shape "${spec.shape}" for type "list".`,
      suggestion: `Valid shapes: ${[...LIST_SHAPES].join(', ')}. Omit shape: to default to "bullet".`,
    })
  }
  if (spec.type === 'process' && spec.shape && !PROCESS_SHAPES.has(spec.shape)) {
    issues.push({
      level: 'error',
      code: 'STRUCT_INVALID_ATTRIBUTE_VALUE',
      message: `Unknown shape "${spec.shape}" for type "process".`,
      suggestion: `Valid shapes: ${[...PROCESS_SHAPES].join(', ')}. Omit shape: to use the default (auto-orientation) layout.`,
    })
  }

  // Empty diagram — network type uses nodes/edges instead of items
  const hasNetworkContent = (spec.nodes?.length ?? 0) > 0 || (spec.edges?.length ?? 0) > 0
  if (spec.items.length === 0 && !hasNetworkContent) {
    issues.push({
      level: 'warning',
      code: 'STRUCT_EMPTY_DIAGRAM',
      message: `Diagram has no items.`,
      suggestion: `Add at least one "- Item" line to produce meaningful output.`,
    })
    return
  }

  // Per-item content checks across the entire item tree
  checkItemTreeContent(spec.items, 'items', spec.type, issues)
}

function checkItemTreeContent(
  items: MdArtItem[],
  path: string,
  type: string,
  issues: ValidationIssue[],
): void {
  const labelMaxLen = TYPE_CONSTRAINTS[type]?.labelMaxLen ?? DEFAULT_LABEL_MAX
  const seenLabels = new Map<string, number>() // normalized label → first index at this level

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const itemPath = `${path}[${i}]`

    // Empty label
    if (!item.label.trim()) {
      issues.push({
        level: 'warning',
        code: 'CONTENT_EMPTY_LABEL',
        message: `Item at ${itemPath} has an empty label.`,
        location: { itemIndex: i, label: item.label, path: itemPath },
      })
    }

    // Very long label
    if (item.label.length > labelMaxLen) {
      issues.push({
        level: 'warning',
        code: 'CONTENT_VERY_LONG_LABEL',
        message: `Label "${item.label.slice(0, 30)}…" at ${itemPath} is ${item.label.length} chars; recommended max for ${type} is ${labelMaxLen}.`,
        location: { itemIndex: i, label: item.label, path: itemPath },
        suggestion: `Shorten the label or switch to a type with more label space (e.g. bullet-list, card-list).`,
      })
    }

    // Duplicate sibling label (at this level only)
    const norm = item.label.trim()
    if (norm) {
      const prev = seenLabels.get(norm)
      if (prev !== undefined) {
        issues.push({
          level: 'warning',
          code: 'CONTENT_DUPLICATE_SIBLING_LABELS',
          message: `Siblings at ${path} share the label "${norm}" (indices ${prev} and ${i}).`,
          location: { itemIndex: i, label: item.label, path: itemPath },
          suggestion: `Duplicate labels are ambiguous for per-item annotation. Add a distinguishing qualifier.`,
        })
      } else {
        seenLabels.set(norm, i)
      }
    }

    // Recurse into children
    if (item.children.length > 0) {
      checkItemTreeContent(item.children, `${itemPath}.children`, type, issues)
    }
  }
}

// ── Family-level checks ───────────────────────────────────────────────────────

type FamilyChecker = (spec: MdArtSpec, issues: ValidationIssue[]) => void

const FAMILY_CHECKERS: Partial<Record<string, FamilyChecker>> = {
  hierarchy:    checkHierarchyFamily,
  cycle:        checkCountingFamily,
  process:      checkCountingFamily,
  relationship: checkCountingFamily,
  matrix:       checkCountingFamily,
  statistical:  checkStatisticalFamily,
  planning:     checkPlanningFamily,
  technical:    checkTechnicalFamily,
}

function runFamilyChecks(spec: MdArtSpec, issues: ValidationIssue[]): void {
  const family = TYPE_FAMILY[spec.type]
  FAMILY_CHECKERS[family]?.(spec, issues)
}

// Generic count check used by several families
function checkCountingFamily(spec: MdArtSpec, issues: ValidationIssue[]): void {
  const c = TYPE_CONSTRAINTS[spec.type]
  if (c) applyCountConstraints(spec, c, issues)
}

function checkHierarchyFamily(spec: MdArtSpec, issues: ValidationIssue[]): void {
  const c = TYPE_CONSTRAINTS[spec.type]
  if (c) applyCountConstraints(spec, c, issues)

  if (!HIERARCHY_TYPES.has(spec.type)) return

  // Flat hierarchy: more than one item but none have children
  const hasChildren = spec.items.some(item => item.children.length > 0)
  if (!hasChildren && spec.items.length > 1) {
    issues.push({
      level: 'warning',
      code: 'LAYOUT_FLAT_HIERARCHY',
      message: `${spec.type} has no nested items — all content is at the root level.`,
      suggestion: `Indent child items to create hierarchy, or use bullet-list / process for flat content.`,
    })
  }

  // Excess depth
  const maxDepth = getMaxDepth(spec.items)
  if (maxDepth > 5) {
    issues.push({
      level: 'warning',
      code: 'LAYOUT_EXCESS_DEPTH',
      message: `Hierarchy is ${maxDepth} levels deep; beyond 5 levels diagrams become very hard to read.`,
      suggestion: `Flatten or split the diagram.`,
    })
  }

  // Unbalanced branches
  if (spec.items.length > 1) {
    const branchDepths = spec.items.map(item => getMaxDepth([item]))
    const hi = Math.max(...branchDepths)
    const lo = Math.min(...branchDepths)
    if (hi - lo > 3) {
      issues.push({
        level: 'warning',
        code: 'LAYOUT_UNBALANCED_TREE',
        message: `Tree branches vary from ${lo} to ${hi} levels deep; shallow branches will leave large whitespace gaps.`,
      })
    }
  }
}

function checkStatisticalFamily(spec: MdArtSpec, issues: ValidationIssue[]): void {
  const c = TYPE_CONSTRAINTS[spec.type]
  if (c) {
    applyCountConstraints(spec, c, issues)
    if (c.ignoresChildren) checkIgnoredChildren(spec, issues)
  }

  if (!NUMERIC_STAT_TYPES.has(spec.type)) return

  spec.items.forEach((item, i) => {
    const raw = item.value ?? item.attrs[0]
    if (raw === undefined) {
      issues.push({
        level: 'warning',
        code: 'CONTENT_MISSING_NUMERIC_VALUE',
        message: `Item "${item.label}" at items[${i}] has no value; ${spec.type} expects a number.`,
        location: { itemIndex: i, label: item.label },
        suggestion: `Add a value: "- ${item.label}: 75"`,
      })
    } else if (isNaN(parseFloat(String(raw).replace('%', '')))) {
      issues.push({
        level: 'warning',
        code: 'CONTENT_NUMERIC_VALUE_EXPECTED',
        message: `Item "${item.label}" at items[${i}] has value "${raw}" which is not a number.`,
        location: { itemIndex: i, label: item.label },
      })
    }
  })
}

function checkPlanningFamily(spec: MdArtSpec, issues: ValidationIssue[]): void {
  if (spec.type !== 'gantt' && spec.type !== 'gantt-lite') return

  spec.items.forEach((item, i) => {
    // Milestones use [wkN*] syntax — the '*' keeps the attr non-empty so the
    // range check passes naturally. No special isMilestone guard needed.
    const rangeStr = item.attrs.find(a => /[\d*]/.test(a)) ?? item.value ?? ''
    if (!rangeStr) {
      issues.push({
        level: 'warning',
        code: 'STRUCT_MISSING_REQUIRED_STRUCTURE',
        message: `Gantt item "${item.label}" at items[${i}] has no week/date range.`,
        location: { itemIndex: i, label: item.label },
        suggestion: `Add a range attribute: "- ${item.label} [wk1-wk3]" or "- ${item.label} [wk8*]" for a milestone.`,
      })
    }
  })
}

function checkTechnicalFamily(spec: MdArtSpec, issues: ValidationIssue[]): void {
  const c = TYPE_CONSTRAINTS[spec.type]
  if (!c) return
  applyCountConstraints(spec, c, issues)

  if (c.requiresFlowChildren) {
    const totalFlow = spec.items.reduce((n, item) => n + item.flowChildren.length, 0)
    if (totalFlow === 0) {
      issues.push({
        level: 'warning',
        code: 'STRUCT_MISSING_REQUIRED_STRUCTURE',
        message: `${spec.type} has no flow children (→ messages or transitions).`,
        suggestion: `Add messages: "  → TargetActor: message text" under each actor/state.`,
      })
    }
  }
}

// ── Type-specific checks ──────────────────────────────────────────────────────

function runTypeChecks(spec: MdArtSpec, issues: ValidationIssue[]): void {
  switch (spec.type) {
    case 'comparison':  checkComparisonStructure(spec, issues);  break
    case 'sankey':      checkSankeyStructure(spec, issues);      break
    case 'swot':        checkSwotStructure(spec, issues);        break
    case 'heatmap':     checkHeatmapStructure(spec, issues);     break
    case 'waffle':      checkIgnoredChildren(spec, issues);      break
  }
}

function checkComparisonStructure(spec: MdArtSpec, issues: ValidationIssue[]): void {
  // Mixed keyed and unkeyed children are allowed. Keyed children form named
  // comparison rows/columns; unkeyed children align positionally with an empty
  // row/column header.
  void spec
  void issues
}

function checkSankeyStructure(spec: MdArtSpec, issues: ValidationIssue[]): void {
  const hasFlows = spec.items.some(item => item.flowChildren.length > 0)
  if (!hasFlows && spec.items.length > 0) {
    issues.push({
      level: 'warning',
      code: 'STRUCT_MISSING_REQUIRED_STRUCTURE',
      message: `Sankey diagram has no flow edges.`,
      suggestion: `Add flows under each source node: "  → TargetNode (value)"`,
    })
  }
}

function checkSwotStructure(spec: MdArtSpec, issues: ValidationIssue[]): void {
  const prefixes = new Set(spec.items.map(i => i.prefix).filter(Boolean))
  if (prefixes.size === 0 && spec.items.length > 0) {
    issues.push({
      level: 'warning',
      code: 'STRUCT_MISSING_REQUIRED_STRUCTURE',
      message: `SWOT diagram items have no quadrant prefixes.`,
      suggestion: `Use + for Strengths, - for Weaknesses, ? for Opportunities, ! for Threats.`,
    })
  }
}

function checkHeatmapStructure(spec: MdArtSpec, issues: ValidationIssue[]): void {
  spec.items.forEach((row, ri) => {
    row.children.forEach((cell, ci) => {
      if (cell.value === undefined && cell.attrs.length === 0) {
        issues.push({
          level: 'warning',
          code: 'CONTENT_MISSING_NUMERIC_VALUE',
          message: `Heatmap cell "${cell.label}" at items[${ri}].children[${ci}] has no value.`,
          location: { itemIndex: ri, label: cell.label, path: `items[${ri}].children[${ci}]` },
          suggestion: `Add a value: "  - ${cell.label}: 75"`,
        })
      }
    })
  })
}

function checkIgnoredChildren(spec: MdArtSpec, issues: ValidationIssue[]): void {
  if (spec.items.some(item => item.children.length > 0)) {
    issues.push({
      level: 'warning',
      code: 'LAYOUT_IGNORED_CHILDREN',
      message: `${spec.type} does not use nested children; they will be ignored.`,
      suggestion: `Remove child items, or switch to a type that supports nesting.`,
    })
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function applyCountConstraints(
  spec: MdArtSpec,
  c: TypeConstraints,
  issues: ValidationIssue[],
): void {
  // Exclude intersection items (∩/&&) — they are meta-items, not diagram nodes
  const n = spec.items.filter(i => !i.isIntersection).length

  if (c.exactItems !== undefined && n !== c.exactItems) {
    issues.push({
      level: 'error',
      code: 'STRUCT_INSUFFICIENT_ITEMS',
      message: `${spec.type} requires exactly ${c.exactItems} items; found ${n}.`,
      suggestion: `Add or remove items until you have exactly ${c.exactItems}.`,
    })
  } else if (c.minItems !== undefined && n < c.minItems) {
    issues.push({
      level: 'error',
      code: 'STRUCT_INSUFFICIENT_ITEMS',
      message: `${spec.type} requires at least ${c.minItems} items; found ${n}.`,
      suggestion: `Add ${c.minItems - n} more item(s).`,
    })
  }

  if (c.softMaxItems !== undefined && n > c.softMaxItems) {
    issues.push({
      level: 'warning',
      code: 'LAYOUT_NODE_COUNT_EXCEEDS_RANGE',
      message: `${spec.type} has ${n} items; more than ${c.softMaxItems} may be difficult to read.`,
      suggestion: `Consider splitting the content or switching to a type that handles more items (e.g. bullet-list, process).`,
    })
  }
}

/** Returns the depth of the deepest leaf: 1 = items only, 2 = one child level, … */
function getMaxDepth(items: MdArtItem[]): number {
  if (items.length === 0) return 0
  return 1 + Math.max(0, ...items.map(item => getMaxDepth(item.children)))
}
