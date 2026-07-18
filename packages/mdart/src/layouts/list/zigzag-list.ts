import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, renderEmpty, getCaption, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

function svg(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const W = 500
  const captions = items.map(item => getCaption(item))
  const BOX_W = 190
  const layouts = items.map((item, i) => {
    const secondary = item.value ?? captions[i]
    const valueMaxLines = secondary && secondary.length > 78 ? 3 : 2
    const boxH = secondary ? (valueMaxLines === 3 ? 58 : 46) : 34
    const rowH = secondary ? (valueMaxLines === 3 ? 66 : 54) : 42
    return { secondary, valueMaxLines, boxH, rowH }
  })
  const SPINE_X = W / 2
  const titleH = spec.title ? 30 : 8
  const H = titleH + layouts.reduce((sum, row) => sum + row.rowH, 0) + 10
  const n = items.length
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts: string[] = []
  // Spine line stays always visible — structural backbone
  parts.push(`<line x1="${SPINE_X}" y1="${titleH}" x2="${SPINE_X}" y2="${H-8}" stroke="${theme.border}" stroke-width="2"/>`)
  if (spec.title) parts.push(`<text x="${SPINE_X}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(spec.title)}</text>`)
  let rowTop = titleH
  items.forEach((item, i) => {
    const { secondary, valueMaxLines, boxH, rowH } = layouts[i]
    const cy = rowTop + rowH / 2
    rowTop += rowH
    const left = i % 2 === 0
    const t = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    const bx = left ? SPINE_X - 8 - BOX_W : SPINE_X + 8
    const lineX = left ? SPINE_X - 8 : SPINE_X + 8
    const { display: zigDisplay, url: zigUrl } = displayLabel(item, { value: true })

    const fit = fitLabelValueBlock(zigDisplay, secondary, BOX_W - 70, boxH - 8, {
      labelUrl: zigUrl,
      labelMaxSize: 11,
      labelMinSize: 7,
      labelMaxLines: 1,
      labelMaxLinesNoValue: 2,
      valueMaxSize: 9,
      valueMinSize: 7,
      valueMaxLines,
      valueShare: 0.44,
    })

    let nodeStr = ''
    nodeStr += `<rect x="${bx.toFixed(1)}" y="${(cy - boxH/2).toFixed(1)}" width="${BOX_W}" height="${boxH}" rx="6" fill="${fill}22" stroke="${fill}" stroke-width="1.2">${itemTitleTag(item)}</rect>`
    nodeStr += renderFitBlock(bx + BOX_W / 2, cy, fit, {
      labelFullText: zigDisplay,
      valueFullText: secondary ?? undefined,
      labelFill: theme.text,
      valueFill: theme.textMuted,
      labelWeight: '600',
    })
    nodeStr += `<circle cx="${SPINE_X}" cy="${cy}" r="4" fill="${fill}"/>`
    nodeStr += `<line x1="${SPINE_X}" y1="${cy}" x2="${lineX}" y2="${cy}" stroke="${fill}" stroke-width="1.2"/>`
    parts.push(wrapItem(nodeStr, i, animate, instrument))
  })
  if (animate) parts.unshift(seqSpotlightCSS(n, spec, { scale: false }))
  return svg(W, H, theme, parts)
}
