import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

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
  const W = 500, TITLE_H = spec.title ? 28 : 8, H = 400 + TITLE_H
  const cx = W / 2, cy = TITLE_H + (H - TITLE_H) / 2
  const ARM = 130, BW = 106, BH = 64, CR = 30
  const pos: [number, number][] = [[cx, cy - ARM], [cx + ARM, cy], [cx, cy + ARM], [cx - ARM, cy]]
  const colors = [theme.primary, theme.secondary, theme.accent, theme.primary]
  const parts: string[] = []
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const armColor = `${theme.primary}55`
  const armLines = [
    `<line x1="${cx}" y1="${cy - ARM + BH / 2}" x2="${cx}" y2="${cy - CR}" stroke="${armColor}" stroke-width="12"/>`,
    `<line x1="${cx + CR}" y1="${cy}" x2="${cx + ARM - BW / 2}" y2="${cy}" stroke="${armColor}" stroke-width="12"/>`,
    `<line x1="${cx}" y1="${cy + CR}" x2="${cx}" y2="${cy + ARM - BH / 2}" stroke="${armColor}" stroke-width="12"/>`,
    `<line x1="${cx - ARM + BW / 2}" y1="${cy}" x2="${cx - CR}" y2="${cy}" stroke="${armColor}" stroke-width="12"/>`,
  ]

  // Centre circle — optional 5th item
  const centerItem = items[4]
  const centerUnit: string[] = []
  centerUnit.push(`<circle cx="${cx}" cy="${cy}" r="${CR}" fill="${theme.accent}33" stroke="${theme.accent}" stroke-width="1.5"/>`)
  if (centerItem) {
    const { display: ctrDisplay, url: ctrUrl } = displayLabel(centerItem)
    // Per-node fitting: the centre circle is CR=30 r, usable text box ≈ 42×48px.
    // boxH = CR*1.6 lets 4 lines unlock at font ≤ 8 (4×10.4=41.6 ≤ 48).
    // At ±3/2 lineHeights from centre (the extremes of 4 lines), the chord is
    // 2√(30²−15.6²)≈51px > boxW=42, so text stays inside the circle.
    const { fontSize: ctrFS, lineHeight: ctrLH, results: [{ lines: ctrLines, truncated: ctrTruncated }] } =
      fitTextToWidthShared([ctrDisplay], CR * 1.4, { maxSize: 9, minSize: 6, maxLines: 4, boxH: CR * 1.6 })
    const ctrTip = ctrTruncated ? `<title>${escapeXml(ctrDisplay)}</title>` : ''
    const ctrStartY = cy - ((ctrLines.length - 1) * ctrLH) / 2 + ctrFS * 0.35
    const ctrSpans = ctrLines
      .map((line, li) => `<tspan x="${cx.toFixed(1)}" dy="${li === 0 ? 0 : ctrLH.toFixed(1)}">${escapeXml(line)}</tspan>`)
      .join('')
    centerUnit.push(aWrap(`${ctrTip}<text x="${cx.toFixed(1)}" y="${ctrStartY.toFixed(1)}" text-anchor="middle" font-size="${ctrFS}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${itemTitleTag(centerItem)}${ctrSpans}</text>`, ctrUrl))
  }
  parts.push(wrapItem(centerUnit.join(''), 0, animate, instrument))

  items.slice(0, 4).forEach((item, i) => {
    const [px, py] = pos[i]
    // value: true — tells ellipsisIfDropped the value IS shown (as a sub-row),
    // so it won't append " …" to the main key label.
    const { display: itmDisplay, url: itmUrl } = displayLabel(item, { value: true })
    const unit: string[] = []
    unit.push(armLines[i])
    unit.push(`<rect x="${(px - BW / 2).toFixed(1)}" y="${(py - BH / 2).toFixed(1)}" width="${BW}" height="${BH}" rx="6" fill="${theme.surface}" stroke="${colors[i]}88" stroke-width="1.5">${itemTitleTag(item)}</rect>`)

    // Per-node label fitting — label may wrap to 2 lines rather than truncate.
    // boxH reserves space according to whether children occupy the bottom half.
    // Sub-rows come from item.value first (key: value syntax), then children —
    // so both "- Label: subtitle" and indented children work interchangeably.
    const childLabels: string[] = []
    if (item.value) childLabels.push(item.value)
    for (const ch of item.children) { if (childLabels.length < 2) childLabels.push(ch.label) }
    const hasChildren = childLabels.length > 0
    const lblBoxH = hasChildren ? BH * 0.52 : BH - 10
    const { fontSize: lblFS, lineHeight: lblLH, results: [{ lines: lblLines, truncated: lblTruncated }] } =
      fitTextToWidthShared([itmDisplay], BW - 16, { maxSize: 11, minSize: 6, maxLines: 4, boxH: lblBoxH })
    const lblTip = lblTruncated ? `<title>${escapeXml(itmDisplay)}</title>` : ''

    // Per-child fitting (shared size within this node for visual consistency).
    const { fontSize: chFS, lineHeight: chLH, results: childFits } = hasChildren
      ? fitTextToWidthShared(childLabels, BW - 16, { maxSize: 9, minSize: 6, maxLines: 2 })
      : { fontSize: 8.5, lineHeight: 11.05, results: [] as ReturnType<typeof fitTextToWidthShared>['results'] }

    // Vertically centre the full label+children block inside the box.
    // Visual height uses (n−1)×lh + fs — cap-top to descender-bottom — rather
    // than n×lh which adds a trailing line-gap and shifts the block upward.
    const chTotalLines = childFits.reduce((s, f) => s + f.lines.length, 0)
    const lblVisualH   = (lblLines.length - 1) * lblLH + lblFS
    const chVisualH    = chTotalLines > 0 ? (chTotalLines - 1) * chLH + chFS : 0
    const gap          = hasChildren ? 4 : 0
    const totalH       = lblVisualH + gap + chVisualH
    const lblStartY    = py - totalH / 2 + lblFS * 0.75  // baseline = block-top + cap-height

    const lblSpans = lblLines
      .map((line, li) => `<tspan x="${px.toFixed(1)}" dy="${li === 0 ? 0 : lblLH.toFixed(1)}">${escapeXml(line)}</tspan>`)
      .join('')
    unit.push(aWrap(`${lblTip}<text x="${px.toFixed(1)}" y="${lblStartY.toFixed(1)}" text-anchor="middle" font-size="${lblFS}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${lblSpans}</text>`, itmUrl))

    const firstChildBaseY = py - totalH / 2 + lblVisualH + gap + chFS * 0.75
    // chLineOffset tracks the cumulative lines emitted so far — necessary when
    // a child wraps to 2 lines, since the next child must start chLines.length
    // rows further down, not just 1.
    let chLineOffset = 0
    childFits.forEach(({ lines: chLines, truncated: chTruncated }, ci) => {
      const chTip = chTruncated ? `<title>${escapeXml(childLabels[ci])}</title>` : ''
      const chBaseY = (firstChildBaseY + chLineOffset * chLH).toFixed(1)
      const chSpans = chLines
        .map((line, li) => `<tspan x="${px.toFixed(1)}" dy="${li === 0 ? 0 : chLH.toFixed(1)}">${escapeXml(line)}</tspan>`)
        .join('')
      unit.push(`${chTip}<text x="${px.toFixed(1)}" y="${chBaseY}" text-anchor="middle" font-size="${chFS}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${chSpans}</text>`)
      chLineOffset += chLines.length
    })
    parts.push(wrapItem(unit.join(''), i + 1, animate, instrument))
  })
  if (animate) parts.unshift(seqSpotlightCSS(Math.min(Math.max(items.length, 1), 5), spec, { scale: false }))
  return svg(W, H, theme, spec.title, parts)
}
