import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, titleEl, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared } from '../shared'

function svgWrapProcess(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const n = Math.min(items.length, 4)
  const W = 560, GAP = 6, HEADER_H = 24, ROW_H = 20
  const maxChildren = Math.max(...items.slice(0, n).map(it => it.children.length), 2)
  const COL_H = HEADER_H + maxChildren * ROW_H + 12
  const COL_W = (W - (n - 1) * GAP) / n
  const titleH = spec.title ? 28 : 8
  const H = titleH + COL_H + 8
  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  // Per-node fitting: every column shares COL_W, but each header label and
  // each child row is sized independently rather than to the diagram's
  // worst-case label — a short header/row stays large instead of being
  // dragged down to match a long neighbor. Replaces the old flat COL_W/6
  // and COL_W/5.5 char-budget truncations.
  const shownItems = items.slice(0, n)
  const displays = shownItems.map(item => displayLabel(item))

  const animate = shouldAnimate(spec)
  shownItems.forEach((item, i) => {
    const x = i * (COL_W + GAP), y = titleH
    const t = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    const { url: itmUrl, display: itmDisplay } = displays[i]
    const { fontSize: headerFS, results: [{ lines: headerLines, truncated: headerTruncated }] } =
      fitTextToWidthShared([itmDisplay], COL_W - 8, { maxSize: 10, minSize: 6.5, maxLines: 1 })
    const headerTip = headerTruncated ? `<title>${escapeXml(itmDisplay)}</title>` : ''
    let nodeStr = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${COL_W.toFixed(1)}" height="${COL_H}" rx="6" fill="${theme.surface}" stroke="${fill}55" stroke-width="1">${itemTitleTag(item)}</rect>`
    nodeStr += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${COL_W.toFixed(1)}" height="${HEADER_H}" rx="6" fill="${fill}"/>`
    nodeStr += `<rect x="${x.toFixed(1)}" y="${(y + HEADER_H - 6).toFixed(1)}" width="${COL_W.toFixed(1)}" height="6" fill="${fill}"/>`
    nodeStr += aWrap(`${headerTip}<text x="${(x + COL_W / 2).toFixed(1)}" y="${(y + HEADER_H / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="${headerFS}" fill="#fff" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(headerLines[0])}</text>`, itmUrl)
    item.children.slice(0, maxChildren).forEach((child, ci) => {
      const ry = y + HEADER_H + ci * ROW_H + 6
      const { fontSize: childFS, results: [{ lines: childLines, truncated: childTruncated }] } =
        fitTextToWidthShared([child.label], COL_W - 8, { maxSize: 9, minSize: 6, maxLines: 1 })
      const childTip = childTruncated ? `<title>${escapeXml(child.label)}</title>` : ''
      nodeStr += `<rect x="${(x + 4).toFixed(1)}" y="${ry.toFixed(1)}" width="${(COL_W - 8).toFixed(1)}" height="${ROW_H - 2}" rx="3" fill="${fill}22"/>`
      nodeStr += `${childTip}<text x="${(x + COL_W / 2).toFixed(1)}" y="${(ry + ROW_H / 2 + 3).toFixed(1)}" text-anchor="middle" font-size="${childFS}" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(childLines[0])}</text>`
    })
    parts.push(animate ? `<g class="mdart-n${i}">${nodeStr}</g>` : nodeStr)
  })
  if (animate) parts.unshift(seqSpotlightCSS(n, spec))
  return svgWrapProcess(W, H, theme, parts)
}
