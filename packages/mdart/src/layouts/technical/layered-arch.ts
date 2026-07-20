import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, lerpColor, renderEmpty, aWrap, itemTitleTag, displayLabelValue, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 600
const LAYER_LEFT = 8
const LAYER_RIGHT = 16
const GAP = 8
const PAD_V = 10
const MIN_LAYER_H = 44

const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 8
const TITLE_BOTTOM_GAP = 8
const BOTTOM_PAD = 8

const TITLE_COL = 120
const DIVIDER_X = 128
const CHIPS_X = 140
const CHIP_PAD_R = 10
const CHIPS_W = W - LAYER_RIGHT - CHIPS_X - CHIP_PAD_R

const CHIP_GAP = 8
const CHIP_ROW_GAP = 7
const CHIP_H_BASE = 28
const CHIP_LH = 13
const CHIP_FS = 11

const LBL_LH = 13
const LBL_FS = 12
const CHAR_PX = 6.5

const LABEL_MAX = Math.max(6, Math.floor((TITLE_COL - 28) / CHAR_PX))
const LABEL_FULL_MAX = Math.max(24, Math.floor((W - LAYER_LEFT - LAYER_RIGHT - 32) / CHAR_PX))

const MAX_LABEL_LINES = 5
const MAX_CHIP_LINES = 3
const MAX_COLS = 6
const TARGET_MIN_CHIP = 70

interface ChipPrecomp {
  item: MdArtItem
  label: string
  lines: string[]
  truncated: boolean
  url: string | null
}

interface LayerPrecomp {
  item: MdArtItem
  fill: string
  label: string
  labelLines: string[]
  labelTrunc: boolean
  labelUrl: string | null
  cols: number
  chipW: number
  chipH: number
  chipFS: number
  chipLH: number
  numRows: number
  chips: ChipPrecomp[]
  layerH: number
}

interface LayeredArchLayout {
  titleH: number
  h: number
  layers: LayerPrecomp[]
  layerY: number[]
}

function visibleItem(item: MdArtItem): { display: string; url: string | null } {
  return displayLabelValue(item)
}

function layerFill(layerIndex: number, numLayers: number, theme: MdArtTheme): string {
  return lerpColor(theme.primary, theme.secondary, layerIndex / Math.max(numLayers - 1, 1))
}

function chipColumns(childCount: number): number {
  const maxFit = Math.floor((CHIPS_W + CHIP_GAP) / (TARGET_MIN_CHIP + CHIP_GAP))
  return Math.min(childCount, MAX_COLS, Math.max(1, maxFit))
}

function computeNoChildLayer(layer: MdArtItem, fill: string): LayerPrecomp {
  const visible = visibleItem(layer)
  const { lines, truncated } = wrapLabel(visible.display, LABEL_FULL_MAX, MAX_LABEL_LINES)
  const layerH = Math.max(MIN_LAYER_H, PAD_V + lines.length * LBL_LH + PAD_V)
  return {
    item: layer,
    fill,
    label: visible.display,
    labelLines: lines,
    labelTrunc: truncated,
    labelUrl: visible.url,
    cols: 0,
    chipW: 0,
    chipH: 0,
    chipFS: CHIP_FS,
    chipLH: CHIP_LH,
    numRows: 0,
    chips: [],
    layerH,
  }
}

function computeChildLayer(layer: MdArtItem, fill: string): LayerPrecomp {
  const visible = visibleItem(layer)
  const { lines: labelLines, truncated: labelTrunc } =
    wrapLabel(visible.display, LABEL_MAX, MAX_LABEL_LINES)

  const n = layer.children.length
  const cols = chipColumns(n)
  const chipW = (CHIPS_W - (cols - 1) * CHIP_GAP) / cols
  const numRows = Math.ceil(n / cols)
  const chipSources = layer.children.map(child => visibleItem(child))
  const { fontSize: chipFS, results: chipFits } = fitTextToWidthShared(
    chipSources.map(source => source.display),
    chipW - 16,
    { maxSize: CHIP_FS, minSize: 8, maxLines: MAX_CHIP_LINES },
  )
  const chipLH = Math.round(chipFS * (CHIP_LH / CHIP_FS) * 10) / 10
  const chips = layer.children.map((child, index) => ({
    item: child,
    label: chipSources[index].display,
    lines: chipFits[index].lines,
    truncated: chipFits[index].truncated,
    url: chipSources[index].url,
  }))

  const maxChipLines = chips.reduce((m, chip) => Math.max(m, chip.lines.length), 1)
  const chipH = CHIP_H_BASE + (maxChipLines - 1) * chipLH
  const chipsH = numRows * chipH + (numRows - 1) * CHIP_ROW_GAP
  const layerH = Math.max(
    MIN_LAYER_H,
    PAD_V + Math.max(labelLines.length * LBL_LH, chipsH) + PAD_V,
  )

  return {
    item: layer,
    fill,
    label: visible.display,
    labelLines,
    labelTrunc,
    labelUrl: visible.url,
    cols,
    chipW,
    chipH,
    chipFS,
    chipLH,
    numRows,
    chips,
    layerH,
  }
}

function computeLayer(layer: MdArtItem, layerIndex: number, numLayers: number, theme: MdArtTheme): LayerPrecomp {
  const fill = layerFill(layerIndex, numLayers, theme)
  return layer.children.length === 0
    ? computeNoChildLayer(layer, fill)
    : computeChildLayer(layer, fill)
}

function resolveLayout(spec: MdArtSpec, theme: MdArtTheme): LayeredArchLayout {
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const layers = spec.items.map((layer, index) => computeLayer(layer, index, spec.items.length, theme))
  const layerY: number[] = []
  let y = titleH + TITLE_BOTTOM_GAP
  for (const layer of layers) {
    layerY.push(y)
    y += layer.layerH + GAP
  }
  return { titleH, layers, layerY, h: y + BOTTOM_PAD }
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  return spec.title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(spec.title)}</text>`
    : ''
}

function renderDefs(theme: MdArtTheme): string {
  return `<defs><marker id="la-arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${theme.textMuted}"/></marker></defs>`
}

function renderBand(layer: LayerPrecomp, y: number): string {
  return `<rect x="${LAYER_LEFT}" y="${y.toFixed(1)}" width="${W - LAYER_LEFT - LAYER_RIGHT}" height="${layer.layerH}" rx="8" fill="${layer.fill}22" stroke="${layer.fill}66" stroke-width="1.2">${itemTitleTag(layer.item)}</rect>`
}

function renderLayerLabel(layer: LayerPrecomp, y: number, theme: MdArtTheme): string {
  const labelH = layer.labelLines.length * LBL_LH
  const startY = y + (layer.layerH - labelH) / 2 + LBL_FS * 0.75
  const tip = layer.labelTrunc ? `<title>${escapeXml(layer.label)}</title>` : ''
  const spans = layer.labelLines
    .map((line, index) => `<tspan x="24" dy="${index === 0 ? 0 : LBL_LH}">${escapeXml(line)}</tspan>`)
    .join('')
  return aWrap(
    `<text x="24" y="${startY.toFixed(1)}" font-size="${LBL_FS}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${tip}${spans}</text>`,
    layer.labelUrl,
  )
}

function renderDivider(layer: LayerPrecomp, y: number): string {
  if (layer.chips.length === 0) return ''
  return `<line x1="${DIVIDER_X}" y1="${(y + 10).toFixed(1)}" x2="${DIVIDER_X}" y2="${(y + layer.layerH - 10).toFixed(1)}" stroke="${layer.fill}55" stroke-width="1"/>`
}

function renderChip(layer: LayerPrecomp, chip: ChipPrecomp, chipIndex: number, chipsStartY: number, theme: MdArtTheme): string {
  const col = chipIndex % layer.cols
  const row = Math.floor(chipIndex / layer.cols)
  const chipX = CHIPS_X + col * (layer.chipW + CHIP_GAP)
  const chipTop = chipsStartY + row * (layer.chipH + CHIP_ROW_GAP)
  const textY = chipTop + (layer.chipH - layer.chipLH * chip.lines.length) / 2 + layer.chipLH - 2
  const textCX = (chipX + layer.chipW / 2).toFixed(1)
  const tip = chip.truncated ? `<title>${escapeXml(chip.label)}</title>` : ''
  const spans = chip.lines
    .map((line, index) => `<tspan x="${textCX}" dy="${index === 0 ? 0 : layer.chipLH}">${escapeXml(line)}</tspan>`)
    .join('')
  return [
    `<rect x="${chipX.toFixed(1)}" y="${chipTop.toFixed(1)}" width="${layer.chipW.toFixed(1)}" height="${layer.chipH.toFixed(1)}" rx="5" fill="${theme.surface}" stroke="${layer.fill}66" stroke-width="1">${itemTitleTag(chip.item)}</rect>`,
    aWrap(`<text x="${textCX}" y="${textY.toFixed(1)}" text-anchor="middle" font-size="${layer.chipFS}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tip}${spans}</text>`, chip.url),
  ].join('')
}

function renderChips(layer: LayerPrecomp, y: number, theme: MdArtTheme): string {
  if (layer.chips.length === 0) return ''
  const chipsH = layer.numRows * layer.chipH + (layer.numRows - 1) * CHIP_ROW_GAP
  const chipsStartY = y + (layer.layerH - chipsH) / 2
  return layer.chips
    .map((chip, index) => renderChip(layer, chip, index, chipsStartY, theme))
    .join('')
}

function renderArrowToNext(layer: LayerPrecomp, y: number, index: number, layerCount: number, theme: MdArtTheme): string {
  if (index >= layerCount - 1) return ''
  const ax = W / 2
  const ay1 = y + layer.layerH
  return `<line x1="${ax}" y1="${ay1.toFixed(1)}" x2="${ax}" y2="${(ay1 + GAP).toFixed(1)}" stroke="${theme.textMuted}" stroke-width="1.5" marker-end="url(#la-arr)"/>`
}

function renderLayer(layer: LayerPrecomp, y: number, index: number, layerCount: number, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const unit = [
    renderBand(layer, y),
    renderLayerLabel(layer, y, theme),
    renderDivider(layer, y),
    renderChips(layer, y, theme),
    renderArrowToNext(layer, y, index, layerCount, theme),
  ].join('')
  return wrapItem(unit, index, animate, instrument)
}

function renderSvg(layout: LayeredArchLayout, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${layout.h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const layers = spec.items
  if (layers.length === 0) return renderEmpty(theme)

  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layout = resolveLayout(spec, theme)
  const parts = [
    renderTitle(spec, theme),
    renderDefs(theme),
    ...layout.layers.map((layer, index) =>
      renderLayer(layer, layout.layerY[index], index, layout.layers.length, theme, animate, instrument),
    ),
  ]

  if (animate) parts.unshift(seqSpotlightCSS(layers.length, spec, { scale: false }))
  return renderSvg(layout, theme, parts)
}
