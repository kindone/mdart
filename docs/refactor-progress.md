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
| Process | `circle-process` | Done | Circle row measurement, node placement, defs/circle/text/arrow renderers, SVG wrapper split |
| Process | `timeline-h` | Done | Spine/tick geometry, node placement, label/value fitting, node/SVG wrapper split |
| Process | `bending-process` | Done | Serpentine grid metrics, node text fitting, straight/turn connector renderers, SVG wrapper split |
| Process | `circular-process` | Done | Circular metrics, polar node placement, arrow clearance math, node/arrow renderers split |
| Process | `snake-process` | Done | Delegates to modular bending-process renderer |
| Process | `funnel` | Done | Metric parsing, band placement, metric/label/conversion renderers, SVG wrapper split |
| Process | `roadmap` | Done | Delegates to modular timeline-h renderer |
| Process | `timeline-v` | Done | Column batch fitting, row placement, spine/tag/main/detail renderers, SVG wrapper split |
| Process | `swimlane` | Done | Shared timeline ranking, lane/step fitting, chrome/step/connector renderers, SVG wrapper split |
| Process | `step-up` | Done | Delegates to shared modular staircase renderer |
| Process | `step-down` | Done | Delegates to shared modular staircase renderer |
| Cycle | `cycle` | Done | Orbit metrics, rectangle clearance, arc/node/title renderers, SVG wrapper split |
| Cycle | `donut-cycle` | Done | Wedge metrics, segment path/text/title renderers, SVG wrapper split |
| Cycle | `segmented-cycle` | Done | Wedge/connector label placement, segment/text/title renderers, SVG wrapper split |
| Cycle | `nondirectional-cycle` | Done | Track/title/node placement, circular text fitting, SVG wrapper split |
| Cycle | `multidirectional-cycle` | Done | Radial node placement, complete-graph connectors, node/SVG renderers split |
| Cycle | `spiral` | Done | Spiral guide sampling, milestone placement, label/node renderers, SVG wrapper split |
| Cycle | `loop` | Done | Row metrics, forward/return arrows, node label/value/badge renderers, SVG wrapper split |
| Cycle | `block-cycle` | Done | Two-row placement, shell/header/body renderers, arrow routing, SVG wrapper split |
| Cycle | `gear-cycle` | Done | Gear sizing variants, reusable gear-node renderer, orbit arrow renderer, SVG wrapper split |
| Matrix | `matrix-2x2` | Done | Quadrant placement, header/children/axis renderers, SVG wrapper split |
| Matrix | `bcg` | Done | Delegates to shared quadrant-grid renderer with BCG metadata |
| Matrix | `ansoff` | Done | Delegates to shared quadrant-grid renderer with Ansoff metadata |
| Matrix | `pros-cons` | Done | Header parsing, row measurement, column text/header/divider renderers, SVG wrapper split |
| Matrix | `swot` | Done | Section routing, quadrant buckets, entry/quadrant/grid renderers, SVG wrapper split |
| Matrix | `matrix-nxm` | Done | Header/cell wrapping, row height calculation, header/row/SVG renderers split |
| Matrix | `comparison` | Done | Already split into validation/error, LR/TB renderers, shared text/row helpers |
| Hierarchy | `org-chart` | Done | Diagram measurement, connector, node box/text, SVG wrapper split |
| Pyramid | `pyramid` | Done | Layer geometry, shape/main/side text renderers, SVG wrapper split |
| Pyramid | `inverted-pyramid` | Done | Delegates to modular pyramid renderer |
| Pyramid | `pyramid-list` | Done | Bar/description measurement, row placement, bar/badge/label/value/description renderers split |
| Pyramid | `segmented-pyramid` | Done | Segmented band layout, shared band shape/label rendering, highlight hook, SVG wrapper split |
| Pyramid | `diamond-pyramid` | Done | Diamond width function, shared band placement/rendering, SVG wrapper split |
| Relationship | `balance` | Done | Scale layout constants, support/plate renderers, side config split, SVG wrapper split |
| Relationship | `counterbalance` | Done | Delegates to modular balance renderer |
| Relationship | `opposing-arrows` | Done | Arrow geometry constants, side config placement, arrow body/text renderers, SVG wrapper split |
| Relationship | `radial` | Done | Hub/spoke content resolution, polar placement, connector/node/center renderers, SVG wrapper split |
| Relationship | `web` | Done | Circular node placement, edge topology builder, edge/node renderers, SVG wrapper split |
| Relationship | `plus` | Done | Center/arm layout constants, arm node placement, center/arm text renderers, SVG wrapper split |
| Relationship | `cluster` | Done | Group grid placement, orphan centering, member packing metrics, group/member renderers split |
| Relationship | `concentric` | Done | Ring layout, outside-in ring placement, label/value-callout renderers, SVG wrapper split |
| Relationship | `target` | Done | Center-out ring placement, crosshair renderer, label/value-callout renderers, SVG wrapper split |
| Relationship | `converging` | Done | Delegates to shared relationship flow renderer |
| Relationship | `diverging` | Done | Delegates to shared relationship flow renderer |
| Relationship | `venn` | Done | Circle/intersection layout helpers, circle/label/intersection renderers, SVG wrapper split |
| Relationship | `venn-3` | Done | Delegates to modular venn renderer |
| Relationship | `venn-4` | Done | Delegates to modular venn renderer |
| Statistical | `progress-list` | Done | Label/row measurement, percent parsing, progress bar/label renderers, SVG wrapper split |
| Statistical | `bullet-chart` | Done | Metric/target parsing, row measurement, range/actual/target/label renderers split |
| Statistical | `scorecard` | Done | Card metrics, row height alignment, grid placement, card renderer split |
| Statistical | `waffle` | Done | Percentage normalization, square ownership, legend measurement, category renderer split |
| Statistical | `treemap` | Done | Equal-grid layout, cell placement, fitted cell text, cell renderer split |
| Statistical | `radar` | Done | Value parsing, polar grid/value polygon helpers, axis/node label renderers, SVG wrapper split |
| Statistical | `gauge` | Done | Gauge sizing, arc geometry, moving-tip animation, counter/label renderers split |
| Statistical | `heatmap` | Done | Header/cell measurement, row/cell text blocks, header/row/cell renderers split |
| Statistical | `sankey` | Done | Flow model building, node stacking, flow geometry, source/destination renderers split |
| Planning | `gantt` | Done | Range parsing, row layout, grid rendering, milestone/task row renderers, SVG wrapper split |
| Planning | `gantt-lite` | Done | Delegates to modular gantt renderer |
| Planning | `timeline` | Done | Timeline metrics, event placement, marker/label renderers, SVG wrapper split |
| Planning | `milestone` | Done | Row measurement, spine renderer, milestone row/status renderers, SVG wrapper split |
| Planning | `wbs` | Done | Root/L1/L2 placement, connector/node renderers, SVG wrapper split |
| Planning | `kanban` | Done | Board/column/card layout, column header/card renderers, SVG wrapper split |
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
