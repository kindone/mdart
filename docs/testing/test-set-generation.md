# MdArt Test Set Generation

A guide to constructing test inputs that exercise the visual test criteria systematically. The goal is a set of MdArt diagrams that, when rendered, give confidence that a wide range of real-world inputs will look correct. Each section describes one dimension of variation, what values to cover, and why the extremes matter.

---

## How to Use This Document

Each dimension below is an independent axis. The basic approach is:

**Univariate sweeps** — Pick a sensible baseline diagram and vary one dimension at a time. This makes it easy to attribute a visual failure to the right cause.

**Boundary pairs** — For each dimension, always test the minimum and maximum values, not just the middle. Most layout bugs live at the extremes.

**Pairwise combinations** — Once univariate sweeps pass, test combinations of two dimensions together. Full combinatorial testing (all dimensions × all values) is impractical; pairwise coverage catches most interaction bugs at a fraction of the cost.

A reasonable baseline for most sweeps: 4–5 nodes, one level of depth, short English labels, no theme specified.

---

## Dimension 1: Node Count

How many nodes a diagram contains is the most direct driver of layout stress.

- **Zero nodes.** An empty diagram. Should render a clear empty state, not crash or produce a blank SVG with no indication of what happened.
- **One node.** The minimum meaningful content. Should centre correctly and not look like a broken version of a multi-node diagram.
- **Two nodes.** The minimum for relational types (venn, balance, pros-cons). Often exposes symmetry assumptions.
- **Three to five.** The typical real-world case. Should look balanced and clean.
- **Ten to fifteen.** Common in larger projects. Tests whether spacing compresses gracefully.
- **Twenty-five or more.** Stress territory for most diagram types. Worth seeing whether the diagram scrolls, wraps, scales down, or clips.

Note that different families have different natural upper limits. A cycle with twelve items is unusual; a kanban board with thirty cards is normal. Use domain sense when deciding where the "stress" threshold sits for each type.

---

## Dimension 2: Node Levels and Depth

For diagram types that support hierarchy — tree, org-chart, mind-map, decision-tree, hierarchy-list, wbs — depth is a separate concern from node count.

- **Flat (depth 1).** All items at root, no children. Tests whether the diagram degrades gracefully when no hierarchy is provided.
- **Shallow (depth 2).** One level of children. The most common real-world case.
- **Moderate (depth 3).** Grandchildren. Tests whether spacing and font sizes remain readable at a third level.
- **Deep (depth 5 or more).** Tests whether the diagram overflows vertically or scales down to illegibility.
- **Unbalanced.** One branch is deep (depth 4–5), another is flat (depth 1). This is more stressful than uniformly deep trees because the layout engine must reconcile very different subtree heights. It is also the most common real-world shape, so it warrants its own dedicated test cases.
- **Wide and shallow.** Many children at depth 1, no further nesting. Tests horizontal overflow rather than vertical.

---

## Dimension 3: Text Length

Label length is one of the most common sources of containment and layout failures.

- **Ultra-short (1–2 characters).** Single letters or two-letter codes like "A" or "OK". Tests whether shapes scale down gracefully or leave awkward empty space inside a full-size container.
- **Short (one word, 4–8 characters).** The common case for concise node labels.
- **Medium (two to four words, 10–30 characters).** Typical for descriptive labels.
- **Long (a full short sentence, 50–80 characters).** Tests whether text wraps inside the shape or overflows it.
- **Very long (100+ characters).** Extreme stress. Some diagram types should truncate with an ellipsis; others should reflow the container. Both the rendering and any truncation behaviour are worth checking.
- **Mixed lengths across siblings.** Some nodes have one word, others have a sentence. This is the most common real-world scenario and the most likely to expose asymmetric layout issues, since siblings are expected to render at a consistent size.

---

## Dimension 4: Languages and Scripts

Different scripts have fundamentally different rendering properties. Layout engines that look correct for English often have subtle failures with other writing systems.

- **ASCII English.** The baseline. Short words, predictable character widths.
- **Extended Latin.** Characters with diacritics — accents, umlauts, cedillas (à, ü, ñ, ç). Mostly safe, but can reveal line-height or glyph-boundary issues.
- **CJK (Chinese, Japanese, Korean).** Characters are roughly square and double-width relative to Latin characters. A ten-character CJK label is as wide as a twenty-character Latin label. Any layout assumption based on character count rather than rendered pixel width will fail here.
- **Arabic and Hebrew (RTL).** Right-to-left base direction. In directional diagram types such as process chains, swimlanes, and timelines, RTL text inside a left-to-right layout can produce confusing results. The minimum bar is that the text is at least internally correct — letters in the right order — even if the overall diagram direction is not flipped.
- **Mixed script in a single label.** For example, an English keyword followed by a Japanese phrase. Tests shaping and text-run handling at the junction between scripts.
- **Emoji.** Emoji characters are typically taller than same-size text characters and may have unexpected widths. One or two emoji in labels is enough to check vertical alignment and containment.

---

## Dimension 5: Key-Value Pairs

Some diagram types support structured `key: value` children — entity, class, comparison, matrix-nxm, heatmap. This dimension covers the variation in how those pairs are supplied.

- **Key only, no value.** A bare label with no colon-separated value. Should render without a dangling colon or empty value column.
- **Both key and value, balanced.** Short key, short value. The baseline.
- **Long key, short value.** Tests whether the key column expands to fit without pushing the value off the canvas.
- **Short key, long value.** Tests whether the value wraps or overflows.
- **Numeric value.** For example "Price: 1 200" or "Score: 87.4 %". Tests whether numeric values align differently from string values, as some renderers right-align numbers.
- **Missing or empty value.** "Status: " with nothing after the colon. Should not crash or leave a stray colon floating.
- **Many pairs on a single node.** Ten or more key-value children on one node. Tests vertical overflow within the node's container.

---

## Dimension 6: Themes

Themes change colour, typography, and sometimes spacing. A diagram that looks correct in the default theme may fail when a different theme is applied.

- **No theme (default).** The baseline. Most testing happens here.
- **Light named themes.** Verify that all colour pairs meet contrast requirements and that no element becomes invisible against a light background.
- **Dark named themes.** Higher risk for contrast failures. Light text on dark backgrounds is harder to get right, and some fill colours that work in light mode become unreadable in dark mode.
- **Mono themes.** No colour differentiation — elements are distinguished only by shape, position, and label. Worth checking whether all diagram types remain readable when colour is removed as a differentiator.
- **High-contrast themes.** Tests the extreme end of contrast. Also useful for accessibility verification.
- **Theme switching.** Render the same diagram first in the default theme, then in a dark theme. The geometry — node positions, sizes, connector paths — should be identical across both renders. Only colours and fonts should change.

---

## Diagram-Family Considerations

Not all dimensions are equally relevant to all diagram families. Some guidance on where to focus effort:

**Hierarchy types** (tree, org-chart, mind-map, decision-tree, wbs): Depth and balance are the primary risks. An unbalanced tree with five levels on one side and one on the other is the canonical stress case for this family.

**Relational types** (venn, network, web): Node count is the primary risk. Most of these types have a natural upper limit beyond which the diagram becomes unreadable regardless of rendering quality; identifying that limit is itself a useful test outcome.

**Directional types** (process, swimlane, timeline-h, sequence): RTL and mixed-script labels are higher risk here because the text direction conflicts with the layout direction.

**Data types** (heatmap, comparison, matrix-nxm, entity): Key-value variation is the main concern. Node count expressed as many rows and columns is also important.

**Statistical types** (gauge, radar, waffle, sankey): Numeric values and count extremes matter more than text length. Test with values near zero, near the declared maximum, and at exactly the midpoint.

---

## High-Value Pairwise Combinations

When moving from univariate to pairwise tests, some combinations are more likely to surface bugs than others:

- **Long text + many nodes.** The classic overflow scenario — both axes push the layout to its limits simultaneously.
- **Deep unbalanced hierarchy + CJK labels.** Vertical space is already tight; double-width characters make it worse.
- **Many nodes + dark theme.** Colour differentiation between adjacent nodes is harder when the palette has fewer steps.
- **Unbalanced tree + mixed text lengths.** The uneven branch structure already strains the layout; uneven labels compound the asymmetry.
- **RTL text + directional layout.** A swimlane or timeline-h with Arabic labels puts the text direction directly at odds with the diagram direction.
- **Very long text + mono theme.** Long labels that would normally use colour for containment cues have none in mono mode.

Start with these pairs before exploring less likely combinations.
