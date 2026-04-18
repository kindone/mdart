import type { MdArtItem } from '../../parser'

export function countLeaves(item: MdArtItem): number {
  if (item.children.length === 0) return 1
  return item.children.reduce((s, c) => s + countLeaves(c), 0)
}

export function maxDepth(items: MdArtItem[]): number {
  if (items.length === 0) return 0
  return 1 + Math.max(...items.map(i => maxDepth(i.children)))
}

export interface RenderedNode {
  label: string
  x: number
  y: number
  parentX?: number
  parentY?: number
  children: RenderedNode[]
}

export function layoutNodes(
  items: MdArtItem[],
  startX: number,
  y: number,
  totalW: number,
  levelH: number,
  parentCx?: number,
  parentCy?: number,
): RenderedNode[] {
  const totalLeaves = items.reduce((s, i) => s + countLeaves(i), 0) || 1
  let cx = startX
  return items.map(item => {
    const myLeaves = countLeaves(item)
    const myW = (myLeaves / totalLeaves) * totalW
    const nx = cx + myW / 2
    const node: RenderedNode = {
      label: item.label,
      x: nx,
      y,
      parentX: parentCx,
      parentY: parentCy,
      children: layoutNodes(item.children, cx, y + levelH, myW, levelH, nx, y),
    }
    cx += myW
    return node
  })
}

export function flatNodes(nodes: RenderedNode[]): RenderedNode[] {
  return nodes.flatMap(n => [n, ...flatNodes(n.children)])
}
