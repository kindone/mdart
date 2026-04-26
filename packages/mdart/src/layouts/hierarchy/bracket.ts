import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  // Each contestant carries a wins counter, summed across three notations:
  //   • `[w]` (or `[win]`, `[winner]`)   — repetition: each occurrence = 1 win
  //   • `[wN]`                           — compact: e.g. `[w3]` = 3 wins
  //   • `[champion]` / `[final]` / `[semi]` — semantic stage shortcuts
  // Ties go to first-listed (preserves stable bracket on user error).
  interface Slot { label: string; wins: number }
  const rounds = Math.max(1, Math.ceil(Math.log2(Math.max(spec.items.length, 2))))
  const slots = Math.pow(2, rounds)
  const STAGE: Record<string, number> = { champion: rounds, final: rounds - 1, semi: rounds - 2 }
  const countWins = (attrs: string[]): number => {
    let n = 0
    for (const raw of attrs) {
      const a = raw.toLowerCase()
      if (a === 'w' || a === 'win' || a === 'winner') { n += 1; continue }
      const compact = a.match(/^w(\d+)$/)
      if (compact) { n += parseInt(compact[1], 10) || 0; continue }
      if (a in STAGE) { n = Math.max(n, STAGE[a]); continue }
    }
    return n
  }
  const contestants: Slot[] = spec.items.map(i => ({ label: i.label, wins: countWins(i.attrs) }))
  if (contestants.length === 0) contestants.push({ label: 'TBD', wins: 0 })
  const leaves: (Slot | null)[] = [...contestants]
  while (leaves.length < slots) leaves.push(null)

  // For each pair, advance only if a winner has been declared for this round
  // (i.e., at least one contestant has wins >= r). If neither qualifies, the
  // next-round slot is null — meaning "match not played yet" rather than a
  // forced default. Byes (null-vs-real) still pass the real contestant through.
  const allRounds: (Slot | null)[][] = [leaves]
  for (let r = 1; r <= rounds; r++) {
    const prev = allRounds[r - 1], curr: (Slot | null)[] = []
    for (let i = 0; i < prev.length; i += 2) {
      const a = prev[i], b = prev[i + 1]
      if (!a && !b) { curr.push(null); continue }
      if (!a)       { curr.push(b);    continue }
      if (!b)       { curr.push(a);    continue }
      const aQual = a.wins >= r, bQual = b.wins >= r
      if      (aQual && bQual) curr.push(a.wins >= b.wins ? a : b)  // both claim → highest (tie: first)
      else if (aQual)          curr.push(a)
      else if (bQual)          curr.push(b)
      else                     curr.push(null)                      // pending — match not played
    }
    allRounds.push(curr)
  }

  // A slot is "lost" only when its pair's winner has been decided AND it's
  // not them. If the next-round slot is null (pending), neither contestant
  // is faded — they're both still in the running.
  const lostAt = (r: number, sIdx: number, slot: Slot | null): boolean => {
    if (!slot || r >= allRounds.length - 1) return false
    const pairIdx  = Math.floor(sIdx / 2)
    const nextSlot = allRounds[r + 1][pairIdx]
    if (nextSlot === null) return false
    return nextSlot !== slot
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
      const slot = round[s], nodeY = TITLE_H + s * slotH + slotH / 2, boxY = nodeY - BOX_H / 2
      if (slot !== null) {
        const lost   = lostAt(r, s, slot)
        const fill   = isWinner ? theme.accent : theme.surface
        const stroke = isWinner ? theme.accent : theme.textMuted
        const fw     = isWinner ? '700' : r === 0 ? '400' : '600'
        const op     = lost ? '0.45' : '1'
        parts.push(`<rect x="${x}" y="${boxY.toFixed(1)}" width="${BOX_W}" height="${BOX_H}" rx="3" fill="${fill}" stroke="${stroke}${isWinner ? '' : 'cc'}" stroke-width="1.2" opacity="${op}"/>`)
        parts.push(`<text x="${(x + BOX_W/2).toFixed(1)}" y="${(nodeY + 4).toFixed(1)}" text-anchor="middle" font-size="9" fill="${isWinner ? theme.bg : theme.text}" font-family="system-ui,sans-serif" font-weight="${fw}" opacity="${op}">${tt(slot.label, 13)}</text>`)
      } else {
        // Distinguish two empty-slot reasons:
        //   r === 0  → bye (not enough contestants for a power-of-two field)
        //   r  >  0  → match pending (winner not yet declared via [w] attrs)
        const placeholder = r === 0 ? 'bye' : 'TBD'
        parts.push(`<rect x="${x}" y="${boxY.toFixed(1)}" width="${BOX_W}" height="${BOX_H}" rx="3" fill="none" stroke="${theme.textMuted}55" stroke-width="1" stroke-dasharray="3,2"/>`)
        parts.push(`<text x="${(x + BOX_W/2).toFixed(1)}" y="${(nodeY + 4).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.textMuted}77" font-family="system-ui,sans-serif">${placeholder}</text>`)
      }
      if (!isWinner && s % 2 === 0 && s + 1 < round.length) {
        const yA = nodeY, yB = TITLE_H + (s + 1) * slotH + slotH / 2, yMid = (yA + yB) / 2
        const armX = x + BOX_W + GAP, nextX = x + COL_W
        parts.push(`<polyline points="${x+BOX_W},${yA.toFixed(1)} ${armX},${yA.toFixed(1)} ${armX},${yMid.toFixed(1)}" fill="none" stroke="${theme.textMuted}aa" stroke-width="1.5"/>`)
        parts.push(`<polyline points="${x+BOX_W},${yB.toFixed(1)} ${armX},${yB.toFixed(1)} ${armX},${yMid.toFixed(1)}" fill="none" stroke="${theme.textMuted}aa" stroke-width="1.5"/>`)
        parts.push(`<line x1="${armX}" y1="${yMid.toFixed(1)}" x2="${nextX}" y2="${yMid.toFixed(1)}" stroke="${theme.textMuted}aa" stroke-width="1.5"/>`)
      }
    }
    const tot = allRounds.length - 1
    const champCrowned = isWinner && round[0] !== null
    const lbl = isWinner
      ? (champCrowned ? '🏆 Champion' : 'Champion')
      : r === tot - 1 ? 'Final' : r === tot - 2 && tot >= 3 ? 'Semi' : `Round ${r + 1}`
    parts.push(`<text x="${(x + BOX_W/2).toFixed(1)}" y="${(TITLE_H + leafH + 16).toFixed(1)}" text-anchor="middle" font-size="8" fill="${champCrowned ? theme.accent : theme.textMuted}" font-family="system-ui,sans-serif">${lbl}</text>`)
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${parts.join('\n  ')}
</svg>`
}
