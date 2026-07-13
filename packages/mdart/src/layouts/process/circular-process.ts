import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, svgWrap, titleEl, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitLabelValueBlock, renderFitBlock, wrapItem, shouldInstrument } from '../shared'

/** Radial clearance from centre of a box to its silhouette edge at angle `a`. */
function boxRadius(hw: number, hh: number, a: number): number {
  const cos = Math.abs(Math.cos(a)), sin = Math.abs(Math.sin(a))
  if (cos < 1e-9) return hh
  if (sin < 1e-9) return hw
  return Math.min(hw / cos, hh / sin)
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const n = items.length

  const W = 500, H = 440
  const titleH = spec.title ? 36 : 8
  const cx = W / 2, cy = titleH + (H - titleH) / 2
  const R = Math.min(160, (H - titleH - 48) / 2)
  const BOX_W = Math.min(104, Math.floor(2 * Math.PI * R / n * 0.70))
  // Taller boxes when values exist: circBoxH grows from 28→48, giving
  // enough budget that valueShare×48=21.6px ≥ 20.8px (2×size-8 lines).
  const anyValue = items.some(it => !!it.value)
  const BOX_H = anyValue ? 56 : 36
  const hw = BOX_W / 2, hh = BOX_H / 2
  const GAP = 6  // extra px gap between arrow tip and box edge

  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  // ── Arrow arcs ──────────────────────────────────────────────────────────────
  parts.push(`<defs><marker id="cp-arr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,1 L7,4 L0,7 Z" fill="${theme.accent}cc"/></marker></defs>`)

  for (let i = 0; i < n; i++) {
    const aFrom = (2 * Math.PI * i / n) - Math.PI / 2
    const aTo   = (2 * Math.PI * ((i + 1) % n) / n) - Math.PI / 2

    // Angle offset to clear each box's silhouette + gap.
    // The arrow travels tangentially along the arc, so we query boxRadius at
    // the tangential direction (radial angle + π/2) rather than the radial angle.
    const offFrom = (boxRadius(hw, hh, aFrom + Math.PI / 2) + GAP) / R
    const offTo   = (boxRadius(hw, hh, aTo   + Math.PI / 2) + GAP) / R

    const sa = aFrom + offFrom
    const ea = aTo   - offTo
    const arcLen = ((ea - sa + 4 * Math.PI) % (2 * Math.PI))
    if (arcLen < 0.05) continue

    const x1 = cx + R * Math.cos(sa), y1 = cy + R * Math.sin(sa)
    const x2 = cx + R * Math.cos(ea), y2 = cy + R * Math.sin(ea)
    const largeArc = arcLen > Math.PI ? 1 : 0
    const arcEl = `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${largeArc},1 ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${theme.accent}55" stroke-width="2" marker-end="url(#cp-arr)"/>`
    const arrIndex = i === n - 1 ? n : i + 1
    parts.push(animate ? `<g class="mdart-arr-n${arrIndex}">${arcEl}</g>` : arcEl)
  }

  // Per-node fitting: every box shares BOX_W, but each label/value pair is
  // sized independently rather than to the diagram's worst-case label — a
  // short label stays large instead of being dragged down to match a long
  // neighbor.
  //
  // Both label and value were also capped at a flat maxLines (1 with a
  // value / 2 without for the label, 1 always for the value) with no
  // boxH — so a smaller font never unlocked an extra line, it just kept
  // shrinking down to the floor before truncating. circBoxH below gives
  // fitTextToWidthShared the real vertical budget, same mechanism as
  // circle-process/waterfall/chevron-process/arrow-process/funnel. The
  // value gets a minority share of that budget (it's the secondary text),
  // enough to wrap to a 2nd line when it's genuinely long — short values
  // still land on 1 line at max size exactly as before.
  const circBoxH = BOX_H - 8
  const displays = items.map(it => displayLabel(it, { value: !!it.value }))

  // ── Nodes ───────────────────────────────────────────────────────────────────
  items.forEach((item, i) => {
    const angle = (2 * Math.PI * i / n) - Math.PI / 2
    const bx = cx + R * Math.cos(angle)
    const by = cy + R * Math.sin(angle)
    // Evenly spaced hue steps so first ≈ last visually for cycling diagrams
    const t = n > 1 ? i / n : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)

    const rx = (bx - hw).toFixed(1), ry = (by - hh).toFixed(1)

    // Step-number badge (top-left corner)
    const badgeX = (bx - hw + 5).toFixed(1)
    const badgeY = (by - hh + 9).toFixed(1)

    const { url, display: itemLabel } = displays[i]
    // 2 lines at the value's own font floor (6) need ~2×(6×1.3)=15.6px —
    // a plain fraction of circBoxH (28px here) can land under that
    // threshold and silently never wrap no matter how long the value is,
    // since the effective per-size line cap floors at 1 before minSize is
    // ever reached. Guarantee at least that floor-line-pair's worth of
    // room so the mechanism can actually engage when genuinely needed.
    const fit = fitLabelValueBlock(itemLabel, item.value, BOX_W - 10, circBoxH, {
      labelMaxSize: 10.5,
      labelMinSize: 6.5,
      labelMaxLines: 2,
      labelMaxLinesNoValue: 3,
      valueMaxSize: 10.5,
      valueMinSize: 6,
      valueMaxLines: 2,
      valueShare: 0.45,
      gap: 0,
    })

    // Box + label text wrapped in aWrap for clickable node
    let nodeContent = `<rect x="${rx}" y="${ry}" width="${BOX_W}" height="${BOX_H}" rx="7" fill="${fill}28" stroke="${fill}" stroke-width="1.8">${itemTitleTag(item)}</rect>`
    nodeContent += `<text x="${badgeX}" y="${badgeY}" font-size="8" fill="${fill}" font-family="system-ui,sans-serif" font-weight="800" opacity="0.85">${i + 1}</text>`
    nodeContent += renderFitBlock(bx, by, fit, {
      labelFullText: itemLabel,
      valueFullText: item.value,
      labelFill: theme.text,
      valueFill: theme.text,
      labelWeight: '600',
      valueExtraAttrs: 'opacity="0.7"',
    })
    const nodeEl = aWrap(nodeContent, url)
    parts.push(wrapItem(nodeEl, i, animate, instrument))
  })

  if (animate) parts.unshift(seqSpotlightCSS(n, spec, { trailingArrowSlot: true }))
  return svgWrap(W, H, theme, undefined, parts)
}
