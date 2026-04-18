import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, renderEmpty } from '../shared'

function svgWrap(W: number, H: number, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
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
  const STATE_W = 100, STATE_H = 30

  const pos = states.map((_, i) => {
    const angle = (2 * Math.PI * i / n) - Math.PI / 2
    return { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) }
  })
  const stateIdx = new Map(states.map((s, i) => [s.label, i]))

  const parts: string[] = []
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
        parts.push(
          `<path d="M${(bx - 4).toFixed(1)},${by.toFixed(1)} C${(bx + 26).toFixed(1)},${(by - 28).toFixed(1)} ${(bx + 26).toFixed(1)},${(by + 12).toFixed(1)} ${(bx - 4).toFixed(1)},${(by + STATE_H).toFixed(1)}" fill="none" stroke="${theme.accent}66" stroke-width="1.5" marker-end="url(#sm-a)"/>`,
          fc.value ? `<text x="${(bx + 32).toFixed(1)}" y="${(by - 6).toFixed(1)}" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(fc.value, 12)}</text>` : '',
        )
      } else {
        const isBidi = transitionSet.has(`${ti}-${si}`)
        const dx = dst.x - src.x, dy = dst.y - src.y
        const len = Math.sqrt(dx * dx + dy * dy) || 1
        const nx = dx / len, ny = dy / len
        const x1 = src.x + nx * (STATE_W / 2 + 2)
        const y1 = src.y + ny * (STATE_H / 2 + 2)
        const x2 = dst.x - nx * (STATE_W / 2 + 10)
        const y2 = dst.y - ny * (STATE_H / 2 + 8)
        const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2
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
        parts.push(
          `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} Q${cpx.toFixed(1)},${cpy.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${theme.accent}66" stroke-width="1.5" marker-end="url(#sm-a)"/>`,
          fc.value ? `<rect x="${(tx - lw / 2).toFixed(1)}" y="${(ty - 9).toFixed(1)}" width="${lw.toFixed(1)}" height="12" rx="3" fill="${theme.surface}" opacity="0.88"/>` : '',
          fc.value ? `<text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="middle" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(fc.value, 14)}</text>` : '',
        )
      }
    })
  })

  const fp = pos[0]
  const dotX = fp.x - STATE_W / 2 - 34
  parts.push(
    `<circle cx="${dotX.toFixed(1)}" cy="${fp.y.toFixed(1)}" r="7" fill="${theme.text}"/>`,
    `<line x1="${(dotX + 7).toFixed(1)}" y1="${fp.y.toFixed(1)}" x2="${(fp.x - STATE_W / 2 - 6).toFixed(1)}" y2="${fp.y.toFixed(1)}" stroke="${theme.text}" stroke-width="2.5" marker-end="url(#sm-a)"/>`,
  )

  states.forEach((state, i) => {
    const { x, y } = pos[i]
    const lbl = state.label.toLowerCase()
    const isFinal = state.attrs.includes('final') || lbl === 'end' || lbl === 'final'
    const stroke = i === 0 ? theme.primary : isFinal ? theme.accent : `${theme.accent}66`
    const fill = isFinal ? `${theme.accent}18` : theme.surface

    if (isFinal) {
      parts.push(`<rect x="${(x - STATE_W/2 - 4).toFixed(1)}" y="${(y - STATE_H/2 - 4).toFixed(1)}" width="${STATE_W + 8}" height="${STATE_H + 8}" rx="9" fill="none" stroke="${theme.accent}" stroke-width="2"/>`)
    }
    parts.push(
      `<rect x="${(x - STATE_W/2).toFixed(1)}" y="${(y - STATE_H/2).toFixed(1)}" width="${STATE_W}" height="${STATE_H}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`,
      `<text x="${x.toFixed(1)}" y="${(y + 5).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif">${tt(state.label, 12)}</text>`,
    )
  })

  return svgWrap(W, H, theme, spec.title, parts)
}
