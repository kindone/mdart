import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { renderQuadrantGrid, type QuadrantDef } from './quadrant-grid'

const BCG_QUADS: QuadrantDef[] = [
  { key: 'stars', keywords: ['star'], label: '★ Stars', sub: 'High growth · High share', fill: '#6d28d9', text: '#ffffff' },
  { key: 'questions', keywords: ['question', 'mark'], label: '? Question Marks', sub: 'High growth · Low share', fill: '#b45309', text: '#ffffff' },
  { key: 'cash', keywords: ['cash', 'cow'], label: '$ Cash Cows', sub: 'Low growth · High share', fill: '#047857', text: '#ffffff' },
  { key: 'dogs', keywords: ['dog'], label: '✕ Dogs', sub: 'Low growth · Low share', fill: '#be123c', text: '#ffffff' },
]

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  return renderQuadrantGrid(spec, theme, BCG_QUADS, '← High Market Share', 'Low Market Share →', 12)
}
