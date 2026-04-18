import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, tt, titleEl, renderEmpty } from '../shared'

function svgWrap(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

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

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const n = items.length
  const W = 500
  const H = 380
  const cx = W / 2
  const cy = H / 2
  const parts: string[] = []

  if (spec.title) parts.push(titleEl(W, spec.title, theme))

  // Arrow marker for directional indicators
  parts.push(`<defs><marker id="gear-arr" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto"><path d="M0,0.5 L6,3.5 L0,6.5 Z" fill="${theme.muted}dd"/></marker></defs>`)

  if (n === 1) {
    const item = items[0]
    const fill = theme.primary
    parts.push(`<path d="${gearPath(cx, cy, 90, 68, 12, 0)}" fill="${fill}" opacity="0.8"/>`)
    parts.push(`<circle cx="${cx}" cy="${cy}" r="52" fill="${theme.bg}"/>`)
    parts.push(`<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="12" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, 12)}</text>`)
    if (item.value) {
      parts.push(`<text x="${cx}" y="${cy + 20}" text-anchor="middle" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(item.value, 12)}</text>`)
    }
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
      parts.push(`<text x="${gx}" y="${cy + (item.value ? -3 : 5)}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, 12)}</text>`)
      if (item.value) {
        parts.push(`<text x="${gx}" y="${cy + 13}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(item.value, 12)}</text>`)
      }
    })
  } else if (n === 3) {
    // Large center gear + 2 smaller side gears at ±120°
    const centerFill = theme.primary
    parts.push(`<path d="${gearPath(cx, cy, 80, 60, 12, 0)}" fill="${centerFill}" opacity="0.8"/>`)
    parts.push(`<circle cx="${cx}" cy="${cy}" r="46" fill="${theme.bg}"/>`)
    parts.push(`<text x="${cx}" y="${cy + (items[0].value ? -3 : 5)}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(items[0].label, 12)}</text>`)
    if (items[0].value) {
      parts.push(`<text x="${cx}" y="${cy + 13}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(items[0].value, 12)}</text>`)
    }
    const sideAngles = [-Math.PI / 3, Math.PI / 3] // 60° left and right
    // distance between center of large and small gear so they nearly touch
    const dist = 80 + 55 - 5
    ;[1, 2].forEach((idx, si) => {
      const item = items[idx]
      const t = idx / (n - 1)
      const fill = lerpColor(theme.primary, theme.secondary, t)
      const angle = sideAngles[si]
      const gx = cx + dist * Math.cos(angle)
      const gy = cy + dist * Math.sin(angle)
      const phase = Math.PI / 8 // offset phase
      parts.push(`<path d="${gearPath(gx, gy, 55, 40, 8, phase)}" fill="${fill}" opacity="0.8"/>`)
      parts.push(`<circle cx="${gx}" cy="${gy}" r="32" fill="${theme.bg}"/>`)
      parts.push(`<text x="${gx}" y="${gy + (item.value ? -3 : 5)}" text-anchor="middle" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, 10)}</text>`)
      if (item.value) {
        parts.push(`<text x="${gx}" y="${gy + 12}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(item.value, 10)}</text>`)
      }
    })
  } else {
    // n>=4: arrange in circular orbit
    const R = 130
    const outerR = 44, innerR = 32, teeth = 8

    // Draw directional arc arrows between consecutive gears (before gears, so behind them)
    for (let i = 0; i < n; i++) {
      const a1 = (2 * Math.PI * i) / n - Math.PI / 2
      const a2 = (2 * Math.PI * ((i + 1) % n)) / n - Math.PI / 2
      // Arc slightly outside gear ring, going clockwise
      const arcR = R + outerR * 0.55
      const angOffset = outerR / R * 0.9  // angular offset to start/end past gear edge
      const startA = a1 + angOffset
      const endA   = a2 - angOffset
      const x1 = cx + arcR * Math.cos(startA), y1 = cy + arcR * Math.sin(startA)
      const x2 = cx + arcR * Math.cos(endA),   y2 = cy + arcR * Math.sin(endA)
      // Large-arc flag: 0 for short arc (consecutive gears < 180° apart)
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
      parts.push(`<text x="${gx}" y="${gy + (item.value ? -3 : 5)}" text-anchor="middle" font-size="9" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${tt(item.label, 10)}</text>`)
      if (item.value) {
        parts.push(`<text x="${gx}" y="${gy + 11}" text-anchor="middle" font-size="8" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(item.value, 10)}</text>`)
      }
    }
  }

  return svgWrap(W, H, theme, parts)
}
