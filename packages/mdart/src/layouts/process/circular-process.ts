import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, svgWrap, titleEl, renderEmpty, aWrap, itemTitleTag, displayLabel } from '../shared'

function wrapText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if (!cur) { cur = w; continue }
    if (cur.length + 1 + w.length <= maxChars) { cur += ' ' + w }
    else { lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  return lines.length ? lines : [text]
}

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
  const BOX_H = 36
  const hw = BOX_W / 2, hh = BOX_H / 2
  const GAP = 6  // extra px gap between arrow tip and box edge

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
    parts.push(`<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${largeArc},1 ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${theme.accent}55" stroke-width="2" marker-end="url(#cp-arr)"/>`)
  }

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

    // Label — up to 2 wrapped lines normally; when a value is present we
    // limit the label to 1 line and use the second line for the value.
    const { display: itemLabel, url } = displayLabel(item, { value: !!item.value })
    const maxLabelLines = item.value ? 1 : 2
    const lines = wrapText(itemLabel, Math.floor(BOX_W / 6.8)).slice(0, maxLabelLines)
    const lineH = 11
    const valueLine = item.value ?? ''
    const totalLines = lines.length + (valueLine ? 1 : 0)
    const totalH = totalLines * lineH

    // Box + label text wrapped in aWrap for clickable node
    let nodeContent = `<rect x="${rx}" y="${ry}" width="${BOX_W}" height="${BOX_H}" rx="7" fill="${fill}28" stroke="${fill}" stroke-width="1.8">${itemTitleTag(item)}</rect>`
    nodeContent += `<text x="${badgeX}" y="${badgeY}" font-size="8" fill="${fill}" font-family="system-ui,sans-serif" font-weight="800" opacity="0.85">${i + 1}</text>`
    lines.forEach((line, li) => {
      const ty = (by - totalH / 2 + lineH * li + lineH * 0.8).toFixed(1)
      nodeContent += `<text x="${bx.toFixed(1)}" y="${ty}" text-anchor="middle" font-size="10.5" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(line)}</text>`
    })
    if (valueLine) {
      const ty = (by - totalH / 2 + lineH * lines.length + lineH * 0.8).toFixed(1)
      const valMax = Math.floor(BOX_W / 5.5)   // smaller font → more chars fit
      const truncated = valueLine.length > valMax ? valueLine.slice(0, valMax - 1) + '…' : valueLine
      nodeContent += `<text x="${bx.toFixed(1)}" y="${ty}" text-anchor="middle" font-size="9" fill="${theme.text}" opacity="0.7" font-family="system-ui,sans-serif">${escapeXml(truncated)}</text>`
    }
    parts.push(aWrap(nodeContent, url))
  })

  return svgWrap(W, H, theme, undefined, parts)
}
