import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { render as renderBendingProcess } from './bending-process'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  return renderBendingProcess(spec, theme)
}
