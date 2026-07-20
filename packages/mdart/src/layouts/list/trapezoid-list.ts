import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, lerpColor, renderEmpty, getCaption, itemTitleTag, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 500
const GAP = 3
const MAX_INSET_RATIO = 0.18
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 8
const BOTTOM_PAD = 8

const LBL_FS = 11
const LBL_LH = 14
const VAL_FS = 10
const VAL_LH = 13
const PAD_V = 8
const SEC_G = 5
const MIN_H = 26

interface BandLayout {
  lblLines: string[]
  lblTrunc: boolean
  lblUrl: string | null
  capLines: string[]
  capTrunc: boolean
  caption: string | null
  blockH: number
  bandH: number
}

interface TrapezoidLayout {
  titleH: number
  height: number
  topInsets: number[]
  rowY: number[]
  bands: BandLayout[]
}

interface BandPlacement {
  item: MdArtItem
  layout: BandLayout
  index: number
  y: number
  topInset: number
  bottomInset: number
  fill: string
}

function titleHeight(spec: MdArtSpec): number {
  return spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
}

function topInset(index: number, count: number): number {
  const t = count > 1 ? index / (count - 1) : 0
  return W * MAX_INSET_RATIO * (1 - t)
}

function computeBand(item: MdArtItem, inset: number): BandLayout {
  const innerW = Math.max(120, W - inset * 2 - 12)
  const labelMax = Math.max(12, Math.floor(innerW / 6.0))
  const captionMax = Math.max(12, Math.floor(innerW / 5.2))
  const caption = getCaption(item)

  const { lines: lblLines, truncated: lblTrunc, url: lblUrl } = wrapLabel(item.label, labelMax, 5)
  const { lines: capLines, truncated: capTrunc } = caption
    ? wrapLabel(caption, captionMax, 5)
    : { lines: [], truncated: false }
  const blockH = lblLines.length * LBL_LH + (capLines.length > 0 ? SEC_G + capLines.length * VAL_LH : 0)

  return {
    lblLines,
    lblTrunc,
    lblUrl,
    capLines,
    capTrunc,
    caption,
    blockH,
    bandH: Math.max(MIN_H, PAD_V + blockH + PAD_V),
  }
}

function resolveLayout(spec: MdArtSpec): TrapezoidLayout {
  const topInsets = spec.items.map((_, index) => topInset(index, spec.items.length))
  const bands = spec.items.map((item, index) => computeBand(item, topInsets[index]))
  const rowY: number[] = []
  let y = titleHeight(spec)
  for (const band of bands) {
    rowY.push(y)
    y += band.bandH + GAP
  }
  return { titleH: titleHeight(spec), height: y - GAP + BOTTOM_PAD, topInsets, rowY, bands }
}

function placeBands(spec: MdArtSpec, layout: TrapezoidLayout, theme: MdArtTheme): BandPlacement[] {
  return spec.items.map((item, index) => {
    const t = spec.items.length > 1 ? index / (spec.items.length - 1) : 0
    return {
      item,
      layout: layout.bands[index],
      index,
      y: layout.rowY[index],
      topInset: layout.topInsets[index],
      bottomInset: index < spec.items.length - 1 ? layout.topInsets[index + 1] : 0,
      fill: lerpColor(theme.primary, theme.secondary, t),
    }
  })
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  if (!spec.title) return ''
  return `<text x="${W / 2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(spec.title)}</text>`
}

function bandPath(band: BandPlacement): string {
  return [
    `M${band.topInset.toFixed(1)},${band.y}`,
    `L${(W - band.topInset).toFixed(1)},${band.y}`,
    `L${(W - band.bottomInset).toFixed(1)},${band.y + band.layout.bandH}`,
    `L${band.bottomInset.toFixed(1)},${band.y + band.layout.bandH}`,
    'Z',
  ].join(' ')
}

function tspans(lines: string[], lineH: number): string {
  return lines.map((line, lineIndex) => `<tspan x="${W / 2}" dy="${lineIndex === 0 ? 0 : lineH}">${escapeXml(line)}</tspan>`).join('')
}

function renderBandShape(band: BandPlacement): string {
  return `<path d="${bandPath(band)}" fill="${band.fill}33" stroke="${band.fill}" stroke-width="1">${itemTitleTag(band.item)}</path>`
}

function labelStartY(band: BandPlacement): number {
  return band.y + (band.layout.bandH - band.layout.blockH) / 2 + LBL_FS * 0.75
}

function renderBandLabel(band: BandPlacement, theme: MdArtTheme): string {
  const tip = band.layout.lblTrunc ? `<title>${escapeXml(band.item.label)}</title>` : ''
  return aWrap(`<text x="${W / 2}" y="${labelStartY(band).toFixed(1)}" text-anchor="middle" font-size="${LBL_FS}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${tip}${tspans(band.layout.lblLines, LBL_LH)}</text>`, band.layout.lblUrl)
}

function renderBandCaption(band: BandPlacement, theme: MdArtTheme): string {
  if (band.layout.capLines.length === 0) return ''
  const y = labelStartY(band) + band.layout.lblLines.length * LBL_LH + SEC_G
  const tip = band.layout.capTrunc ? `<title>${escapeXml(band.layout.caption!)}</title>` : ''
  return `<text x="${W / 2}" y="${y.toFixed(1)}" text-anchor="middle" font-size="${VAL_FS}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tip}${tspans(band.layout.capLines, VAL_LH)}</text>`
}

function renderBand(band: BandPlacement, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  return wrapItem(renderBandShape(band) + renderBandLabel(band, theme) + renderBandCaption(band, theme), band.index, animate, instrument)
}

function renderSvg(layout: TrapezoidLayout, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${layout.height}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)

  const layout = resolveLayout(spec)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const bands = placeBands(spec, layout, theme)
  const parts = [
    ...(animate ? [seqSpotlightCSS(spec.items.length, spec)] : []),
    renderTitle(spec, theme),
    ...bands.map(band => renderBand(band, theme, animate, instrument)),
  ].filter(Boolean)

  return renderSvg(layout, theme, parts)
}
