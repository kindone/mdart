import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { renderDiverging } from './flow-shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  return renderDiverging(spec, theme)
}
