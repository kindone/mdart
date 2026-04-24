import type { MdArtSpec, MdArtItem } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, renderEmpty } from '../shared'

/** Parse a strictly-numeric string (allowing commas, underscores, whitespace). */
function parseNum(s: string): number | null {
  const m = s.replace(/[,_\s]/g, '').match(/^-?\d+(\.\d+)?$/)
  return m ? parseFloat(m[0]) : null
}

type Metric = { num: number | null; raw: string | null }

/**
 * Extract a funnel metric from an item: prefer `item.value` (e.g. `Visitors: 10000`),
 * then fall back to the first child's label (`- Visitors\n  - 10000`).
 */
function deriveMetric(it: MdArtItem): Metric {
  if (it.value) return { num: parseNum(it.value), raw: it.value }
  if (it.children[0]) {
    const n = parseNum(it.children[0].label)
    if (n !== null) return { num: n, raw: it.children[0].label }
  }
  return { num: null, raw: null }
}

function fmtNum(n: number): string {
  return Math.abs(n) >= 1000
    ? n.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : n.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const n       = items.length
  const W       = 500
  const STEP_H  = 60
  const PAD     = 20
  const titleH  = spec.title ? 30 : 0
  const H       = titleH + PAD + n * STEP_H + PAD
  const maxW    = 440   // widest band (top)
  const minW    = 130   // narrowest band (bottom)

  const metrics = items.map(deriveMetric)

  let svg = ''
  if (spec.title) {
    svg += `<text x="${W/2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`
  }

  for (let i = 0; i < n; i++) {
    const item = items[i]
    const t    = i / (n - 1 || 1)
    const w    = maxW - (maxW - minW) * t
    const x    = (W - w) / 2
    const y    = titleH + PAD + i * STEP_H
    const fill = lerpColor(theme.primary, theme.secondary, t)

    // Trapezoid polygon — top edge of this band, bottom edge sized for next step
    const nextT = i < n - 1 ? (i + 1) / (n - 1 || 1) : t
    const nextW = maxW - (maxW - minW) * nextT
    const nextX = (W - nextW) / 2
    const points = `${x},${y} ${x + w},${y} ${nextX + nextW},${y + STEP_H} ${nextX},${y + STEP_H}`
    svg += `<polygon points="${points}" fill="${fill}"/>`

    const m      = metrics[i]
    const bandCx = W / 2

    if (m.raw !== null) {
      // Label small uppercase on top, metric BIG and bold below
      svg += `<text x="${bandCx}" y="${y + 24}" text-anchor="middle" font-size="10" fill="#fff" fill-opacity="0.85" font-family="system-ui,sans-serif" font-weight="700" letter-spacing="0.08em">${escapeXml(item.label.toUpperCase())}</text>`
      const metricText = m.num !== null ? fmtNum(m.num) : m.raw
      svg += `<text x="${bandCx}" y="${y + 46}" text-anchor="middle" font-size="19" fill="#fff" font-family="system-ui,sans-serif" font-weight="800" letter-spacing="0.02em">${escapeXml(metricText)}</text>`
    } else {
      // No metric — just centre the label
      svg += `<text x="${bandCx}" y="${y + STEP_H/2 + 5}" text-anchor="middle" font-size="13" fill="#fff" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(item.label)}</text>`
    }

    // Conversion rate from previous step — right gutter, small accent badge
    if (i > 0) {
      const prev = metrics[i - 1]
      if (prev.num !== null && m.num !== null && prev.num > 0) {
        const pct       = (m.num / prev.num) * 100
        const pctText   = pct >= 10 ? `${Math.round(pct)}%` : `${pct.toFixed(1)}%`
        const dropText  = `↓ ${pctText}`
        svg += `<text x="${W - 8}" y="${(y + STEP_H / 2 + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="${theme.accent}" font-family="system-ui,sans-serif" font-weight="700">${dropText}</text>`
      }
    }
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svg}
  </svg>`
}
