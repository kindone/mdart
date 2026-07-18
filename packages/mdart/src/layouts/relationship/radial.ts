import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { tt, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const centerLabel = spec.title ?? spec.items[0]?.label ?? 'Hub'
  const spokes = spec.title ? spec.items : spec.items.slice(1)
  const n = spokes.length || 1
  const W = 560, H = 440
  const cx = W / 2, cy = H / 2
  const R = 158
  const CR = 38  // center circle radius
  const parts: string[] = []
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i / n) - Math.PI / 2
    const sx = cx + R * Math.cos(angle), sy = cy + R * Math.sin(angle)
    // start line from circle edge, not center — so it never crosses the circle
    const lx = cx + CR * Math.cos(angle), ly = cy + CR * Math.sin(angle)
    const item = spokes[i]
    const unit: string[] = []
    unit.push(`<line x1="${lx.toFixed(1)}" y1="${ly.toFixed(1)}" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}" stroke="${theme.textMuted}" stroke-width="1.5"/>`)
    if (item) {
      const { display: itmDisplay, url: itmUrl } = displayLabel(item)
      unit.push(`<rect x="${(sx - 52).toFixed(1)}" y="${(sy - 18).toFixed(1)}" width="104" height="36" rx="5" fill="${theme.surface}" stroke="${theme.primary}66" stroke-width="1.2">${itemTitleTag(item)}</rect>`)
      unit.push(aWrap(`<text x="${sx.toFixed(1)}" y="${(sy + 5).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="600">${tt(itmDisplay, 12, item)}</text>`, itmUrl))
      // Render children on the OUTER side of the box (away from the hub) so
      // they never sit on top of the connector line. For upper-half boxes the
      // outer side is above; for lower-half (or pure horizontal) it stays below.
      // Asymmetric offsets compensate for SVG text baselines: 8.5 px text
      // ascends ~7 px above its y, descends ~3 px below — so a "below" baseline
      // needs 4 extra px to match the visual gap of an "above" baseline.
      const above = Math.sin(angle) < -0.1
      item.children.slice(0, 2).forEach((ch, j) => {
        const offY = above ? sy - 26 - j * 13 : sy + 30 + j * 13
        unit.push(`<text x="${sx.toFixed(1)}" y="${offY.toFixed(1)}" text-anchor="middle" font-size="8.5" fill="${theme.textMuted}" ${FONT_SANS_ATTR}>${tt(ch.label, 12)}</text>`)
      })
    }
    parts.push(wrapItem(unit.join(''), i + 1, animate, instrument))
  }
  const centerUnit: string[] = []
  centerUnit.push(`<circle cx="${cx}" cy="${cy}" r="${CR}" fill="${theme.surface}" stroke="${theme.accent}" stroke-width="1.5"/>`)
  centerUnit.push(`<circle cx="${cx}" cy="${cy}" r="${CR}" fill="${theme.accent}22" stroke="none"/>`)
  const cw = centerLabel.split(' ')
  if (cw.length === 1) {
    centerUnit.push(`<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="11" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${tt(centerLabel, 12)}</text>`)
  } else {
    const m = Math.ceil(cw.length / 2)
    centerUnit.push(`<text x="${cx}" y="${cy - 3}" text-anchor="middle" font-size="10" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${tt(cw.slice(0, m).join(' '), 12)}</text>`)
    centerUnit.push(`<text x="${cx}" y="${cy + 11}" text-anchor="middle" font-size="10" fill="${theme.text}" ${FONT_SANS_ATTR} font-weight="700">${tt(cw.slice(m).join(' '), 12)}</text>`)
  }
  parts.push(wrapItem(centerUnit.join(''), 0, animate, instrument))
  if (animate) parts.unshift(seqSpotlightCSS(n + 1, spec, { scale: false }))
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${parts.join('\n  ')}
</svg>`
}
