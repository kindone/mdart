import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { renderQuadrantGrid, type QuadrantDef } from './quadrant-grid'

const ANSOFF_QUADS: QuadrantDef[] = [
  { key: 'penetration', keywords: ['penetrat'], label: 'Market Penetration', sub: 'Existing product · Existing market', fill: '#047857', text: '#ffffff' },
  { key: 'product-dev', keywords: ['product dev', 'product d', 'new product'], label: 'Product Development', sub: 'New product · Existing market', fill: '#6d28d9', text: '#ffffff' },
  { key: 'market-dev', keywords: ['market dev', 'market d', 'new market'], label: 'Market Development', sub: 'Existing product · New market', fill: '#b45309', text: '#ffffff' },
  { key: 'diversification', keywords: ['divers'], label: 'Diversification', sub: 'New product · New market', fill: '#be123c', text: '#ffffff' },
]

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  return renderQuadrantGrid(spec, theme, ANSOFF_QUADS, 'Existing Products', 'New Products →', 11.5)
}
