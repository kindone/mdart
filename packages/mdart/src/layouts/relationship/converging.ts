import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { renderConverging } from './flow-shared'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  return renderConverging(spec, theme)
}
