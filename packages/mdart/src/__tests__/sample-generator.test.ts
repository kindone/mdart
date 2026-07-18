import { describe, expect, it } from 'vitest'
import { renderMdArt, KNOWN_TYPES } from '../index'
import { configureMdArt, resetMdArtConfig } from '../config'
import { checkSvg } from '../heuristics'
import { generatePropertyMdart, type PropertySampleDomain } from './sample-generator'

const SAMPLE_DOMAINS: PropertySampleDomain[] = [
  'printable-flat',
  'unicode-flat',
  'cjk-flat',
  'emoji-flat',
  'long-flat',
  'process-large',
  'hierarchy-nested',
]

describe('property sample generator', () => {
  it('generates renderable samples for every known type', () => {
    for (const type of KNOWN_TYPES) {
      const sample = generatePropertyMdart(type, `sample-${type}`)
      expect(sample.type).toBe(type)
      expect(sample.source).toContain(`type: ${type}`)
      expect(renderMdArt(sample.source)).toContain('<svg')
    }
  })

  it('can generate all property-test domains', () => {
    for (const domain of SAMPLE_DOMAINS) {
      const sample = generatePropertyMdart('any', `domain-${domain}`, domain)
      expect(sample.domain).toBe(domain)
      expect(renderMdArt(sample.source)).toContain('<svg')
    }
  })

  it('audits generated samples for text boxes escaping shape bounds', () => {
    const escapes: string[] = []
    const auditFindings: string[] = []
    const softShapeLabels = ['chevron-node', 'circle-node', 'hexagon-node', 'cycle-node']

    configureMdArt({ instrument: true, animate: false, debugTextBounds: 'both' })
    try {
      for (const type of KNOWN_TYPES) {
        for (const domain of SAMPLE_DOMAINS) {
          const sample = generatePropertyMdart(type, `text-audit-${type}-${domain}`, domain)
          const svg = renderMdArt(sample.source, sample.type)
          const issues = checkSvg(svg, {
            skip: ['SVG_ITEM_NO_TITLE', 'SVG_OVERFLOW', 'SVG_EMPTY_CONTENT'],
          })
          for (const issue of issues) {
            if (issue.code === 'SVG_TEXT_BOX_ESCAPES_SHAPE') {
              const finding = `${sample.type}/${sample.domain}: ${issue.message}`
              if (softShapeLabels.some(label => issue.message.includes(`"${label}"`))) {
                auditFindings.push(finding)
              } else {
                escapes.push(finding)
              }
            } else if (issue.code === 'SVG_TEXT_BOX_UNDERFILLS_SHAPE') {
              auditFindings.push(`${sample.type}/${sample.domain}: ${issue.message}`)
            }
          }
        }
      }
    } finally {
      resetMdArtConfig()
    }

    if (auditFindings.length > 0 && process.env.MDART_TEXT_AUDIT_VERBOSE === '1') {
      console.warn(`Text containment audit non-blocking findings (${auditFindings.length}):\n${auditFindings.join('\n')}`)
    }
    expect(escapes).toEqual([])
  })
})
