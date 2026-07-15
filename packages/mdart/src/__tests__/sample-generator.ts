import { Gen, Random, type Generator } from 'jsproptest'
import { KNOWN_TYPES } from '../index'

export type PropertySampleDomain =
  | 'printable-flat'
  | 'unicode-flat'
  | 'cjk-flat'
  | 'emoji-flat'
  | 'long-flat'
  | 'process-large'
  | 'hierarchy-nested'

export interface PropertyMdartSample {
  type: string
  source: string
  domain: PropertySampleDomain
}

const ALL_TYPES = [...KNOWN_TYPES]

const PROCESS_TYPES = ALL_TYPES.filter(t =>
  ['process', 'chevron-process', 'arrow-process', 'circular-process',
   'funnel', 'roadmap', 'waterfall', 'snake-process', 'step-up', 'step-down',
   'circle-process', 'bending-process', 'segmented-bar', 'phase-process'].includes(t)
)

const HIER_TYPES = ALL_TYPES.filter(t =>
  ['org-chart', 'tree', 'h-org-chart', 'hierarchy-list', 'radial-tree',
   'decision-tree', 'sitemap', 'bracket', 'bracket-tree', 'mind-map',
   'kanban', 'sprint-board', 'wbs', 'swimlane'].includes(t)
)

const DOMAINS: PropertySampleDomain[] = [
  'printable-flat',
  'unicode-flat',
  'cjk-flat',
  'emoji-flat',
  'long-flat',
  'process-large',
  'hierarchy-nested',
]

const CJK_LABELS = [
  '日本語テスト',
  '中文测试内容',
  '한국어 테스트',
  '中文標題文字',
  'テスト中のデータ',
  '시스템 점검',
  '数据分析报告',
  '東アジア文字',
  '한글 입력 테스트',
  '漢字テスト文',
]

const EMOJI_LABELS = [
  '🚀 Launch',
  '✅ Complete',
  '⚠️ Alert',
  '📊 Report',
  '🎯 Goal reached',
  '🔥 Hot topic',
  '💡 New idea',
  '🌍 Global scale',
  '🛠️ In progress',
  '📅 Scheduled',
]

function sample<T>(gen: Generator<T>, rand: Random): T {
  return gen.generate(rand).value
}

function cleanLabel(label: string): string {
  return label.replace(/\n/g, ' ').trim() || 'x'
}

function frontMatter(type: string, domain: PropertySampleDomain): string[] {
  return [`type: ${type}`, `title: Property sample - ${domain}`, '']
}

function flatSource(type: string, domain: PropertySampleDomain, labels: string[]): string {
  return [...frontMatter(type, domain), ...labels.map(label => `- ${cleanLabel(label)}`)].join('\n')
}

function pickType(requested: string | undefined, candidates: string[], rand: Random): string {
  if (requested && requested !== 'any' && candidates.includes(requested)) return requested
  if (requested && requested !== 'any' && ALL_TYPES.includes(requested)) return requested
  return candidates[sample(Gen.inRange(0, candidates.length), rand)] ?? 'process'
}

function pickDomain(requestedType: string | undefined, rand: Random): PropertySampleDomain {
  if (requestedType && requestedType !== 'any') {
    if (PROCESS_TYPES.includes(requestedType) && rand.nextProb() < 0.35) return 'process-large'
    if (HIER_TYPES.includes(requestedType) && rand.nextProb() < 0.35) return 'hierarchy-nested'
  }
  return DOMAINS[sample(Gen.inRange(0, DOMAINS.length), rand)] ?? 'printable-flat'
}

export function generatePropertyMdart(
  requestedType = 'any',
  seed = `${Date.now()}-${Math.random()}`,
  requestedDomain?: PropertySampleDomain,
): PropertyMdartSample {
  const rand = new Random(seed)
  const domain = requestedDomain ?? pickDomain(requestedType, rand)

  if (domain === 'process-large') {
    const type = pickType(requestedType, PROCESS_TYPES, rand)
    const n = sample(Gen.inRange(0, 20), rand)
    const label = sample(Gen.printableAsciiString(1, 40), rand)
    const body = Array.from({ length: n }, (_, i) => `- ${cleanLabel(label)} ${i}`)
    return { type, domain, source: [...frontMatter(type, domain), ...body].join('\n') }
  }

  if (domain === 'hierarchy-nested') {
    const type = pickType(requestedType, HIER_TYPES, rand)
    const parents = sample(Gen.array(Gen.printableAsciiString(1, 40), 1, 4), rand)
    const child = sample(Gen.printableAsciiString(1, 40), rand)
    const body: string[] = []
    for (const parent of parents.slice(0, 4)) {
      body.push(`- ${cleanLabel(parent)}`)
      body.push(`  - ${cleanLabel(child)} A`)
      body.push(`  - ${cleanLabel(child)} B`)
    }
    return { type, domain, source: [...frontMatter(type, domain), ...body].join('\n') }
  }

  const type = pickType(requestedType, ALL_TYPES, rand)
  if (domain === 'unicode-flat') {
    return {
      type,
      domain,
      source: flatSource(type, domain, sample(Gen.array(Gen.unicodeString(1, 40), 0, 8), rand)),
    }
  }
  if (domain === 'cjk-flat') {
    const n = sample(Gen.inRange(1, 6), rand)
    const label = sample(Gen.elementOf(...CJK_LABELS), rand)
    return { type, domain, source: flatSource(type, domain, Array.from({ length: n }, (_, i) => `${label} ${i}`)) }
  }
  if (domain === 'emoji-flat') {
    const n = sample(Gen.inRange(1, 6), rand)
    const label = sample(Gen.elementOf(...EMOJI_LABELS), rand)
    return { type, domain, source: flatSource(type, domain, Array.from({ length: n }, (_, i) => `${label} ${i}`)) }
  }
  if (domain === 'long-flat') {
    const n = sample(Gen.inRange(1, 6), rand)
    const label = sample(Gen.printableAsciiString(30, 80), rand)
    return { type, domain, source: flatSource(type, domain, Array.from({ length: n }, (_, i) => `${label} item${i}`)) }
  }
  return {
    type,
    domain,
    source: flatSource(type, domain, sample(Gen.array(Gen.printableAsciiString(1, 50), 0, 12), rand)),
  }
}
