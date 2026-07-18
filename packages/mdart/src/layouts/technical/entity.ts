import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR, FONT_MONO_ATTR } from '../shared'

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
  const entities = spec.items
  if (entities.length === 0) return renderEmpty(theme)

  const W = 600
  const TITLE_H = spec.title ? 30 : 8
  const n = entities.length
  const GAP = 14
  const ENT_W = Math.min(170, (W - (n + 1) * GAP) / n)
  const HEADER_H = 30
  const FIELD_H = 22
  const ENT_H = HEADER_H + Math.max(...entities.map(e => e.children.length), 1) * FIELD_H + 8
  const totalW = n * ENT_W + (n - 1) * GAP
  const startX = (W - totalW) / 2
  const H = TITLE_H + ENT_H + 32

  const parts: string[] = []
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()

  entities.forEach((entity, i) => {
    const x = startX + i * (ENT_W + GAP)
    const y = TITLE_H + 12

    const { display: entDisplay, url: entUrl } = displayLabel(entity)
    const unit: string[] = []
    unit.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${ENT_W}" height="${ENT_H}" rx="6" fill="${theme.surface}" stroke="${theme.accent}88" stroke-width="1.5">${itemTitleTag(entity)}</rect>`)
    unit.push(
      `<path d="M${(x + 6).toFixed(1)},${y.toFixed(1)} Q${x.toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${(y + 6).toFixed(1)} L${x.toFixed(1)},${(y + HEADER_H).toFixed(1)} L${(x + ENT_W).toFixed(1)},${(y + HEADER_H).toFixed(1)} L${(x + ENT_W).toFixed(1)},${(y + 6).toFixed(1)} Q${(x + ENT_W).toFixed(1)},${y.toFixed(1)} ${(x + ENT_W - 6).toFixed(1)},${y.toFixed(1)} Z" fill="${theme.accent}33"/>`,
    )
    unit.push(aWrap(`<text x="${(x + ENT_W / 2).toFixed(1)}" y="${(y + 19).toFixed(1)}" text-anchor="middle" font-size="12" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${tt(entDisplay, 14, entity)}</text>`, entUrl))
    unit.push(`<line x1="${x.toFixed(1)}" y1="${(y + HEADER_H).toFixed(1)}" x2="${(x + ENT_W).toFixed(1)}" y2="${(y + HEADER_H).toFixed(1)}" stroke="${theme.accent}44" stroke-width="1"/>`)

    entity.children.forEach((field, fi) => {
      const fy = y + HEADER_H + fi * FIELD_H + 14
      const isPK = field.attrs.includes('PK')
      const isFK = field.attrs.includes('FK')
      const textColor = isPK ? theme.accent : isFK ? `${theme.secondary}ee` : theme.textMuted

      // Field already shows attrs as PK/FK badges where applicable, so
      // shows.attrs=true; value (e.g. type after `name: text`) is dropped.
      const { display: fldDisplay, url: fldUrl } = displayLabel(field, { attrs: true })
      unit.push(aWrap(`<text x="${(x + 10).toFixed(1)}" y="${fy.toFixed(1)}" font-size="10" fill="${textColor}" ${FONT_MONO_ATTR}>${itemTitleTag(field)}${tt(fldDisplay, 16, field)}</text>`, fldUrl))

      if (isPK || isFK) {
        const badge = isPK ? 'PK' : 'FK'
        const badgeColor = isPK ? theme.accent : theme.secondary
        const bx = x + ENT_W - 28
        unit.push(
          `<rect x="${bx.toFixed(1)}" y="${(fy - 11).toFixed(1)}" width="24" height="13" rx="3" fill="${badgeColor}22" stroke="${badgeColor}66" stroke-width="0.5"/>`,
          `<text x="${(bx + 12).toFixed(1)}" y="${(fy - 1).toFixed(1)}" text-anchor="middle" font-size="8" fill="${badgeColor}" ${FONT_SANS_ATTR} font-weight="600">${badge}</text>`,
        )
      }
    })
    parts.push(wrapItem(unit.join(''), i, animate, instrument))
  })

  if (animate) parts.unshift(seqSpotlightCSS(n, spec, { scale: false }))
  return svgWrap(W, H, theme, spec.title, parts)
}
