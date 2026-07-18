import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, parseLink, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

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

  const allLabels: string[] = items.map(it => it.label)
  items.forEach(it => {
    it.flowChildren.forEach(fc => {
      if (!allLabels.includes(fc.label)) allLabels.push(fc.label)
    })
  })

  const n = allLabels.length
  const W = 580, H = 420
  const TITLE_H_net = spec.title ? 30 : 8
  const cx = W / 2, cy = (H + TITLE_H_net) / 2
  const NODE_W = 130, NODE_H = 44
  const maxRH = cy - TITLE_H_net - NODE_H / 2 - 12
  const maxRW = cx - NODE_W / 2 - 8
  const R = Math.min(maxRH, maxRW, Math.max(100, 80 + n * 18))

  const positions = allLabels.map((_, i) => {
    const angle = (2 * Math.PI * i / n) - Math.PI / 2
    return { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) }
  })

  const labelIndex = new Map(allLabels.map((lbl, i) => [lbl, i]))

  const parts: string[] = []
  const edges: string[] = []
  const nodes: string[] = []
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()

  parts.push(`<defs><marker id="net-arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="${theme.textMuted}"/></marker></defs>`)

  items.forEach(item => {
    const si = labelIndex.get(item.label) ?? -1
    if (si < 0) return
    const src = positions[si]
    item.flowChildren.forEach(fc => {
      const ti = labelIndex.get(fc.label) ?? -1
      if (ti < 0) return
      const dst = positions[ti]
      const dx = dst.x - src.x, dy = dst.y - src.y
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const x1 = src.x + (dx / len) * (NODE_W / 2 + 2)
      const y1 = src.y + (dy / len) * (NODE_H / 2 + 2)
      const x2 = dst.x - (dx / len) * (NODE_W / 2 + 10)
      const y2 = dst.y - (dy / len) * (NODE_H / 2 + 6)
      const edge = `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${theme.textMuted}99" stroke-width="1.5" marker-end="url(#net-arr)"/>`
      edges.push(wrapItem(edge, ti, animate, instrument))
    })
  })

  // Find the original item for each label so we can carry value/attrs
  const itemByLabel = new Map(items.map(it => [it.label, it]))
  const topLevelSet = new Set(items.map(it => it.label))
  allLabels.forEach((label, i) => {
    const { x, y } = positions[i]
    const isTop = topLevelSet.has(label)
    const stroke = isTop ? `${theme.accent}bb` : `${theme.muted}aa`
    const fill = isTop ? theme.surface : `${theme.surface}cc`
    const sourceItem = itemByLabel.get(label)
    const { display: lblDisplay, url: lblUrl } = sourceItem
      ? displayLabel(sourceItem, { value: true })
      : parseLink(label)
    const tip = sourceItem ? itemTitleTag(sourceItem) : ''
    const fit = fitLabelValueBlock(lblDisplay, sourceItem?.value, NODE_W - 14, NODE_H - 8, {
      labelUrl: lblUrl,
      labelMaxSize: 11,
      labelMinSize: 7,
      labelMaxLines: 1,
      labelMaxLinesNoValue: 2,
      valueMaxSize: 9,
      valueMinSize: 7,
      valueMaxLines: 1,
      valueShare: 0.34,
    })
    const unit = [
      `<rect x="${(x - NODE_W / 2).toFixed(1)}" y="${(y - NODE_H / 2).toFixed(1)}" width="${NODE_W}" height="${NODE_H}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="1.2">${tip}</rect>`,
      renderFitBlock(x, y, fit, {
        labelFullText: lblDisplay,
        valueFullText: sourceItem?.value,
        labelFill: theme.text,
        valueFill: theme.textMuted,
        labelWeight: '600',
      }),
    ].join('')
    nodes.push(wrapItem(unit, i, animate, instrument))
  })

  const out = [
    ...parts,
    ...edges,
    ...nodes,
  ]
  if (animate) out.unshift(seqSpotlightCSS(n, spec, { scale: false }))
  return svgWrap(W, H, theme, spec.title, out)
}
