import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

function svgWrap(W: number, H: number, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const hasL2 = items.some(it => it.children.length > 0)
  const NW = 118, NH = 30, HGAP = 40, VGAP = 10, PAD_TOP = 8
  const cols = hasL2 ? 3 : 2
  const colX = Array.from({ length: cols }, (_, c) => 16 + c * (NW + HGAP))

  const totalLeaves = hasL2
    ? items.reduce((a, it) => a + Math.max(it.children.length, 1), 0)
    : items.length

  const TITLE_H = 8
  const H = TITLE_H + PAD_TOP + totalLeaves * (NH + VGAP) - VGAP + PAD_TOP + 10
  const W = colX[cols - 1] + NW + 16

  const parts: string[] = []
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const rootLabel = spec.title ?? items[0].label

  let leafRow = 0
  const l1Mids: number[] = []
  let animIndex = hasL2 ? 1 : 0
  const spineX = hasL2 ? colX[1] - HGAP / 2 : 0

  items.forEach((l1) => {
    const groupIndex = animIndex++
    const unit: string[] = []
    const leaves = hasL2 ? Math.max(l1.children.length, 1) : 1
    const l1SpanTop = TITLE_H + PAD_TOP + leafRow * (NH + VGAP)
    const l1SpanH = leaves * (NH + VGAP) - VGAP
    const l1Mid = l1SpanTop + l1SpanH / 2
    l1Mids.push(l1Mid)

    const l1x = colX[hasL2 ? 1 : 0]
    const l1y = l1Mid - NH / 2
    const { display: l1Display, url: l1Url } = displayLabel(l1)
    if (hasL2) {
      unit.push(`<line x1="${spineX}" y1="${l1Mid.toFixed(1)}" x2="${colX[1]}" y2="${l1Mid.toFixed(1)}" stroke="${theme.border}" stroke-width="1.2"/>`)
    }
    unit.push(`<rect x="${l1x}" y="${l1y.toFixed(1)}" width="${NW}" height="${NH}" rx="5" fill="${theme.primary}2e" stroke="${theme.primary}88" stroke-width="1.5">${itemTitleTag(l1)}</rect>`)
    unit.push(aWrap(`<text x="${(l1x+NW/2).toFixed(1)}" y="${(l1y+20).toFixed(1)}" text-anchor="middle" font-size="10.5" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${tt(l1Display, 15, l1)}</text>`, l1Url))

    if (hasL2) {
      const midX = colX[1] + NW
      const childX = colX[2]
      const elbowX = midX + HGAP / 2

      l1.children.forEach((l2, j) => {
        const childUnit: string[] = []
        const l2y = TITLE_H + PAD_TOP + (leafRow + j) * (NH + VGAP)
        const l2Mid = l2y + NH / 2
        const done = l2.attrs.includes('done')
        const active = l2.attrs.includes('active') || l2.attrs.includes('wip')

        childUnit.push(`<path d="M${midX},${l1Mid.toFixed(1)} H${elbowX} V${l2Mid.toFixed(1)} H${childX}" fill="none" stroke="${theme.border}" stroke-width="1.2"/>`)

        const { display: l2Display, url: l2Url } = displayLabel(l2, { attrs: true })
        const l2Fill = done ? `${theme.accent}22` : theme.surface
        const l2Stroke = done ? theme.accent : active ? `${theme.accent}88` : theme.border
        childUnit.push(`<rect x="${childX}" y="${l2y.toFixed(1)}" width="${NW}" height="${NH}" rx="4" fill="${l2Fill}" stroke="${l2Stroke}" stroke-width="${active ? 1.5 : 1}">${itemTitleTag(l2)}</rect>`)
        const l2Col = done ? theme.accent : active ? theme.text : theme.textMuted
        childUnit.push(aWrap(`<text x="${(childX+NW/2).toFixed(1)}" y="${(l2y+20).toFixed(1)}" text-anchor="middle" font-size="10" fill="${l2Col}" ${FONT_SANS_ATTR} ${done ? 'text-decoration="line-through"' : ''}>${tt(l2Display, 15, l2)}</text>`, l2Url))
        parts.push(wrapItem(childUnit.join(''), animIndex++, animate, instrument))
      })
    }

    parts.push(wrapItem(unit.join(''), groupIndex, animate, instrument))
    leafRow += leaves
  })

  if (hasL2 && l1Mids.length > 0) {
    const rootUnit: string[] = []
    rootUnit.push(`<line x1="${spineX}" y1="${l1Mids[0].toFixed(1)}" x2="${spineX}" y2="${l1Mids[l1Mids.length-1].toFixed(1)}" stroke="${theme.border}" stroke-width="1.5"/>`)

    const rootMid = (l1Mids[0] + l1Mids[l1Mids.length - 1]) / 2
    const rootX = colX[0]
    rootUnit.push(`<rect x="${rootX}" y="${(rootMid-NH/2).toFixed(1)}" width="${NW}" height="${NH}" rx="6" fill="${theme.accent}33" stroke="${theme.accent}99" stroke-width="2"/>`)
    rootUnit.push(`<text x="${(rootX+NW/2).toFixed(1)}" y="${(rootMid+5).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.accent}" ${FONT_SANS_ATTR} font-weight="700">${tt(rootLabel, 15)}</text>`)
    rootUnit.push(`<line x1="${rootX+NW}" y1="${rootMid.toFixed(1)}" x2="${spineX}" y2="${rootMid.toFixed(1)}" stroke="${theme.border}" stroke-width="1.5"/>`)
    parts.unshift(wrapItem(rootUnit.join(''), 0, animate, instrument))
  }

  if (animate) parts.unshift(seqSpotlightCSS(hasL2 ? animIndex : items.length, spec, { scale: false }))
  return svgWrap(W, H, theme, undefined, parts)
}
