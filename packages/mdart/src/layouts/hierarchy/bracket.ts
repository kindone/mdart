import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const contestants = spec.items.map(i => i.label)
  if (contestants.length === 0) contestants.push('TBD')
  const rounds = Math.max(1, Math.ceil(Math.log2(Math.max(contestants.length, 2))))
  const slots = Math.pow(2, rounds)
  const leaves: (string | null)[] = [...contestants]
  while (leaves.length < slots) leaves.push(null)

  const allRounds: (string | null)[][] = [leaves]
  for (let r = 1; r <= rounds; r++) {
    const prev = allRounds[r - 1], curr: (string | null)[] = []
    for (let i = 0; i < prev.length; i += 2) curr.push(prev[i] !== null ? prev[i] : prev[i + 1])
    allRounds.push(curr)
  }

  const TITLE_H = spec.title ? 28 : 8
  const ROW_H = Math.max(20, Math.min(34, 240 / slots))
  const BOX_W = 98, BOX_H = Math.max(16, ROW_H - 8)
  const GAP = 10, COL_W = BOX_W + GAP + 30
  const W = allRounds.length * COL_W + 20
  const leafH = slots * ROW_H
  const H = TITLE_H + leafH + 22

  const parts: string[] = []
  if (spec.title) parts.push(`<text x="${(W/2).toFixed(1)}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(spec.title)}</text>`)

  for (let r = 0; r < allRounds.length; r++) {
    const round = allRounds[r], x = 10 + r * COL_W
    const slotH = leafH / round.length
    const isWinner = r === allRounds.length - 1

    for (let s = 0; s < round.length; s++) {
      const label = round[s], nodeY = TITLE_H + s * slotH + slotH / 2, boxY = nodeY - BOX_H / 2
      if (label !== null) {
        const fill = isWinner ? theme.accent : theme.surface
        const stroke = isWinner ? theme.accent : theme.border
        const fw = isWinner ? '700' : r === 0 ? '400' : '600'
        parts.push(`<rect x="${x}" y="${boxY.toFixed(1)}" width="${BOX_W}" height="${BOX_H}" rx="3" fill="${fill}" stroke="${stroke}88" stroke-width="1.2"/>`)
        parts.push(`<text x="${(x + BOX_W/2).toFixed(1)}" y="${(nodeY + 4).toFixed(1)}" text-anchor="middle" font-size="9" fill="${isWinner ? theme.bg : theme.text}" font-family="system-ui,sans-serif" font-weight="${fw}">${tt(label, 13)}</text>`)
      } else {
        parts.push(`<rect x="${x}" y="${boxY.toFixed(1)}" width="${BOX_W}" height="${BOX_H}" rx="3" fill="none" stroke="${theme.border}28" stroke-width="1" stroke-dasharray="3,2"/>`)
        parts.push(`<text x="${(x + BOX_W/2).toFixed(1)}" y="${(nodeY + 4).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.border}44" font-family="system-ui,sans-serif">bye</text>`)
      }
      if (!isWinner && s % 2 === 0 && s + 1 < round.length) {
        const yA = nodeY, yB = TITLE_H + (s + 1) * slotH + slotH / 2, yMid = (yA + yB) / 2
        const armX = x + BOX_W + GAP, nextX = x + COL_W
        parts.push(`<polyline points="${x+BOX_W},${yA.toFixed(1)} ${armX},${yA.toFixed(1)} ${armX},${yMid.toFixed(1)}" fill="none" stroke="${theme.border}55" stroke-width="1.5"/>`)
        parts.push(`<polyline points="${x+BOX_W},${yB.toFixed(1)} ${armX},${yB.toFixed(1)} ${armX},${yMid.toFixed(1)}" fill="none" stroke="${theme.border}55" stroke-width="1.5"/>`)
        parts.push(`<line x1="${armX}" y1="${yMid.toFixed(1)}" x2="${nextX}" y2="${yMid.toFixed(1)}" stroke="${theme.border}55" stroke-width="1.5"/>`)
      }
    }
    const tot = allRounds.length - 1
    const lbl = isWinner ? '🏆 Champion' : r === tot - 1 ? 'Final' : r === tot - 2 && tot >= 3 ? 'Semi' : `Round ${r + 1}`
    parts.push(`<text x="${(x + BOX_W/2).toFixed(1)}" y="${(TITLE_H + leafH + 16).toFixed(1)}" text-anchor="middle" font-size="8" fill="${isWinner ? theme.accent : theme.border + '88'}" font-family="system-ui,sans-serif">${lbl}</text>`)
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${parts.join('\n  ')}
</svg>`
}
