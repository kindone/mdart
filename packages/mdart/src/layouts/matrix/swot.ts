import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, parseLink, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, renderWrappedText, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 500
const H = 400
const PAD = 16
const TITLE_H = 28
const CELL_W = W / 2
const QUADRANTS: Array<{ key: SwotKey, col: number, row: number }> = [
  { key: 'S', col: 0, row: 0 },
  { key: 'W', col: 1, row: 0 },
  { key: 'O', col: 0, row: 1 },
  { key: 'T', col: 1, row: 1 },
]

type SwotKey = 'S' | 'W' | 'O' | 'T'

interface SwotEntry {
  display: string
  url: string | null
  value?: string
  attrs?: string[]
  rawLabel: string
}

interface SwotQuadrant {
  label: string
  items: SwotEntry[]
  fill: string
  textColor: string
}

interface SwotLayout {
  titleH: number
  contentTop: number
  cellH: number
}

const HEADER_MAP: Record<string, SwotKey> = {
  strength: 'S',
  strengths: 'S',
  weakness: 'W',
  weaknesses: 'W',
  opportunity: 'O',
  opportunities: 'O',
  threat: 'T',
  threats: 'T',
}

const ATTR_MAP: Record<string, SwotKey> = {
  strengths: 'S',
  strength: 'S',
  s: 'S',
  weaknesses: 'W',
  weakness: 'W',
  w: 'W',
  opportunities: 'O',
  opportunity: 'O',
  o: 'O',
  threats: 'T',
  threat: 'T',
  t: 'T',
}

const MONO_FILLS: Record<string, { fills: string[], text: string }> = {
  '#374151': { fills: ['#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8'], text: '#111827' },
  '#9ca3af': { fills: ['#1e293b', '#334155', '#475569', '#64748b'], text: '#f9fafb' },
}

function toEntry(label: string, value?: string, attrs?: string[]): SwotEntry {
  return { ...parseLink(label), value, attrs, rawLabel: label }
}

function createQuadrants(theme: MdArtTheme): Record<SwotKey, SwotQuadrant> {
  const mono = MONO_FILLS[theme.primary]
  return {
    S: { label: 'Strengths', items: [], fill: mono ? mono.fills[0] : '#047857', textColor: mono ? mono.text : '#ffffff' },
    W: { label: 'Weaknesses', items: [], fill: mono ? mono.fills[1] : '#be123c', textColor: mono ? mono.text : '#ffffff' },
    O: { label: 'Opportunities', items: [], fill: mono ? mono.fills[2] : '#6d28d9', textColor: mono ? mono.text : '#ffffff' },
    T: { label: 'Threats', items: [], fill: mono ? mono.fills[3] : '#b45309', textColor: mono ? mono.text : '#ffffff' },
  }
}

function headerKeyFor(item: MdArtItem): SwotKey | null {
  for (const attr of item.attrs) {
    const key = ATTR_MAP[attr.toLowerCase()]
    if (key) return key
  }
  const normalized = item.label.toLowerCase().trim().replace(/:$/, '').trim()
  return HEADER_MAP[normalized] ?? null
}

function routeItems(spec: MdArtSpec, theme: MdArtTheme): Record<SwotKey, SwotQuadrant> {
  const quadrants = createQuadrants(theme)
  let currentSection: SwotKey | null = null

  for (const item of spec.items) {
    const headerKey = headerKeyFor(item)
    if (headerKey) {
      currentSection = headerKey
      if (item.children.length) {
        quadrants[headerKey].items.push(...item.children.map(child => toEntry(child.label, child.value, child.attrs)))
        currentSection = null
      }
      continue
    }
    if (item.prefix === '+') {
      quadrants.S.items.push(toEntry(item.label, item.value, item.attrs))
    } else if (item.prefix === '?') {
      quadrants.O.items.push(toEntry(item.label, item.value, item.attrs))
    } else if (item.prefix === '!') {
      quadrants.T.items.push(toEntry(item.label, item.value, item.attrs))
    } else if (item.prefix === '-') {
      quadrants[currentSection ?? 'W'].items.push(toEntry(item.label, item.value, item.attrs))
    } else if (currentSection) {
      quadrants[currentSection].items.push(toEntry(item.label, item.value, item.attrs))
    }
  }

  return quadrants
}

function resolveLayout(spec: MdArtSpec): SwotLayout {
  const titleH = spec.title ? TITLE_H : 0
  const contentTop = spec.title ? PAD + titleH : 0
  return { titleH, contentTop, cellH: (H - contentTop) / 2 }
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  if (!spec.title) return ''
  return `<text x="${W / 2}" y="${PAD + 16}" text-anchor="middle" font-size="13" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(spec.title)}</text>`
}

function renderEntry(entry: SwotEntry, index: number, x: number, y: number, q: SwotQuadrant): string {
  const valueSuffix = entry.value ? ` · ${entry.value}` : ''
  const bulletText = `• ${entry.display}${valueSuffix}`
  const bulletFit = fitTextToWidthShared([bulletText], CELL_W - 20, { maxSize: 10, minSize: 6.5, maxLines: 2, boxH: 24 })
  return renderWrappedText(
    x + 10,
    y + 44 + index * 25,
    `font-size="${bulletFit.fontSize}" fill="${q.textColor}" ${FONT_SANS_ATTR} opacity="0.85"`,
    bulletText,
    { ...bulletFit.results[0], url: entry.url },
    bulletFit.lineHeight,
    { label: entry.rawLabel, value: entry.value, attrs: entry.attrs },
  )
}

function renderQuadrant(key: SwotKey, col: number, row: number, layout: SwotLayout, quadrants: Record<SwotKey, SwotQuadrant>, animate: boolean, instrument: boolean): string {
  const q = quadrants[key]
  const x = col * CELL_W
  const y = layout.contentTop + row * layout.cellH
  const entries = q.items.slice(0, 5).map((entry, index) => renderEntry(entry, index, x, y, q)).join('')
  const more = q.items.length > 5
    ? `<text x="${x + 10}" y="${y + 44 + 5 * 25}" font-size="9" fill="${q.textColor}" ${FONT_SANS_ATTR} opacity="0.6">+${q.items.length - 5} more</text>`
    : ''
  const content = `<rect x="${x}" y="${y}" width="${CELL_W}" height="${layout.cellH}" fill="${q.fill}" />` +
    `<text x="${x + CELL_W / 2}" y="${y + 22}" text-anchor="middle" font-size="12" fill="${q.textColor}" ${FONT_SANS_ATTR} font-weight="700">${q.label}</text>` +
    entries +
    more
  return wrapItem(content, QUADRANTS.findIndex(qd => qd.key === key), animate, instrument)
}

function renderGrid(layout: SwotLayout, theme: MdArtTheme): string {
  return `<line x1="${W / 2}" y1="${layout.contentTop}" x2="${W / 2}" y2="${H}" stroke="${theme.bg}" stroke-width="2" />` +
    `<line x1="0" y1="${layout.contentTop + layout.cellH}" x2="${W}" y2="${layout.contentTop + layout.cellH}" stroke="${theme.bg}" stroke-width="2" />`
}

function renderSvg(spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  const animate = shouldAnimate(spec)
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${animate ? seqSpotlightCSS(QUADRANTS.length, spec, { scale: false }) : ''}
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const layout = resolveLayout(spec)
  const quadrants = routeItems(spec, theme)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts = [
    renderTitle(spec, theme),
    ...QUADRANTS.map(({ key, col, row }) => renderQuadrant(key, col, row, layout, quadrants, animate, instrument)),
    renderGrid(layout, theme),
  ].filter(Boolean)

  return renderSvg(spec, theme, parts)
}
