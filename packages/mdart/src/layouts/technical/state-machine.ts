import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, renderEmpty, aWrap, itemTitleTag, displayLabel, shouldAnimate, seqSpotlightCSS, fitTextToWidthShared, wrapItem, shouldInstrument } from '../shared'

function svgWrap(W: number, H: number, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

/**
 * Exact intersection of a ray from the rectangle centre (cx, cy) in the
 * unit direction (nx, ny) with the rectangle boundary (hw × hh), plus an
 * optional outward padding gap.
 *
 * The old approach — `cx + nx*(hw+pad)`, `cy + ny*(hh+pad)` — traces an
 * *ellipse*, not a rectangle, so diagonal directions land INSIDE the box.
 * SVG then draws the bezier from inside the box outward, and the first place
 * the curve crosses the border happens to be near a corner.  This function
 * returns the correct edge midpoint instead.
 */
function boxEdge(
  cx: number, cy: number,
  nx: number, ny: number,
  hw: number, hh: number,
  pad = 0,
): { x: number; y: number } {
  const tx = Math.abs(nx) > 1e-9 ? (hw + pad) / Math.abs(nx) : Infinity
  const ty = Math.abs(ny) > 1e-9 ? (hh + pad) / Math.abs(ny) : Infinity
  const t  = Math.min(tx, ty)
  return { x: cx + nx * t, y: cy + ny * t }
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const states = spec.items
  if (states.length === 0) return renderEmpty(theme)

  const W = 580
  const TITLE_H = spec.title ? 30 : 8
  const H = 380
  const n = states.length
  const cx = W / 2
  const cy = (H - TITLE_H) / 2 + TITLE_H
  const R = Math.min(150, Math.max(90, 55 + n * 18))
  const STATE_W = 100
  // Taller than the old 30 px so 2-line labels don't clip.
  // boxH budget = STATE_H − 6 = 32 px → 2 lines at font 9 need 23.4 px ✓
  const STATE_H = 38

  const pos = states.map((_, i) => {
    const angle = (2 * Math.PI * i / n) - Math.PI / 2
    return { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) }
  })
  const stateIdx = new Map(states.map((s, i) => [s.label, i]))

  const parts: string[] = []
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  parts.push(`<defs>
    <marker id="sm-a" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
      <path d="M0,0 L7,3.5 L0,7 Z" fill="${theme.accent}99"/>
    </marker>
  </defs>`)

  const transitionSet = new Set<string>()
  states.forEach((state, si) => {
    state.flowChildren.forEach(fc => {
      const ti = stateIdx.get(fc.label) ?? -1
      if (ti >= 0 && si !== ti) transitionSet.add(`${si}-${ti}`)
    })
  })

  // ── Transitions ───────────────────────────────────────────────────────────
  states.forEach((state, si) => {
    const src = pos[si]
    state.flowChildren.forEach((fc) => {
      const ti = stateIdx.get(fc.label) ?? -1
      if (ti < 0) return
      const dst = pos[ti]
      const isSelf = si === ti

      if (isSelf) {
        const bx = src.x + STATE_W / 2
        const by = src.y - STATE_H / 2
        const unit = [
          `<path d="M${(bx - 4).toFixed(1)},${by.toFixed(1)} C${(bx + 26).toFixed(1)},${(by - 28).toFixed(1)} ${(bx + 26).toFixed(1)},${(by + 12).toFixed(1)} ${(bx - 4).toFixed(1)},${(by + STATE_H).toFixed(1)}" fill="none" stroke="${theme.accent}66" stroke-width="1.5" marker-end="url(#sm-a)"/>`,
          fc.value ? `<text x="${(bx + 32).toFixed(1)}" y="${(by - 6).toFixed(1)}" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(fc.value, 12)}</text>` : '',
        ].join('')
        parts.push(wrapItem(unit, si, animate, instrument))
      } else {
        const isBidi = transitionSet.has(`${ti}-${si}`)
        const dx = dst.x - src.x, dy = dst.y - src.y
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        const nx = dx / len, ny = dy / len

        // Correct rectangle-edge attachment — exits/enters the nearest face,
        // not the corner that the old ellipse approximation aimed for.
        const p1 = boxEdge(src.x, src.y,  nx,  ny, STATE_W / 2, STATE_H / 2, 2)
        const p2 = boxEdge(dst.x, dst.y, -nx, -ny, STATE_W / 2, STATE_H / 2, 10)

        const midX = (p1.x + p2.x) / 2, midY = (p1.y + p2.y) / 2
        const toCenterX = cx - midX, toCenterY = cy - midY
        const dot = (-ny) * toCenterX + nx * toCenterY
        const naturalSign = dot < 0 ? 1 : -1

        const curveMag = isBidi ? 44 : 30
        const effectiveSign = (isBidi && si > ti) ? -naturalSign : naturalSign

        const cpx = midX - ny * curveMag * effectiveSign
        const cpy = midY + nx * curveMag * effectiveSign
        const labelOff = curveMag - 12
        const tx = midX - ny * labelOff * effectiveSign
        const ty = midY + nx * labelOff * effectiveSign
        const lw = Math.min((fc.value?.length ?? 0) * 5.5 + 8, 90)
        const unit = [
          `<path d="M${p1.x.toFixed(1)},${p1.y.toFixed(1)} Q${cpx.toFixed(1)},${cpy.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}" fill="none" stroke="${theme.accent}66" stroke-width="1.5" marker-end="url(#sm-a)"/>`,
          fc.value ? `<rect x="${(tx - lw / 2).toFixed(1)}" y="${(ty - 9).toFixed(1)}" width="${lw.toFixed(1)}" height="12" rx="3" fill="${theme.surface}" opacity="0.88"/>` : '',
          fc.value ? `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(fc.value, 14)}</text>` : '',
        ].join('')
        parts.push(wrapItem(unit, ti, animate, instrument))
      }
    })
  })

  // ── Entry arrow ──────────────────────────────────────────────────────────
  const fp = pos[0]
  const dotX = fp.x - STATE_W / 2 - 34
  const entryUnit = [
    `<circle cx="${dotX.toFixed(1)}" cy="${fp.y.toFixed(1)}" r="7" fill="${theme.text}"/>`,
    `<line x1="${(dotX + 7).toFixed(1)}" y1="${fp.y.toFixed(1)}" x2="${(fp.x - STATE_W / 2 - 6).toFixed(1)}" y2="${fp.y.toFixed(1)}" stroke="${theme.text}" stroke-width="2.5" marker-end="url(#sm-a)"/>`,
  ].join('')
  parts.push(wrapItem(entryUnit, 0, animate, instrument))

  // ── State boxes ────────────────────────────────────────────────────────────
  states.forEach((state, i) => {
    const { x, y } = pos[i]
    const lbl = state.label.toLowerCase()
    const isFinal = state.attrs.includes('final') || lbl === 'end' || lbl === 'final'
    const stroke = i === 0 ? theme.primary : isFinal ? theme.accent : `${theme.accent}66`
    const fill = isFinal ? `${theme.accent}18` : theme.surface
    const unit: string[] = []

    if (isFinal) {
      unit.push(`<rect x="${(x - STATE_W/2 - 4).toFixed(1)}" y="${(y - STATE_H/2 - 4).toFixed(1)}" width="${STATE_W + 8}" height="${STATE_H + 8}" rx="9" fill="none" stroke="${theme.accent}" stroke-width="2"/>`)
    }

    // shows.attrs=true since [final] gets a visible double-border treatment
    const { display: stDisplay, url: stUrl } = displayLabel(state, { attrs: true })
    unit.push(
      `<rect x="${(x - STATE_W/2).toFixed(1)}" y="${(y - STATE_H/2).toFixed(1)}" width="${STATE_W}" height="${STATE_H}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="1.5">${itemTitleTag(state)}</rect>`,
    )

    // Adaptive text fitting — wraps to 2 lines instead of hard-truncating at
    // 12 chars, consistent with the other renderers.
    const { fontSize, lineHeight, results: [{ lines, truncated }] } =
      fitTextToWidthShared([stDisplay], STATE_W - 8, {
        maxSize: 11, minSize: 7, maxLines: 2, boxH: STATE_H - 6,
      })
    const tip = truncated ? `<title>${escapeXml(stDisplay)}</title>` : ''
    const firstY = y - ((lines.length - 1) * lineHeight) / 2 + lineHeight * 0.35
    const tspans = lines
      .map((l, li) => `<tspan x="${x.toFixed(1)}" dy="${li === 0 ? 0 : lineHeight.toFixed(1)}">${escapeXml(l)}</tspan>`)
      .join('')
    unit.push(aWrap(`${tip}<text x="${x.toFixed(1)}" y="${firstY.toFixed(1)}" text-anchor="middle" font-size="${fontSize}" fill="${theme.text}" font-family="system-ui,sans-serif">${tspans}</text>`, stUrl))
    parts.push(wrapItem(unit.join(''), i, animate, instrument))
  })

  if (animate) parts.unshift(seqSpotlightCSS(n, spec, { scale: false }))
  return svgWrap(W, H, theme, spec.title, parts)
}
