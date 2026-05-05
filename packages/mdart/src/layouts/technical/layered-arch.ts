import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, lerpColor, renderEmpty, aWrap } from '../shared'

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
const CHIPS_W       = W - LAYER_RIGHT - CHIPS_X   // 444 px of chip area

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
      wrapLabel(layer.label, LABEL_FULL_MAX, MAX_LABEL_LINES)
    const layerH = Math.max(MIN_LAYER_H, PAD_V + labelLines.length * LBL_LH + PAD_V)
    return { fill, labelLines, labelTrunc, labelUrl, hasChildren: false,
             cols: 0, chipW: 0, chipH: 0, numRows: 0, chips: [], layerH }
  }

  // ── With children: label in left column, chips on right ───────────────────
  const { lines: labelLines, truncated: labelTrunc, url: labelUrl } =
    wrapLabel(layer.label, LABEL_MAX, MAX_LABEL_LINES)

  // Determine how many chips fit per row
  const n       = layer.children.length
  const maxFit  = Math.floor((CHIPS_W + CHIP_GAP) / (TARGET_MIN_CHIP + CHIP_GAP))
  const cols    = Math.min(n, MAX_COLS, Math.max(1, maxFit))
  const chipW   = (CHIPS_W - (cols - 1) * CHIP_GAP) / cols
  const maxChars = Math.max(4, Math.floor((chipW - 16) / CHAR_PX))
  const numRows  = Math.ceil(n / cols)

  const chips: ChipPrecomp[] = layer.children.map(child => {
    const { lines, truncated, url } = wrapLabel(child.label, maxChars, MAX_CHIP_LINES)
    return { label: child.label, lines, truncated, url }
  })

  // All chips in this layer share the same height (tallest line count wins)
  const maxChipLines = chips.reduce((m, c) => Math.max(m, c.lines.length), 1)
  const chipH  = CHIP_H_BASE + (maxChipLines - 1) * CHIP_LH
  const chipsH = numRows * chipH + (numRows - 1) * CHIP_ROW_GAP

  const layerH = Math.max(
    MIN_LAYER_H,
    PAD_V + Math.max(labelLines.length * LBL_LH, chipsH) + PAD_V,
  )

  return { fill, labelLines, labelTrunc, labelUrl, hasChildren: true,
           cols, chipW, chipH, numRows, chips, layerH }
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

  if (spec.title) {
    parts.push(`<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(spec.title)}</text>`)
  }
  parts.push(`<defs><marker id="la-arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${theme.muted}"/></marker></defs>`)

  precomps.forEach((lc, i) => {
    const y = layerY[i]
    const { fill, labelLines, labelTrunc, labelUrl,
            hasChildren, cols, chipW, chipH, numRows, chips, layerH } = lc

    // Band background
    parts.push(`<rect x="${LAYER_LEFT}" y="${y.toFixed(1)}" width="${W - LAYER_LEFT - LAYER_RIGHT}" height="${layerH}" rx="8" fill="${fill}22" stroke="${fill}66" stroke-width="1.2"/>`)

    // ── Layer label (vertically centred in band) ─────────────────────────────
    const labelH    = labelLines.length * LBL_LH
    const lblStartY = y + (layerH - labelH) / 2 + LBL_FS * 0.75
    const lblTip    = labelTrunc ? `<title>${escapeXml(layers[i].label)}</title>` : ''
    const lblSpans  = labelLines
      .map((line, li) => `<tspan x="24" dy="${li === 0 ? 0 : LBL_LH}">${escapeXml(line)}</tspan>`)
      .join('')
    parts.push(aWrap(
      `<text x="24" y="${lblStartY.toFixed(1)}" font-size="${LBL_FS}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${lblTip}${lblSpans}</text>`,
      labelUrl,
    ))

    if (!hasChildren) {
      if (i < layers.length - 1) {
        const ax = W / 2, ay1 = y + layerH
        parts.push(`<line x1="${ax}" y1="${ay1.toFixed(1)}" x2="${ax}" y2="${(ay1 + GAP).toFixed(1)}" stroke="${theme.muted}" stroke-width="1.5" marker-end="url(#la-arr)"/>`)
      }
      return
    }

    // ── Divider ───────────────────────────────────────────────────────────────
    parts.push(`<line x1="${DIVIDER_X}" y1="${(y + 10).toFixed(1)}" x2="${DIVIDER_X}" y2="${(y + layerH - 10).toFixed(1)}" stroke="${fill}55" stroke-width="1"/>`)

    // ── Chips in a grid, block centred vertically ─────────────────────────────
    const chipsH     = numRows * chipH + (numRows - 1) * CHIP_ROW_GAP
    const chipsStartY = y + (layerH - chipsH) / 2

    chips.forEach((chip, ci) => {
      const col     = ci % cols
      const row     = Math.floor(ci / cols)
      const chipX   = CHIPS_X + col * (chipW + CHIP_GAP)
      const chipTop = chipsStartY + row * (chipH + CHIP_ROW_GAP)

      // Baseline of first line: centre text block inside chip
      const textY  = chipTop + (chipH - CHIP_LH * chip.lines.length) / 2 + CHIP_LH - 2
      const textCX = (chipX + chipW / 2).toFixed(1)
      const chipTip   = chip.truncated ? `<title>${escapeXml(chip.label)}</title>` : ''
      const chipSpans = chip.lines
        .map((line, idx) => `<tspan x="${textCX}" dy="${idx === 0 ? 0 : CHIP_LH}">${escapeXml(line)}</tspan>`)
        .join('')

      parts.push(`<rect x="${chipX.toFixed(1)}" y="${chipTop.toFixed(1)}" width="${chipW.toFixed(1)}" height="${chipH.toFixed(1)}" rx="5" fill="${theme.surface}" stroke="${fill}66" stroke-width="1"/>`)
      parts.push(aWrap(
        `<text x="${textCX}" y="${textY.toFixed(1)}" text-anchor="middle" font-size="${CHIP_FS}" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${chipTip}${chipSpans}</text>`,
        chip.url,
      ))
    })

    // Arrow to next layer
    if (i < layers.length - 1) {
      const ax = W / 2, ay1 = y + layerH
      parts.push(`<line x1="${ax}" y1="${ay1.toFixed(1)}" x2="${ax}" y2="${(ay1 + GAP).toFixed(1)}" stroke="${theme.muted}" stroke-width="1.5" marker-end="url(#la-arr)"/>`)
    }
  })

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${parts.join('\n  ')}
</svg>`
}
