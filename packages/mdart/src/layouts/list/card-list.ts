import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, tt, renderEmpty, parseLink, aWrap, wrapLabel, itemTitleTag } from '../shared'

function svg(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

// ── Per-child layout ──────────────────────────────────────────────────────────

interface WrapResult { lines: string[]; truncated: boolean; url: string | null }

interface ChildLayout {
  isKV:      boolean
  keyWrap:   WrapResult | null   // key label (isKV only)
  valWrap:   WrapResult | null   // value text (isKV only)
  plainWrap: WrapResult | null   // plain label (!isKV)
  slotH:     number              // total vertical advance for this child
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const W        = 500
  const n        = Math.min(items.length, 4)
  const GAP      = 8
  const HEADER_H = 32
  const VALUE_H  = 18         // subtitle slot under the header band

  // Multi-line child metrics
  const KV_KEY_FS  = 10, KV_KEY_LH = 12   // key: 10 px bold
  const KV_VAL_FS  = 9,  KV_VAL_LH = 11   // value: 9 px regular
  const KV_INNER_G = 2                     // gap between key block and value block
  const KV_OUTER_G = 6                     // gap after value (before next child)
  const PLAIN_FS   = 10, PLAIN_LH = 13     // plain row: 10 px
  const PLAIN_G    = 5                     // gap after plain row
  const CHILD_PAD  = 8                     // space above first and below last child

  const slice   = items.slice(0, n)
  const anyVal  = slice.some(it => it.value)
  const valueH  = anyVal ? VALUE_H : 0
  const CARD_W  = (W - (n - 1) * GAP) / n
  const innerW  = Math.max(40, CARD_W - 20)   // 10 px padding each side

  // px/char estimates: ~6 px @ 11 px bold, ~5.5 px @ 10 px, ~5 px @ 9 px
  const headerMax = Math.max(4, Math.floor(innerW / 6.0))
  const valueMax  = Math.max(6, Math.floor(innerW / 5.5))
  const childMax  = Math.max(4, Math.floor(innerW / 5.5))

  // Pre-compute per-child layouts for every card (drives CARD_H)
  const cardLayouts: ChildLayout[][] = slice.map(item =>
    item.children.map((ch): ChildLayout => {
      if (ch.value) {
        const kw = wrapLabel(ch.label, childMax, 2)
        const vw = wrapLabel(ch.value,  childMax, 3)
        return {
          isKV: true, keyWrap: kw, valWrap: vw, plainWrap: null,
          slotH: kw.lines.length * KV_KEY_LH + KV_INNER_G + vw.lines.length * KV_VAL_LH + KV_OUTER_G,
        }
      } else {
        const pw = wrapLabel(ch.label, childMax, 3)
        return {
          isKV: false, keyWrap: null, valWrap: null, plainWrap: pw,
          slotH: pw.lines.length * PLAIN_LH + PLAIN_G,
        }
      }
    })
  )

  const minChildH = 2 * (PLAIN_LH + PLAIN_G)   // floor: two plain single-line rows
  const maxChildH = Math.max(...cardLayouts.map(cls => cls.reduce((h, cl) => h + cl.slotH, 0)), minChildH)

  const CARD_H = HEADER_H + valueH + CHILD_PAD + maxChildH + CHILD_PAD
  const titleH = spec.title ? 30 : 8
  const H      = titleH + CARD_H + 8

  const parts: string[] = []
  if (spec.title) parts.push(`<text x="${W/2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`)

  slice.forEach((item, i) => {
    const x    = i * (CARD_W + GAP), y = titleH
    const t    = n > 1 ? i / (n - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    const cx   = (x + CARD_W / 2).toFixed(1)

    // Card body + coloured header band — tooltip on the whole card body
    parts.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${CARD_W.toFixed(1)}" height="${CARD_H}" rx="7" fill="${theme.surface}" stroke="${fill}66" stroke-width="1.2">${itemTitleTag(item)}</rect>`)
    parts.push(`<path d="M${(x+7).toFixed(1)},${y.toFixed(1)} Q${x.toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${(y+7).toFixed(1)} L${x.toFixed(1)},${(y+HEADER_H).toFixed(1)} L${(x+CARD_W).toFixed(1)},${(y+HEADER_H).toFixed(1)} L${(x+CARD_W).toFixed(1)},${(y+7).toFixed(1)} Q${(x+CARD_W).toFixed(1)},${y.toFixed(1)} ${(x+CARD_W-7).toFixed(1)},${y.toFixed(1)} Z" fill="${fill}"/>`)

    // Header label
    const { display: lblDisplay, url: lblUrl } = parseLink(item.label)
    parts.push(aWrap(`<text x="${cx}" y="${(y+HEADER_H/2+4).toFixed(1)}" text-anchor="middle" font-size="11" fill="#fff" font-family="system-ui,sans-serif" font-weight="700">${tt(lblDisplay, headerMax)}</text>`, lblUrl))

    // Optional subtitle (item.value) under the header band
    if (anyVal && item.value) {
      parts.push(`<text x="${cx}" y="${(y+HEADER_H+13).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" fill-opacity="0.85" font-family="system-ui,sans-serif" font-style="italic">${tt(item.value, valueMax)}</text>`)
    }

    // Children — multi-line, key:value pairs stack; plain rows centred
    let rowTop = y + HEADER_H + valueH + CHILD_PAD
    cardLayouts[i].forEach((cl, ci) => {
      const child = item.children[ci]
      if (cl.isKV) {
        const kw = cl.keyWrap!
        const vw = cl.valWrap!
        // Key block
        const keyTip   = kw.truncated ? `<title>${escapeXml(child.label)}</title>` : ''
        const keySpans = kw.lines.map((l, li) => `<tspan x="${cx}" dy="${li === 0 ? 0 : KV_KEY_LH}">${escapeXml(l)}</tspan>`).join('')
        parts.push(aWrap(`<text x="${cx}" y="${(rowTop + KV_KEY_FS).toFixed(1)}" text-anchor="middle" font-size="${KV_KEY_FS}" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${keyTip}${keySpans}</text>`, kw.url))
        // Value block — starts after all key lines + inner gap
        const valY     = rowTop + kw.lines.length * KV_KEY_LH + KV_INNER_G + KV_VAL_FS
        const valTip   = vw.truncated ? `<title>${escapeXml(child.value!)}</title>` : ''
        const valSpans = vw.lines.map((l, li) => `<tspan x="${cx}" dy="${li === 0 ? 0 : KV_VAL_LH}">${escapeXml(l)}</tspan>`).join('')
        parts.push(aWrap(`<text x="${cx}" y="${valY.toFixed(1)}" text-anchor="middle" font-size="${KV_VAL_FS}" fill="${theme.text}" font-family="system-ui,sans-serif">${valTip}${valSpans}</text>`, vw.url))
      } else {
        const pw = cl.plainWrap!
        const tip   = pw.truncated ? `<title>${escapeXml(child.label)}</title>` : ''
        const spans = pw.lines.map((l, li) => `<tspan x="${cx}" dy="${li === 0 ? 0 : PLAIN_LH}">${escapeXml(l)}</tspan>`).join('')
        parts.push(aWrap(`<text x="${cx}" y="${(rowTop + PLAIN_FS).toFixed(1)}" text-anchor="middle" font-size="${PLAIN_FS}" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tip}${spans}</text>`, pw.url))
      }
      rowTop += cl.slotH
    })
  })

  return svg(W, H, theme, parts)
}
