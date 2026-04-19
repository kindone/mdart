import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, tt, svgWrap, renderEmpty } from '../shared'

function gearPath(cx: number, cy: number, outerR: number, innerR: number, teeth: number, phase: number): string {
  const points: string[] = []
  for (let i = 0; i < teeth * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const angle = phase + (Math.PI / teeth) * i
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`)
  }
  return 'M ' + points.join(' L ') + ' Z'
}

/** Wrap label into up to 2 lines of ≤ maxChars each. Last line truncated with ellipsis if needed. */
function wrapGearText(text: string, maxChars: number): string[] {
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
  if (lines.length === 0) return [tt(text, maxChars)]
  if (lines.length === 1) return lines
  // Cap at 2 lines; fold any overflow into line 2 with ellipsis
  return [lines[0], tt(lines.slice(1).join(' '), maxChars)]
}

/**
 * Emit up to 2 wrapped label lines + optional value line, vertically centred at (gx, gy).
 */
function renderGearLabel(
  parts: string[],
  gx: number, gy: number,
  label: string, value: string | undefined,
  fontSize: number, maxChars: number,
  labelFill: string, theme: MdArtTheme
): void {
  const lines = wrapGearText(label, maxChars)
  const lineH = fontSize + 2
  const valueFontSize = Math.max(fontSize - 2, 8)
  const valueLineH = valueFontSize + 2
  const blockH = lines.length * lineH + (value ? valueLineH : 0)
  // Start y: top of block offset so the whole block is centred on gy.
  // 0.72 * lineH ≈ cap-height for the first baseline.
  let y = gy - blockH / 2 + lineH * 0.72

  for (const line of lines) {
    parts.push(
      `<text x="${gx.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" ` +
      `font-size="${fontSize}" fill="${labelFill}" ` +
      `font-family="system-ui,sans-serif" font-weight="600">${line}</text>`
    )
    y += lineH
  }

  if (value) {
    parts.push(
      `<text x="${gx.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" ` +
      `font-size="${valueFontSize}" fill="${theme.textMuted}" ` +
      `font-family="system-ui,sans-serif">${tt(value, maxChars)}</text>`
    )
  }
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const n = items.length
  const W = 500
  const titleH = spec.title ? 34 : 0
  const H = 380 + titleH
  const cx = W / 2
  const cy = titleH + 190   // content centre stays 190 px into the content area
  const parts: string[] = []

  // Arrow marker for directional indicators
  parts.push(`<defs><marker id="gear-arr" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto"><path d="M0,0.5 L6,3.5 L0,6.5 Z" fill="${theme.muted}dd"/></marker></defs>`)

  if (n === 1) {
    const item = items[0]
    const fill = theme.primary
    parts.push(`<path d="${gearPath(cx, cy, 90, 68, 12, 0)}" fill="${fill}" opacity="0.8"/>`)
    parts.push(`<circle cx="${cx}" cy="${cy}" r="52" fill="${theme.bg}"/>`)
    // inner r=52 → usable chord ~88px at font-size 12 → ~12 chars/line
    renderGearLabel(parts, cx, cy, item.label, item.value, 12, 12, theme.text, theme)

  } else if (n === 2) {
    const outerR = 90, innerR = 68, teeth = 12
    const gapX = outerR * 1.85
    const positions = [cx - gapX / 2, cx + gapX / 2]
    positions.forEach((gx, i) => {
      const item = items[i]
      const t = i / (n - 1 || 1)
      const fill = lerpColor(theme.primary, theme.secondary, t)
      const phase = i * (Math.PI / teeth) // alternate phase so teeth interlock visually
      parts.push(`<path d="${gearPath(gx, cy, outerR, innerR, teeth, phase)}" fill="${fill}" opacity="0.8"/>`)
      parts.push(`<circle cx="${gx}" cy="${cy}" r="52" fill="${theme.bg}"/>`)
      // inner r=52 → ~12 chars/line at font-size 11
      renderGearLabel(parts, gx, cy, item.label, item.value, 11, 12, theme.text, theme)
    })

  } else if (n === 3) {
    // Large center gear + 2 smaller side gears at ±60°
    const centerFill = theme.primary
    parts.push(`<path d="${gearPath(cx, cy, 80, 60, 12, 0)}" fill="${centerFill}" opacity="0.8"/>`)
    parts.push(`<circle cx="${cx}" cy="${cy}" r="46" fill="${theme.bg}"/>`)
    // inner r=46 → ~12 chars/line at font-size 11
    renderGearLabel(parts, cx, cy, items[0].label, items[0].value, 11, 12, theme.text, theme)

    const sideAngles = [-Math.PI / 3, Math.PI / 3]
    const dist = 80 + 55 - 5
    ;[1, 2].forEach((idx, si) => {
      const item = items[idx]
      const t = idx / (n - 1)
      const fill = lerpColor(theme.primary, theme.secondary, t)
      const angle = sideAngles[si]
      const gx = cx + dist * Math.cos(angle)
      const gy = cy + dist * Math.sin(angle)
      const phase = Math.PI / 8
      parts.push(`<path d="${gearPath(gx, gy, 55, 40, 8, phase)}" fill="${fill}" opacity="0.8"/>`)
      parts.push(`<circle cx="${gx}" cy="${gy}" r="32" fill="${theme.bg}"/>`)
      // inner r=32 → ~9 chars/line at font-size 10
      renderGearLabel(parts, gx, gy, item.label, item.value, 10, 9, theme.text, theme)
    })

  } else {
    // n>=4: arrange in circular orbit
    const R = 130
    const outerR = 44, innerR = 32, teeth = 8

    // Draw directional arc arrows between consecutive gears (before gears, so behind them)
    for (let i = 0; i < n; i++) {
      const a1 = (2 * Math.PI * i) / n - Math.PI / 2
      const a2 = (2 * Math.PI * ((i + 1) % n)) / n - Math.PI / 2
      const arcR = R + outerR * 0.55
      const angOffset = outerR / R * 0.9
      const startA = a1 + angOffset
      const endA   = a2 - angOffset
      const x1 = cx + arcR * Math.cos(startA), y1 = cy + arcR * Math.sin(startA)
      const x2 = cx + arcR * Math.cos(endA),   y2 = cy + arcR * Math.sin(endA)
      const sweep = ((endA - startA + 2 * Math.PI) % (2 * Math.PI)) > Math.PI ? 1 : 0
      parts.push(`<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${arcR.toFixed(1)},${arcR.toFixed(1)} 0 ${sweep},1 ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${theme.muted}bb" stroke-width="1.8" marker-end="url(#gear-arr)"/>`)
    }

    for (let i = 0; i < n; i++) {
      const item = items[i]
      const angle = (2 * Math.PI * i) / n - Math.PI / 2
      const gx = cx + R * Math.cos(angle)
      const gy = cy + R * Math.sin(angle)
      const t = i / (n - 1 || 1)
      const fill = lerpColor(theme.primary, theme.secondary, t)
      const phase = i * (Math.PI / (teeth * n))
      parts.push(`<path d="${gearPath(gx, gy, outerR, innerR, teeth, phase)}" fill="${fill}" opacity="0.8"/>`)
      parts.push(`<circle cx="${gx}" cy="${gy}" r="24" fill="${theme.bg}"/>`)
      // inner r=24 → ~7 chars/line at font-size 9
      renderGearLabel(parts, gx, gy, item.label, item.value, 9, 7, theme.text, theme)
    }
  }

  return svgWrap(W, H, theme, spec.title, parts)
}
