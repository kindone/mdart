import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, parseLink, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, renderWrappedText, centeredTextY, type ItemLike, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 520
const TITLE_H = 28
const CELL_W = W / 2
const CELL_H = 168
const AXIS_H = 20
const POSITIONS: Array<[number, number]> = [[0, 0], [1, 0], [0, 1], [1, 1]]

export interface QuadrantDef {
  key: string
  keywords: string[]
  label: string
  sub: string
  fill: string
  text: string
}

type Entry = { display: string, url: string | null, src: ItemLike }

const MONO_FILLS: Record<string, { fills: string[], text: string }> = {
  '#374151': { fills: ['#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8'], text: '#111827' },
  '#9ca3af': { fills: ['#1e293b', '#334155', '#475569', '#64748b'], text: '#f9fafb' },
}

function bucketItems(items: MdArtItem[], quadrants: QuadrantDef[]): Record<string, Entry[]> {
  const buckets: Record<string, Entry[]> = Object.fromEntries(quadrants.map(q => [q.key, []]))
  let slotIdx = 0
  for (const item of items) {
    const lower = item.label.toLowerCase()
    const matched = quadrants.find(q => q.keywords.some(keyword => lower.includes(keyword)))
    if (matched) {
      buckets[matched.key].push(...(item.children.length ? item.children.map(child => ({ ...parseLink(child.label), src: child })) : []))
    } else {
      const slot = quadrants[slotIdx % quadrants.length]
      buckets[slot.key].push({ ...parseLink(item.label), src: item })
      slotIdx++
    }
  }
  return buckets
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  if (!spec.title) return ''
  return `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(spec.title)}</text>`
}

function renderQuadrantHeader(q: QuadrantDef, x: number, y: number, text: string, headerMaxSize: number): string {
  const headerFit = fitTextToWidthShared([q.label], CELL_W - 20, { maxSize: headerMaxSize, minSize: 7, maxLines: 2, boxH: 28 })
  const subFit = fitTextToWidthShared([q.sub], CELL_W - 20, { maxSize: headerMaxSize === 12 ? 8 : 7.5, minSize: 6, maxLines: 2, boxH: 20 })
  return renderWrappedText(
    x + CELL_W / 2,
    centeredTextY(y + 8, 24, headerFit.results[0].lines.length, headerFit.lineHeight),
    `text-anchor="middle" font-size="${headerFit.fontSize}" fill="${text}" ${FONT_SANS_ATTR} font-weight="700"`,
    q.label,
    headerFit.results[0],
    headerFit.lineHeight,
  ) + renderWrappedText(
    x + CELL_W / 2,
    centeredTextY(y + 34, 18, subFit.results[0].lines.length, subFit.lineHeight),
    `text-anchor="middle" font-size="${subFit.fontSize}" fill="${text}" ${FONT_SANS_ATTR} opacity="0.65"`,
    q.sub,
    subFit.results[0],
    subFit.lineHeight,
  )
}

function renderEntries(entries: Entry[], x: number, y: number, text: string): string {
  return entries.slice(0, 4).map(({ display, url, src }, index) => {
    const bulletText = `• ${display}`
    const bulletFit = fitTextToWidthShared([bulletText], CELL_W - 20, { maxSize: 10, minSize: 6.5, maxLines: 2, boxH: 24 })
    return renderWrappedText(
      x + 10,
      y + 62 + index * 25,
      `font-size="${bulletFit.fontSize}" fill="${text}" ${FONT_SANS_ATTR} opacity="0.9"`,
      bulletText,
      { ...bulletFit.results[0], url },
      bulletFit.lineHeight,
      src,
    )
  }).join('')
}

function renderQuadrant(q: QuadrantDef, index: number, buckets: Record<string, Entry[]>, mono: { fills: string[], text: string } | undefined, titleH: number, animate: boolean, instrument: boolean, headerMaxSize: number): string {
  const [col, row] = POSITIONS[index]
  const x = col * CELL_W
  const y = titleH + row * CELL_H
  const fill = mono ? mono.fills[index] : q.fill
  const text = mono ? mono.text : q.text
  const content = `<rect x="${x}" y="${y}" width="${CELL_W}" height="${CELL_H}" fill="${fill}"/>` +
    renderQuadrantHeader(q, x, y, text, headerMaxSize) +
    renderEntries(buckets[q.key], x, y, text)
  return wrapItem(content, index, animate, instrument)
}

export function renderQuadrantGrid(spec: MdArtSpec, theme: MdArtTheme, quadrants: QuadrantDef[], axisLeft: string, axisRight: string, headerMaxSize: number): string {
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const buckets = bucketItems(spec.items, quadrants)
  const mono = MONO_FILLS[theme.primary]
  const titleH = spec.title ? TITLE_H : 0
  const height = titleH + CELL_H * 2 + AXIS_H
  const parts = [
    renderTitle(spec, theme),
    ...quadrants.map((q, index) => renderQuadrant(q, index, buckets, mono, titleH, animate, instrument, headerMaxSize)),
    `<line x1="${W / 2}" y1="${titleH}" x2="${W / 2}" y2="${titleH + CELL_H * 2}" stroke="${theme.bg}" stroke-width="2"/>`,
    `<line x1="0" y1="${titleH + CELL_H}" x2="${W}" y2="${titleH + CELL_H}" stroke="${theme.bg}" stroke-width="2"/>`,
    `<text x="${CELL_W / 2}" y="${titleH + CELL_H * 2 + 14}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${escapeXml(axisLeft)}</text>`,
    `<text x="${CELL_W + CELL_W / 2}" y="${titleH + CELL_H * 2 + 14}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${escapeXml(axisRight)}</text>`,
  ].filter(Boolean)

  return `<svg viewBox="0 0 ${W} ${height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${height}" fill="${theme.bg}" rx="8"/>
    ${animate ? seqSpotlightCSS(quadrants.length, spec, { scale: false }) : ''}
    ${parts.join('\n    ')}
  </svg>`
}
