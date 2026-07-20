import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, lerpColor, renderEmpty, itemTitleTag, FONT_SANS_ATTR } from '../shared'

const W = 500

const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 8
const TITLE_FS = 13
const TITLE_Y = 22

const TAB_H = 28
const TAB_GAP = 2
const TAB_PAD_X = 4
const TAB_MAX_W = 160
const TAB_LABEL_FS = 10

const PANEL_MIN_H = 90
const PANEL_PAD_T = 22
const PANEL_PAD_B = 14
const PANEL_HPAD = 20
const PANEL_BOTTOM_PAD = 8
const SEC_G = 8

const PANEL_TITLE_FS = 13
const PANEL_TITLE_LH = 16
const VALUE_FS = 10
const VALUE_LH = 13
const CHILD_FS = 10
const CHILD_LH = 13
const SUB_FS = 9
const SUB_LH = 12

interface PanelLayout {
  titleLines: string[]
  titleUrl: string | null
  valLines: string[]
  childLines: string[]
  subLines: string[]
  contentH: number
}

interface TabLayout {
  n: number
  tabW: number
  titleH: number
  panelY: number
  contentH: number
  height: number
  panels: PanelLayout[]
}

function titleHeight(spec: MdArtSpec): number {
  return spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
}

function computePanel(item: MdArtItem): PanelLayout {
  const innerW = W - PANEL_HPAD * 2
  const titleMax = Math.max(10, Math.floor(innerW / 6.0))
  const valueMax = Math.max(16, Math.floor(innerW / 5.0))
  const childMax = Math.max(20, Math.floor(innerW / 4.5))
  const subMax = Math.max(24, Math.floor(innerW / 4.2))

  const { lines: titleLines, url: titleUrl } = wrapLabel(item.label, titleMax, 5)
  const { lines: valLines } = item.value ? wrapLabel(item.value, valueMax, 5) : { lines: [] }
  const childRow = item.children.map(c => c.label).join('  ·  ')
  const { lines: childLines } = childRow ? wrapLabel(childRow, childMax, 5) : { lines: [] }
  const subRow = item.children.flatMap(c => c.children).map(c => c.label).join('  ·  ')
  const { lines: subLines } = subRow ? wrapLabel(subRow, subMax, 5) : { lines: [] }

  let h = titleLines.length * PANEL_TITLE_LH
  if (valLines.length > 0) h += SEC_G + valLines.length * VALUE_LH
  if (childLines.length > 0) h += SEC_G + childLines.length * CHILD_LH
  if (subLines.length > 0) h += SEC_G + subLines.length * SUB_LH

  return {
    titleLines,
    titleUrl,
    valLines,
    childLines,
    subLines,
    contentH: PANEL_PAD_T + h + PANEL_PAD_B,
  }
}

function resolveLayout(spec: MdArtSpec): TabLayout {
  const n = spec.items.length
  const titleH = titleHeight(spec)
  const panels = spec.items.map(computePanel)
  const contentH = Math.max(PANEL_MIN_H, ...panels.map(p => p.contentH))

  return {
    n,
    tabW: Math.min(TAB_MAX_W, (W - TAB_PAD_X * 2) / n),
    titleH,
    panelY: titleH + TAB_H,
    contentH,
    height: titleH + TAB_H + contentH + PANEL_BOTTOM_PAD,
    panels,
  }
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  if (!spec.title) return ''
  return `<text x="${W / 2}" y="${TITLE_Y}" text-anchor="middle" font-size="${TITLE_FS}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(spec.title)}</text>`
}

function renderTextLines(lines: string[], x: number, y: number, lineH: number, fontSize: number, fill: string, weight = '400', opacity?: string): string {
  const spans = lines.map((line, li) => `<tspan x="${x}" dy="${li === 0 ? 0 : lineH}">${escapeXml(line)}</tspan>`).join('')
  const opacityAttr = opacity ? ` opacity="${opacity}"` : ''
  return `<text x="${x}" y="${y}" text-anchor="middle" font-size="${fontSize}" fill="${fill}" ${FONT_SANS_ATTR} font-weight="${weight}"${opacityAttr}>${spans}</text>`
}

function renderTab(item: MdArtItem, index: number, layout: TabLayout, theme: MdArtTheme): string {
  const tx = TAB_PAD_X + index * (layout.tabW + TAB_GAP)
  const ty = layout.titleH
  const t = layout.n > 1 ? index / (layout.n - 1) : 0
  const fill = lerpColor(theme.primary, theme.secondary, t)
  const isActive = index === 0
  const tabLabelMax = Math.max(3, Math.floor((layout.tabW - 6) / 5.0))
  const { lines: tabLines } = wrapLabel(item.label, tabLabelMax, 1)

  return `<g class="mdart-tab-hit" data-tab="${index}" data-color="${fill}" style="cursor:pointer">` +
    itemTitleTag(item) +
    `<rect class="mdart-tab-rect" x="${tx}" y="${ty}" width="${layout.tabW}" height="${TAB_H}" rx="5" ` +
    `fill="${isActive ? fill : `${fill}22`}" ` +
    `${isActive ? '' : `stroke="${fill}55" stroke-width="1"`}/>` +
    `<text class="mdart-tab-label" x="${(tx + layout.tabW / 2).toFixed(1)}" y="${(ty + TAB_H / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="${TAB_LABEL_FS}" ` +
    `fill="${isActive ? '#ffffff' : theme.textMuted}" ${FONT_SANS_ATTR} font-weight="${isActive ? '700' : '400'}">${escapeXml(tabLines[0] ?? item.label)}</text>` +
  `</g>`
}

function renderPanelBackground(layout: TabLayout, theme: MdArtTheme): string {
  const activeFill = lerpColor(theme.primary, theme.secondary, 0)
  return `<rect class="mdart-tab-content-bg" x="0" y="${layout.panelY}" width="${W}" height="${layout.contentH}" rx="6" fill="${activeFill}11" stroke="${activeFill}44" stroke-width="1.2"/>`
}

function renderPanelContent(layout: PanelLayout, theme: MdArtTheme, panelY: number): string[] {
  const cx = W / 2
  const parts: string[] = []
  let y = panelY + PANEL_PAD_T

  parts.push(aWrap(renderTextLines(layout.titleLines, cx, y, PANEL_TITLE_LH, PANEL_TITLE_FS, theme.text, '600'), layout.titleUrl))
  y += layout.titleLines.length * PANEL_TITLE_LH

  if (layout.valLines.length > 0) {
    y += SEC_G
    parts.push(renderTextLines(layout.valLines, cx, y, VALUE_LH, VALUE_FS, theme.textMuted))
    y += layout.valLines.length * VALUE_LH
  }

  if (layout.childLines.length > 0) {
    y += SEC_G
    parts.push(renderTextLines(layout.childLines, cx, y, CHILD_LH, CHILD_FS, theme.textMuted))
    y += layout.childLines.length * CHILD_LH
  }

  if (layout.subLines.length > 0) {
    y += SEC_G
    parts.push(renderTextLines(layout.subLines, cx, y, SUB_LH, SUB_FS, theme.textMuted, '400', '0.7'))
  }

  return parts
}

function renderPanel(panel: PanelLayout, index: number, layout: TabLayout, theme: MdArtTheme): string {
  const vis = index === 0 ? 'visible' : 'hidden'
  return `<g class="mdart-tab-panel" data-tab="${index}" visibility="${vis}">
    ${renderPanelContent(panel, theme, layout.panelY).join('\n    ')}
  </g>`
}

function renderTabRoot(spec: MdArtSpec, layout: TabLayout, theme: MdArtTheme): string {
  const tabs = spec.items.map((item, index) => renderTab(item, index, layout, theme))
  const panels = layout.panels.map((panel, index) => renderPanel(panel, index, layout, theme))
  return `<g class="mdart-tab-root" data-text-muted="${escapeXml(theme.textMuted)}">
    ${tabs.join('\n    ')}
    ${renderPanelBackground(layout, theme)}
    ${panels.join('\n    ')}
  </g>`
}

function renderSvg(layout: TabLayout, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${layout.height}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)

  const layout = resolveLayout(spec)
  return renderSvg(layout, theme, [
    renderTitle(spec, theme),
    renderTabRoot(spec, layout, theme),
  ].filter(Boolean))
}
