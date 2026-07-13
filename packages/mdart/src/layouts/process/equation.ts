import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, titleEl, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument } from '../shared'

function svgWrapProcess(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const n = items.length
  const W = 560
  const CARD_H = 100, CARD_W = Math.min(110, (W - 16 - 24 * (n - 1)) / n)
  const titleH = spec.title ? 28 : 8
  const H = titleH + CARD_H + 16
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  const opW = 24
  const total = n * CARD_W + (n - 1) * opW
  const startX = (W - total) / 2
  const cardY = titleH + 8

  // One shared font size for every card header (all cards share CARD_W),
  // sized to whichever is worst-fitting — replaces the old flat 14-char
  // truncation.
  const displays = items.map(item => {
    const showsBody = !!(item.children.length || item.value)
    return displayLabel(item, { value: showsBody })
  })
  const { fontSize: headerFS, results: headerFits } = fitTextToWidthShared(
    displays.map(d => d.display), CARD_W - 8, { maxSize: 10, minSize: 6.5, maxLines: 1 },
  )

  // Sub-list rows: cap at 3 real rows + a "+N more" summary row instead of
  // silently dropping everything past the 4th (the old subs.slice(0, 4)
  // just discarded the 5th+ child/value with no ellipsis or indication at
  // all). All rows across every card share one fit against the same CARD_W.
  const subsPerItem = items.map(item =>
    item.children.length ? item.children.map(c => c.label) : item.value ? [item.value] : [],
  )
  const visiblePerItem = subsPerItem.map(subs => (subs.length > 4 ? subs.slice(0, 3) : subs.slice(0, 4)))
  const allVisibleSubs = visiblePerItem.flat()
  const { fontSize: subFS, results: subFits } = allVisibleSubs.length
    ? fitTextToWidthShared(allVisibleSubs, CARD_W - 8, { maxSize: 9, minSize: 6, maxLines: 1 })
    : { fontSize: 9, results: [] as ReturnType<typeof fitTextToWidthShared>['results'] }

  let subCursor = 0
  items.forEach((item, i) => {
    const x = startX + i * (CARD_W + opW)
    const isResult = i === n - 1
    const t = n > 1 ? i / (n - 1) : 0
    const fill = isResult ? theme.accent : lerpColor(theme.primary, theme.secondary, t)
    const { url: itmUrl, display: itmDisplay } = displays[i]
    const { lines: headerLines, truncated: headerTruncated } = headerFits[i]
    const headerTip = headerTruncated ? `<title>${escapeXml(itmDisplay)}</title>` : ''
    let cardStr = ''
    cardStr += `<rect x="${x.toFixed(1)}" y="${cardY.toFixed(1)}" width="${CARD_W.toFixed(1)}" height="${CARD_H}" rx="7" fill="${fill}22" stroke="${fill}88" stroke-width="1.5">${itemTitleTag(item)}</rect>`
    cardStr += `<rect x="${x.toFixed(1)}" y="${cardY.toFixed(1)}" width="${CARD_W.toFixed(1)}" height="22" rx="7" fill="${fill}"/>`
    cardStr += `<rect x="${x.toFixed(1)}" y="${(cardY + 14).toFixed(1)}" width="${CARD_W.toFixed(1)}" height="8" fill="${fill}"/>`
    cardStr += aWrap(`${headerTip}<text x="${(x + CARD_W / 2).toFixed(1)}" y="${(cardY + 14).toFixed(1)}" text-anchor="middle" font-size="${headerFS}" fill="#fff" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(headerLines[0])}</text>`, itmUrl)
    const subs = subsPerItem[i]
    const visible = visiblePerItem[i]
    const moreCount = subs.length - visible.length
    // Centre the sub-list block in the body area (between header band at
    // cardY+22 and card bottom at cardY+CARD_H).
    const bodyCy  = cardY + 22 + (CARD_H - 22) / 2  // centre of body area
    const rowH    = 16
    const totalRows = visible.length + (moreCount > 0 ? 1 : 0)
    visible.forEach((_, si) => {
      const { lines: subLines, truncated: subTruncated } = subFits[subCursor++]
      const ty = bodyCy + (si - (totalRows - 1) / 2) * rowH + 4
      const subTip = subTruncated ? `<title>${escapeXml(subs[si])}</title>` : ''
      cardStr += `${subTip}<text x="${(x + CARD_W / 2).toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="${subFS}" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(subLines[0])}</text>`
    })
    if (moreCount > 0) {
      const ty = bodyCy + (visible.length - (totalRows - 1) / 2) * rowH + 4
      cardStr += `<text x="${(x + CARD_W / 2).toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="${subFS}" fill="${theme.textMuted}" fill-opacity="0.7" font-family="system-ui,sans-serif" font-style="italic">+${moreCount} more</text>`
    }
    parts.push(wrapItem(cardStr, i, animate, instrument))
    if (i < n - 1) {
      const op = i === n - 2 ? '=' : '+'
      const opX = x + CARD_W + opW / 2
      const opEl = `<text x="${opX.toFixed(1)}" y="${(cardY + CARD_H / 2 + 8).toFixed(1)}" text-anchor="middle" font-size="20" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="400">${op}</text>`
      parts.push(animate ? `<g class="mdart-arr-n${i + 1}">${opEl}</g>` : opEl)
    }
  })

  if (animate) parts.unshift(seqSpotlightCSS(n, spec))
  return svgWrapProcess(W, H, theme, parts)
}
