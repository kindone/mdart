import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, contrastColor, itemTitleTag, displayLabel, shouldAnimate, shouldInstrument, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock } from '../shared'

function renderVerticalProcess(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  const n = items.length
  const W = 400
  const ROW_H = 54
  const PAD = 16
  const NODE_W = 280
  const ARROW_H = 16
  const titleH = spec.title ? 30 : 0
  const H = PAD + titleH + n * ROW_H + (n - 1) * ARROW_H + PAD
  const nodeX = (W - NODE_W) / 2

  // Per-node fitting: every box shares NODE_W, but each label is sized
  // independently rather than to the diagram's worst-case label — a short
  // label stays large instead of being dragged down to match a long
  // neighbor. This fallback previously had no wrap/truncation mechanism at
  // all — a long label just rendered past the box edges unbounded.
  const displays = items.map(item => displayLabel(item, { value: !!item.value }))

  let svgContent = ''
  if (spec.title) {
    svgContent += `<text x="${W / 2}" y="${PAD + 16}" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`
  }

  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()

  for (let i = 0; i < n; i++) {
    const item = items[i]
    const t = n > 1 ? i / (n - 1) : 0.5
    const fill = lerpColor(theme.secondary, theme.primary, t)
    const y = PAD + titleH + i * (ROW_H + ARROW_H)
    const { url: itmUrl, display: itmDisplay } = displays[i]
    const fit = fitLabelValueBlock(itmDisplay, item.value, NODE_W - 24, ROW_H - 12, {
      labelUrl: itmUrl,
      labelMaxSize: 12,
      labelMinSize: 6.5,
      labelMaxLines: 1,
      labelMaxLinesNoValue: 2,
      valueMaxSize: 10.5,
      valueMinSize: 6,
      valueMaxLines: 3,
      valueShare: 0.65,
      gap: 3,
    })
    const cy = y + ROW_H / 2

    // Arrow from previous node lives inside this node's <g> so it fades in together.
    svgContent += `<g${animate ? ` class="mdart-n${i}"` : ''}${instrument ? ` data-item-index="${i}"` : ''}>`
    if (i > 0) {
      const prevT = n > 1 ? (i - 1) / (n - 1) : 0.5
      const prevFill = lerpColor(theme.secondary, theme.primary, prevT)
      const ay = y - ARROW_H + 2
      svgContent += `<polygon points="${W / 2 - 8},${ay} ${W / 2 + 8},${ay} ${W / 2},${ay + ARROW_H - 2}" fill="${prevFill}" />`
    }
    svgContent += `<rect x="${nodeX}" y="${y}" width="${NODE_W}" height="${ROW_H}" rx="6" fill="${fill}" >${itemTitleTag(item)}</rect>`
    svgContent += renderFitBlock(W / 2, cy, fit, {
      labelFullText: itmDisplay,
      valueFullText: item.value,
      labelFill: contrastColor(fill),
      valueFill: contrastColor(fill),
      labelWeight: '600',
      valueExtraAttrs: 'opacity="0.85"',
    })
    svgContent += `</g>`
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${animate ? seqSpotlightCSS(n, spec) : ''}
    ${svgContent}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) {
    return `<svg viewBox="0 0 400 80" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="80" fill="${theme.bg}" rx="6"/>
      <text x="200" y="44" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif">No items</text>
    </svg>`
  }

  const n = items.length
  const W = 700
  const PAD = 20
  const ARROW_W = 18
  const nodeW = Math.min(130, Math.floor((W - PAD * 2 - ARROW_W * (n - 1)) / n))
  const nodeH = 60
  const titleH = spec.title ? 30 : 0          // reserved strip above the boxes
  const H = nodeH + PAD * 2 + titleH

  if (n > 5) return renderVerticalProcess(spec, theme)

  const totalContentW = n * nodeW + (n - 1) * ARROW_W
  const startX = (W - totalContentW) / 2
  const cy = PAD + titleH + nodeH / 2          // centre of boxes, below title strip

  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  let svgContent = ''

  // Per-node fitting: every box shares nodeW, but each label is sized
  // independently rather than to the diagram's worst-case label — replaces
  // the old flat nodeW/7 char-budget wrap (uncapped line count, so a very
  // long label could grow past nodeH with nothing to stop it) plus an
  // arbitrary 12px/11px split between single- and multi-line nodes.
  const displays = items.map(item => displayLabel(item, { value: !!item.value }))

  for (let i = 0; i < n; i++) {
    const item = items[i]
    const x = startX + i * (nodeW + ARROW_W)
    const y = cy - nodeH / 2
    const t = n > 1 ? i / (n - 1) : 0.5
    const fill = lerpColor(theme.secondary, theme.primary, t)
    const { url: itmUrl, display: itmDisplay } = displays[i]
    const fit = fitLabelValueBlock(itmDisplay, item.value, nodeW - 12, nodeH - 12, {
      labelUrl: itmUrl,
      labelMaxSize: 12,
      labelMinSize: 6.5,
      labelMaxLines: 1,
      labelMaxLinesNoValue: 2,
      valueMaxSize: 10.5,
      valueMinSize: 6,
      valueMaxLines: 3,
      valueShare: 0.65,
      gap: 3,
    })

    // Arrow from previous node lives inside this node's <g> so it fades in together.
    svgContent += `<g${animate ? ` class="mdart-n${i}"` : ''}${instrument ? ` data-item-index="${i}"` : ''}>`
    if (i > 0) {
      const ax = x - ARROW_W + 2
      const prevT = n > 1 ? (i - 1) / (n - 1) : 0.5
      const prevFill = lerpColor(theme.secondary, theme.primary, prevT)
      svgContent += `<polygon points="${ax},${cy - 7} ${ax + ARROW_W - 2},${cy} ${ax},${cy + 7}" fill="${prevFill}" />`
    }
    svgContent += `<rect x="${x}" y="${y}" width="${nodeW}" height="${nodeH}" rx="6" fill="${fill}" >${itemTitleTag(item)}</rect>`

    svgContent += renderFitBlock(x + nodeW / 2, cy, fit, {
      labelFullText: itmDisplay,
      valueFullText: item.value,
      labelFill: contrastColor(fill),
      valueFill: contrastColor(fill),
      labelWeight: '600',
      valueExtraAttrs: 'opacity="0.85"',
    })
    svgContent += `</g>`
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${animate ? seqSpotlightCSS(n, spec) : ''}
    ${spec.title ? `<text x="${W / 2}" y="${PAD + 16}" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>` : ''}
    ${svgContent}
  </svg>`
}
