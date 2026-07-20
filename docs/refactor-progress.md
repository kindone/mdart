# Renderer Refactor Progress

Tracking renderers that have been modularized into named geometry constants,
layout/measurement helpers, and smaller SVG emission helpers.

| Family | Type | Status | Notes |
|---|---|---|---|
| List | `bullet-list` | Done | Item measurement/placement, marker/label/value/child/divider renderers, SVG wrapper split |
| List | `numbered-list` | Done | Item measurement/placement, badge/label/value/child/divider renderers, SVG wrapper split |
| List | `block-list` | Done | Grid row measurement, cell placement, shape/label/value/child renderers, SVG wrapper split |
| List | `card-list` | Done | Card deck measurement, child slot layout, header/value/child/card renderers, SVG wrapper split |
| List | `checklist` | Done | Completion parsing, item/subtask measurement, checkbox/text/subtask/separator renderers, SVG wrapper split |
| List | `zigzag-list` | Done | Dynamic row layout, fitted value lines, node renderer split |
| List | `two-column-list` | Done | Column split, row measurement, item/divider renderers, SVG wrapper split |
| List | `timeline-list` | Done | Card measurement/placement, backbone, card shape/text renderers, SVG wrapper split |
| List | `chevron-list` | Done | Row placement, chevron path, label/caption renderers, SVG wrapper split |
| List | `ribbon-list` | Done | Row placement, ribbon shape, label/caption renderers, SVG wrapper split |
| List | `circle-list` | Done | Row measurement/placement, connector, marker/label/caption renderers, SVG wrapper split |
| List | `icon-list` | Done | Icon extraction, row measurement/placement, marker/label/caption/divider renderers, SVG wrapper split |
| List | `hexagon-list` | Done | Hex grid measurement/placement, shape/text renderers, SVG wrapper split |
| List | `tab-list` | Done | Panel measurement, tab/panel/text renderers, tab root and SVG wrapper split |
| List | `trapezoid-list` | Done | Band measurement, trapezoid geometry, label/caption/band renderers, SVG wrapper split |
| Process | `segmented-bar` | Done | Weight/segment measurement, segment placement, shape/label/percent renderers, SVG wrapper split |
| Process | `equation` | Done | Equation card measurement, child slot fitting, card/operator renderers, SVG wrapper split |
| Process | `phase-process` | Done | Phase column measurement, phase placement, shell/header/child renderers, SVG wrapper split |
| Process | `waterfall` | Done | Step geometry, connector rendering, per-node text fitting, node/SVG wrapper split |
| Process | `process` | Done | Horizontal/vertical layout resolution, node placement, arrow/node/SVG renderers split |
| Process | `arrow-process` | Done | Arrow box measurement, node placement, box/text/arrow renderers, SVG wrapper split |
| Process | `chevron-process` | Done | Chevron geometry, per-body text fitting, shape/text renderers, SVG wrapper split |
| Process | `step-up` | Done | Delegates to shared modular staircase renderer |
| Process | `step-down` | Done | Delegates to shared modular staircase renderer |
| Hierarchy | `org-chart` | Done | Diagram measurement, connector, node box/text, SVG wrapper split |
| Hierarchy | `h-org-chart` | Done | Horizontal tree traversal, node fit/layout, node renderer split |
| Hierarchy | `decision-tree` | Done | Tree measurement, fit maps, connector/branch labels, leaf/decision renderers split |
| Hierarchy | `tree` | Done | Dynamic box measurement, connector, node box/text, SVG wrapper split |
| Hierarchy | `radial-tree` | Done | Center resolution, branch/subnode positioning, center/branch renderers split |
| Hierarchy | `sitemap` | Done | Recursive layout, level box helpers, connector/node/title/SVG renderers split |
| Hierarchy | `mind-map` | Done | Center resolution, tier fitting, radial point helpers, branch/center renderers split |
| Hierarchy | `hierarchy-list` | Done | Row flattening, placement, connector, bullet/text, SVG wrapper split |
| Hierarchy | `bracket` | Done | Contestant parsing, advancement, layout metrics, connector/slot/round renderers split |
| Hierarchy | `bracket-tree` | Done | Delegates to modular bracket renderer |
| Technical | `network` | Done | Label collection, circular layout, edge/node renderers split |
| Technical | `layered-arch` | Done | Layer/chip precomputation, band/label/chip/connector renderers, SVG wrapper split |
| Technical | `pipeline` | Done | Layout metrics, stage placement, arrow/box/text, SVG wrapper split |
| Technical | `entity` | Done | Table metrics, entity placement, header/field/badge renderers, SVG wrapper split |
| Technical | `sequence` | Done | Actor/message extraction, actor measurement, lifeline/message renderers, SVG wrapper split |
| Technical | `state-machine` | Done | Circular state layout, transition geometry, self-loop/entry/state renderers, SVG wrapper split |
| Technical | `class` | Done | Class/member splitting, grid metrics, shell/header/member/badge renderers, SVG wrapper split |
