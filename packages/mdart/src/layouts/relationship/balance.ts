import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, wrapLabel, renderWrappedText, FONT_SANS_ATTR } from '../shared'

const W = 520
const TITLE_H_WITH_TITLE = 28
const TITLE_H_NO_TITLE = 8
const BODY_H = 300
const BEAM_OFFSET_Y = 76
const BEAM_W = 400
const PLATE_W = 130
const PLATE_H = 18
const SUPPORT_W = 60
const SUPPORT_H = 8

interface BalanceLayout {
  titleH: number
  height: number
  baseX: number
  beamY: number
  leftX: number
  rightX: number
}

interface PlateConfig {
  item: MdArtItem
  index: number
  x: number
  fill: string
  stroke: string
  valueChars: number
}

function resolveLayout(spec: MdArtSpec): BalanceLayout {
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const height = BODY_H + titleH
  const baseX = W / 2
  const beamY = titleH + BEAM_OFFSET_Y
  return {
    titleH,
    height,
    baseX,
    beamY,
    leftX: baseX - BEAM_W / 2 + PLATE_W / 2 - 6,
    rightX: baseX + BEAM_W / 2 - PLATE_W / 2 + 6,
  }
}

function fallbackItem(label: string): MdArtItem {
  return { label, children: [], attrs: [], flowChildren: [] }
}

function svg(layout: BalanceLayout, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${layout.height}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

function renderSupport(layout: BalanceLayout, theme: MdArtTheme): string[] {
  const { baseX, beamY } = layout
  return [
    `<polygon points="${baseX},${beamY + 4} ${baseX - 18},${beamY + 44} ${baseX + 18},${beamY + 44}" fill="${theme.surface}" stroke="${theme.textMuted}" stroke-width="1.5"/>`,
    `<rect x="${baseX - SUPPORT_W / 2}" y="${beamY + 44}" width="${SUPPORT_W}" height="${SUPPORT_H}" rx="2" fill="${theme.surface}" stroke="${theme.textMuted}" stroke-width="1"/>`,
    `<rect x="${(baseX - BEAM_W / 2).toFixed(1)}" y="${(beamY - 4).toFixed(1)}" width="${BEAM_W}" height="8" rx="3" fill="${theme.surface}" stroke="${theme.textMuted}" stroke-width="1.5"/>`,
  ]
}

function renderPlate(config: PlateConfig, layout: BalanceLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const { item, x } = config
  const { display, url } = displayLabel(item, { value: !!item.value })
  const unit: string[] = [
    `<line x1="${x}" y1="${layout.beamY}" x2="${x}" y2="${layout.beamY + 38}" stroke="${theme.textMuted}99" stroke-width="1.5"/>`,
    `<rect x="${(x - PLATE_W / 2).toFixed(1)}" y="${(layout.beamY + 38).toFixed(1)}" width="${PLATE_W}" height="${PLATE_H}" rx="4" fill="${config.fill}" stroke="${config.stroke}" stroke-width="1.2">${itemTitleTag(item)}</rect>`,
    aWrap(`<text x="${x.toFixed(1)}" y="${(layout.beamY + 50).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${tt(display, 24, item)}</text>`, url),
  ]
  let detailY = layout.beamY + 66
  if (item.value) {
    const wrap = wrapLabel(item.value, config.valueChars, 2)
    unit.push(renderWrappedText(x, detailY, `text-anchor="middle" font-size="9" fill="${theme.textMuted}" ${FONT_SANS_ATTR}`, item.value, wrap, 12))
    detailY += wrap.lines.length * 12 + 3
  }
  item.children.slice(0, 4).forEach((ch) => {
    const wrap = wrapLabel(ch.label, config.valueChars, 2)
    unit.push(renderWrappedText(x, detailY, `text-anchor="middle" font-size="9" fill="${theme.textMuted}" ${FONT_SANS_ATTR}`, ch.label, wrap, 12, ch))
    detailY += wrap.lines.length * 12
  })
  return wrapItem(unit.join(''), config.index, animate, instrument)
}

function plateConfigs(spec: MdArtSpec, layout: BalanceLayout, theme: MdArtTheme): PlateConfig[] {
  return [
    { item: spec.items[0] ?? fallbackItem('Side A'), index: 0, x: layout.leftX, fill: `${theme.primary}30`, stroke: `${theme.primary}77`, valueChars: 34 },
    { item: spec.items[1] ?? fallbackItem('Side B'), index: 1, x: layout.rightX, fill: `${theme.secondary}30`, stroke: `${theme.secondary}77`, valueChars: 50 },
  ]
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const layout = resolveLayout(spec)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts = [
    ...(animate ? [seqSpotlightCSS(2, spec, { scale: false })] : []),
    ...renderSupport(layout, theme),
    ...plateConfigs(spec, layout, theme).map(config => renderPlate(config, layout, theme, animate, instrument)),
  ]
  return svg(layout, theme, spec.title, parts)
}
