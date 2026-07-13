import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, lerpColor, renderEmpty, getCaption, itemTitleTag, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument } from '../shared'

// ── Layout constants ─────────────────────────────────────────────────────────

const W       = 500
const LEFT    = 28          // circle centre x
const R       = 16          // circle radius
const textX   = LEFT + R + 10   // 54
const PAD_T   = 8           // above text block
const PAD_B   = 8           // below text block
const LBL_FS  = 12, LBL_LH = 15
const CAP_FS  = 10, CAP_LH = 13
const SEC_G   = 4            // gap between label block and caption block
const MIN_H   = 38           // minimum row height
const rightM  = 16

const LABEL_MAX = Math.max(12, Math.floor((W - textX - rightM) / 6.5))  // ~67
const CAP_MAX   = Math.max(12, Math.floor((W - textX - rightM) / 5.2))  // ~84

// ── Per-row layout ────────────────────────────────────────────────────────────

interface RowLayout {
  lblLines: string[]
  lblTrunc: boolean
  lblUrl:   string | null
  capLines: string[]
  capTrunc: boolean
  caption:  string | null
  blockH:   number
  rowH:     number
}

function computeRowLayout(item: MdArtSpec['items'][number]): RowLayout {
  const { lines: lblLines, truncated: lblTrunc, url: lblUrl } = wrapLabel(item.label, LABEL_MAX, 5)
  const caption = getCaption(item)
  const { lines: capLines, truncated: capTrunc } = caption
    ? wrapLabel(caption, CAP_MAX, 5)
    : { lines: [], truncated: false }

  const blockH = lblLines.length * LBL_LH
    + (capLines.length > 0 ? SEC_G + capLines.length * CAP_LH : 0)
  const rowH   = Math.max(MIN_H, PAD_T + blockH + PAD_B)

  return { lblLines, lblTrunc, lblUrl, capLines, capTrunc, caption, blockH, rowH }
}

// ── Renderer ─────────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const titleH  = spec.title ? 30 : 8
  const layouts = items.map(computeRowLayout)

  // Cumulative Y positions
  const rowY: number[] = []
  let cumY = titleH
  for (const l of layouts) {
    rowY.push(cumY)
    cumY += l.rowH
  }
  const H = cumY + 8

  const n = items.length
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts: string[] = []
  if (spec.title) {
    parts.push(`<text x="${W / 2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`)
  }

  // Connecting dashed line from first to last circle centre (always visible)
  if (n > 1) {
    const firstCy = rowY[0] + layouts[0].rowH / 2
    const lastCy  = rowY[n - 1] + layouts[n - 1].rowH / 2
    parts.push(`<line x1="${LEFT}" y1="${firstCy.toFixed(1)}" x2="${LEFT}" y2="${lastCy.toFixed(1)}" stroke="${theme.border}" stroke-width="2" stroke-dasharray="4,4"/>`)
  }

  items.forEach((item, i) => {
    const y      = rowY[i]
    const { lblLines, lblTrunc, lblUrl, capLines, capTrunc, caption, blockH, rowH } = layouts[i]
    const t      = n > 1 ? i / (n - 1) : 0
    const fill   = lerpColor(theme.primary, theme.secondary, t)
    const cy     = y + rowH / 2

    const lblStartY = y + (rowH - blockH) / 2 + LBL_FS * 0.75
    const lblTip   = lblTrunc ? `<title>${escapeXml(item.label)}</title>` : ''
    const lblSpans = lblLines
      .map((l, li) => `<tspan x="${textX}" dy="${li === 0 ? 0 : LBL_LH}">${escapeXml(l)}</tspan>`)
      .join('')

    let nodeStr = ''
    nodeStr += `<circle cx="${LEFT}" cy="${cy.toFixed(1)}" r="${R}" fill="${fill}">${itemTitleTag(item)}</circle>`
    nodeStr += `<text x="${LEFT}" y="${(cy + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="#fff" font-family="system-ui,sans-serif" font-weight="700">${i + 1}</text>`
    nodeStr += aWrap(`<text x="${textX}" y="${lblStartY.toFixed(1)}" font-size="${LBL_FS}" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${lblTip}${lblSpans}</text>`, lblUrl)
    if (capLines.length > 0) {
      const capStartY = lblStartY + lblLines.length * LBL_LH + SEC_G
      const capTip    = capTrunc ? `<title>${escapeXml(caption!)}</title>` : ''
      const capSpans  = capLines
        .map((l, li) => `<tspan x="${textX}" dy="${li === 0 ? 0 : CAP_LH}">${escapeXml(l)}</tspan>`)
        .join('')
      nodeStr += `<text x="${textX}" y="${capStartY.toFixed(1)}" font-size="${CAP_FS}" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${capTip}${capSpans}</text>`
    }
    parts.push(wrapItem(nodeStr, i, animate, instrument))
  })

  if (animate) parts.unshift(seqSpotlightCSS(n, spec))
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}
