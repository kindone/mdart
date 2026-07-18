import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, renderEmpty, itemTitleTag, ellipsisIfDropped, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

// ── Layout constants ─────────────────────────────────────────────────────────

const W      = 460
const LINE_X = 36

const LBL_FS = 12, LBL_LH = 15
const PAD_T  = 8
const PAD_B  = 8
const MIN_ROW_H = 40

// Label area: from diamond edge to where status tag starts (approx 90px from right)
const textX    = LINE_X + 22
const TAG_W    = 80   // reserved for status tag on the right
const LABEL_MAX = Math.max(12, Math.floor((W - textX - TAG_W - 8) / 6.0))  // ~42

// ── Per-row layout ────────────────────────────────────────────────────────────

interface RowLayout {
  lblLines: string[]
  lblTrunc: boolean
  lblUrl:   string | null
  rowH:     number
}

function computeRow(item: MdArtSpec['items'][number]): RowLayout {
  // Status tag uses value or attrs; other attrs would drop silently.
  const labelStr = ellipsisIfDropped(item.label, item, { value: !!item.value, attrs: true })
  const { lines: lblLines, truncated: lblTrunc, url: lblUrl } = wrapLabel(labelStr, LABEL_MAX, 5)
  const rowH = Math.max(MIN_ROW_H, PAD_T + lblLines.length * LBL_LH + PAD_B)
  return { lblLines, lblTrunc, lblUrl, rowH }
}

// ── Renderer ─────────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const TITLE_H = spec.title ? 30 : 8
  const rows    = items.map(computeRow)

  const rowY: number[] = []
  let cumY = TITLE_H + 12
  for (const r of rows) {
    rowY.push(cumY)
    cumY += r.rowH
  }
  const H = cumY + 8

  function svgWrap(W: number, H: number, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
    const titleEl = title
      ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
      : ''
    return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
  }

  const parts: string[] = []
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()

  // Spine line
  const spineY1 = TITLE_H + 12 + rows[0].rowH / 2
  const lastCy  = rowY[items.length - 1] + rows[items.length - 1].rowH / 2
  parts.push(wrapItem(`<line x1="${LINE_X}" y1="${spineY1.toFixed(1)}" x2="${LINE_X}" y2="${lastCy.toFixed(1)}" stroke="${theme.border}" stroke-width="2"/>`, 0, animate, instrument))

  items.forEach((item, i) => {
    const cy      = rowY[i] + rows[i].rowH / 2
    const { lblLines, lblTrunc, lblUrl, rowH } = rows[i]
    const done    = item.attrs.includes('done') || item.attrs.includes('complete')
    const active  = item.attrs.includes('active') || item.attrs.includes('current') || item.attrs.includes('now')
    const upcoming = !done && !active

    const s      = active ? 10 : 8
    const fill   = done || active ? theme.accent : theme.surface
    const stroke = done || active ? theme.accent : theme.border
    const sw     = active ? 2.5 : 1.5
    const unit: string[] = []

    unit.push(`<rect x="${(LINE_X - s).toFixed(1)}" y="${(cy - s).toFixed(1)}" width="${(s * 2).toFixed(1)}" height="${(s * 2).toFixed(1)}" rx="2" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" transform="rotate(45 ${LINE_X} ${cy})">${itemTitleTag(item)}</rect>`)
    if (done) {
      unit.push(`<text x="${LINE_X}" y="${(cy + 4).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.bg}" ${FONT_SANS_ATTR} font-weight="700">✓</text>`)
    }

    const labelColor = upcoming ? theme.textMuted : theme.text
    const fw         = active ? '600' : '400'

    // Label — vertically centred, up to 2 lines
    const lblStartY = rowY[i] + (rowH - lblLines.length * LBL_LH) / 2 + LBL_FS * 0.75
    const lblTip    = lblTrunc ? `<title>${escapeXml(item.label)}</title>` : ''
    const lblSpans  = lblLines
      .map((l, li) => `<tspan x="${textX}" dy="${li === 0 ? 0 : LBL_LH}">${escapeXml(l)}</tspan>`)
      .join('')
    unit.push(aWrap(`<text x="${textX}" y="${lblStartY.toFixed(1)}" font-size="${LBL_FS}" fill="${labelColor}" ${FONT_SANS_ATTR} font-weight="${fw}">${lblTip}${lblSpans}</text>`, lblUrl))

    // Status tag on the right
    const tag    = done ? 'Done' : active ? 'In Progress' : (item.value ?? 'Upcoming')
    const tagCol = done ? theme.accent : active ? '#fbbf24' : theme.textMuted
    const tagTip = tag.length > 16 ? `<title>${escapeXml(tag)}</title>` : ''
    unit.push(`<text x="${W - 10}" y="${(cy + 4).toFixed(1)}" text-anchor="end" font-size="9" fill="${tagCol}" ${FONT_SANS_ATTR}>${tagTip}${escapeXml(tag.slice(0, 16))}</text>`)
    parts.push(wrapItem(unit.join(''), i + 1, animate, instrument))
  })

  if (animate) parts.unshift(seqSpotlightCSS(items.length + 1, spec, { scale: false }))
  return svgWrap(W, H, theme, spec.title, parts)
}
