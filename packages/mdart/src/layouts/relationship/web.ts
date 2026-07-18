import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

function svg(W: number, H: number, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const n = items.length
  const W = 520, TITLE_H = spec.title ? 28 : 8, H = 420 + TITLE_H
  const cx = W / 2, cy = TITLE_H + (H - TITLE_H) / 2
  const R = 148
  const pos: [number, number][] = items.map((_, i) => [
    cx + R * Math.cos(2 * Math.PI * i / n - Math.PI / 2),
    cy + R * Math.sin(2 * Math.PI * i / n - Math.PI / 2),
  ])
  const parts: string[] = []
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const drawn = new Set<string>()
  const edges: string[] = []
  const edge = (i: number, j: number) => {
    const k = `${Math.min(i, j)}-${Math.max(i, j)}`
    if (drawn.has(k)) return; drawn.add(k)
    edges.push(`<line x1="${pos[i][0].toFixed(1)}" y1="${pos[i][1].toFixed(1)}" x2="${pos[j][0].toFixed(1)}" y2="${pos[j][1].toFixed(1)}" stroke="${theme.primary}55" stroke-width="1.8"/>`)
  }
  for (let i = 0; i < n; i++) {
    edge(i, (i + 1) % n)
    if (n <= 7) edge(i, (i + 2) % n)
    if (n <= 4) for (let j = i + 1; j < n; j++) edge(i, j)
  }
  parts.push(wrapItem(edges.join(''), 0, animate, instrument))

  // nodeR grows as item count drops (more room per node). At n=2 it's 34, at n≥4 it's 22.
  const nodeR = Math.max(22, Math.min(34, 72 / n))
  // Usable text box inside the circle — safe chord width for up to 3 lines.
  // For r=22 and 3 lines at lh≈9.1, extremes sit ±9.1px from centre;
  // chord at y=9.1 is 2√(22²−9.1²)≈40px, so 1.5×r≈33 is comfortably inscribed.
  // boxH = 1.4×r lets the 3rd line unlock at font ≈7 (3×9.1=27.3 ≤ 30.8).
  const nodeBoxW = nodeR * 1.5
  const nodeBoxH = nodeR * 1.4
  const nodeMaxSize = Math.max(8, Math.min(10, nodeR * 0.5))

  items.forEach((item, i) => {
    const [nx, ny] = pos[i]
    const { display: itmDisplay, url: itmUrl } = displayLabel(item)

    // Per-node fitting: short labels stay large; long labels shrink and wrap
    // to up to 2 lines rather than being hard-truncated at 9 chars.
    const { fontSize, lineHeight: lh, results: [{ lines, truncated }] } =
      fitTextToWidthShared([itmDisplay], nodeBoxW, {
        maxSize: nodeMaxSize,
        minSize: 6,
        maxLines: 3,
        boxH: nodeBoxH,
      })
    const tip = truncated ? `<title>${escapeXml(itmDisplay)}</title>` : ''
    // Vertically centre the text block in the circle
    const startY = ny - ((lines.length - 1) * lh) / 2 + fontSize * 0.35
    const spans = lines
      .map((line, li) => `<tspan x="${nx.toFixed(1)}" dy="${li === 0 ? 0 : lh.toFixed(1)}">${escapeXml(line)}</tspan>`)
      .join('')

    const unit = `<circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="${nodeR}" fill="${theme.surface}" stroke="${theme.primary}99" stroke-width="1.8">${itemTitleTag(item)}</circle>`
      + aWrap(`${tip}<text x="${nx.toFixed(1)}" y="${startY.toFixed(1)}" text-anchor="middle" font-size="${fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${spans}</text>`, itmUrl)
    parts.push(wrapItem(unit, i + 1, animate, instrument))
  })
  if (animate) parts.unshift(seqSpotlightCSS(n + 1, spec, { scale: false }))
  return svg(W, H, theme, spec.title, parts)
}
