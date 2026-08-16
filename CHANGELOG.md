# Changelog

All notable changes to the mdart packages.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). All four packages (`mdart`, `mdart-marked`, `mdart-markdown-it`, `mdart-remark`) are versioned in lockstep.

---

## [Unreleased]

### Added

- **`network` curved edges.** Ring-layout edges are now quadratic Bézier curves bowed outward from the ring centre (actual bow ~10% of chord). Bidi pairs bow to opposite sides for visual separation. New front-matter option `edges: straight` opts back into straight lines; `edges: curved` is explicit default.
- **`boxEdge()` shared helper.** Precise ray–rectangle intersection exported from `layouts/shared.ts`; used by both `network` and `state-machine` for exact anchor points on box faces.

### Changed

- **`network` + `state-machine` arrowhead proximity.** `EDGE_ENTER_PAD` reduced from 10 → 3 px and marker `refX` advanced to the arrow tip so arrowheads land within ~3 px of their target box instead of ~8 px away.

## [0.3.0] — 2026-05-10

### Added

- **Plot family.** New `line-chart`, `scatter`, `area-chart`, `bar-chart` renderers with multi-series support, shaded regions (`shade-x:`, `shade-y:`), reference lines (`ref-x:`, `ref-y:`), per-series attributes (`[smooth]`, `[dashed]`, `[w=4]`, `[nopoints]`, …), Catmull-Rom smoothing (gap-aware), and continuous numeric x-axis when any series uses `(x, y)` pairs. Reference-line labels accept `@ <coord>` for manual perpendicular positioning.
- **Plot front-matter:** `title`, `x:`/`x-axis`, `x-label`/`label-x`, `y-label`/`label-y`, `smooth`, `points`, `line-width` (`lw`), `mode` (group/stack), `grid`, `ticks`.
- **Skill packaging.** The mdart selection guide (`SKILL.md`, `anti-patterns.md`) ships inside the npm tarball at `skills/mdart/`. New scripts: `npm run install:skill`, `npm run regen:skill`. Consumers can install the skill into their project's `.claude/skills/` automatically.
- **Renderer principles doc.** `docs/renderer-principles.md` — abstract, codebase-agnostic guide for renderer design (visibility, affordance completeness, theme over style, determinism, conservation).
- **Typed values via colon.** `- Label: 75`, `- Label: 75%`, `- Label: Q3` now render the value in 10 previously-silent shape-based renderers (pyramid family, cycle family, waterfall, swot).
- **Theme additions.** `mono` theme + `mono-light` variant; `theme.danger`, `theme.warning`, `theme.palette[]` now drive series and statistical layouts.
- **Per-fence theme picker** in the playground; persistent dark/light toggle.
- **Arrow alias.** `->` is normalized to `→` at parse time and works in all four contexts (flow-child prefix, arrow-chain, edges section, front-matter).
- **Soft syntax exchangeability.** `-` and `→` children are both queryable from `item.children` and `item.flowChildren`. Renderers choose which list to walk.
- **Word-wrap.** `wrapLabel(label, perLine, maxLines)` rolled out across 30+ renderers (venn, comparison, matrix-nxm, kanban, pyramid family, layered-arch, plot, …).
- **Link/URL anchors.** Bracketed URLs become clickable `<a>` wrappers in supported renderers.

### Changed

- **Visibility — No Silent Drops.** Every shape across all 101 renderers now embeds `<title>` with the full `Label: value [attrs]` summary; truncated labels render with a `…` cue so users can tell content was cut. Foundation in `layouts/shared.ts`: `itemSummary`, `itemTitleTag`, `displayLabel`, extended `tt`.
- **Parser: YAML-strict colon split.** Paren-, quote-, digit-, whitespace-aware. `\:` is the literal-colon escape. Resolves `direction: A → B` being mis-treated as an arrow chain and similar edge cases.
- **Parser: blank-line tolerance.** Blank lines inside front-matter no longer terminate it; later keys no longer fall through into the legend as series.
- **Reference-line labels** rendered bold with a paint-order halo so they punch through dashed lines.
- **`bullet-list` and `numbered-list`** now render typed values and children.
- **`pros-cons` and `swot`** column-align markers and labels via separate `<tspan>` elements at distinct x-coordinates.
- **`class` renderer** now accepts both `+ name` and `[+] name` (and `-`, `#`, `~`) — implementation matches docs.
- **`cycle`** uses proper circular arcs (was quadratic curves).
- **Light-mode contrast** improvements across cycle/matrix renderers.
- **Strict `noUnusedLocals` / `noUnusedParameters`** enabled in `packages/mdart/tsconfig.json` to prevent steward-side build breakage. Unused params are now prefixed with `_`.

### Fixed

- **Parser:** `direction: A → B` no longer mis-parsed as an arrow chain (regression-protected).
- **Playground:** strips `ANTHROPIC_API_KEY` from Claude spawn env so the CLI uses OAuth subscription billing instead of API-key billing.
- **Pros-cons / SWOT:** test regression caused by column-aligned tspans — fixed assertion to use a same-`<text>`-element matcher.

### Tests

- 106/106 passing (up from 76 in v0.2.1).
- New: 30 plot tests, 5 ref-positioning / grid-tick / front-matter blank-line tests, 3 swot/pros-cons render fixes.

---

## [0.2.1] — 2026-04-23

### Fixed

- Package READMEs use absolute GitHub raw URLs (npm package pages had broken images from `../../docs/…` relative paths).

### Removed

- VS Code Marketplace publish job from CI workflow (no Marketplace account configured yet; can be re-added when publisher + VSCE_PAT are ready).

---

## [0.2.0] — 2026-04-22

### Added

- Full theme system, 97 layouts.

(See git history pre-CHANGELOG for details.)

---

## [0.1.0] — 2026-04-14

Initial public release on npm.

[Unreleased]: https://github.com/kindone/mdart/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/kindone/mdart/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/kindone/mdart/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/kindone/mdart/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/kindone/mdart/releases/tag/v0.1.0
