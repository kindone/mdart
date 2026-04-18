import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { render as renderPyramid } from './pyramid'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  return renderPyramid(spec, theme)
}
