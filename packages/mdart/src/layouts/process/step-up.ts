import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { renderStaircase } from '../shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  return renderStaircase(spec, theme, true)
}
