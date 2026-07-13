import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, wrapLabel, renderEmpty, parseLink, aWrap, itemTitleTag, ellipsisIfDropped, shouldAnimate, seqSpotlightCSS, wrapItem, shouldInstrument } from '../shared'

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
  type Msg = { from: string; to: string; msg: string }
  const messages: Msg[] = []
  const actors: string[] = []
  const addActor = (name: string) => { if (!actors.includes(name)) actors.push(name) }

  spec.items.forEach(item => {
    addActor(item.label)
    item.flowChildren.forEach(fc => {
      addActor(fc.label)
      messages.push({ from: item.label, to: fc.label, msg: fc.value ?? '' })
    })
  })

  if (actors.length === 0) return renderEmpty(theme)

  const n = actors.length
  const W = 600
  const TITLE_H = spec.title ? 30 : 8
  const MSG_GAP = 36
  const PAD_V = 16

  const COL_W = W / n
  const ax = (i: number) => (i + 0.5) * COL_W
  const bw = Math.min(COL_W - 16, 96)

  // ── Pre-wrap actor names (need max line count before computing H) ─────────
  const ACTOR_LH = 13, ACTOR_VPAD = 7
  const charBudgetActor = Math.max(8, Math.floor((bw - 10) / 6.5))
  const itemByActor = new Map(spec.items.map(it => [it.label, it]))
  const actorRenders = actors.map(actor => {
    const sourceItem = itemByActor.get(actor)
    const { display: rawDisplay, url: actUrl } = parseLink(actor)
    const actDisplay = sourceItem ? ellipsisIfDropped(rawDisplay, sourceItem, { value: false }) : rawDisplay
    const { lines, truncated } = wrapLabel(actDisplay, charBudgetActor, 2)
    const tip = sourceItem ? itemTitleTag(sourceItem) : ''
    return { actDisplay, lines, url: actUrl, tip, truncated }
  })
  const maxActorLines = actorRenders.reduce((m, a) => Math.max(m, a.lines.length), 1)
  const ACTOR_H = ACTOR_VPAD * 2 + maxActorLines * ACTOR_LH

  const H = TITLE_H + ACTOR_H + PAD_V + Math.max(messages.length, 1) * MSG_GAP + PAD_V + 16
  const actorBoxY = TITLE_H + 8
  const lifeY1 = TITLE_H + ACTOR_H + PAD_V
  const lifeY2 = H - 16

  const parts: string[] = []
  const animate = shouldAnimate(spec)
  const instrument = shouldInstrument()
  parts.push(`<defs>
    <marker id="sq-a" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
      <path d="M0,0 L7,3.5 L0,7 Z" fill="${theme.accent}"/>
    </marker>
    <marker id="sq-b" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
      <path d="M0,0 L7,3.5 L0,7 Z" fill="${theme.textMuted}"/>
    </marker>
  </defs>`)

  actorRenders.forEach(({ actDisplay, lines, url: actUrl, tip, truncated }, i) => {
    const x = ax(i)
    const unit: string[] = []
    const textBlockH = lines.length * ACTOR_LH
    const textStartY = actorBoxY + (ACTOR_H - textBlockH) / 2 + ACTOR_LH - 2
    const fullTip = truncated ? `<title>${escapeXml(actDisplay)}</title>` : ''
    const spans = lines.map((l, li) => `<tspan x="${x.toFixed(1)}" dy="${li === 0 ? 0 : ACTOR_LH}">${escapeXml(l)}</tspan>`).join('')
    unit.push(
      `<rect x="${(x - bw/2).toFixed(1)}" y="${actorBoxY.toFixed(1)}" width="${bw.toFixed(1)}" height="${ACTOR_H}" rx="5" fill="${theme.accent}22" stroke="${theme.accent}aa" stroke-width="1.5">${tip}</rect>`,
    )
    unit.push(aWrap(`<text x="${x.toFixed(1)}" y="${textStartY.toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${fullTip}${spans}</text>`, actUrl))
    unit.push(`<line x1="${x.toFixed(1)}" y1="${lifeY1.toFixed(1)}" x2="${x.toFixed(1)}" y2="${lifeY2.toFixed(1)}" stroke="${theme.textMuted}9a" stroke-width="1" stroke-dasharray="4,4"/>`)
    parts.push(wrapItem(unit.join(''), i, animate, instrument))
  })

  messages.forEach((msg, mi) => {
    const y = lifeY1 + PAD_V + mi * MSG_GAP
    const fi = actors.indexOf(msg.from)
    const ti = actors.indexOf(msg.to)
    if (fi < 0 || ti < 0) return

    const x1 = ax(fi)
    const x2 = ax(ti)
    const isSelf = fi === ti

    if (isSelf) {
      const loopExt = COL_W * 0.38
      const lx = x1 + loopExt
      // Left-align label from the lifeline axis (x1). Extend budget all the
      // way to the next lifeline (or SVG right edge) — self-loop rows have no
      // horizontal elements competing for that space.
      const nextLifeline = fi < n - 1 ? ax(fi + 1) : W - 8
      const maxCharsLoop = Math.max(12, Math.floor((nextLifeline - x1 - 8) / 5.0))
      const unit = [
        `<path d="M${x1.toFixed(1)},${y.toFixed(1)} C${lx.toFixed(1)},${(y - 10).toFixed(1)} ${lx.toFixed(1)},${(y + 10).toFixed(1)} ${x1.toFixed(1)},${(y + MSG_GAP * 0.55).toFixed(1)}" fill="none" stroke="${theme.accent}cc" stroke-width="1.5" marker-end="url(#sq-a)"/>`,
        msg.msg ? `<text x="${(x1 + 4).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="start" font-size="9" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(msg.msg, maxCharsLoop)}</text>` : '',
      ].join('')
      parts.push(wrapItem(unit, n + mi, animate, instrument))
    } else {
      const isRet = ti < fi
      const dir = x2 > x1 ? 1 : -1
      const ex1 = x1 + dir * 4
      const ex2 = x2 - dir * 8
      const midX = (ex1 + ex2) / 2
      const maxChars = Math.max(8, Math.floor(Math.abs(ex2 - ex1) / 7))
      const unit = [
        `<line x1="${ex1.toFixed(1)}" y1="${y.toFixed(1)}" x2="${ex2.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${isRet ? theme.textMuted : theme.accent}" stroke-width="1.5"${isRet ? ' stroke-dasharray="5,3"' : ''} marker-end="${isRet ? 'url(#sq-b)' : 'url(#sq-a)'}"/>`,
        msg.msg ? `<text x="${midX.toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(msg.msg, maxChars)}</text>` : '',
      ].join('')
      parts.push(wrapItem(unit, n + mi, animate, instrument))
    }
  })

  if (animate) parts.unshift(seqSpotlightCSS(n + messages.length, spec, { scale: false }))
  return svgWrap(W, H, theme, spec.title, parts)
}
