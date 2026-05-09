import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { renderPlot } from './shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  return renderPlot(spec, theme, 'line')
}
