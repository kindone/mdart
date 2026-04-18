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

  const colors = [theme.primary, theme.secondary, theme.accent, theme.muted, ...theme.palette]

  const srcW = items.map(it => Math.max(1, parseFloat((it.value ?? it.attrs[0] ?? '1').replace('%', '')) || 1))
  const totalSrc = srcW.reduce((a, b) => a + b, 0)

  const dstMap = new Map<string, number>()
  type FlowDef = { si: number; dst: string; w: number }
  const flows: FlowDef[] = []
  items.forEach((it, si) => {
    const perChild = srcW[si] / Math.max(it.children.length, 1)
    it.children.forEach(ch => {
      const fw = Math.max(1, parseFloat((ch.value ?? ch.attrs[0] ?? '0').replace('%', '')) || perChild)
      flows.push({ si, dst: ch.label, w: fw })
      dstMap.set(ch.label, (dstMap.get(ch.label) ?? 0) + fw)
    })
  })

  const dstNames = [...dstMap.keys()]
  const totalDst = [...dstMap.values()].reduce((a, b) => a + b, 0) || totalSrc

  const W = 520, TITLE_H = spec.title ? 30 : 10
  const BOX_W = 112, GAP = 8, CONTENT_H = 280
  const H = TITLE_H + CONTENT_H + GAP * 2

  const srcScale = (CONTENT_H - (items.length - 1) * GAP) / totalSrc
  type Node = { y: number; h: number }
  const srcNodes: Node[] = []
  let sy = TITLE_H + GAP
  items.forEach((_, i) => {
    const h = Math.max(18, srcW[i] * srcScale)
    srcNodes.push({ y: sy, h })
    sy += h + GAP
  })

  const dstScale = (CONTENT_H - (dstNames.length - 1) * GAP) / totalDst
  const dstNodes = new Map<string, Node>()
  let dy = TITLE_H + GAP
  dstNames.forEach(name => {
    const h = Math.max(18, (dstMap.get(name) ?? 1) * dstScale)
    dstNodes.set(name, { y: dy, h })
    dy += h + GAP
  })

  const parts: string[] = []
  const srcYCur = srcNodes.map(n => n.y)
  const dstYCur = new Map<string, number>(dstNames.map(n => [n, dstNodes.get(n)!.y]))

  const x0 = BOX_W, x1 = W - BOX_W, mx = (x0 + x1) / 2

  flows.forEach(f => {
    const src = srcNodes[f.si]
    const dst = dstNodes.get(f.dst)
    if (!src || !dst) return
    const fwSrc = (f.w / srcW[f.si]) * src.h
    const fwDst = (f.w / (dstMap.get(f.dst) ?? 1)) * dst.h
    const sy0 = srcYCur[f.si], sy1 = sy0 + fwSrc
    srcYCur[f.si] += fwSrc
    const dy0 = dstYCur.get(f.dst)!, dy1 = dy0 + fwDst
    dstYCur.set(f.dst, dy1)
    const col = colors[f.si % colors.length]
    parts.push(`<path d="M${x0},${sy0.toFixed(1)} C${mx},${sy0.toFixed(1)} ${mx},${dy0.toFixed(1)} ${x1},${dy0.toFixed(1)} L${x1},${dy1.toFixed(1)} C${mx},${dy1.toFixed(1)} ${mx},${sy1.toFixed(1)} ${x0},${sy1.toFixed(1)} Z" fill="${col}3a" stroke="${col}77" stroke-width="0.5"/>`)
  })

  srcNodes.forEach((n, i) => {
    const col = colors[i % colors.length]
    parts.push(`<rect x="0" y="${n.y.toFixed(1)}" width="${BOX_W - 8}" height="${n.h.toFixed(1)}" rx="4" fill="${col}44" stroke="${col}99" stroke-width="1"/>`)
    if (n.h >= 14) parts.push(`<text x="${(BOX_W - 8) / 2}" y="${(n.y + n.h / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif">${tt(items[i].label, 13)}</text>`)
  })

  dstNames.forEach(name => {
    const n = dstNodes.get(name)!
    parts.push(`<rect x="${W - BOX_W + 8}" y="${n.y.toFixed(1)}" width="${BOX_W - 8}" height="${n.h.toFixed(1)}" rx="4" fill="${theme.surface}" stroke="${theme.border}" stroke-width="1"/>`)
    if (n.h >= 14) parts.push(`<text x="${W - (BOX_W - 8) / 2}" y="${(n.y + n.h / 2 + 4).toFixed(1)}" text-anchor="middle" font-size="10" fill="${theme.text}" font-family="system-ui,sans-serif">${tt(name, 13)}</text>`)
  })

  return svg(W, H, theme, spec.title, parts)
}
