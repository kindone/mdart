import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const n = items.length
  const W = Math.max(500, n * 100 + 80)
  const H = 160
  const LINE_Y = 90
  const DOT_R = 8
  const PAD = 50
  const spacing = (W - PAD * 2) / (n - 1 || 1)

  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  let svgContent = ''

  // Timeline backbone — always visible
  svgContent += `<line x1="${PAD}" y1="${LINE_Y}" x2="${W - PAD}" y2="${LINE_Y}" stroke="${theme.border}" stroke-width="3" />`

  // Per-node fitting: every column shares the same spacing-derived width,
  // but each label/value pair is sized independently rather than to the
  // diagram's worst-case label — a short label stays large instead of
  // being dragged down to match a long neighbor. Replaces the old flat
  // 12-char budget (unrelated to actual spacing) with no line cap at all,
  // which on a fixed-height (H=140) canvas could push content past the
  // top/bottom edge for a sufficiently long label.
  const labelBoxW = Math.max(30, spacing - 10)
  const displays = items.map(it => displayLabel(it, { value: !!it.value }))

  for (let i = 0; i < n; i++) {
    const item = items[i]
    const x = PAD + i * spacing
    const t = n > 1 ? i / (n - 1) : 0.5
    const fill = lerpColor(theme.secondary, theme.primary, t)
    const above = i % 2 === 0
    const lineEndY = above ? LINE_Y - 14 : LINE_Y + 14

    const { url: itmUrl, display: itmDisplay } = displays[i]
    const { fontSize: labelFS, lineHeight: lineH, results: [{ lines, truncated }] } =
      fitTextToWidthShared([itmDisplay], labelBoxW, { maxSize: 10, minSize: 6.5, maxLines: 2 })
    const valueFitFull = item.value
      ? fitTextToWidthShared([item.value], labelBoxW, { maxSize: 9, minSize: 6, maxLines: 1 })
      : null
    const valueFS = valueFitFull?.fontSize ?? 9
    const valueLH = valueFS * 1.3
    // Anchor the label block relative to the connector endpoint AFTER
    // fitting, so the gap is consistent regardless of how many lines the
    // label wraps to. Fixed offsets computed before fitting caused the
    // connector to cut through the text when a label wrapped to 2 lines.
    const numValueLines = valueFitFull?.results[0].lines.length ?? 0
    // Distance from first baseline to the visual bottom of the last line.
    // Cap-height ≈ 0.8×fontSize above baseline; descender ≈ 0.2×fontSize
    // below — so we add only 0.2×fontSize for the trailing descent, not
    // the full fontSize or a whole lineHeight (which would include an
    // inter-line gap that belongs only between adjacent lines).
    const lastDescent = (numValueLines > 0 ? valueFS : labelFS) * 0.2
    const lastBaselineFromFirst = numValueLines > 0
      ? lines.length * lineH + (numValueLines - 1) * valueLH
      : (lines.length - 1) * lineH
    const labelY = above
      ? lineEndY - 4 - lastBaselineFromFirst - lastDescent  // visual bottom 4px above connector
      : lineEndY + 4 + labelFS * 0.8                        // visual top 4px below connector
    let lblContent = truncated ? `<title>${escapeXml(itmDisplay)}</title>` : ''
    lines.forEach((line, li) => {
      const ly = labelY + li * lineH
      lblContent += `<text x="${x}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="${labelFS}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(line)}</text>`
    })

    let nodeStr = ''
    nodeStr += `<circle cx="${x}" cy="${LINE_Y}" r="${DOT_R}" fill="${fill}" >${itemTitleTag(item)}</circle>`
    nodeStr += `<circle cx="${x}" cy="${LINE_Y}" r="${DOT_R - 3}" fill="${theme.bg}" />`
    nodeStr += `<line x1="${x}" y1="${LINE_Y}" x2="${x}" y2="${lineEndY}" stroke="${fill}" stroke-width="1.5" stroke-dasharray="3,2" />`
    nodeStr += aWrap(lblContent, itmUrl)
    if (valueFitFull) {
      const valueFit = valueFitFull.results[0]
      const valueTip = valueFit.truncated ? `<title>${escapeXml(item.value!)}</title>` : ''
      nodeStr += `${valueTip}<text x="${x}" y="${(labelY + lines.length * lineH).toFixed(1)}" text-anchor="middle" font-size="${valueFS}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${escapeXml(valueFit.lines[0])}</text>`
    }
    svgContent += wrapItem(nodeStr, i, animate, instrument)
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${animate ? seqSpotlightCSS(n, spec) : ''}
    ${spec.title ? `<text x="${W / 2}" y="16" text-anchor="middle" font-size="12" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${escapeXml(spec.title)}</text>` : ''}
    ${svgContent}
  </svg>`
}
