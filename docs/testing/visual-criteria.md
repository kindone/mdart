# MdArt Visual Test Criteria

A catalogue of what "correct rendering" means for MdArt diagrams, expressed in plain language. Each criterion names the property being checked, describes what a passing diagram looks like, and calls out the concrete failure modes to watch for.

---

## 1. Balance of Layout

A well-balanced diagram uses its available space evenly. Elements at the same logical level sit at roughly equal distances from each other and from the diagram's centre of gravity. There are no large dead zones on one side while the other is crowded, and no single branch or node that visually dominates in a way the data doesn't justify.

**What passing looks like:** Siblings are evenly spaced. The overall shape feels centred. In symmetric diagram types (venn, cycle, org-chart), left-right or radial symmetry is maintained when the data is symmetric.

**Failure modes:**
- One branch grows so large it pushes all other content to a corner
- Siblings have inconsistent gaps — some touching, others far apart
- The diagram renders flush against one edge with large empty space on the opposite side
- A symmetric type (e.g. cycle with 4 equal items) renders asymmetrically

---

## 2. Text Containment and Visibility

Every text label must fit visibly within the shape or region it belongs to. No text should be clipped by its container's boundary, hidden behind another element, or rendered in a colour that makes it illegible against its background.

**What passing looks like:** All label text is fully visible. There is a consistent padding gap between text and the edge of its containing shape. Text colour has sufficient contrast against the fill colour of its container.

**Failure modes:**
- Text is cut off at the edge of a box or shape (clipping)
- Text renders outside its container and overlaps adjacent elements
- Text is the same colour (or too similar) to its background fill, making it unreadable
- A label is present in the input but does not appear in the rendered output at all

---

## 3. Text Flexibility and Balance

Diagrams should handle the full range of label lengths gracefully — from single-character abbreviations to multi-sentence descriptions — without breaking layout. When labels vary in length across sibling nodes, the diagram should adapt so no single node looks anomalously large or small relative to its peers.

**What passing looks like:** A label that is longer than usual causes a graceful reflow (the containing shape grows, text wraps, or font scales) rather than overflow or clipping. Sibling nodes with very different label lengths still look like they belong to the same diagram.

**Failure modes:**
- A long label overflows its shape and overlaps neighbouring nodes
- A very short label leaves its container almost entirely empty while siblings look full
- Multi-line text wraps inconsistently — one node wraps at 3 words, another at 10 with the same available width
- The diagram's overall dimensions do not grow to accommodate a larger-than-average label, causing clipping instead

---

## 4. Animation Flow

Where MdArt diagrams include animated entrance or transition effects, the animation must feel intentional and coherent. Elements should appear in an order that matches the logical reading order of the diagram. The final state of the animation must exactly match how the diagram looks when rendered statically.

**What passing looks like:** Elements enter in a logical sequence (e.g. parent before children, left-to-right in process chains). Transitions are smooth. The diagram reaches its final state cleanly, with no elements displaced from where they would sit in a static render.

**Failure modes:**
- A child node appears before its parent
- Elements flicker or jump during a transition
- The final animated frame differs from the equivalent static SVG (drift)
- The animation gets stuck partway through and never completes
- Pausing and resuming mid-animation causes elements to shift position

---

## 5. Consistency

The same input structure should produce the same visual output regardless of content. Visual rules — padding, font size, shape style, spacing — must apply uniformly to all elements that share the same logical role. A diagram should look like it was drawn by one hand, not assembled from independently styled pieces.

**What passing looks like:** All nodes at the same depth level have the same shape, font size, and padding. Swapping a theme changes colours but not geometry or spacing. Running the renderer twice on identical input produces identical SVG output.

**Failure modes:**
- Two sibling nodes at the same depth use different shape types for no data-driven reason
- Font size varies across nodes without a hierarchical reason
- Padding inside containers differs noticeably from one node to the next
- Switching themes shifts the layout — nodes move, sizes change — rather than only affecting colours
- The same input renders differently on two consecutive runs (non-determinism)

---

## 6. Colors

Colour choices must be accessible, semantically meaningful, and internally coherent. Every colour pair in the diagram (text on background, border on fill) must meet a minimum contrast threshold. All distinct elements must remain distinguishable when viewed in greyscale or by someone with a common colour vision deficiency.

**What passing looks like:** Any text-on-background colour pair meets WCAG AA contrast (4.5:1 for normal text, 3:1 for large text). Distinct elements use visually differentiable colours. The palette reads as cohesive — no random mixing of unrelated hues within a single theme.

**Failure modes:**
- Text colour and background fill are too similar (low contrast ratio)
- Two adjacent or logically distinct elements share the same fill colour, making them appear as one
- In a greyscale simulation, elements that should be distinct become indistinguishable
- In a colour-blindness simulation (Deuteranopia, Protanopia), a key distinction is lost
- A theme override introduces a colour that clashes visibly with the rest of the palette

---

## 7. Overflow and Clipping

The diagram as a whole must fit within its declared viewport or container. No part of the diagram — nodes, labels, connectors, decorations — should be clipped by the outer boundary of the SVG canvas.

**What passing looks like:** The SVG viewBox is large enough to contain all rendered content with a reasonable margin. The diagram scales or reflows rather than cropping when content is large.

**Failure modes:**
- Nodes near the canvas edge are partially clipped by the SVG boundary
- The bottom of the diagram overflows the declared height, common with deep trees or many nodes
- The canvas is excessively large relative to the content, leaving a disproportionate whitespace border
- Content that is visible when zoomed out is clipped in the default view

---

## 8. Edge and Connector Routing

In diagram types that use arrows, lines, or connectors between nodes, those connectors must be readable and must not obscure the nodes they connect. Connectors should take clear, direct paths and avoid unnecessary crossings.

**What passing looks like:** Arrows connect the correct source and target nodes. Arrow paths do not pass through unrelated nodes. Where crossings are unavoidable, they are visually distinguishable. Arrowheads are clearly visible and point in the correct direction.

**Failure modes:**
- An arrow passes through the interior of a node it is not connecting
- Two connectors overlap exactly, making it look like one connector where two exist
- An arrowhead is hidden behind a node's shape
- A connector links the wrong pair of nodes
- Bidirectional connectors are visually indistinguishable from unidirectional ones
