# MdArt Diagrams for VS Code

Renders `mdart` diagram fences as inline SVG in the VS Code Markdown Preview.

## Usage

Write a fenced code block tagged `mdart` in any Markdown file:

````markdown
```mdart
type: chevron-process
title: Development Lifecycle

Discovery → Design → Build → Test → Deploy
```
````

Open the Markdown Preview (`Ctrl+Shift+V` / `Cmd+Shift+V`) and the fence renders as a diagram.

## Syntax

MdArt supports 11 diagram families and 100+ layout types — org charts, kanban boards,
sequence diagrams, Gantt charts, SWOT analyses, line charts, and more. All driven by
a simple indented-bullet syntax.

Full syntax reference: https://github.com/kindone/mdart/blob/main/docs/syntax.md

## Themes

Apply a theme per fence with front-matter:

````markdown
```mdart
type: cycle
theme: emerald

Plan → Build → Measure → Learn
```
````

Available themes: `mono-light` · `mono-dark` · `cyan` · `emerald` · `violet` ·
`lavender` · `amber` · `orange` · `rose` · `blue` · `sky`

## Links

- [GitHub](https://github.com/kindone/mdart)
- [npm](https://www.npmjs.com/package/mdart)
- [Gallery](https://github.com/kindone/mdart/blob/main/docs/gallery.md)
