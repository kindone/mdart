import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, titleEl, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, type FitTextResult, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

function svgWrapProcess(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const n = items.length

  const BOX_H = 40
  const STEP_Y = 24
  const titleH = spec.title ? 28 : 8
  const BOX_W = Math.min(110, Math.floor((520 - (n - 1) * 8) / Math.max(n, 1)))
  const STEP_X = BOX_W + 8
  const totalH = STEP_Y * (n - 1) + BOX_H
  const diagW = (n - 1) * STEP_X + BOX_W + 40
  const W = Math.max(560, diagW)
  const H = totalH + titleH + 36
  const startX = (W - (STEP_X * (n - 1) + BOX_W)) / 2
  const startY = titleH + 14

  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  // Connectors fade in with the destination node they point to.
  for (let i = 0; i < n - 1; i++) {
    const x1 = startX + i * STEP_X + BOX_W
    const y1 = startY + i * STEP_Y + BOX_H / 2
    const x2 = startX + (i + 1) * STEP_X
    const y2 = startY + (i + 1) * STEP_Y + BOX_H / 2
    const t = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    const connLines =
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${(x1 + 4).toFixed(1)}" y2="${y1.toFixed(1)}" stroke="${fill}99" stroke-width="1.5"/>` +
      `<line x1="${(x1 + 4).toFixed(1)}" y1="${y1.toFixed(1)}" x2="${(x1 + 4).toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${fill}55" stroke-width="1.5" stroke-dasharray="3,3"/>` +
      `<line x1="${(x1 + 4).toFixed(1)}" y1="${y2.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${fill}99" stroke-width="1.5"/>`
    parts.push(animate ? `<g class="mdart-arr-n${i + 1}">${connLines}</g>` : connLines)
  }

  // Floors pushed lower than the usual 8/7 — the SVG scales via viewBox, so
  // a smaller source font size still reads fine once the diagram renders at
  // a normal display width; better to shrink further than to drop content.
  const VALUE_FS_MAX = 9, VALUE_FS_MIN = 6
  const LABEL_FS_MAX = 10.5, LABEL_FS_MIN = 6.5
  const PAD_V = 3
  const usableH = BOX_H - PAD_V * 2

  const displays = items.map(it => displayLabel(it, { value: !!it.value }))

  // Per-node fitting: every box shares BOX_W, but each label/value pair is
  // sized independently rather than to the diagram's worst-case label — a
  // short label stays large instead of being dragged down to match a long
  // neighbor. The value's own best-fit size isn't necessarily the best
  // choice for the box overall: a short value ("4wk") that already fits
  // fine at its max size stays at a taller line height than it needs to,
  // which reserves LESS room for the label than a longer value that was
  // forced to shrink would have — so a short value can paradoxically starve
  // the label of room a long one wouldn't have. Try shrinking the value
  // (down to its own floor) and re-check the label at each step, preferring
  // the LARGEST value size that still lets the label avoid truncation —
  // only give up value size for label room when the label actually needs it.
  items.forEach((item, i) => {
    const x = startX + i * STEP_X
    const y = startY + i * STEP_Y
    const t = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    const { url: itmUrl, display: itmDisplay } = displays[i]

    let labelFS: number, labelLH: number, lines: string[], labelTruncated: boolean
    let valueFS: number, valueLH: number, valueFit: FitTextResult | null
    if (item.value) {
      const natural = fitTextToWidthShared([item.value], BOX_W - 10, { maxSize: VALUE_FS_MAX, minSize: VALUE_FS_MIN, maxLines: 1 })
      let bestValue = natural
      let bestLabel = fitTextToWidthShared([itmDisplay], BOX_W - 10, {
        maxSize: LABEL_FS_MAX, minSize: LABEL_FS_MIN, maxLines: 2,
        boxH: Math.max(10, usableH - natural.lineHeight - 4),
      })
      // Keep updating on EVERY iteration (not just on full success): if some
      // value size fully clears the label's truncation, `break` locks that
      // in (preferring the largest such size); if none do, the loop still
      // runs to its last (smallest) value size, which is the most room the
      // label can possibly get — a genuine best effort, unlike reverting to
      // the value's natural (least-helpful) size.
      for (let vfs = natural.fontSize; vfs >= VALUE_FS_MIN; vfs--) {
        const candidateValue = fitTextToWidthShared([item.value], BOX_W - 10, { maxSize: vfs, minSize: vfs, maxLines: 1 })
        const reservedBoxH = Math.max(10, usableH - candidateValue.lineHeight - 4)
        const candidateLabel = fitTextToWidthShared([itmDisplay], BOX_W - 10, {
          maxSize: LABEL_FS_MAX, minSize: LABEL_FS_MIN, maxLines: 2, boxH: reservedBoxH,
        })
        bestValue = candidateValue
        bestLabel = candidateLabel
        if (!candidateLabel.results[0].truncated) break
      }
      valueFS = bestValue.fontSize; valueLH = bestValue.lineHeight; valueFit = bestValue.results[0]
      labelFS = bestLabel.fontSize; labelLH = bestLabel.lineHeight
      ;({ lines, truncated: labelTruncated } = bestLabel.results[0])
    } else {
      const labelFit = fitTextToWidthShared([itmDisplay], BOX_W - 10, {
        maxSize: LABEL_FS_MAX, minSize: LABEL_FS_MIN, maxLines: 3, boxH: usableH,
      })
      labelFS = labelFit.fontSize; labelLH = labelFit.lineHeight
      ;({ lines, truncated: labelTruncated } = labelFit.results[0])
      valueFS = VALUE_FS_MAX; valueLH = VALUE_FS_MAX * 1.3; valueFit = null
    }
    const cy = y + BOX_H / 2
    // Centre the whole block (label lines + optional value line) around cy —
    // generalized so it works whatever combination of line counts the fit
    // above landed on, instead of assuming exactly 1 or 2 label lines.
    const totalH = lines.length * labelLH + (valueFit ? valueLH + 3 : 0)
    const labelTip = labelTruncated ? `<title>${escapeXml(itmDisplay)}</title>` : ''
    let lblContent = labelTip
    lines.forEach((line, li) => {
      const ty = cy - totalH / 2 + li * labelLH + labelLH * 0.8
      lblContent += `<text x="${(x + BOX_W / 2).toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="${labelFS}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(line)}</text>`
    })
    if (valueFit) {
      const ty = cy - totalH / 2 + lines.length * labelLH + valueLH * 0.8
      const valueTip = valueFit.truncated ? `<title>${escapeXml(item.value!)}</title>` : ''
      lblContent += `${valueTip}<text x="${(x + BOX_W / 2).toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="${valueFS}" fill="${theme.text}" opacity="0.7" ${FONT_SANS_ATTR}>${escapeXml(valueFit.lines[0])}</text>`
    }
    let nodeStr = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${BOX_W}" height="${BOX_H}" rx="5" fill="${fill}33" stroke="${fill}" stroke-width="1.5">${itemTitleTag(item)}</rect>`
    nodeStr += aWrap(lblContent, itmUrl)
    parts.push(wrapItem(nodeStr, i, animate, instrument))
  })

  if (animate) parts.unshift(seqSpotlightCSS(n, spec))
  return svgWrapProcess(W, H, theme, parts)
}
