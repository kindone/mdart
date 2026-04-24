import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, renderEmpty, tt } from '../shared'

const DONE_ATTRS = ['done', '✓', 'complete']
const isDone = (it: { attrs: string[] }) => it.attrs.some(a => DONE_ATTRS.includes(a))

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)

  const W      = 480
  const PAD    = 16
  const titleH = spec.title ? 28 : 0

  // Symmetric vertical budgets
  const TOP_PAD            = 8     // yCur → main checkbox top
  const LABEL_BOTTOM       = 23    // yCur → bottom of label text (baseline 20 + descent 3)
  const VALUE_STEP         = 14    // labelY → value baseline
  const GAP_BEFORE_SUBS    = 8     // label/value bottom → first sub checkbox top
  const SUB_BOX            = 12
  const SUB_GAP            = 4     // between consecutive subs
  const BOTTOM_PAD         = 8     // last content bottom → yCur + itemH (matches TOP_PAD)
  const ITEM_GAP           = 6     // between top-level items

  const contentBottom = (item: { value?: string; children: unknown[] }) => {
    // Returns the y-offset (relative to yCur) of the bottom of the last drawn element.
    let y = item.value ? LABEL_BOTTOM + VALUE_STEP : LABEL_BOTTOM
    if (item.children.length > 0) {
      y += GAP_BEFORE_SUBS                                            // first sub top
      y += SUB_BOX + (item.children.length - 1) * (SUB_BOX + SUB_GAP) // cascade
    }
    return y
  }

  const itemHeights = items.map(it => contentBottom(it) + BOTTOM_PAD)
  const totalContent = itemHeights.reduce((a, b) => a + b, 0)
    + ITEM_GAP * Math.max(0, items.length - 1)
  const H = PAD + titleH + totalContent + PAD

  let svgContent = ''
  if (spec.title) {
    svgContent += `<text x="${PAD}" y="${PAD + 16}" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`
  }

  let yCur = PAD + titleH

  for (let i = 0; i < items.length; i++) {
    const item  = items[i]
    const itemH = itemHeights[i]
    const done  = isDone(item)

    // ── Main checkbox + label ───────────────────────────────────────────────
    const boxY   = yCur + TOP_PAD     // 8
    const labelY = yCur + 20

    svgContent += `<rect x="${PAD}" y="${boxY}" width="18" height="18" rx="3" fill="none" stroke="${theme.primary}" stroke-width="1.5" />`
    if (done) {
      const cy = boxY + 9
      svgContent += `<polyline points="${PAD + 4},${cy} ${PAD + 8},${cy + 4} ${PAD + 14},${cy - 4}" fill="none" stroke="${theme.accent}" stroke-width="2" stroke-linecap="round" />`
    }

    const labelStyle = done
      ? `fill="${theme.text}" fill-opacity="0.62" font-style="italic"`
      : `fill="${theme.text}"`
    svgContent += `<text x="${PAD + 26}" y="${labelY}" font-size="12" font-family="system-ui,sans-serif" ${labelStyle}>${tt(item.label, 58)}</text>`

    const extraAttrs = item.attrs.filter(a => !DONE_ATTRS.includes(a))
    if (extraAttrs.length > 0) {
      svgContent += `<text x="${W - PAD}" y="${labelY}" text-anchor="end" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">[${extraAttrs.join(', ')}]</text>`
    }

    // ── Optional description (item.value) ───────────────────────────────────
    let labelZoneBottom = yCur + LABEL_BOTTOM  // 23
    if (item.value) {
      const vy = labelY + VALUE_STEP  // yCur + 34
      svgContent += `<text x="${PAD + 26}" y="${vy}" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(item.value, 70)}</text>`
      labelZoneBottom = yCur + LABEL_BOTTOM + VALUE_STEP  // 37
    }

    // ── Subtasks (children) ─────────────────────────────────────────────────
    const subX = PAD + 32
    // First child box top: labelZoneBottom + GAP_BEFORE_SUBS
    let subTop = labelZoneBottom + GAP_BEFORE_SUBS

    for (const child of item.children) {
      const childDone = isDone(child)
      const cy        = subTop + SUB_BOX / 2
      const cLabelY   = subTop + 10

      svgContent += `<rect x="${subX}" y="${subTop}" width="${SUB_BOX}" height="${SUB_BOX}" rx="2" fill="none" stroke="${theme.primary}" stroke-width="1.2" opacity="0.85" />`
      if (childDone) {
        svgContent += `<polyline points="${subX + 3},${cy} ${subX + 6},${cy + 2.5} ${subX + 10},${cy - 3}" fill="none" stroke="${theme.accent}" stroke-width="1.5" stroke-linecap="round" />`
      }

      const cStyle = childDone
        ? `fill="${theme.text}" fill-opacity="0.55" font-style="italic"`
        : `fill="${theme.text}" fill-opacity="0.85"`
      svgContent += `<text x="${subX + SUB_BOX + 6}" y="${cLabelY}" font-size="10.5" font-family="system-ui,sans-serif" ${cStyle}>${tt(child.label, 62)}</text>`

      subTop += SUB_BOX + SUB_GAP  // 16
    }

    // ── Separator ───────────────────────────────────────────────────────────
    if (i < items.length - 1) {
      const sepY = yCur + itemH + ITEM_GAP / 2
      svgContent += `<line x1="${PAD}" y1="${sepY.toFixed(1)}" x2="${W - PAD}" y2="${sepY.toFixed(1)}" stroke="${theme.border}" stroke-width="0.5" />`
    }

    yCur += itemH + ITEM_GAP
  }

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${svgContent}
  </svg>`
}
