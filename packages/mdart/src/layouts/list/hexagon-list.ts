import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, renderEmpty, getCaption, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, wrapItem, shouldInstrument } from '../shared'

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
  const R = 50  // circumradius (bumped to give text a little more room)
  const HEX_W = R * Math.sqrt(3), HEX_H = R * 2
  const COL_W = HEX_W + 6, ROW_H = HEX_H * 0.75 + 4
  const COLS = Math.min(items.length, 4)
  const rows = Math.ceil(items.length / COLS)
  const totalW = COLS * COL_W - 6
  const startX = (W - totalW) / 2 + HEX_W / 2
  const titleH = spec.title ? 30 : 8
  const H = titleH + rows * ROW_H + R * 0.25 + 8

  const hexPoints = (cx: number, cy: number) =>
    Array.from({ length: 6 }, (_, k) => {
      const a = Math.PI / 6 + k * Math.PI / 3
      return `${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)}`
    }).join(' ')

  // Per-node fitting: every hexagon shares R (like circle-process.ts's
  // circles), so each label/value pair is sized independently — a short
  // label stays large instead of being dragged down to match a long
  // neighbor. Replaces the old flat 12/14-char truncation (fixed font-size
  // 11/9, hard 2-line label cap, no <title> tooltip so truncated text was
  // silently lost with no way to see the full value on hover).
  //
  // The hexagon is a pointy-top shape (vertices at top/bottom), so like
  // circle-process's circleBoxW/H it's widest at the vertical middle and
  // narrows toward the top/bottom points — usable width/height are
  // fractions of the full HEX_W/HEX_H, not the full extents, to keep
  // wrapped text clear of the taper.
  const hexBoxW = Math.max(20, HEX_W - 10)
  const hexBoxH = HEX_H * 0.7

  const n = items.length
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts: string[] = []
  if (spec.title) parts.push(`<text x="${W/2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`)

  items.forEach((item, i) => {
    const col = i % COLS, row = Math.floor(i / COLS)
    const cx = startX + col * COL_W + (row % 2 === 1 ? COL_W / 2 : 0)
    const cy = titleH + R + row * ROW_H
    const t = items.length > 1 ? i / (items.length - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    const caption = getCaption(item)
    const { display: rawLabel, url: lblUrl } = displayLabel(item, { value: !!caption })

    // Value/caption fit first (its own boxH share, a minority of hexBoxH
    // since the label is the primary text), then label reserves whatever's
    // left — same joint pattern as circle-process/chevron-process.
    const fit = fitLabelValueBlock(rawLabel, caption, hexBoxW, hexBoxH, {
      labelUrl: lblUrl,
      labelMaxSize: 11,
      labelMinSize: 6.5,
      labelMaxLines: 2,
      labelMaxLinesNoValue: 3,
      valueMaxSize: 9,
      valueMinSize: 6.5,
      valueMaxLines: 2,
      valueShare: 0.4,
      gap: 3,
    })
    let nodeStr = ''
    nodeStr += `<polygon points="${hexPoints(cx, cy)}" fill="${fill}33" stroke="${fill}" stroke-width="1.5">${itemTitleTag(item)}</polygon>`
    nodeStr += renderFitBlock(cx, cy, fit, {
      labelFullText: rawLabel,
      valueFullText: caption ?? undefined,
      labelFill: theme.text,
      valueFill: theme.textMuted,
      labelWeight: '700',
    })
    parts.push(wrapItem(nodeStr, i, animate, instrument))
  })
  if (animate) parts.unshift(seqSpotlightCSS(n, spec))
  return svg(W, H, theme, parts)
}
