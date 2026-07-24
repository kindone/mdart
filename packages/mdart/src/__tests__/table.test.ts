// Feature:     Generic table layout
// Arch/Design: The table renderer accepts both markdown pipe tables and
//              mdart's normal nested list / key:value structure.
// Spec:        markdown table cells render visibly; nested keyed children
//              become columns; plain key:value items become Item/Value rows.
// @quality:    correctness
// @type:       example
// @mode:       verification

import { describe, expect, it } from 'vitest'
import { renderMdArt } from '../index'
import { validateMdArt } from '../validator'
import { parseMdArt } from '../parser'

describe('table renderer', () => {
  it('renders markdown pipe table syntax', () => {
    const svg = renderMdArt(`type: table
title: Decision Table

| Criterion | Option A | Option B |
|---|---|---|
| Cost | Low | Medium |
| Risk | Medium | Low |`)

    expect(svg).toContain('<svg')
    expect(svg).toContain('Decision Table')
    expect(svg).toContain('Criterion')
    expect(svg).toContain('Option A')
    expect(svg).toContain('Medium')
    expect(svg).not.toContain('NaN')
  })

  it('honors markdown table alignment markers', () => {
    const svg = renderMdArt(`type: table
|제목|내용|설명|
|:---|---:|:---:|
|왼쪽정렬|오른쪽정렬|중앙정렬|
|왼쪽정렬|오른쪽정렬|중앙정렬|`)

    expect(svg).toContain('제목')
    expect(svg).toContain('왼쪽정렬')
    expect(svg).toMatch(/<text(?:(?!<\/text>)[\s\S])*text-anchor="end"(?:(?!<\/text>)[\s\S])*오른쪽정렬(?:(?!<\/text>)[\s\S])*<\/text>/)
    expect(svg).toMatch(/<text(?:(?!<\/text>)[\s\S])*text-anchor="middle"(?:(?!<\/text>)[\s\S])*중앙정렬(?:(?!<\/text>)[\s\S])*<\/text>/)
  })

  it('renders nested keyed list syntax as columns', () => {
    const svg = renderMdArt(`type: table
title: Vendor Fit
- Vendor A
  - Cost: Low
  - Risk: Medium
- Vendor B
  - Cost: Medium
  - Risk: Low`)

    expect(svg).toContain('Vendor Fit')
    expect(svg).toContain('Item')
    expect(svg).toContain('Cost')
    expect(svg).toContain('Vendor A')
    expect(svg).toContain('Low')
  })

  it('renders flat key:value items as Item / Value rows', () => {
    const svg = renderMdArt(`type: table
- Owner: Platform
- Status: Ready`)

    expect(svg).toContain('Item')
    expect(svg).toContain('Value')
    expect(svg).toContain('Owner')
    expect(svg).toContain('Platform')
  })

  it('is a known valid type', () => {
    const issues = validateMdArt(parseMdArt('type: table\n- A: B'))
    expect(issues.some(issue => issue.code === 'STRUCT_UNKNOWN_TYPE')).toBe(false)
  })
})
