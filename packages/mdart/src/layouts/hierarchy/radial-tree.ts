import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { tt, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const W = 600, H = 500
  const cx = W / 2, cy = H / 2
  let centerLabel: string, branches: MdArtSpec['items']
  if (spec.title) {
    centerLabel = spec.title; branches = spec.items
  } else if (spec.items.length === 1) {
    centerLabel = spec.items[0].label; branches = spec.items[0].children
  } else {
    centerLabel = 'Root'; branches = spec.items
  }

  const n = branches.length || 1
  const R1 = 150, R2 = 72
  const parts: string[] = []

  for (let i = 0; i < n; i++) {
    const unit: string[] = []
    const angle = (2 * Math.PI * i / n) - Math.PI / 2
    const bx = cx + R1 * Math.cos(angle), by = cy + R1 * Math.sin(angle)
    const branch = branches[i]
    unit.push(`<line x1="${cx}" y1="${cy}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="${theme.accent}50" stroke-width="2.5"/>`)

    const subs = branch.children, ns = subs.length
    for (let j = 0; j < ns; j++) {
      const spread = Math.min(Math.PI * 0.5, Math.max(0.4, (ns - 1) * 0.38))
      const sa = ns <= 1 ? angle : angle + (j - (ns - 1) / 2) * (spread / Math.max(ns - 1, 1))
      const sx = bx + R2 * Math.cos(sa), sy = by + R2 * Math.sin(sa)
      const sub = subs[j]
      const { display: subDisplay, url: subUrl } = displayLabel(sub)
      unit.push(`<line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}" stroke="${theme.border}88" stroke-width="1.5"/>`)
      unit.push(`<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="14" fill="${theme.muted}" stroke="${theme.accent}88" stroke-width="1.2">${itemTitleTag(sub)}</circle>`)
      unit.push(aWrap(`<text x="${sx.toFixed(1)}" y="${(sy + 3.5).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.text}" font-family="system-ui,sans-serif">${tt(subDisplay, 9, sub)}</text>`, subUrl))
    }
    const { display: brDisplay, url: brUrl } = displayLabel(branch)
    unit.push(`<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="22" fill="${theme.primary}" stroke="${theme.bg}" stroke-width="2">${itemTitleTag(branch)}</circle>`)
    const ws = brDisplay.split(' ')
    if (ws.length === 1) {
      unit.push(aWrap(`<text x="${bx.toFixed(1)}" y="${(by + 4).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.bg}" font-weight="700" font-family="system-ui,sans-serif">${tt(brDisplay, 9, branch)}</text>`, brUrl))
    } else {
      const m = Math.ceil(ws.length / 2)
      unit.push(aWrap(`<text x="${bx.toFixed(1)}" y="${(by - 1).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.bg}" font-weight="700" font-family="system-ui,sans-serif">${tt(ws.slice(0,m).join(' '), 9)}</text><text x="${bx.toFixed(1)}" y="${(by + 9).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.bg}" font-weight="700" font-family="system-ui,sans-serif">${tt(ws.slice(m).join(' '), 9)}</text>`, brUrl))
    }
    parts.push(wrapItem(unit.join(''), i + 1, animate, instrument))
  }
  const centerUnit: string[] = []
  centerUnit.push(`<circle cx="${cx}" cy="${cy}" r="32" fill="${theme.accent}" stroke="${theme.bg}" stroke-width="2"/>`)
  const cw = centerLabel.split(' ')
  if (cw.length === 1) {
    centerUnit.push(`<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="11" fill="${theme.bg}" font-weight="700" font-family="system-ui,sans-serif">${tt(centerLabel, 12)}</text>`)
  } else {
    const m = Math.ceil(cw.length / 2)
    centerUnit.push(`<text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="10" fill="${theme.bg}" font-weight="700" font-family="system-ui,sans-serif">${tt(cw.slice(0,m).join(' '), 12)}</text>`)
    centerUnit.push(`<text x="${cx}" y="${cy + 11}" text-anchor="middle" font-size="10" fill="${theme.bg}" font-weight="700" font-family="system-ui,sans-serif">${tt(cw.slice(m).join(' '), 12)}</text>`)
  }
  parts.unshift(wrapItem(centerUnit.join(''), 0, animate, instrument))
  if (animate) parts.unshift(seqSpotlightCSS(n + 1, spec, { scale: false }))
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${parts.join('\n  ')}
</svg>`
}
