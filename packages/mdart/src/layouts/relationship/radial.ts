import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { tt, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const W = 560
const H = 440
const CX = W / 2
const CY = H / 2
const SPOKE_R = 158
const CENTER_R = 38
const NODE_W = 104
const NODE_H = 36

interface RadialNode {
  item: MdArtItem | undefined
  index: number
  angle: number
  x: number
  y: number
  lineX: number
  lineY: number
}

function resolveContent(spec: MdArtSpec): { centerLabel: string, spokes: MdArtItem[], count: number } {
  const centerLabel = spec.title ?? spec.items[0]?.label ?? 'Hub'
  const spokes = spec.title ? spec.items : spec.items.slice(1)
  return { centerLabel, spokes, count: spokes.length || 1 }
}

function placeSpokes(spokes: MdArtItem[], count: number): RadialNode[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (2 * Math.PI * index / count) - Math.PI / 2
    return {
      item: spokes[index],
      index,
      angle,
      x: CX + SPOKE_R * Math.cos(angle),
      y: CY + SPOKE_R * Math.sin(angle),
      lineX: CX + CENTER_R * Math.cos(angle),
      lineY: CY + CENTER_R * Math.sin(angle),
    }
  })
}

function renderSpoke(node: RadialNode, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const unit: string[] = [
    `<line x1="${node.lineX.toFixed(1)}" y1="${node.lineY.toFixed(1)}" x2="${node.x.toFixed(1)}" y2="${node.y.toFixed(1)}" stroke="${theme.textMuted}" stroke-width="1.5"/>`,
  ]
  if (node.item) {
    const { display, url } = displayLabel(node.item)
    unit.push(`<rect x="${(node.x - NODE_W / 2).toFixed(1)}" y="${(node.y - NODE_H / 2).toFixed(1)}" width="${NODE_W}" height="${NODE_H}" rx="5" fill="${theme.surface}" stroke="${theme.primary}66" stroke-width="1.2">${itemTitleTag(node.item)}</rect>`)
    unit.push(aWrap(`<text x="${node.x.toFixed(1)}" y="${(node.y + 5).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${tt(display, 12, node.item)}</text>`, url))
    unit.push(renderChildLabels(node, theme))
  }
  return wrapItem(unit.join(''), node.index + 1, animate, instrument)
}

function renderChildLabels(node: RadialNode, theme: MdArtTheme): string {
  if (!node.item) return ''
  const above = Math.sin(node.angle) < -0.1
  return node.item.children.slice(0, 2)
    .map((ch, index) => {
      const y = above ? node.y - 26 - index * 13 : node.y + 30 + index * 13
      return `<text x="${node.x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" font-size="8.5" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tt(ch.label, 12)}</text>`
    })
    .join('')
}

function renderCenter(label: string, theme: MdArtTheme, animate: boolean, instrument: boolean): string {
  const unit: string[] = [
    `<circle cx="${CX}" cy="${CY}" r="${CENTER_R}" fill="${theme.surface}" stroke="${theme.accent}" stroke-width="1.5"/>`,
    `<circle cx="${CX}" cy="${CY}" r="${CENTER_R}" fill="${theme.accent}22" stroke="none"/>`,
  ]
  const words = label.split(' ')
  if (words.length === 1) {
    unit.push(`<text x="${CX}" y="${CY + 5}" text-anchor="middle" font-size="11" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${tt(label, 12)}</text>`)
  } else {
    const midpoint = Math.ceil(words.length / 2)
    unit.push(`<text x="${CX}" y="${CY - 3}" text-anchor="middle" font-size="10" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${tt(words.slice(0, midpoint).join(' '), 12)}</text>`)
    unit.push(`<text x="${CX}" y="${CY + 11}" text-anchor="middle" font-size="10" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${tt(words.slice(midpoint).join(' '), 12)}</text>`)
  }
  return wrapItem(unit.join(''), 0, animate, instrument)
}

function renderSvg(theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const { centerLabel, spokes, count } = resolveContent(spec)
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts = [
    ...(animate ? [seqSpotlightCSS(count + 1, spec, { scale: false })] : []),
    ...placeSpokes(spokes, count).map(node => renderSpoke(node, theme, animate, instrument)),
    renderCenter(centerLabel, theme, animate, instrument),
  ]
  return renderSvg(theme, parts)
}
