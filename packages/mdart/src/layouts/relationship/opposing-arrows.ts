import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, wrapLabel, renderWrappedText } from '../shared'

function svg(W: number, H: number, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const left  = spec.items[0] ?? { label: 'Force A', children: [] as MdArtSpec['items'][0]['children'] }
  const right = spec.items[1] ?? { label: 'Force B', children: [] as MdArtSpec['items'][0]['children'] }
  const W = 520, TITLE_H = spec.title ? 28 : 8, H = 180 + TITLE_H
  const cy = TITLE_H + (H - TITLE_H) / 2
  const AH = 92, gap = 18
  const lx1 = 8, lx2 = W / 2 - gap / 2
  const rx1 = W / 2 + gap / 2, rx2 = W - 8
  const parts: string[] = []
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const { display: leftDisplay, url: leftUrl } = displayLabel(left, { value: !!left.value })
  const { display: rightDisplay, url: rightUrl } = displayLabel(right, { value: !!right.value })
  const leftUnit: string[] = []
  leftUnit.push(`<polygon points="${lx1},${cy - AH/2} ${lx2 - 32},${cy - AH/2} ${lx2},${cy} ${lx2 - 32},${cy + AH/2} ${lx1},${cy + AH/2}" fill="${theme.primary}2a" stroke="${theme.primary}77" stroke-width="1.5">${itemTitleTag(left)}</polygon>`)
  const leftCx = (lx1 + lx2) / 2 - 14
  const leftLabelWrap = wrapLabel(leftDisplay, 28, 2)
  leftUnit.push(aWrap(renderWrappedText(leftCx, cy - 24, `text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700"`, leftDisplay, leftLabelWrap, 12, left), leftUrl))
  let leftDetailY = cy + 4
  if (left.value) {
    const wrap = wrapLabel(left.value, 30, 2)
    leftUnit.push(renderWrappedText(leftCx, leftDetailY, `text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif"`, left.value, wrap, 11))
    leftDetailY += wrap.lines.length * 11 + 2
  }
  left.children.slice(0, 3).forEach((ch) => {
    const wrap = wrapLabel(ch.label, 30, 1)
    leftUnit.push(renderWrappedText(leftCx, leftDetailY, `text-anchor="middle" font-size="8.5" fill="${theme.textMuted}" font-family="system-ui,sans-serif"`, ch.label, wrap, 10, ch))
    leftDetailY += wrap.lines.length * 10
  })
  parts.push(wrapItem(leftUnit.join(''), 0, animate, instrument))
  const rightUnit: string[] = []
  rightUnit.push(`<polygon points="${rx2},${cy - AH/2} ${rx1 + 32},${cy - AH/2} ${rx1},${cy} ${rx1 + 32},${cy + AH/2} ${rx2},${cy + AH/2}" fill="${theme.secondary}2a" stroke="${theme.secondary}77" stroke-width="1.5">${itemTitleTag(right)}</polygon>`)
  const rightCx = (rx1 + rx2) / 2 + 14
  const rightLabelWrap = wrapLabel(rightDisplay, 28, 2)
  rightUnit.push(aWrap(renderWrappedText(rightCx, cy - 24, `text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700"`, rightDisplay, rightLabelWrap, 12, right), rightUrl))
  let rightDetailY = cy + 4
  if (right.value) {
    const wrap = wrapLabel(right.value, 30, 2)
    rightUnit.push(renderWrappedText(rightCx, rightDetailY, `text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif"`, right.value, wrap, 11))
    rightDetailY += wrap.lines.length * 11 + 2
  }
  right.children.slice(0, 3).forEach((ch) => {
    const wrap = wrapLabel(ch.label, 30, 1)
    rightUnit.push(renderWrappedText(rightCx, rightDetailY, `text-anchor="middle" font-size="8.5" fill="${theme.textMuted}" font-family="system-ui,sans-serif"`, ch.label, wrap, 10, ch))
    rightDetailY += wrap.lines.length * 10
  })
  parts.push(wrapItem(rightUnit.join(''), 1, animate, instrument))
  if (animate) parts.unshift(seqSpotlightCSS(2, spec, { scale: false }))
  return svg(W, H, theme, spec.title, parts)
}
