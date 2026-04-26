import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { escapeXml, tt, renderEmpty } from '../shared'

function svg(W: number, H: number, theme: MdArtTheme, title: string | undefined, parts: string[]): string {
  const titleEl = title
    ? `<text x="${W / 2}" y="20" text-anchor="middle" font-size="13" fill="${theme.textMuted}" font-family="system-ui,sans-serif" font-weight="600">${escapeXml(title)}</text>`
    : ''
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;background:${theme.bg};border-radius:8px">
  ${titleEl}
  ${parts.join('\n  ')}
</svg>`
}

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  const items = spec.items
  if (items.length === 0) return renderEmpty(theme)
  const n = items.length
  const cols = n <= 2 ? n : n <= 4 ? 2 : 3
  const rows = Math.ceil(n / cols)
  const W = 560, TITLE_H = spec.title ? 28 : 8, H = TITLE_H + rows * 180 + 20
  const clW = (W - 20) / cols - 10, clH = 168
  const colors = [theme.primary, theme.secondary, theme.accent, theme.primary, theme.secondary]
  const parts: string[] = []
  items.forEach((group, i) => {
    const col = i % cols, row = Math.floor(i / cols)
    const gx = 10 + col * (clW + 10) + clW / 2
    const gy = TITLE_H + 10 + row * (clH + 10) + clH / 2
    const color = colors[i % colors.length]
    parts.push(`<ellipse cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" rx="${(clW / 2).toFixed(1)}" ry="${(clH / 2).toFixed(1)}" fill="${color}14" stroke="${color}55" stroke-width="1.5"/>`)
    parts.push(`<text x="${gx.toFixed(1)}" y="${(gy - clH / 2 + 16).toFixed(1)}" text-anchor="middle" font-size="11" fill="${theme.text}" font-family="system-ui,sans-serif" font-weight="700">${tt(group.label, 16)}</text>`)
    // Layout adapts to member count: 1–3 in a single row, 4–6 in two rows.
    // Circles are pushed outward toward the ellipse boundary instead of
    // sitting in the middle third of the cell.
    const members  = group.children
    const mCount   = Math.min(members.length, 6)
    const mCols    = mCount === 0 ? 1 : (mCount <= 3 ? mCount : Math.ceil(mCount / 2))
    const nRows    = Math.max(1, Math.ceil(mCount / mCols))

    // Spread depends on column count: 2 circles need a wider gap to be big,
    // 3 circles need a tighter spread or the centre runs out of room. These
    // values come from solving "biggest mR" given an ellipse-bounded cell.
    const marginFrac  = mCols <= 1 ? 0 : (mCols === 2 ? 0.26 : 0.18)
    const useableSpan = mCols > 1 ? clW * (1 - 2 * marginFrac) : 0
    const stepSize    = mCols > 1 ? useableSpan / (mCols - 1) : 0

    // mR is limited by ellipse boundary (8px inside) and adjacent-circle gap
    // (8px between). The 40 cap keeps single-member groups from ballooning
    // while letting 2x2 layouts with 1–3 children fill more of the ellipse.
    const ellipseMargin = 8
    const minGap = 8
    const mRFromEllipse = clW / 2 - (mCols > 1 ? useableSpan / 2 : 0) - ellipseMargin
    const mRFromGap     = mCols > 1 ? (stepSize - minGap) / 2 : Infinity
    let mR              = Math.max(13, Math.min(40, Math.floor(Math.min(mRFromEllipse, mRFromGap))))

    // For 2-row layouts the block is positioned as close to the ellipse
    // centre as possible — only pushed down enough to keep the top row
    // clear of the title strip. mR is then clipped iteratively so the
    // bottom row stays inside the ellipse with the same 8px breathing room
    // we already enforce horizontally (no "almost touching" the boundary).
    //
    // titleSlack = clH/2 - (titleHeight + safetyGap) = 84 - (28 + 4) = 52
    // For an offset where top row clears the title: offset >= 2*mR - 52.
    let verticalOffset = nRows === 1 ? 9 : 0
    if (nRows > 1) {
      const xFar = useableSpan / 2
      while (mR > 13) {
        verticalOffset = Math.max(0, 2 * mR - 52)
        const yFar = verticalOffset + mR + 4   // distance from ellipse centre to bottom row
        const rxEff = clW / 2 - ellipseMargin   // shrunk ellipse keeps circles 8px inside
        const ryEff = clH / 2 - ellipseMargin
        if ((xFar * xFar) / ((rxEff - mR) ** 2) + (yFar * yFar) / ((ryEff - mR) ** 2) <= 1) break
        mR--
      }
    }

    const rowSpacing = mR * 2 + 8
    const blockH     = (nRows - 1) * rowSpacing
    const firstRowY  = gy + verticalOffset - blockH / 2

    // Font and label cap track circle size.
    const fontSize = mR >= 22 ? 9 : (mR >= 16 ? 8 : 7)
    const labelMax = Math.max(5, Math.floor(mR * 0.55))

    members.slice(0, 6).forEach((m, j) => {
      const mc = j % mCols, mr = Math.floor(j / mCols)
      const offset = mCols === 1 ? 0 : -useableSpan / 2 + mc * stepSize
      const mx = gx + offset
      const my = firstRowY + mr * rowSpacing
      parts.push(`<circle cx="${mx.toFixed(1)}" cy="${my.toFixed(1)}" r="${mR}" fill="${color}2a" stroke="${color}66" stroke-width="1"/>`)
      parts.push(`<text x="${mx.toFixed(1)}" y="${(my + 4).toFixed(1)}" text-anchor="middle" font-size="${fontSize}" fill="${theme.text}" font-family="system-ui,sans-serif">${tt(m.label, labelMax)}</text>`)
    })
  })
  return svg(W, H, theme, spec.title, parts)
}
