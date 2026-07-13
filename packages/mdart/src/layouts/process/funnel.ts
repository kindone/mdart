import type { MdArtSpec, MdArtItem } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument } from '../shared'

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

  // Per-node fitting: each row's band is a genuinely different width (the
  // trapezoid narrows toward the bottom), so — unlike circle-process where
  // every node shares one radius — there's no single "shared" width that
  // makes sense here at all. Picking the narrowest band across the whole
  // funnel and applying it everywhere would crush the wide top band's text
  // down to whatever the skinny bottom band needs, wasting the extra room
  // every wider band actually has. Instead, size each row's text to its
  // OWN band width: the narrower of its top/bottom edge (the tightest
  // point text has to clear, since the trapezoid only gets narrower toward
  // the bottom edge). Previously there was no wrap/truncation at all here —
  // a long label just rendered past the band edges unbounded.
  // Each of the caption/metric/label fits below was also capped at a flat
  // maxLines: 1, with no boxH — so a smaller font never unlocked an extra
  // line, it just kept shrinking a single line down to the floor before
  // truncating. bandBoxH gives fitTextToWidthShared the vertical budget to
  // grow the caption/label's line count as the font shrinks, same
  // mechanism as circle-process/waterfall/chevron-process.
  const bandBoxH = STEP_H - 12
  const displays = items.map((it, i) => displayLabel(it, { value: metrics[i].raw !== null }))
  const rowBandW = items.map((_, i) => {
    const t = i / (n - 1 || 1)
    const w = maxW - (maxW - minW) * t
    const nextT = i < n - 1 ? (i + 1) / (n - 1 || 1) : t
    const nextW = maxW - (maxW - minW) * nextT
    return Math.max(20, Math.min(w, nextW) - 16)
  })

  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
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

    const nextT = i < n - 1 ? (i + 1) / (n - 1 || 1) : t
    const nextW = maxW - (maxW - minW) * nextT
    const nextX = (W - nextW) / 2
    const points = `${x},${y} ${x + w},${y} ${nextX + nextW},${y + STEP_H} ${nextX},${y + STEP_H}`

    const m      = metrics[i]
    const bandCx = W / 2
    const { url: itmUrl, display: itmDisplay } = displays[i]

    const bandW = rowBandW[i]
    const bandCy = y + STEP_H / 2
    let nodeStr = `<polygon points="${points}" fill="${fill}">${itemTitleTag(item)}</polygon>`
    if (m.raw !== null) {
      const metricTextFull = m.num !== null ? fmtNum(m.num) : m.raw
      const metricFit = fitTextToWidthShared([metricTextFull], bandW, { maxSize: 19, minSize: 10, maxLines: 1 })
      const { lines: metLines, truncated: metTrunc } = metricFit.results[0]
      const reservedBoxH = Math.max(10, bandBoxH - metricFit.lineHeight - 4)
      const captionFit = fitTextToWidthShared([itmDisplay.toUpperCase()], bandW, {
        maxSize: 10, minSize: 6.5, maxLines: 2, boxH: reservedBoxH,
      })
      const { lines: capLines, truncated: capTrunc } = captionFit.results[0]
      const capTip = capTrunc ? `<title>${escapeXml(itmDisplay.toUpperCase())}</title>` : ''
      const metTip = metTrunc ? `<title>${escapeXml(metricTextFull)}</title>` : ''
      // Centre the whole block (caption lines + metric line) on bandCy —
      // generalized so it works whatever line count the caption fit above
      // lands on, instead of assuming exactly 1 caption line.
      const totalH = capLines.length * captionFit.lineHeight + metricFit.lineHeight + 4
      let capContent = capTip
      capLines.forEach((line, li) => {
        const ty = bandCy - totalH / 2 + li * captionFit.lineHeight + captionFit.lineHeight * 0.8
        capContent += `<text x="${bandCx}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="${captionFit.fontSize}" fill="#fff" fill-opacity="0.85" font-family="system-ui,sans-serif" font-weight="700" letter-spacing="0.08em">${escapeXml(line)}</text>`
      })
      nodeStr += aWrap(capContent, itmUrl)
      const metTy = bandCy - totalH / 2 + capLines.length * captionFit.lineHeight + metricFit.lineHeight * 0.8
      nodeStr += `${metTip}<text x="${bandCx}" y="${metTy.toFixed(1)}" text-anchor="middle" font-size="${metricFit.fontSize}" fill="#fff" font-family="system-ui,sans-serif" font-weight="800" letter-spacing="0.02em">${escapeXml(metLines[0])}</text>`
    } else {
      const labelFit = fitTextToWidthShared([itmDisplay], bandW, { maxSize: 13, minSize: 6.5, maxLines: 2, boxH: bandBoxH })
      const { lines, truncated } = labelFit.results[0]
      const tip = truncated ? `<title>${escapeXml(itmDisplay)}</title>` : ''
      const totalH = lines.length * labelFit.lineHeight
      let lblContent = tip
      lines.forEach((line, li) => {
        const ty = bandCy - totalH / 2 + li * labelFit.lineHeight + labelFit.lineHeight * 0.8
        lblContent += `<text x="${bandCx}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="${labelFit.fontSize}" fill="#fff" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(line)}</text>`
      })
      nodeStr += aWrap(lblContent, itmUrl)
    }
    if (i > 0) {
      const prev = metrics[i - 1]
      if (prev.num !== null && m.num !== null && prev.num > 0) {
        const pct      = (m.num / prev.num) * 100
        const pctText  = pct >= 10 ? `${Math.round(pct)}%` : `${pct.toFixed(1)}%`
        nodeStr += `<text x="${W - 8}" y="${(y + STEP_H / 2 + 4).toFixed(1)}" text-anchor="end" font-size="10" fill="${theme.accent}" font-family="system-ui,sans-serif" font-weight="700">↓ ${pctText}</text>`
      }
    }
    svg += wrapItem(nodeStr, i, animate, instrument)
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${animate ? seqSpotlightCSS(n, spec) : ''}
    ${svg}
  </svg>`
}
