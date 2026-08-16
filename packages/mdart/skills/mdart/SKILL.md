---
name: mdart
description: Generate MdArt diagrams from structured intent — pick the right diagram type from 107+ layouts (process, list, hierarchy, comparison, cycle, matrix, pyramid, relationship, statistical, planning, technical, plot) and produce valid syntax. Use when the user asks for a diagram, chart, flowchart, mind map, comparison, org chart, timeline, kanban board, swot analysis, sequence diagram, state machine, gantt, funnel, sankey, treemap, line chart, scatter plot, bar chart, area chart, table, or any visual representation of structured information. Also use when generating ```mdart fenced blocks. For flowcharts use mdart `flowchart` type; prefer mermaid only when you need orthogonal routing, parallel fork/join, or 3+ exits from a single node.
---

# MdArt diagram generation

Produce MdArt fenced code blocks that pick the *right* diagram type for the user's intent. Optimise for **selection judgment**, not just syntactically valid output. Defaulting to `process` or `bullet-list` for everything is the most common failure.

**Fence form (the type is required):**
````
```mdart <type>
- Item
```
````

Always declare the type either in the fence header or as `type:` front matter.
Do not emit a bare ` ```mdart ` fence: a standalone first line like `layered-arch` is parsed as diagram *content*, not as the layout type.

---

## Full reference

The comprehensive type catalog, selection guide, plot syntax, and authoring rules live in:

- **mdart repo:** `packages/mdart/docs/mdart.md`
- **Consumer projects:** `node_modules/mdart/docs/mdart.md`

Read that file when you need:
- The Family Cheat Sheet or Complete Type Listing (106 types, 11 families)
- The Selection Guide (10 rules, first-match-wins)
- Plot family syntax (series format, per-series attributes, front-matter keys)
- Authoring rules (label density targets, orientation defaults, typed-value syntax)
- The Generation Checklist

---

## Generation checklist (quick form)

1. Walk the **Selection Guide** in `docs/mdart.md` — first match wins.
2. Check the **Family Cheat Sheet** — is the default right, or should you escalate?
3. **Label density** — compress labels to noun phrases; split if >12 flat / >20 hierarchy nodes.
4. **Orientation** — longer axis as rows; `comparison` default is TB; add `direction: LR` only if attributes > items.
5. **Typed values** — wherever a node carries a number, status, or target, use `key: value` not `key - value`.
6. Check **anti-patterns** — read `anti-patterns.md` in this skill directory before committing to a non-default type.
7. Add `theme:` only if the user requested a specific look.
8. Add `title:` only when it adds context the labels alone don't carry.

---

## Anti-patterns (quick reminders)

- **Keyword match trap**: if the user said "timeline", match the *data structure* not the word.
- **Generic default**: `process` for unordered items, `bullet-list` for comparisons, `tree` for processes.
- **Wrong family**: `pyramid` ≠ hierarchy; `cycle` ≠ recurring task; `network` ≠ tree.
- **Verbose nodes**: sentences overflow fixed-size shapes — compress to noun phrases.
- **Dashes instead of `:`**: `Item - value` parses as one label; only `:` splits into `{label, value}`.

For the full failure-mode catalog, read `anti-patterns.md` in this skill directory.

---

*Version: derived from mdart v0.3.0+ · `docs/mdart.md` is the canonical cross-agent reference · regenerate via `scripts/regen-skill.md`.*
