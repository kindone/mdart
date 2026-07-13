import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, parseLink, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, renderWrappedText, centeredTextY, type ItemLike, wrapItem, shouldInstrument } from '../shared'

const BCG_QUADS = [
  { key: 'stars',     keywords: ['star'],             label: '★ Stars',          sub: 'High growth · High share', fill: '#6d28d9', text: '#ffffff' },  // violet-700
  { key: 'questions', keywords: ['question', 'mark'], label: '? Question Marks', sub: 'High growth · Low share',  fill: '#b45309', text: '#ffffff' },  // amber-700
  { key: 'cash',      keywords: ['cash', 'cow'],      label: '$ Cash Cows',      sub: 'Low growth · High share',  fill: '#047857', text: '#ffffff' },  // emerald-700
  { key: 'dogs',      keywords: ['dog'],              label: '✕ Dogs',           sub: 'Low growth · Low share',   fill: '#be123c', text: '#ffffff' },  // rose-700
]

type BcgEntry = { display: string; url: string | null; src: ItemLike }

// Neutral grey ramps for mono-light / mono-dark themes
const MONO_FILLS: Record<string, { fills: string[]; text: string }> = {
  '#374151': { fills: ['#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8'], text: '#111827' }, // mono-light
  '#9ca3af': { fills: ['#1e293b', '#334155', '#475569', '#64748b'], text: '#f9fafb' }, // mono-dark
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const buckets: Record<string, BcgEntry[]> = Object.fromEntries(BCG_QUADS.map(q => [q.key, []]))
  let slotIdx = 0
  for (const item of spec.items) {
    const lower = item.label.toLowerCase()
    const matched = BCG_QUADS.find(q => q.keywords.some(kw => lower.includes(kw)))
    if (matched) {
      buckets[matched.key].push(...(item.children.length ? item.children.map(c => ({ ...parseLink(c.label), src: c })) : []))
    } else {
      // Distribute ungrouped items across quadrants in order
      const slot = BCG_QUADS[slotIdx % 4]
      buckets[slot.key].push({ ...parseLink(item.label), src: item })
      slotIdx++
    }
  }

  const mono = MONO_FILLS[theme.primary]
  const W = 520, TITLE_H = spec.title ? 28 : 0, CELL_W = W / 2, CELL_H = 168
  const AX = 20, H = TITLE_H + CELL_H * 2 + AX
  let svgContent = ''
  if (spec.title) {
    svgContent += `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(spec.title)}</text>`
  }

  const positions = [[0, 0], [1, 0], [0, 1], [1, 1]]
  BCG_QUADS.forEach((q, i) => {
    const unit: string[] = []
    const [col, row] = positions[i]
    const x = col * CELL_W, y = TITLE_H + row * CELL_H
    const fill = mono ? mono.fills[i] : q.fill
    const text = mono ? mono.text : q.text
    unit.push(`<rect x="${x}" y="${y}" width="${CELL_W}" height="${CELL_H}" fill="${fill}"/>`)
    const headerFit = fitTextToWidthShared([q.label], CELL_W - 20, { maxSize: 12, minSize: 7, maxLines: 2, boxH: 28 })
    unit.push(renderWrappedText(
      x + CELL_W / 2,
      centeredTextY(y + 8, 24, headerFit.results[0].lines.length, headerFit.lineHeight),
      `text-anchor="middle" font-size="${headerFit.fontSize}" fill="${text}" font-family="system-ui,sans-serif" font-weight="700"`,
      q.label,
      headerFit.results[0],
      headerFit.lineHeight,
    ))
    const subFit = fitTextToWidthShared([q.sub], CELL_W - 20, { maxSize: 8, minSize: 6, maxLines: 2, boxH: 20 })
    unit.push(renderWrappedText(
      x + CELL_W / 2,
      centeredTextY(y + 34, 18, subFit.results[0].lines.length, subFit.lineHeight),
      `text-anchor="middle" font-size="${subFit.fontSize}" fill="${text}" font-family="system-ui,sans-serif" opacity="0.65"`,
      q.sub,
      subFit.results[0],
      subFit.lineHeight,
    ))
    buckets[q.key].slice(0, 4).forEach(({ display: lbl, url: lblUrl, src }, j) => {
      const bulletText = `• ${lbl}`
      const bulletFit = fitTextToWidthShared([bulletText], CELL_W - 20, { maxSize: 10, minSize: 6.5, maxLines: 2, boxH: 24 })
      unit.push(renderWrappedText(
        x + 10,
        y + 62 + j * 25,
        `font-size="${bulletFit.fontSize}" fill="${text}" font-family="system-ui,sans-serif" opacity="0.9"`,
        bulletText,
        { ...bulletFit.results[0], url: lblUrl },
        bulletFit.lineHeight,
        src,
      ))
    })
    svgContent += wrapItem(unit.join(''), i, animate, instrument)
  })
  // Grid lines
  svgContent += `<line x1="${W / 2}" y1="${TITLE_H}" x2="${W / 2}" y2="${TITLE_H + CELL_H * 2}" stroke="${theme.bg}" stroke-width="2"/>`
  svgContent += `<line x1="0" y1="${TITLE_H + CELL_H}" x2="${W}" y2="${TITLE_H + CELL_H}" stroke="${theme.bg}" stroke-width="2"/>`
  // Axis labels
  const axY = TITLE_H + CELL_H * 2 + 14
  svgContent += `<text x="${CELL_W / 2}" y="${axY}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">← High Market Share</text>`
  svgContent += `<text x="${CELL_W + CELL_W / 2}" y="${axY}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">Low Market Share →</text>`
  if (animate) svgContent = seqSpotlightCSS(BCG_QUADS.length, spec, { scale: false }) + svgContent

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svgContent}
  </svg>`
}
