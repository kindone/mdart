import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, titleEl, renderEmpty, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, roundTextBox, wrapItem, shouldInstrument } from '../shared'

function svgWrap(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const n = items.length
  const W = 440
  const H = 400
  const cx = W / 2
  const cy = H / 2
  const R = 150
  const nodeR = 20

  const parts: string[] = []

  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  // Calculate node positions
  const positions: Array<{ x: number; y: number }> = []
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    positions.push({ x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) })
  }

  // Draw all connections behind nodes (always visible)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = positions[i]
      const b = positions[j]
      parts.push(`<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${theme.textMuted}" stroke-width="1" opacity="0.55"/>`)
    }
  }

  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()

  // Per-node fitting: every node shares nodeR (like circle-process.ts's
  // circles), so each label is sized independently — a short label stays
  // large instead of being dragged down to match a long neighbor. Delegates
  // to shared.ts's fitLabelValueBlock/renderFitBlock (no value here, so
  // hasValue is always false) — replaces the old flat 10-char truncation
  // (fixed font-size 10, single line only, no <title> tooltip).
  const { w: nodeBoxW, h: nodeBoxH } = roundTextBox(nodeR)
  const halo = `stroke="#000000" stroke-opacity="0.4" stroke-width="2.5" paint-order="stroke fill"`

  // Draw nodes on top
  for (let i = 0; i < n; i++) {
    const item = items[i]
    const { x, y } = positions[i]
    const t = i / (n - 1 || 1)
    const fill = lerpColor(theme.primary, theme.secondary, t)

    const { display: lblDisplay, url: lblUrl } = displayLabel(item)
    const fit = fitLabelValueBlock(lblDisplay, null, nodeBoxW, nodeBoxH, {
      labelUrl: lblUrl, labelMaxSize: 10, labelMinSize: 6.5, labelMaxLines: 2, labelMaxLinesNoValue: 2,
    })
    let nodeStr = ''
    nodeStr += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${nodeR}" fill="${fill}" stroke="${theme.bg}" stroke-width="2">${itemTitleTag(item)}</circle>`
    nodeStr += renderFitBlock(x, y, fit, {
      labelFullText: lblDisplay, labelFill: '#ffffff', valueFill: '#ffffff',
      labelWeight: '600', extraAttrs: halo,
    })
    parts.push(wrapItem(nodeStr, i, animate, instrument))
  }

  if (animate) parts.unshift(seqSpotlightCSS(n, spec))
  return svgWrap(W, H, theme, parts)
}
