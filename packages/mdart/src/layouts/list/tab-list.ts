import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, lerpColor, renderEmpty, itemTitleTag, FONT_SANS_ATTR } from '../shared'

// ── Layout constants ─────────────────────────────────────────────────────────

const W = 500

const TITLE_FS = 13, TITLE_LH = 16
const VALUE_FS = 10, VALUE_LH = 13
const CHILD_FS = 10, CHILD_LH = 13
const SUB_FS   = 9,  SUB_LH   = 12

const PANEL_PAD_T = 22   // top padding inside panel before first title baseline
const PANEL_PAD_B = 14   // bottom padding after last content
const SEC_G       = 8    // gap between content sections

// ── Per-panel height computation ──────────────────────────────────────────────

interface PanelLayout {
  titleLines: string[]
  titleUrl:   string | null
  valLines:   string[]
  childLines: string[]
  subLines:   string[]
  contentH:   number
}

function computePanel(item: MdArtItem, W: number): PanelLayout {
  const hPad     = 20
  const innerW   = W - hPad * 2

  const titleMax = Math.max(10, Math.floor(innerW / 6.0))
  const valueMax = Math.max(16, Math.floor(innerW / 5.0))
  const childMax = Math.max(20, Math.floor(innerW / 4.5))
  const subMax   = Math.max(24, Math.floor(innerW / 4.2))

  const { lines: titleLines, url: titleUrl } = wrapLabel(item.label, titleMax, 5)
  const { lines: valLines }   = item.value
    ? wrapLabel(item.value, valueMax, 5)
    : { lines: [] }

  const childRow = item.children.map(c => c.label).join('  ·  ')
  const { lines: childLines } = childRow
    ? wrapLabel(childRow, childMax, 5)
    : { lines: [] }

  const subRow = item.children.flatMap(c => c.children).map(c => c.label).join('  ·  ')
  const { lines: subLines } = subRow
    ? wrapLabel(subRow, subMax, 5)
    : { lines: [] }

  let h = titleLines.length * TITLE_LH
  if (valLines.length > 0)   h += SEC_G + valLines.length * VALUE_LH
  if (childLines.length > 0) h += SEC_G + childLines.length * CHILD_LH
  if (subLines.length > 0)   h += SEC_G + subLines.length * SUB_LH

  return { titleLines, titleUrl, valLines, childLines, subLines, contentH: PANEL_PAD_T + h + PANEL_PAD_B }
}

// ── Panel content parts ───────────────────────────────────────────────────────

function tabPanelParts(
  layout: PanelLayout,
  theme: MdArtTheme,
  panelY: number,
  W: number,
): string[] {
  const cx    = W / 2
  const parts: string[] = []
  let y = panelY + PANEL_PAD_T

  const { titleLines, titleUrl, valLines, childLines, subLines } = layout

  const titleSpans = titleLines
    .map((l, li) => `<tspan x="${cx}" dy="${li === 0 ? 0 : TITLE_LH}">${escapeXml(l)}</tspan>`)
    .join('')
  parts.push(aWrap(`<text x="${cx}" y="${y}" text-anchor="middle" font-size="${TITLE_FS}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${titleSpans}</text>`, titleUrl))
  y += titleLines.length * TITLE_LH

  if (valLines.length > 0) {
    y += SEC_G
    const valSpans = valLines
      .map((l, li) => `<tspan x="${cx}" dy="${li === 0 ? 0 : VALUE_LH}">${escapeXml(l)}</tspan>`)
      .join('')
    parts.push(`<text x="${cx}" y="${y}" text-anchor="middle" font-size="${VALUE_FS}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${valSpans}</text>`)
    y += valLines.length * VALUE_LH
  }

  if (childLines.length > 0) {
    y += SEC_G
    const childSpans = childLines
      .map((l, li) => `<tspan x="${cx}" dy="${li === 0 ? 0 : CHILD_LH}">${escapeXml(l)}</tspan>`)
      .join('')
    parts.push(`<text x="${cx}" y="${y}" text-anchor="middle" font-size="${CHILD_FS}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${childSpans}</text>`)
    y += childLines.length * CHILD_LH
  }

  if (subLines.length > 0) {
    y += SEC_G
    const subSpans = subLines
      .map((l, li) => `<tspan x="${cx}" dy="${li === 0 ? 0 : SUB_LH}">${escapeXml(l)}</tspan>`)
      .join('')
    parts.push(`<text x="${cx}" y="${y}" text-anchor="middle" font-size="${SUB_FS}" fill="${theme.textMuted}" ${FONT_SANS_ATTR} opacity="0.7">${subSpans}</text>`)
  }

  return parts
}

// ── Renderer ─────────────────────────────────────────────────────────────────

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const n       = items.length
  const TAB_H   = 28
  const TAB_W   = Math.min(160, (W - 8) / n)
  const titleH  = spec.title ? 30 : 8

  // Compute per-panel layouts and use max content height as shared panel height
  const panels     = items.map(item => computePanel(item, W))
  const CONTENT_H  = Math.max(90, ...panels.map(p => p.contentH))
  const H          = titleH + TAB_H + CONTENT_H + 8

  const activeFill = lerpColor(theme.primary, theme.secondary, 0)
  const parts: string[] = []

  if (spec.title) {
    parts.push(`<text x="${W / 2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(spec.title)}</text>`)
  }

  parts.push(`<g class="mdart-tab-root" data-text-muted="${escapeXml(theme.textMuted)}">`)

  // Tab buttons
  items.forEach((item, i) => {
    const tx = 4 + i * (TAB_W + 2)
    const ty = titleH
    const t  = items.length > 1 ? i / (items.length - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    const isActive = i === 0
    const tabLabelMax = Math.max(3, Math.floor((TAB_W - 6) / 5.0))
    const { lines: tabLines } = wrapLabel(item.label, tabLabelMax, 1)
    parts.push(
      `<g class="mdart-tab-hit" data-tab="${i}" data-color="${fill}" style="cursor:pointer">` +
        itemTitleTag(item) +
        `<rect class="mdart-tab-rect" x="${tx}" y="${ty}" width="${TAB_W}" height="${TAB_H}" rx="5" ` +
        `fill="${isActive ? fill : `${fill}22`}" ` +
        `${isActive ? '' : `stroke="${fill}55" stroke-width="1"`}/>` +
        `<text class="mdart-tab-label" x="${(tx + TAB_W / 2).toFixed(1)}" y="${(ty + TAB_H / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="10" ` +
        `fill="${isActive ? '#ffffff' : theme.textMuted}" ${FONT_SANS_ATTR} font-weight="${isActive ? '700' : '400'}">${escapeXml(tabLines[0] ?? item.label)}</text>` +
      `</g>`,
    )
  })

  const panelY = titleH + TAB_H
  parts.push(
    `<rect class="mdart-tab-content-bg" x="0" y="${panelY}" width="${W}" height="${CONTENT_H}" rx="6" ` +
    `fill="${activeFill}11" stroke="${activeFill}44" stroke-width="1.2"/>`,
  )

  items.forEach((_item, i) => {
    const vis = i === 0 ? 'visible' : 'hidden'
    parts.push(`<g class="mdart-tab-panel" data-tab="${i}" visibility="${vis}">`)
    parts.push(...tabPanelParts(panels[i], theme, panelY, W))
    parts.push('</g>')
  })

  parts.push('</g>')

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}
