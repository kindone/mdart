import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, parseLink, aWrap, itemTitleTag, ellipsisIfDropped, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument, FONT_SANS_ATTR } from '../shared'

const MIN_ROUNDS = 1
const MIN_CONTESTANTS = 2
const TITLE_H_WITH_TITLE = 28
const TITLE_H_NO_TITLE = 8
const LEAF_H_MAX = 240
const ROW_H_MIN = 20
const ROW_H_MAX = 34
const BOX_W = 98
const BOX_H_PAD = 8
const BOX_H_MIN = 16
const GAP = 10
const CONNECTOR_W = 30
const LEFT_PAD = 10
const RIGHT_PAD = 20
const BOTTOM_PAD = 22
const ROUND_LABEL_PAD = 16
const LABEL_MAX_CHARS = 13

interface Slot {
  label: string
  url: string | null
  wins: number
  src?: MdArtItem
}

interface BracketLayout {
  rounds: number
  slots: number
  allRounds: (Slot | null)[][]
  titleH: number
  rowH: number
  boxH: number
  colW: number
  leafH: number
  w: number
  h: number
}

// Each contestant carries a wins counter, summed across three notations:
// - [w] / [win] / [winner]: each occurrence = 1 win
// - [wN]: compact count, e.g. [w3] = 3 wins
// - [champion] / [final] / [semi]: semantic stage shortcuts
// Ties go to first-listed, preserving a stable bracket on user error.
function countWins(attrs: string[], rounds: number): number {
  const STAGE: Record<string, number> = { champion: rounds, final: rounds - 1, semi: rounds - 2 }
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

function contestantFromItem(item: MdArtItem, rounds: number): Slot {
  const { display, url } = parseLink(item.label)
  // bracket already shows winner attrs (w, champion, final) as visible
  // semantic position. Only "other" attrs (e.g. extra notes) drop silently.
  const label = ellipsisIfDropped(item.value ? `${display}: ${item.value}` : display, item, { value: true, attrs: false })
  return { label, url, wins: countWins(item.attrs, rounds), src: item }
}

function buildContestants(spec: MdArtSpec, rounds: number): Slot[] {
  const contestants = spec.items.map(i => contestantFromItem(i, rounds))
  if (contestants.length === 0) contestants.push({ label: 'TBD', url: null, wins: 0 })
  return contestants
}

function buildRounds(spec: MdArtSpec, rounds: number, slots: number): (Slot | null)[][] {
  const contestants = buildContestants(spec, rounds)
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
  return allRounds
}

function resolveLayout(spec: MdArtSpec): BracketLayout {
  const rounds = Math.max(MIN_ROUNDS, Math.ceil(Math.log2(Math.max(spec.items.length, MIN_CONTESTANTS))))
  const slots = Math.pow(2, rounds)
  const titleH = spec.title ? TITLE_H_WITH_TITLE : TITLE_H_NO_TITLE
  const rowH = Math.max(ROW_H_MIN, Math.min(ROW_H_MAX, LEAF_H_MAX / slots))
  const boxH = Math.max(BOX_H_MIN, rowH - BOX_H_PAD)
  const colW = BOX_W + GAP + CONNECTOR_W
  const leafH = slots * rowH
  const allRounds = buildRounds(spec, rounds, slots)

  return {
    rounds,
    slots,
    allRounds,
    titleH,
    rowH,
    boxH,
    colW,
    leafH,
    w: allRounds.length * colW + RIGHT_PAD,
    h: titleH + leafH + BOTTOM_PAD,
  }
}

// A slot is "lost" only when its pair's winner has been decided AND it is not
// them. If the next-round slot is null (pending), neither contestant is faded.
function lostAt(layout: BracketLayout, r: number, sIdx: number, slot: Slot | null): boolean {
  if (!slot || r >= layout.allRounds.length - 1) return false
  const pairIdx = Math.floor(sIdx / 2)
  const nextSlot = layout.allRounds[r + 1][pairIdx]
  if (nextSlot === null) return false
  return nextSlot !== slot
}

function renderTitle(spec: MdArtSpec, theme: MdArtTheme, layout: BracketLayout): string {
  return spec.title
    ? `<text x="${(layout.w/2).toFixed(1)}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" ${FONT_SANS_ATTR} font-weight="600">${escapeXml(spec.title)}</text>`
    : ''
}

function renderSlot(slot: Slot, layout: BracketLayout, theme: MdArtTheme, r: number, s: number, x: number, nodeY: number, isWinner: boolean): string {
  const lost = lostAt(layout, r, s, slot)
  const fill = isWinner ? theme.accent : theme.surface
  const stroke = isWinner ? theme.accent : theme.textMuted
  const fw = isWinner ? '700' : r === 0 ? '400' : '600'
  const op = lost ? '0.45' : '1'
  const boxY = nodeY - layout.boxH / 2
  const tip = slot.src ? itemTitleTag(slot.src) : ''
  return [
    `<rect x="${x}" y="${boxY.toFixed(1)}" width="${BOX_W}" height="${layout.boxH}" rx="3" fill="${fill}" stroke="${stroke}${isWinner ? '' : 'cc'}" stroke-width="1.2" opacity="${op}">${tip}</rect>`,
    aWrap(`<text x="${(x + BOX_W/2).toFixed(1)}" y="${(nodeY + 4).toFixed(1)}" text-anchor="middle" font-size="9" fill="${isWinner ? theme.bg : theme.text}" ${FONT_SANS_ATTR} font-weight="${fw}" opacity="${op}">${tt(slot.label, LABEL_MAX_CHARS)}</text>`, slot.url),
  ].join('')
}

function renderEmptySlot(layout: BracketLayout, theme: MdArtTheme, r: number, x: number, nodeY: number): string {
  // r === 0 is a bye; r > 0 is pending because no winner attr was declared.
  const boxY = nodeY - layout.boxH / 2
  const placeholder = r === 0 ? 'bye' : 'TBD'
  return [
    `<rect x="${x}" y="${boxY.toFixed(1)}" width="${BOX_W}" height="${layout.boxH}" rx="3" fill="none" stroke="${theme.textMuted}55" stroke-width="1" stroke-dasharray="3,2"/>`,
    `<text x="${(x + BOX_W/2).toFixed(1)}" y="${(nodeY + 4).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.textMuted}77" ${FONT_SANS_ATTR}>${placeholder}</text>`,
  ].join('')
}

function renderConnector(layout: BracketLayout, theme: MdArtTheme, r: number, s: number, x: number): string {
  const round = layout.allRounds[r]
  const slotH = layout.leafH / round.length
  const yA = layout.titleH + s * slotH + slotH / 2
  const yB = layout.titleH + (s + 1) * slotH + slotH / 2
  const yMid = (yA + yB) / 2
  const armX = x + BOX_W + GAP
  const nextX = x + layout.colW
  return [
    `<polyline points="${x+BOX_W},${yA.toFixed(1)} ${armX},${yA.toFixed(1)} ${armX},${yMid.toFixed(1)}" fill="none" stroke="${theme.textMuted}aa" stroke-width="1.5"/>`,
    `<polyline points="${x+BOX_W},${yB.toFixed(1)} ${armX},${yB.toFixed(1)} ${armX},${yMid.toFixed(1)}" fill="none" stroke="${theme.textMuted}aa" stroke-width="1.5"/>`,
    `<line x1="${armX}" y1="${yMid.toFixed(1)}" x2="${nextX}" y2="${yMid.toFixed(1)}" stroke="${theme.textMuted}aa" stroke-width="1.5"/>`,
  ].join('')
}

function roundLabel(layout: BracketLayout, r: number, round: (Slot | null)[]): { label: string; fill: string } {
  const total = layout.allRounds.length - 1
  const isWinner = r === total
  const champCrowned = isWinner && round[0] !== null
  const label = isWinner
    ? (champCrowned ? '🏆 Champion' : 'Champion')
    : r === total - 1 ? 'Final' : r === total - 2 && total >= 3 ? 'Semi' : `Round ${r + 1}`
  return { label, fill: champCrowned ? 'accent' : 'muted' }
}

function renderRoundLabel(layout: BracketLayout, theme: MdArtTheme, r: number, round: (Slot | null)[], x: number): string {
  const { label, fill } = roundLabel(layout, r, round)
  return `<text x="${(x + BOX_W/2).toFixed(1)}" y="${(layout.titleH + layout.leafH + ROUND_LABEL_PAD).toFixed(1)}" text-anchor="middle" font-size="8" fill="${fill === 'accent' ? theme.accent : theme.textMuted}" ${FONT_SANS_ATTR}>${label}</text>`
}

function renderRound(layout: BracketLayout, theme: MdArtTheme, r: number, animate: boolean, instrument: boolean): string {
  const roundUnit: string[] = []
  const round = layout.allRounds[r]
  const x = LEFT_PAD + r * layout.colW
  const slotH = layout.leafH / round.length
  const isWinner = r === layout.allRounds.length - 1

  round.forEach((slot, s) => {
    const nodeY = layout.titleH + s * slotH + slotH / 2
    roundUnit.push(slot
      ? renderSlot(slot, layout, theme, r, s, x, nodeY, isWinner)
      : renderEmptySlot(layout, theme, r, x, nodeY))
  })

  roundUnit.push(renderRoundLabel(layout, theme, r, round, x))
  return wrapItem(roundUnit.join(''), r, animate, instrument)
}

function renderConnectors(layout: BracketLayout, theme: MdArtTheme, animate: boolean, instrument: boolean): string[] {
  const connectors: string[] = []
  for (let r = 0; r < layout.allRounds.length - 1; r++) {
    const round = layout.allRounds[r]
    const x = LEFT_PAD + r * layout.colW
    for (let s = 0; s + 1 < round.length; s += 2) {
      connectors.push(wrapItem(renderConnector(layout, theme, r, s, x), r + 1, animate, instrument))
    }
  }
  return connectors
}

function renderSvg(spec: MdArtSpec, theme: MdArtTheme, layout: BracketLayout, animate: boolean, instrument: boolean): string {
  const style = animate ? seqSpotlightCSS(layout.allRounds.length, spec, { scale: false }) : ''
  const rounds = layout.allRounds.map((_round, r) => renderRound(layout, theme, r, animate, instrument))

  return `<svg viewBox="0 0 ${layout.w} ${layout.h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${style}
  ${renderTitle(spec, theme, layout)}
  ${renderConnectors(layout, theme, animate, instrument).join('\n  ')}
  ${rounds.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  return renderSvg(spec, theme, resolveLayout(spec), animate, instrument)
}
