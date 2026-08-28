import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, truncate, renderEmpty, aWrap, itemTitleTag, displayLabelValue, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR, FONT_MONO_ATTR } from '../shared'

const W = 600
const TITLE_H_WITH_TITLE = 30
const TITLE_H_NO_TITLE = 8
const MAX_COLS = 3
const SIDE_PAD = 24
const CLASS_W_MAX = 170
const CLASS_GAP_Y = 20
const CLASS_TOP_GAP = 12
const HEADER_H = 30
const FIELD_H = 18
const SEP_H = 6
const VPAD = 10
const BOTTOM_PAD = 20
const HEADER_RX = 5
const FIELD_CHAR_PX = 7
const CLASS_NAME_CHAR_PX = 7

interface ClassSections {
  fields: MdArtItem[]
  methods: MdArtItem[]
  hasDivider: boolean
}

interface ClassLayout {
  titleH: number
  cols: number
  rows: number
  classW: number
  rowH: number
  colGap: number
  classHeights: number[]
  h: number
  maxCharsPerField: number
}

interface ClassPlacement {
  cls: MdArtItem
  index: number
  x: number
  y: number
  totalH: number
  sections: ClassSections
}

function splitMembers(cls: MdArtItem): ClassSections {
  const fields = cls.children.filter(c => !c.label.includes('('))
  const methods = cls.children.filter(c => c.label.includes('('))
  return { fields, methods, hasDivider: fields.length > 0 && methods.length > 0 }
}

function classHeight(sections: ClassSections): number {
  return HEADER_H
    + sections.fields.length * FIELD_H
    + (sections.hasDivider ? SEP_H : 0)
    + sections.methods.length * FIELD_H
    + VPAD
}

function resolveLayout(spec: MdArtSpec): ClassLayout {
  const classes = spec.items
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const cols = Math.min(classes.length, MAX_COLS)
  const classW = Math.min(CLASS_W_MAX, Math.floor((W - SIDE_PAD) / cols) - 12)
  const classHeights = classes.map(cls => classHeight(splitMembers(cls)))
  const rows = Math.ceil(classes.length / cols)
  const rowH = Math.max(...classHeights) + CLASS_GAP_Y
  const colGap = (W - cols * classW) / (cols + 1)
  return {
    titleH,
    cols,
    rows,
    classW,
    rowH,
    colGap,
    classHeights,
    h: titleH + rows * rowH + BOTTOM_PAD,
    maxCharsPerField: Math.floor(classW / FIELD_CHAR_PX) - 2,
  }
}

function placeClasses(spec: MdArtSpec, layout: ClassLayout): ClassPlacement[] {
  return spec.items.map((cls, index) => {
    const col = index % layout.cols
    const row = Math.floor(index / layout.cols)
    return {
      cls,
      index,
      x: layout.colGap + col * (layout.classW + layout.colGap),
      y: layout.titleH + CLASS_TOP_GAP + row * layout.rowH,
      totalH: layout.classHeights[index],
      sections: splitMembers(cls),
    }
  })
}

function renderTitle(theme: MdArtTheme, title: string | undefined): string {
  return title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
}

function renderClassShell(placement: ClassPlacement, layout: ClassLayout, theme: MdArtTheme): string {
  const { cls, x, y, totalH } = placement
  return [
    `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${layout.classW}" height="${totalH}" rx="${HEADER_RX}" fill="${theme.surface}" stroke="${theme.accent}77" stroke-width="1.5">${itemTitleTag(cls)}</rect>`,
    `<path d="M${(x+5).toFixed(1)},${y.toFixed(1)} L${(x+layout.classW-5).toFixed(1)},${y.toFixed(1)} Q${(x+layout.classW).toFixed(1)},${y.toFixed(1)} ${(x+layout.classW).toFixed(1)},${(y+5).toFixed(1)} L${(x+layout.classW).toFixed(1)},${(y+HEADER_H).toFixed(1)} L${x.toFixed(1)},${(y+HEADER_H).toFixed(1)} L${x.toFixed(1)},${(y+5).toFixed(1)} Q${x.toFixed(1)},${y.toFixed(1)} ${(x+5).toFixed(1)},${y.toFixed(1)} Z" fill="${theme.accent}22"/>`,
  ].join('')
}

function classStereotype(cls: MdArtItem): string | null {
  if (cls.attrs.includes('interface')) return '«interface»'
  if (cls.attrs.includes('abstract')) return '«abstract»'
  return null
}

function renderClassHeader(placement: ClassPlacement, layout: ClassLayout, theme: MdArtTheme): string {
  const { cls, x, y } = placement
  const stereotype = classStereotype(cls)
  const isSpecial = !!stereotype
  const { display, url } = displayLabelValue(cls)
  const unit: string[] = []

  if (stereotype) {
    unit.push(`<text x="${(x + layout.classW/2).toFixed(1)}" y="${(y + 11).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.accent}99" ${FONT_SANS_ATTR}>${stereotype}</text>`)
  }
  const nameY = isSpecial ? y + 24 : y + 19
  unit.push(
    aWrap(`<text x="${(x + layout.classW/2).toFixed(1)}" y="${nameY.toFixed(1)}" text-anchor="middle" font-size="12" fill="${theme.text}" ${FONT_MONO_ATTR} font-weight="700"${isSpecial ? ' font-style="italic"' : ''}>${tt(display, Math.floor(layout.classW / CLASS_NAME_CHAR_PX), cls)}</text>`, url),
    `<line x1="${x.toFixed(1)}" y1="${(y + HEADER_H).toFixed(1)}" x2="${(x + layout.classW).toFixed(1)}" y2="${(y + HEADER_H).toFixed(1)}" stroke="${theme.accent}44" stroke-width="1"/>`,
  )
  return unit.join('')
}

function memberVisibility(display: string): { prefix: string; raw: string } {
  const visMatch = display.match(/^\[([+\-#~])\]/) ?? display.match(/^([+\-#~])/)
  const prefix = visMatch ? visMatch[1] + ' ' : '  '
  const raw = display.replace(/^\[[+\-#~]\]\s*|^[+\-#~]\s*/, '')
  return { prefix, raw }
}

function renderField(placement: ClassPlacement, layout: ClassLayout, field: MdArtItem, fieldIndex: number, startY: number, theme: MdArtTheme): string {
  const fy = startY + fieldIndex * FIELD_H + 13
  const isPK = field.attrs.includes('PK')
  const isFK = field.attrs.includes('FK')
  const { display } = displayLabelValue(field)
  const { prefix, raw } = memberVisibility(display)
  const color = isPK ? theme.accent : isFK ? '#c4b5fd' : `${theme.textMuted}cc`
  const truncatedTip = raw.length > layout.maxCharsPerField ? `<title>${escapeXml(prefix + raw)}</title>` : ''
  const unit = [`<text x="${(placement.x + 7).toFixed(1)}" y="${fy.toFixed(1)}" font-size="10" fill="${color}" ${FONT_MONO_ATTR}>${truncatedTip}${escapeXml(prefix + truncate(raw, layout.maxCharsPerField))}</text>`]

  if (isPK || isFK) {
    const bc = isPK ? theme.accent : '#a78bfa'
    const bx = placement.x + layout.classW - 26
    unit.push(
      `<rect x="${bx.toFixed(1)}" y="${(fy - 11).toFixed(1)}" width="22" height="12" rx="3" fill="${bc}22" stroke="${bc}55" stroke-width="0.5"/>`,
      `<text x="${(bx + 11).toFixed(1)}" y="${(fy - 1).toFixed(1)}" text-anchor="middle" font-size="8" fill="${bc}" ${FONT_SANS_ATTR} font-weight="600">${isPK ? 'PK' : 'FK'}</text>`,
    )
  }
  return unit.join('')
}

function renderDivider(placement: ClassPlacement, layout: ClassLayout, y: number, theme: MdArtTheme): string {
  return `<line x1="${placement.x.toFixed(1)}" y1="${(y + SEP_H/2).toFixed(1)}" x2="${(placement.x + layout.classW).toFixed(1)}" y2="${(y + SEP_H/2).toFixed(1)}" stroke="${theme.border}" stroke-width="0.8"/>`
}

function renderMethod(placement: ClassPlacement, layout: ClassLayout, method: MdArtItem, methodIndex: number, startY: number, theme: MdArtTheme): string {
  const my = startY + methodIndex * FIELD_H + 13
  const { display } = displayLabelValue(method)
  const { prefix, raw } = memberVisibility(display)
  const isStatic = method.attrs.includes('static')
  const truncatedTip = raw.length > layout.maxCharsPerField ? `<title>${escapeXml(prefix + raw)}</title>` : ''
  return `<text x="${(placement.x + 7).toFixed(1)}" y="${my.toFixed(1)}" font-size="10" fill="${theme.primary}cc" ${FONT_MONO_ATTR}${isStatic ? ' text-decoration="underline"' : ''}>${truncatedTip}${escapeXml(prefix + truncate(raw, layout.maxCharsPerField))}</text>`
}

function renderMembers(placement: ClassPlacement, layout: ClassLayout, theme: MdArtTheme): string {
  const { sections } = placement
  const unit: string[] = []
  let curY = placement.y + HEADER_H

  sections.fields.forEach((field, fieldIndex) => {
    unit.push(renderField(placement, layout, field, fieldIndex, curY, theme))
  })
  curY += sections.fields.length * FIELD_H

  if (sections.hasDivider) {
    unit.push(renderDivider(placement, layout, curY, theme))
    curY += SEP_H
  }

  sections.methods.forEach((method, methodIndex) => {
    unit.push(renderMethod(placement, layout, method, methodIndex, curY, theme))
  })
  return unit.join('')
}

function renderClass(placement: ClassPlacement, layout: ClassLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const unit = [
    renderClassShell(placement, layout, theme),
    renderClassHeader(placement, layout, theme),
    renderMembers(placement, layout, theme),
  ].join('')
  return wrapItem(unit, placement.index, animate, instrument)
}

function svgWrap(layout: ClassLayout, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${layout.h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${renderTitle(theme, title)}
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const classes = spec.items
  if (classes.length === 0) return renderEmpty(theme)

  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const layout = resolveLayout(spec)
  const parts = placeClasses(spec, layout).map(placement =>
    renderClass(placement, layout, theme, animate, instrument),
  )

  if (animate) parts.unshift(seqSpotlightCSS(classes.length, spec, { scale: false }))
  return svgWrap(layout, theme, spec.title, parts)
}
