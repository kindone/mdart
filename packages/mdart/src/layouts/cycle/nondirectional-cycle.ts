import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, renderEmpty, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, roundTextBox } from '../shared'

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
  const R = 145
  const nodeR = 22

  const parts: string[] = []

  // Track ring
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${theme.textMuted}" stroke-width="14" opacity="0.45"/>`)

  // Center title
  if (spec.title) {
    parts.push(`<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="12" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(spec.title)}</text>`)
  }

  const animate = shouldAnimate(spec)

  // Per-node fitting: every node shares nodeR (like circle-process.ts's
  // circles), so each label/value pair is sized independently — a short
  // label stays large instead of being dragged down to match a long
  // neighbor. Delegates to shared.ts's fitLabelValueBlock/renderFitBlock,
  // which centralise this exact "value gets a minority boxH share, label
  // reserves what's left, both centred as one block" pattern that used to
  // be hand-rolled per file (circle-process.ts, cycle.ts, donut-cycle.ts,
  // gear-cycle.ts, etc.) — replaces the old flat 10-char truncation (fixed
  // font-size 9/8, single line only, no <title> tooltip).
  const { w: nodeBoxW, h: nodeBoxH } = roundTextBox(nodeR)
  const halo = `stroke="#000000" stroke-opacity="0.4" stroke-width="2.5" paint-order="stroke fill"`

  // Nodes on track
  for (let i = 0; i < n; i++) {
    const item = items[i]
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    const nx = cx + R * Math.cos(angle)
    const ny = cy + R * Math.sin(angle)
    const t = i / (n - 1 || 1)
    const fill = lerpColor(theme.primary, theme.secondary, t)

    const { display: lblDisplay, url: lblUrl } = displayLabel(item, { value: true })
    const fit = fitLabelValueBlock(lblDisplay, item.value, nodeBoxW, nodeBoxH, {
      labelUrl: lblUrl,
      labelMaxSize: 9, labelMinSize: 6.5, labelMaxLines: 2,
      valueMaxSize: 8, valueMinSize: 6,
    })

    let nodeStr = ''
    nodeStr += `<circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="${nodeR}" fill="${fill}">${itemTitleTag(item)}</circle>`
    nodeStr += renderFitBlock(nx, ny, fit, {
      labelFullText: lblDisplay, valueFullText: item.value ?? undefined,
      labelFill: '#ffffff', valueFill: '#ffffff',
      labelWeight: '600', valueWeight: '400',
      extraAttrs: halo,
    })
    parts.push(animate ? `<g class="mdart-n${i}">${nodeStr}</g>` : nodeStr)
  }

  if (animate) parts.unshift(seqSpotlightCSS(n, spec))
  return svgWrap(W, H, theme, parts)
}
