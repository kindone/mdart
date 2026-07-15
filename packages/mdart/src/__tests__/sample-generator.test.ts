import { describe, expect, it } from 'vitest'
import { renderMdArt, KNOWN_TYPES } from '../index'
import { generatePropertyMdart, type PropertySampleDomain } from './sample-generator'

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
    const domains: PropertySampleDomain[] = [
      'printable-flat',
      'unicode-flat',
      'cjk-flat',
      'emoji-flat',
      'long-flat',
      'process-large',
      'hierarchy-nested',
    ]
    for (const domain of domains) {
      const sample = generatePropertyMdart('any', `domain-${domain}`, domain)
      expect(sample.domain).toBe(domain)
      expect(renderMdArt(sample.source)).toContain('<svg')
    }
  })
})
