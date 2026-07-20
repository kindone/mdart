import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, renderEmpty, aWrap, itemTitleTag, displayLabelValue, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR, FONT_MONO_ATTR } from '../shared'

const W = 600
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 8
const GAP = 14
const HEADER_H = 30
const FIELD_H = 22
const ENTITY_BOTTOM_PAD = 8
const OUTER_BOTTOM_PAD = 32
const ENTITY_TOP_PAD = 12
const ENTITY_RX = 6
const MAX_ENTITY_W = 170
const HEADER_CORNER_R = 6
const HEADER_TEXT_MAX = 14
const FIELD_TEXT_MAX = 16
const BADGE_W = 24
const BADGE_H = 13
const BADGE_RIGHT_PAD = 28

interface EntityLayout {
  titleH: number
  entityW: number
  entityH: number
  startX: number
  h: number
}

interface EntityPlacement {
  entity: MdArtItem
  index: number
  x: number
  y: number
}

function resolveLayout(spec: MdArtSpec): EntityLayout {
  const entities = spec.items
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const n = entities.length
  const entityW = Math.min(MAX_ENTITY_W, (W - (n + 1) * GAP) / n)
  const entityH = HEADER_H + Math.max(...entities.map(e => e.children.length), 1) * FIELD_H + ENTITY_BOTTOM_PAD
  const totalW = n * entityW + (n - 1) * GAP
  return {
    titleH,
    entityW,
    entityH,
    startX: (W - totalW) / 2,
    h: titleH + entityH + OUTER_BOTTOM_PAD,
  }
}

function placeEntities(spec: MdArtSpec, layout: EntityLayout): EntityPlacement[] {
  return spec.items.map((entity, index) => ({
    entity,
    index,
    x: layout.startX + index * (layout.entityW + GAP),
    y: layout.titleH + ENTITY_TOP_PAD,
  }))
}

function renderTitle(theme: MdArtTheme, title: string | undefined): string {
  return title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
}

function renderEntityBox(placement: EntityPlacement, layout: EntityLayout, theme: MdArtTheme): string {
  const { entity, x, y } = placement
  return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${layout.entityW}" height="${layout.entityH}" rx="${ENTITY_RX}" fill="${theme.surface}" stroke="${theme.accent}88" stroke-width="1.5">${itemTitleTag(entity)}</rect>`
}

function renderHeaderShape(placement: EntityPlacement, layout: EntityLayout, theme: MdArtTheme): string {
  const { x, y } = placement
  const w = layout.entityW
  return `<path d="M${(x + HEADER_CORNER_R).toFixed(1)},${y.toFixed(1)} Q${x.toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${(y + HEADER_CORNER_R).toFixed(1)} L${x.toFixed(1)},${(y + HEADER_H).toFixed(1)} L${(x + w).toFixed(1)},${(y + HEADER_H).toFixed(1)} L${(x + w).toFixed(1)},${(y + HEADER_CORNER_R).toFixed(1)} Q${(x + w).toFixed(1)},${y.toFixed(1)} ${(x + w - HEADER_CORNER_R).toFixed(1)},${y.toFixed(1)} Z" fill="${theme.accent}33"/>`
}

function renderHeaderText(placement: EntityPlacement, layout: EntityLayout, theme: MdArtTheme): string {
  const { entity, x, y } = placement
  const { display, url } = displayLabelValue(entity)
  return aWrap(`<text x="${(x + layout.entityW / 2).toFixed(1)}" y="${(y + 19).toFixed(1)}" text-anchor="middle" font-size="12" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${tt(display, HEADER_TEXT_MAX, entity)}</text>`, url)
}

function renderHeaderDivider(placement: EntityPlacement, layout: EntityLayout, theme: MdArtTheme): string {
  const { x, y } = placement
  return `<line x1="${x.toFixed(1)}" y1="${(y + HEADER_H).toFixed(1)}" x2="${(x + layout.entityW).toFixed(1)}" y2="${(y + HEADER_H).toFixed(1)}" stroke="${theme.accent}44" stroke-width="1"/>`
}

function fieldColor(field: MdArtItem, theme: MdArtTheme): string {
  if (field.attrs.includes('PK')) return theme.accent
  if (field.attrs.includes('FK')) return `${theme.secondary}ee`
  return theme.textMuted
}

function renderFieldText(placement: EntityPlacement, field: MdArtItem, fieldIndex: number, theme: MdArtTheme): string {
  const { x, y } = placement
  const fy = y + HEADER_H + fieldIndex * FIELD_H + 14
  const { display, url } = displayLabelValue(field)
  return aWrap(`<text x="${(x + 10).toFixed(1)}" y="${fy.toFixed(1)}" font-size="10" fill="${fieldColor(field, theme)}" ${FONT_MONO_ATTR}>${itemTitleTag(field)}${tt(display, FIELD_TEXT_MAX, field)}</text>`, url)
}

function renderFieldBadge(placement: EntityPlacement, layout: EntityLayout, field: MdArtItem, fieldIndex: number, theme: MdArtTheme): string {
  const isPK = field.attrs.includes('PK')
  const isFK = field.attrs.includes('FK')
  if (!isPK && !isFK) return ''

  const badge = isPK ? 'PK' : 'FK'
  const badgeColor = isPK ? theme.accent : theme.secondary
  const bx = placement.x + layout.entityW - BADGE_RIGHT_PAD
  const fy = placement.y + HEADER_H + fieldIndex * FIELD_H + 14
  return [
    `<rect x="${bx.toFixed(1)}" y="${(fy - 11).toFixed(1)}" width="${BADGE_W}" height="${BADGE_H}" rx="3" fill="${badgeColor}22" stroke="${badgeColor}66" stroke-width="0.5"/>`,
    `<text x="${(bx + BADGE_W / 2).toFixed(1)}" y="${(fy - 1).toFixed(1)}" text-anchor="middle" font-size="8" fill="${badgeColor}" ${FONT_SANS_ATTR} font-weight="600">${badge}</text>`,
  ].join('')
}

function renderEntity(placement: EntityPlacement, layout: EntityLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const unit = [
    renderEntityBox(placement, layout, theme),
    renderHeaderShape(placement, layout, theme),
    renderHeaderText(placement, layout, theme),
    renderHeaderDivider(placement, layout, theme),
    ...placement.entity.children.flatMap((field, fieldIndex) => [
      renderFieldText(placement, field, fieldIndex, theme),
      renderFieldBadge(placement, layout, field, fieldIndex, theme),
    ]),
  ].join('')
  return wrapItem(unit, placement.index, animate, instrument)
}

function svgWrap(layout: EntityLayout, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${layout.h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${renderTitle(theme, title)}
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  if (spec.items.length === 0) return renderEmpty(theme)

  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layout = resolveLayout(spec)
  const parts = placeEntities(spec, layout).map(placement =>
    renderEntity(placement, layout, theme, animate, instrument),
  )

  if (animate) parts.unshift(seqSpotlightCSS(spec.items.length, spec, { scale: false }))
  return svgWrap(layout, theme, spec.title, parts)
}
