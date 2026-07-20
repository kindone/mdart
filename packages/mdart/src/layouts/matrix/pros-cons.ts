import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, wrapLabel, aWrap, itemTitleTag, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 500
const PAD = 16
const HALF = W / 2
const HEADER_H = 40
const PAD_V = 8
const MIN_ROW_H = 32
const LBL_FS = 11
const LBL_LH = 14
const COL_MAX = Math.max(10, Math.floor((HALF - PAD - 14 - 6) / 5.8))

interface ProsConsGroups {
  pros: MdArtItem[]
  cons: MdArtItem[]
}

interface RowLayout {
  index: number
  y: number
  height: number
  textY: number
}

interface ProsConsLayout {
  titleH: number
  height: number
  baseY: number
  rows: RowLayout[]
  proLayouts: Array<{ lines: string[], truncated: boolean, url: string | null }>
  conLayouts: Array<{ lines: string[], truncated: boolean, url: string | null }>
}

const PROS_HEADERS = new Set(['pros', 'pro', 'advantages', 'advantage', 'benefits', 'benefit', 'for'])
const CONS_HEADERS = new Set(['cons', 'con', 'disadvantages', 'disadvantage', 'risks', 'risk', 'against'])

function parseGroups(spec: MdArtSpec): ProsConsGroups {
  const pros: MdArtItem[] = []
  const cons: MdArtItem[] = []
  let currentSection: 'pros' | 'cons' | null = null

  for (const item of spec.items) {
    const normalized = item.label.toLowerCase().trim().replace(/:$/, '').trim()
    const hasProsAttr = item.attrs.some(attr => attr.toLowerCase() === 'pros')
    const hasConsAttr = item.attrs.some(attr => attr.toLowerCase() === 'cons')
    const isProsHeader = hasProsAttr || PROS_HEADERS.has(normalized)
    const isConsHeader = hasConsAttr || CONS_HEADERS.has(normalized)

    if (isProsHeader) {
      currentSection = 'pros'
      if (item.children.length) {
        pros.push(...item.children)
        currentSection = null
      }
      continue
    }
    if (isConsHeader) {
      currentSection = 'cons'
      if (item.children.length) {
        cons.push(...item.children)
        currentSection = null
      }
      continue
    }
    if (item.prefix === '+') {
      pros.push(item)
    } else if (currentSection === 'pros') {
      pros.push(item)
    } else if (currentSection === 'cons') {
      cons.push(item)
    } else if (item.prefix === '-') {
      cons.push(item)
    }
  }
  return { pros, cons }
}

function resolveLayout(spec: MdArtSpec, groups: ProsConsGroups): ProsConsLayout {
  const maxRows = Math.max(groups.pros.length, groups.cons.length, 1)
  const proLayouts = groups.pros.map(item => wrapLabel(item.label, COL_MAX, 5))
  const conLayouts = groups.cons.map(item => wrapLabel(item.label, COL_MAX, 5))
  const rowHeights: number[] = []
  for (let index = 0; index < maxRows; index++) {
    const proLines = proLayouts[index]?.lines.length ?? 0
    const conLines = conLayouts[index]?.lines.length ?? 0
    rowHeights.push(Math.max(MIN_ROW_H, PAD_V + Math.max(proLines, conLines, 1) * LBL_LH + PAD_V))
  }
  const titleH = spec.title ? 28 : 0
  const baseY = PAD + titleH
  const itemsY = baseY + HEADER_H
  const rows: RowLayout[] = []
  let y = itemsY
  rowHeights.forEach((height, index) => {
    const lines = Math.max(proLayouts[index]?.lines.length ?? 0, conLayouts[index]?.lines.length ?? 0, 1)
    rows.push({
      index,
      y,
      height,
      textY: lines > 1 ? y + PAD_V + LBL_FS * 0.75 : y + height / 2 + 4,
    })
    y += height
  })
  return {
    titleH,
    height: PAD + titleH + HEADER_H + rowHeights.reduce((sum, h) => sum + h, 0) + PAD,
    baseY,
    rows,
    proLayouts,
    conLayouts,
  }
}

function columnText(item: MdArtItem, layout: { lines: string[], truncated: boolean, url: string | null }, startX: number, textX: number, textY: number, color: string, prefix: string): string {
  const tip = itemTitleTag(item) || (layout.truncated ? `<title>${escapeXml(item.label)}</title>` : '')
  const spans = layout.lines
    .map((line, index) => index === 0
      ? `<tspan x="${startX}">${escapeXml(prefix)}</tspan><tspan x="${textX}">${escapeXml(line)}</tspan>`
      : `<tspan x="${textX}" dy="${LBL_LH}">${escapeXml(line)}</tspan>`)
    .join('')
  return aWrap(`<text x="${startX}" y="${textY.toFixed(1)}" font-size="${LBL_FS}" fill="${color}" ${FONT_SANS_ATTR}>${tip}${spans}</text>`, layout.url)
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme): string {
  if (!spec.title) return ''
  return `<text x="${W / 2}" y="${PAD + 16}" text-anchor="middle" font-size="13" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${escapeXml(spec.title)}</text>`
}

function renderHeader(layout: ProsConsLayout, animate: boolean, instrument: boolean): string {
  const content = [
    `<rect x="0" y="${layout.baseY}" width="${HALF}" height="${HEADER_H}" fill="#064e3b" />`,
    `<text x="${HALF / 2}" y="${layout.baseY + 25}" text-anchor="middle" font-size="13" fill="#6ee7b7" ${FONT_SANS_ATTR} font-weight="700">Pros</text>`,
    `<rect x="${HALF}" y="${layout.baseY}" width="${HALF}" height="${HEADER_H}" fill="#4c0519" />`,
    `<text x="${HALF + HALF / 2}" y="${layout.baseY + 25}" text-anchor="middle" font-size="13" fill="#fda4af" ${FONT_SANS_ATTR} font-weight="700">Cons</text>`,
  ].join('')
  return wrapItem(content, 0, animate, instrument)
}

function textColors(theme: MdArtTheme): { pro: string, con: string } {
  const isLight = theme.surface === '#ffffff'
  return {
    pro: isLight ? '#065f46' : '#6ee7b7',
    con: isLight ? '#881337' : '#fda4af',
  }
}

function renderRow(row: RowLayout, groups: ProsConsGroups, layout: ProsConsLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const colors = textColors(theme)
  const rowBg = row.index % 2 === 0 ? theme.surface : theme.bg
  const unit = [
    `<rect x="0" y="${row.y}" width="${HALF}" height="${row.height}" fill="${rowBg}" />`,
    `<rect x="${HALF}" y="${row.y}" width="${HALF}" height="${row.height}" fill="${rowBg}" />`,
  ]
  if (row.index < groups.pros.length) {
    unit.push(columnText(groups.pros[row.index], layout.proLayouts[row.index], PAD, PAD + 14, row.textY, colors.pro, '✓'))
  }
  if (row.index < groups.cons.length) {
    unit.push(columnText(groups.cons[row.index], layout.conLayouts[row.index], HALF + PAD, HALF + PAD + 14, row.textY, colors.con, '✗'))
  }
  if (row.index < layout.rows.length - 1) {
    unit.push(`<line x1="0" y1="${row.y + row.height}" x2="${W}" y2="${row.y + row.height}" stroke="${theme.border}" stroke-width="0.5" />`)
  }
  return wrapItem(unit.join(''), row.index + 1, animate, instrument)
}

function renderDivider(layout: ProsConsLayout, theme: MdArtTheme): string {
  return `<line x1="${HALF}" y1="${layout.baseY}" x2="${HALF}" y2="${layout.height}" stroke="${theme.bg}" stroke-width="2" />`
}

function renderSvg(layout: ProsConsLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  const animate = shouldAnimate(spec)
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${layout.height}" fill="${theme.bg}" rx="8"/>
    ${animate ? seqSpotlightCSS(layout.rows.length + 1, spec, { scale: false, loopStartIndex: 1 }) : ''}
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const groups = parseGroups(spec)
  const layout = resolveLayout(spec, groups)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts = [
    renderTitle(spec, theme),
    renderHeader(layout, animate, instrument),
    ...layout.rows.map(row => renderRow(row, groups, layout, theme, animate, instrument)),
    renderDivider(layout, theme),
  ].filter(Boolean)

  return renderSvg(layout, spec, theme, parts)
}
