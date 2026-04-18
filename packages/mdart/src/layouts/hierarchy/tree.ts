import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { render as renderOrgChart } from './org-chart'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  return renderOrgChart(spec, theme)
}
