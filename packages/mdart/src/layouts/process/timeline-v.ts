import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, aWrap, lerpColor, titleEl, renderEmpty, itemTitleTag, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, type FitTextResult, FONT_SANS_ATTR } from '../shared'

const W = 560
const SPINE_X = 80
const DOT_R = 7
const TAG_FS_MAX = 9
const TAG_LH_RATIO = 12 / 9
const LBL_FS_MAX = 11
const LBL_LH_RATIO = 14 / 11
const DET_FS_MAX = 9
const DET_LH_RATIO = 12 / 9
const SEC_G = 5
const PAD_T = 8
const PAD_B = 8
const MIN_ROW_H = 40
const RIGHT_MARGIN = 16
const TEXT_X = SPINE_X + DOT_R + 8
const TAG_X = SPINE_X - DOT_R - 4
const RIGHT_COL_W = W - TEXT_X - RIGHT_MARGIN

interface TimelineVFit {
  titleH: number
  tagFit: { fontSize: number, results: FitTextResult[] }
  tagFitByIdx: Map<number, number>
  tagLH: number
  mainFit: { fontSize: number, results: FitTextResult[] }
  mainTexts: string[]
  mainLH: number
  detFit: { fontSize: number, results: FitTextResult[] }
  detFitByIdx: Map<number, number>
  detailTexts: string[]
  detLH: number
}

interface RowLayout {
  item: MdArtItem
  index: number
  y: number
  cy: number
  fill: string
  tagLines: string[]
  tagTrunc: boolean
  tagUrl: string | null
  mainLines: string[]
  mainTrunc: boolean
  mainUrl: string | null
  mainText: string
  detLines: string[]
  detTrunc: boolean
  detail: string
  rightH: number
  rowH: number
}

interface TimelineVLayout {
  n: number
  titleH: number
  height: number
  rows: RowLayout[]
  fits: TimelineVFit
}

function buildFits(spec: MdArtSpec): TimelineVFit {
  const titleH = spec.title ? 28 : 8
  const hasValueIdx: number[] = []
  spec.items.forEach((item, index) => { if (item.value) hasValueIdx.push(index) })

  const tagTexts = hasValueIdx.map(index => spec.items[index].label)
  const tagFit = tagTexts.length
    ? fitTextToWidthShared(tagTexts, TAG_X - 8, { maxSize: TAG_FS_MAX, minSize: 6.5, maxLines: 5 })
    : { fontSize: TAG_FS_MAX, results: [] as FitTextResult[] }
  const tagFitByIdx = new Map(hasValueIdx.map((idx, fitIndex) => [idx, fitIndex]))

  const mainTexts = spec.items.map(item => item.value ?? item.label)
  const mainFit = fitTextToWidthShared(mainTexts, RIGHT_COL_W, { maxSize: LBL_FS_MAX, minSize: 7, maxLines: 5 })

  const detailIdx: number[] = []
  const detailTexts: string[] = []
  spec.items.forEach((item, index) => {
    const detail = item.children.map(child => child.label).join(' · ')
    if (detail) {
      detailIdx.push(index)
      detailTexts.push(detail)
    }
  })
  const detFit = detailTexts.length
    ? fitTextToWidthShared(detailTexts, RIGHT_COL_W, { maxSize: DET_FS_MAX, minSize: 6.5, maxLines: 5 })
    : { fontSize: DET_FS_MAX, results: [] as FitTextResult[] }
  const detFitByIdx = new Map(detailIdx.map((idx, fitIndex) => [idx, fitIndex]))

  return {
    titleH,
    tagFit,
    tagFitByIdx,
    tagLH: tagFit.fontSize * TAG_LH_RATIO,
    mainFit,
    mainTexts,
    mainLH: mainFit.fontSize * LBL_LH_RATIO,
    detFit,
    detFitByIdx,
    detailTexts,
    detLH: detFit.fontSize * DET_LH_RATIO,
  }
}

function rowFor(item: MdArtItem, index: number, spec: MdArtSpec, theme: MdArtTheme, fits: TimelineVFit): Omit<RowLayout, 'y' | 'cy'> {
  const tagFitIdx = fits.tagFitByIdx.get(index)
  const { lines: tagLines, truncated: tagTrunc, url: tagUrl } =
    tagFitIdx !== undefined ? fits.tagFit.results[tagFitIdx] : { lines: [] as string[], truncated: false, url: null }

  const mainText = fits.mainTexts[index]
  const { lines: mainLines, truncated: mainTrunc, url: mainUrl } = fits.mainFit.results[index]

  const detFitIdx = fits.detFitByIdx.get(index)
  const { lines: detLines, truncated: detTrunc } =
    detFitIdx !== undefined ? fits.detFit.results[detFitIdx] : { lines: [] as string[], truncated: false }
  const detail = detFitIdx !== undefined ? fits.detailTexts[detFitIdx] : ''
  const rightH = mainLines.length * fits.mainLH + (detLines.length > 0 ? SEC_G + detLines.length * fits.detLH : 0)
  const leftH = tagLines.length * fits.tagLH
  const rowH = Math.max(MIN_ROW_H, PAD_T + Math.max(rightH, leftH) + PAD_B)
  const t = spec.items.length > 1 ? index / (spec.items.length - 1) : 0
  const fill = index === spec.items.length - 1 ? theme.accent : lerpColor(theme.primary, theme.secondary, t)

  return {
    item,
    index,
    fill,
    tagLines,
    tagTrunc,
    tagUrl,
    mainLines,
    mainTrunc,
    mainUrl,
    mainText,
    detLines,
    detTrunc,
    detail,
    rightH,
    rowH,
  }
}

function resolveLayout(spec: MdArtSpec, theme: MdArtTheme): TimelineVLayout {
  const fits = buildFits(spec)
  const partialRows = spec.items.map((item, index) => rowFor(item, index, spec, theme, fits))
  let y = fits.titleH
  const rows = partialRows.map(row => {
    const placed = { ...row, y, cy: y + row.rowH / 2 }
    y += row.rowH
    return placed
  })
  return { n: spec.items.length, titleH: fits.titleH, height: y + 8, rows, fits }
}

function renderSpine(layout: TimelineVLayout, theme: MdArtTheme): string {
  const last = layout.rows[layout.rows.length - 1]
  const spineTop = layout.titleH + DOT_R
  const arrowTipY = last.cy + DOT_R + 8
  return `<g class="mdart-n0">
      <line x1="${SPINE_X}" y1="${spineTop}" x2="${SPINE_X}" y2="${(last.cy + DOT_R).toFixed(1)}" stroke="${theme.border}" stroke-width="2"/>
      <polygon points="${(SPINE_X - 5).toFixed(1)},${(arrowTipY - 8).toFixed(1)} ${(SPINE_X + 5).toFixed(1)},${(arrowTipY - 8).toFixed(1)} ${SPINE_X},${arrowTipY.toFixed(1)}" fill="${theme.border}"/>
    </g>`
}

function renderTag(row: RowLayout, fits: TimelineVFit): string {
  if (row.tagLines.length === 0) return ''
  const tagBlockH = row.tagLines.length * fits.tagLH
  const tagStartY = row.cy - tagBlockH / 2 + fits.tagFit.fontSize * 0.75
  const tip = row.tagTrunc ? `<title>${escapeXml(row.item.label)}</title>` : ''
  const spans = row.tagLines
    .map((line, lineIndex) => `<tspan x="${TAG_X}" dy="${lineIndex === 0 ? 0 : fits.tagLH}">${escapeXml(line)}</tspan>`)
    .join('')
  return aWrap(
    `<text x="${TAG_X}" y="${tagStartY.toFixed(1)}" text-anchor="end" font-size="${fits.tagFit.fontSize}" fill="${row.fill}" ${FONT_SANS_ATTR} font-weight="700">${tip}${spans}</text>`,
    row.tagUrl,
  )
}

function renderMain(row: RowLayout, fits: TimelineVFit, theme: MdArtTheme): string {
  const mainStartY = row.y + (row.rowH - row.rightH) / 2 + fits.mainFit.fontSize * 0.75
  const mainTip = row.mainTrunc ? `<title>${escapeXml(row.mainText)}</title>` : ''
  const spans = row.mainLines
    .map((line, lineIndex) => `<tspan x="${TEXT_X}" dy="${lineIndex === 0 ? 0 : fits.mainLH}">${escapeXml(line)}</tspan>`)
    .join('')
  return aWrap(
    `<text x="${TEXT_X}" y="${mainStartY.toFixed(1)}" font-size="${fits.mainFit.fontSize}" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${mainTip}${spans}</text>`,
    row.mainUrl,
  )
}

function renderDetail(row: RowLayout, fits: TimelineVFit, mainStartY: number, theme: MdArtTheme): string {
  if (row.detLines.length === 0) return ''
  const detStartY = mainStartY + row.mainLines.length * fits.mainLH + SEC_G
  const detTip = row.detTrunc ? `<title>${escapeXml(row.detail)}</title>` : ''
  const spans = row.detLines
    .map((line, lineIndex) => `<tspan x="${TEXT_X}" dy="${lineIndex === 0 ? 0 : fits.detLH}">${escapeXml(line)}</tspan>`)
    .join('')
  return `<text x="${TEXT_X}" y="${detStartY.toFixed(1)}" font-size="${fits.detFit.fontSize}" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${detTip}${spans}</text>`
}

function renderRow(row: RowLayout, fits: TimelineVFit, theme: MdArtTheme): string {
  const mainStartY = row.y + (row.rowH - row.rightH) / 2 + fits.mainFit.fontSize * 0.75
  const unit = [
    `<circle cx="${SPINE_X}" cy="${row.cy.toFixed(1)}" r="${DOT_R}" fill="${row.fill}">${itemTitleTag(row.item)}</circle>`,
    renderTag(row, fits),
    renderMain(row, fits, theme),
    renderDetail(row, fits, mainStartY, theme),
  ].filter(Boolean)
  return `<g class="mdart-n${row.index + 1}">${unit.join('\n      ')}</g>`
}

function renderSvg(layout: TimelineVLayout, spec: MdArtSpec, theme: MdArtTheme, parts: string[]): string {
  const animate = shouldAnimate(spec)
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${layout.height}" fill="${theme.bg}" rx="8"/>
    ${animate ? seqSpotlightCSS(layout.n + 1, spec, { scale: false }) : ''}
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)

  const layout = resolveLayout(spec, theme)
  const parts = [
    spec.title ? titleEl(W, spec.title, theme) : '',
    renderSpine(layout, theme),
    ...layout.rows.map(row => renderRow(row, layout.fits, theme)),
  ].filter(Boolean)

  return renderSvg(layout, spec, theme, parts)
}
