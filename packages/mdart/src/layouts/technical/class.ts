import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, truncate, renderEmpty } from '../shared'

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
  const classes = spec.items
  if (classes.length === 0) return renderEmpty(theme)

  const W = 600
  const TITLE_H = spec.title ? 30 : 8
  const cols = Math.min(classes.length, 3)
  const CLASS_W = Math.min(170, Math.floor((W - 24) / cols) - 12)
  const HEADER_H = 30
  const FIELD_H = 18
  const SEP_H = 6
  const VPAD = 10
  const colGap = (W - cols * CLASS_W) / (cols + 1)

  const classHeights = classes.map(cls => {
    const fields = cls.children.filter(c => !c.label.includes('('))
    const methods = cls.children.filter(c => c.label.includes('('))
    const hasDiv = fields.length > 0 && methods.length > 0
    return HEADER_H + fields.length * FIELD_H + (hasDiv ? SEP_H : 0) + methods.length * FIELD_H + VPAD
  })

  const rows = Math.ceil(classes.length / cols)
  const ROW_H = Math.max(...classHeights) + 20
  const H = TITLE_H + rows * ROW_H + 20

  const parts: string[] = []
  const maxCharsPerField = Math.floor(CLASS_W / 7) - 2

  classes.forEach((cls, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = colGap + col * (CLASS_W + colGap)
    const y = TITLE_H + 12 + row * ROW_H

    const fields = cls.children.filter(c => !c.label.includes('('))
    const methods = cls.children.filter(c => c.label.includes('('))
    const hasDiv = fields.length > 0 && methods.length > 0
    const totalH = classHeights[i]
    const isAbstract = cls.attrs.includes('abstract')
    const isInterface = cls.attrs.includes('interface')
    const isSpecial = isAbstract || isInterface

    parts.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${CLASS_W}" height="${totalH}" rx="5" fill="${theme.surface}" stroke="${theme.accent}77" stroke-width="1.5"/>`,
      `<path d="M${(x+5).toFixed(1)},${y.toFixed(1)} L${(x+CLASS_W-5).toFixed(1)},${y.toFixed(1)} Q${(x+CLASS_W).toFixed(1)},${y.toFixed(1)} ${(x+CLASS_W).toFixed(1)},${(y+5).toFixed(1)} L${(x+CLASS_W).toFixed(1)},${(y+HEADER_H).toFixed(1)} L${x.toFixed(1)},${(y+HEADER_H).toFixed(1)} L${x.toFixed(1)},${(y+5).toFixed(1)} Q${x.toFixed(1)},${y.toFixed(1)} ${(x+5).toFixed(1)},${y.toFixed(1)} Z" fill="${theme.accent}22"/>`,
    )

    if (isSpecial) {
      const stereo = isInterface ? '«interface»' : '«abstract»'
      parts.push(`<text x="${(x + CLASS_W/2).toFixed(1)}" y="${(y + 11).toFixed(1)}" text-anchor="middle" font-size="8" fill="${theme.accent}99" font-family="system-ui,sans-serif">${stereo}</text>`)
    }
    const nameY = isSpecial ? y + 24 : y + 19
    parts.push(
      `<text x="${(x + CLASS_W/2).toFixed(1)}" y="${nameY.toFixed(1)}" text-anchor="middle" font-size="12" fill="${theme.text}" font-family="ui-monospace,monospace" font-weight="700"${isSpecial ? ' font-style="italic"' : ''}>${tt(cls.label, Math.floor(CLASS_W / 7))}</text>`,
      `<line x1="${x.toFixed(1)}" y1="${(y + HEADER_H).toFixed(1)}" x2="${(x + CLASS_W).toFixed(1)}" y2="${(y + HEADER_H).toFixed(1)}" stroke="${theme.accent}44" stroke-width="1"/>`,
    )

    let curY = y + HEADER_H

    fields.forEach((field, fi) => {
      const fy = curY + fi * FIELD_H + 13
      const isPK = field.attrs.includes('PK')
      const isFK = field.attrs.includes('FK')
      const visMatch = field.label.match(/^\[([+\-#~])\]/) ?? field.label.match(/^([+\-#~])/)
      const vis = visMatch ? visMatch[1] + ' ' : '  '
      const raw = field.label.replace(/^\[[+\-#~]\]\s*|^[+\-#~]\s*/, '')
      const color = isPK ? theme.accent : isFK ? '#c4b5fd' : `${theme.textMuted}cc`
      parts.push(`<text x="${(x + 7).toFixed(1)}" y="${fy.toFixed(1)}" font-size="10" fill="${color}" font-family="ui-monospace,monospace">${escapeXml(vis + truncate(raw, maxCharsPerField))}</text>`)
      if (isPK || isFK) {
        const bc = isPK ? theme.accent : '#a78bfa'
        const bx = x + CLASS_W - 26
        parts.push(
          `<rect x="${bx.toFixed(1)}" y="${(fy - 11).toFixed(1)}" width="22" height="12" rx="3" fill="${bc}22" stroke="${bc}55" stroke-width="0.5"/>`,
          `<text x="${(bx + 11).toFixed(1)}" y="${(fy - 1).toFixed(1)}" text-anchor="middle" font-size="8" fill="${bc}" font-family="system-ui,sans-serif" font-weight="600">${isPK ? 'PK' : 'FK'}</text>`,
        )
      }
    })
    curY += fields.length * FIELD_H

    if (hasDiv) {
      parts.push(`<line x1="${x.toFixed(1)}" y1="${(curY + SEP_H/2).toFixed(1)}" x2="${(x + CLASS_W).toFixed(1)}" y2="${(curY + SEP_H/2).toFixed(1)}" stroke="${theme.border}" stroke-width="0.8"/>`)
      curY += SEP_H
    }

    methods.forEach((method, mi) => {
      const my = curY + mi * FIELD_H + 13
      const visMatch = method.label.match(/^\[([+\-#~])\]/) ?? method.label.match(/^([+\-#~])/)
      const vis = visMatch ? visMatch[1] + ' ' : '  '
      const raw = method.label.replace(/^\[[+\-#~]\]\s*|^[+\-#~]\s*/, '')
      const isStatic = method.attrs.includes('static')
      parts.push(`<text x="${(x + 7).toFixed(1)}" y="${my.toFixed(1)}" font-size="10" fill="${theme.primary}cc" font-family="ui-monospace,monospace"${isStatic ? ' text-decoration="underline"' : ''}>${escapeXml(vis + truncate(raw, maxCharsPerField))}</text>`)
    })
  })

  return svgWrap(W, H, theme, spec.title, parts)
}
