/**
 * mdart — public API
 *
 * Core rendering and parsing.
 * Browser-only tab interactivity lives at the `mdart/preview` subpath.
 */

export { renderMdArt, renderMdArtDetailed, applyRootSizing, KNOWN_TYPES } from './renderer'
export type { RenderResult }                     from './renderer'
export { parseMdArt }                            from './parser'
export { configureMdArt, resetMdArtConfig }      from './config'
export { validateMdArt }                         from './validator'
export type { MdArtSpec, MdArtItem }             from './parser'
export type { MdArtTheme }                       from './theme'
export type { MdArtConfig, TextBoundsDebugMode } from './config'
export type {
  ValidationIssue,
  ValidationCode,
  ValidationOptions,
  ValidationLevel,
  ValidationLocation,
}                                                from './validator'
export { checkSvg }                              from './heuristics'
export type {
  SvgIssue,
  SvgIssueCode,
  SvgIssueLevel,
  CheckOptions,
}                                                from './heuristics'
