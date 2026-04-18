import type { MdArtItem, MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, lerpColor, tt, renderEmpty } from '../shared'

function svg(W: number, H: number, theme: MdArtTheme, parts: string[]): string {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto">
    <rect width="${W}" height="${H}" fill="${theme.bg}" rx="8"/>
    ${parts.join('\n    ')}
  </svg>`
}

function tabPanelContentParts(item: MdArtItem, theme: MdArtTheme, panelY: number, W: number): string[] {
  const cx = W / 2
  const parts: string[] = []
  parts.push(`<text x="${cx}" y="${panelY + 26}" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(item.label)}</text>`)
  if (item.value) {
    parts.push(`<text x="${cx}" y="${panelY + 44}" text-anchor="middle" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${escapeXml(item.value)}</text>`)
  }
  const childRow = item.children.map(c => c.label).join('  ·  ')
  if (childRow) {
    parts.push(`<text x="${cx}" y="${panelY + 62}" text-anchor="middle" font-size="10" fill="${theme.textMuted}" font-family="system-ui,sans-serif">${tt(childRow, 55)}</text>`)
  }
  const subRow = item.children.flatMap(c => c.children).map(c => c.label).join('  ·  ')
  if (subRow) {
    parts.push(`<text x="${cx}" y="${panelY + 78}" text-anchor="middle" font-size="9" fill="${theme.muted}" font-family="system-ui,sans-serif">${tt(subRow, 60)}</text>`)
  }
  return parts
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const W = 500, TAB_H = 28, CONTENT_H = 100, TAB_W = Math.min(110, (W - 8) / items.length)
  const titleH = spec.title ? 30 : 8
  const H = titleH + TAB_H + CONTENT_H + 8
  const activeFill = lerpColor(theme.primary, theme.secondary, 0)
  const parts: string[] = []
  if (spec.title) {
    parts.push(`<text x="${W / 2}" y="22" text-anchor="middle" font-size="13" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${escapeXml(spec.title)}</text>`)
  }

  parts.push(`<g class="mdart-tab-root" data-text-muted="${escapeXml(theme.textMuted)}">`)

  // Tabs (uniform row; active vs inactive styled via fill/stroke — toggled on click)
  items.forEach((item, i) => {
    const tx = 4 + i * (TAB_W + 2)
    const ty = titleH
    const t = items.length > 1 ? i / (items.length - 1) : 0
    const fill = lerpColor(theme.primary, theme.secondary, t)
    const isActive = i === 0
    parts.push(
      `<g class="mdart-tab-hit" data-tab="${i}" data-color="${fill}" style="cursor:pointer">` +
        `<rect class="mdart-tab-rect" x="${tx}" y="${ty}" width="${TAB_W}" height="${TAB_H}" rx="5" ` +
        `fill="${isActive ? fill : `${fill}22`}" ` +
        `${isActive ? '' : `stroke="${fill}55" stroke-width="1"`}/>` +
        `<text class="mdart-tab-label" x="${(tx + TAB_W / 2).toFixed(1)}" y="${(ty + TAB_H / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="10" ` +
        `fill="${isActive ? '#ffffff' : theme.textMuted}" font-family="system-ui,sans-serif" font-weight="${isActive ? '700' : '400'}">${tt(item.label, 12)}</text>` +
      `</g>`,
    )
  })

  const panelY = titleH + TAB_H
  parts.push(
    `<rect class="mdart-tab-content-bg" x="0" y="${panelY}" width="${W}" height="${CONTENT_H}" rx="6" ` +
    `fill="${activeFill}11" stroke="${activeFill}44" stroke-width="1.2"/>`,
  )

  items.forEach((item, i) => {
    const vis = i === 0 ? 'visible' : 'hidden'
    parts.push(`<g class="mdart-tab-panel" data-tab="${i}" visibility="${vis}">`)
    parts.push(...tabPanelContentParts(item, theme, panelY, W))
    parts.push('</g>')
  })

  parts.push('</g>') // mdart-tab-root

  return svg(W, H, theme, parts)
}
