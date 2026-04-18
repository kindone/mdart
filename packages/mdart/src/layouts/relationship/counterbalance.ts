import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { render as renderBalance } from './balance'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  return renderBalance(spec, theme)
}
