import type { MdArtSpec } from '../../parser'
import type { MdArtTheme } from '../../theme'
import { render as renderBracket } from './bracket'

export function render(spec: MdArtSpec, theme: MdArtTheme): string {
  return renderBracket(spec, theme)
}
