import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { render as renderGantt } from './gantt'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  return renderGantt(spec, theme)
}
