import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { lerpColor, titleEl, tt, renderEmpty } from '../shared'

function svgWrapProcess(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const W = 560
  const LABEL_W = 56, LANE_H = 44, GAP = 1
  const titleH = spec.title ? 28 : 8
  const H = titleH + items.length * (LANE_H + GAP) + 8
  const parts: string[] = []
  if (spec.title) parts.push(titleEl(W, spec.title, theme))
  parts.push(`<defs><marker id="sl-arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><polygon points="0,0 6,3 0,6" fill="${theme.muted}"/></marker></defs>`)

  items.forEach((item, i) => {
    const y = titleH + i * (LANE_H + GAP)
    const t = items.length > 1 ? i / (items.length - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    parts.push(`<rect x="0" y="${y.toFixed(1)}" width="${W}" height="${LANE_H}" fill="${fill}0a"/>`)
    if (i > 0) parts.push(`<line x1="0" y1="${y.toFixed(1)}" x2="${W}" y2="${y.toFixed(1)}" stroke="${theme.border}" stroke-width="0.5"/>`)
    parts.push(`<rect x="2" y="${(y + 2).toFixed(1)}" width="${LABEL_W - 4}" height="${LANE_H - 4}" rx="4" fill="${fill}33" stroke="${fill}66" stroke-width="1"/>`)
    parts.push(`<text x="${(LABEL_W / 2).toFixed(1)}" y="${(y + LANE_H / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${tt(item.label, 9)}</text>`)
    const steps = item.children
    const stepW = steps.length > 0 ? Math.min(90, (W - LABEL_W - 8) / steps.length - 6) : 0
    const stepGap = steps.length > 1 ? ((W - LABEL_W - 8) - steps.length * stepW) / (steps.length - 1) : 0
    steps.forEach((step, si) => {
      const sx = LABEL_W + 4 + si * (stepW + stepGap)
      const sy = y + (LANE_H - 28) / 2
      const isDone = step.attrs.includes('done')
      const stepFill = isDone ? theme.accent : fill
      parts.push(`<rect x="${sx.toFixed(1)}" y="${sy.toFixed(1)}" width="${stepW.toFixed(1)}" height="28" rx="4" fill="${stepFill}${isDone ? '44' : '22'}" stroke="${stepFill}${isDone ? '99' : '66'}" stroke-width="1"/>`)
      parts.push(`<text x="${(sx + stepW / 2).toFixed(1)}" y="${(sy + 17).toFixed(1)}" text-anchor="middle" font-size="9" fill="${isDone ? theme.text : theme.textMuted}" font-family="system-ui,sans-serif" font-weight="${isDone ? '600' : '400'}">${tt(step.label, Math.floor(stepW / 5))}</text>`)
      if (si < steps.length - 1) {
        const ax1 = sx + stepW + 2, ax2 = sx + stepW + stepGap - 4
        parts.push(`<line x1="${ax1.toFixed(1)}" y1="${(sy + 14).toFixed(1)}" x2="${ax2.toFixed(1)}" y2="${(sy + 14).toFixed(1)}" stroke="${theme.muted}" stroke-width="1" marker-end="url(#sl-arr)"/>`)
      }
    })
  })
  return svgWrapProcess(W, H, theme, parts)
}
