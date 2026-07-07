import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, lerpColor, renderEmpty, aWrap, itemTitleTag, ellipsisIfDropped, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared } from '../shared'

// ── Layout constants ──────────────────────────────────────────────────────────

const W             = 600
const LAYER_LEFT    = 8
const LAYER_RIGHT   = 16
const GAP           = 8      // vertical gap between layer bands
const PAD_V         = 10     // top/bottom padding inside each band
const MIN_LAYER_H   = 44

const TITLE_COL     = 120    // right edge of left label column
const DIVIDER_X     = 128
const CHIPS_X       = 140    // chips start here
const CHIP_PAD_R    = 10     // gap between rightmost chip and band right edge
const CHIPS_W       = W - LAYER_RIGHT - CHIPS_X - CHIP_PAD_R   // 434 px of chip area

const CHIP_GAP      = 8      // horizontal gap between chips in a row
const CHIP_ROW_GAP  = 7      // vertical gap between chip rows
const CHIP_H_BASE   = 28     // chip height when text fits on one line
const CHIP_LH       = 13     // chip text line-height
const CHIP_FS       = 11

const LBL_LH        = 13     // layer-name line-height
const LBL_FS        = 12
const CHAR_PX       = 6.5    // avg px / char at 11–12 px font

// Character budgets
const LABEL_MAX      = Math.max(6,  Math.floor((TITLE_COL - 28) / CHAR_PX))   // ~14
const LABEL_FULL_MAX = Math.max(24, Math.floor((W - LAYER_LEFT - LAYER_RIGHT - 32) / CHAR_PX)) // ~83

const MAX_LABEL_LINES = 5
const MAX_CHIP_LINES  = 3

// Column count: target ≥ 70 px per chip, never more than 6 per row
const MAX_COLS        = 6
const TARGET_MIN_CHIP = 70   // px

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChipPrecomp {
  label:     string
  lines:     string[]
  truncated: boolean
  url:       string | null
}

interface LayerPrecomp {
  fill:        string
  labelLines:  string[]
  labelTrunc:  boolean
  labelUrl:    string | null
  hasChildren: boolean
  // uniform chip dimensions for this layer
  cols:        number
  chipW:       number
  chipH:       number   // same for every chip in this layer (tallest needed)
  chipFS:      number   // font size shared by every chip in this layer
  chipLH:      number   // line-height at chipFS (keeps CHIP_LH:CHIP_FS ratio)
  numRows:     number
  chips:       ChipPrecomp[]
  layerH:      number
}

// ── Pre-computation ───────────────────────────────────────────────────────────

function computeLayer(
  layer:      MdArtSpec['items'][number],
  layerIndex: number,
  numLayers:  number,
  theme:      MdArtTheme,
): LayerPrecomp {
  const t    = layerIndex / Math.max(numLayers - 1, 1)
  const fill = lerpColor(theme.primary, theme.secondary, t)
  const hasChildren = layer.children.length > 0

  // ── No-children: label spans full width ───────────────────────────────────
  if (!hasChildren) {
    const { lines: labelLines, truncated: labelTrunc, url: labelUrl } =
      wrapLabel(ellipsisIfDropped(layer.label, layer), LABEL_FULL_MAX, MAX_LABEL_LINES)
    const layerH = Math.max(MIN_LAYER_H, PAD_V + labelLines.length * LBL_LH + PAD_V)
    return { fill, labelLines, labelTrunc, labelUrl, hasChildren: false,
             cols: 0, chipW: 0, chipH: 0, chipFS: CHIP_FS, chipLH: CHIP_LH, numRows: 0, chips: [], layerH }
  }

  // ── With children: label in left column, chips on right ───────────────────
  const { lines: labelLines, truncated: labelTrunc, url: labelUrl } =
    wrapLabel(ellipsisIfDropped(layer.label, layer), LABEL_MAX, MAX_LABEL_LINES)

  // Determine how many chips fit per row
  const n       = layer.children.length
  const maxFit  = Math.floor((CHIPS_W + CHIP_GAP) / (TARGET_MIN_CHIP + CHIP_GAP))
  const cols    = Math.min(n, MAX_COLS, Math.max(1, maxFit))
  const chipW   = (CHIPS_W - (cols - 1) * CHIP_GAP) / cols
  const numRows  = Math.ceil(n / cols)

  // One shared font size for every chip in this layer (not per-chip), sized
  // to whichever child label is worst-fitting at this layer's chipW — a
  // layer with one long child and several short ones used to force every
  // chip to the same fixed 11px and let the long one wrap to 3 lines or
  // truncate, while the short ones sat mostly empty at that same size.
  const { fontSize: chipFS, results: chipFits } = fitTextToWidthShared(
    layer.children.map(c => c.label),
    chipW - 16,
    { maxSize: CHIP_FS, minSize: 8, maxLines: MAX_CHIP_LINES },
  )
  const chipLH = Math.round(chipFS * (CHIP_LH / CHIP_FS) * 10) / 10

  const chips: ChipPrecomp[] = layer.children.map((child, ci) => {
    const { lines, truncated, url } = chipFits[ci]
    return { label: child.label, lines, truncated, url }
  })

  // All chips in this layer share the same height (tallest line count wins)
  const maxChipLines = chips.reduce((m, c) => Math.max(m, c.lines.length), 1)
  const chipH  = CHIP_H_BASE + (maxChipLines - 1) * chipLH
  const chipsH = numRows * chipH + (numRows - 1) * CHIP_ROW_GAP

  const layerH = Math.max(
    MIN_LAYER_H,
    PAD_V + Math.max(labelLines.length * LBL_LH, chipsH) + PAD_V,
  )

  return { fill, labelLines, labelTrunc, labelUrl, hasChildren: true,
           cols, chipW, chipH, chipFS, chipLH, numRows, chips, layerH }
}

// ── Renderer ─────────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const layers = spec.items
  if (layers.length === 0) return renderEmpty(theme)

  const TITLE_H = spec.title ? 30 : 8

  // Pre-compute every layer (so cumulative Y can be calculated before rendering)
  const precomps = layers.map((layer, i) =>
    computeLayer(layer, i, layers.length, theme),
  )

  const layerY: number[] = []
  let cumY = TITLE_H + 8
  for (const lc of precomps) { layerY.push(cumY); cumY += lc.layerH + GAP }
  const H = cumY + 8

  const parts: string[] = []
  const animate = shouldAnimate(spec)

  if (spec.title) {
    parts.push(`<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(spec.title)}</text>`)
  }
  parts.push(`<defs><marker id="la-arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${theme.textMuted}"/></marker></defs>`)

  precomps.forEach((lc, i) => {
    const y = layerY[i]
    const { fill, labelLines, labelTrunc, labelUrl,
            hasChildren, cols, chipW, chipH, chipFS, chipLH, numRows, chips, layerH } = lc
    const unit: string[] = []

    // Band background — tooltip carries full layer item summary
    unit.push(`<rect x="${LAYER_LEFT}" y="${y.toFixed(1)}" width="${W - LAYER_LEFT - LAYER_RIGHT}" height="${layerH}" rx="8" fill="${fill}22" stroke="${fill}66" stroke-width="1.2">${itemTitleTag(layers[i])}</rect>`)

    // ── Layer label (vertically centred in band) ─────────────────────────────
    const labelH    = labelLines.length * LBL_LH
    const lblStartY = y + (layerH - labelH) / 2 + LBL_FS * 0.75
    const lblTip    = labelTrunc ? `<title>${escapeXml(layers[i].label)}</title>` : ''
    const lblSpans  = labelLines
      .map((line, li) => `<tspan x="24" dy="${li === 0 ? 0 : LBL_LH}">${escapeXml(line)}</tspan>`)
      .join('')
    unit.push(aWrap(
      `<text x="24" y="${lblStartY.toFixed(1)}" font-size="${LBL_FS}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${lblTip}${lblSpans}</text>`,
      labelUrl,
    ))

    if (!hasChildren) {
      if (i < layers.length - 1) {
        const ax = W / 2, ay1 = y + layerH
        unit.push(`<line x1="${ax}" y1="${ay1.toFixed(1)}" x2="${ax}" y2="${(ay1 + GAP).toFixed(1)}" stroke="${theme.textMuted}" stroke-width="1.5" marker-end="url(#la-arr)"/>`)
      }
      parts.push(animate ? `<g class="mdart-n${i}">${unit.join('')}</g>` : unit.join(''))
      return
    }

    // ── Divider ───────────────────────────────────────────────────────────────
    unit.push(`<line x1="${DIVIDER_X}" y1="${(y + 10).toFixed(1)}" x2="${DIVIDER_X}" y2="${(y + layerH - 10).toFixed(1)}" stroke="${fill}55" stroke-width="1"/>`)

    // ── Chips in a grid, block centred vertically ─────────────────────────────
    const chipsH     = numRows * chipH + (numRows - 1) * CHIP_ROW_GAP
    const chipsStartY = y + (layerH - chipsH) / 2

    chips.forEach((chip, ci) => {
      const col     = ci % cols
      const row     = Math.floor(ci / cols)
      const chipX   = CHIPS_X + col * (chipW + CHIP_GAP)
      const chipTop = chipsStartY + row * (chipH + CHIP_ROW_GAP)

      // Baseline of first line: centre text block inside chip
      const textY  = chipTop + (chipH - chipLH * chip.lines.length) / 2 + chipLH - 2
      const textCX = (chipX + chipW / 2).toFixed(1)
      const chipTip   = chip.truncated ? `<title>${escapeXml(chip.label)}</title>` : ''
      const chipSpans = chip.lines
        .map((line, idx) => `<tspan x="${textCX}" dy="${idx === 0 ? 0 : chipLH}">${escapeXml(line)}</tspan>`)
        .join('')

      unit.push(`<rect x="${chipX.toFixed(1)}" y="${chipTop.toFixed(1)}" width="${chipW.toFixed(1)}" height="${chipH.toFixed(1)}" rx="5" fill="${theme.surface}" stroke="${fill}66" stroke-width="1"/>`)
      unit.push(aWrap(
        `<text x="${textCX}" y="${textY.toFixed(1)}" text-anchor="middle" font-size="${chipFS}" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${chipTip}${chipSpans}</text>`,
        chip.url,
      ))
    })

    // Arrow to next layer
    if (i < layers.length - 1) {
      const ax = W / 2, ay1 = y + layerH
      unit.push(`<line x1="${ax}" y1="${ay1.toFixed(1)}" x2="${ax}" y2="${(ay1 + GAP).toFixed(1)}" stroke="${theme.textMuted}" stroke-width="1.5" marker-end="url(#la-arr)"/>`)
    }
    parts.push(animate ? `<g class="mdart-n${i}">${unit.join('')}</g>` : unit.join(''))
  })

  if (animate) parts.unshift(seqSpotlightCSS(layers.length, spec, { scale: false }))
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${parts.join('\n  ')}
</svg>`
}
