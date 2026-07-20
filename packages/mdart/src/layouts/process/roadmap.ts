import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { render as renderTimelineH } from './timeline-h'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  return renderTimelineH(spec, theme)
}
