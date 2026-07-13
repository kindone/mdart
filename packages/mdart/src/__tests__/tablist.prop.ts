// Feature:     tab-list interaction — activateMdArtTab, tryActivateMdArtTabFromEventTarget
// Arch/Design: activateMdArtTab(root, n) makes panel[data-tab="n"] visible and
//              hides all others.  The content background rect updates to the
//              active tab's colour.  tryActivateMdArtTabFromEventTarget(el) walks
//              up the DOM to find a .mdart-tab-hit ancestor and activates it.
// Spec:        ∀ n ∈ [0, k): activating tab n makes panel n visible
//              ∀ n ∈ [0, k): all OTHER panels become hidden
//              ∀ n: content-bg fill updates to active color (hex + "11" alpha)
//              ∀ n: content-bg stroke updates (hex + "44" alpha)
//              ∀ nested el inside mdart-tab-hit: tryActivate returns true
//              ∀ el outside mdart tab: tryActivate returns false
// @quality:    correctness
// @type:       property
// @mode:       verification

import { describe, it } from 'vitest'
import { forAll, Gen } from 'jsproptest'
import { activateMdArtTab, tryActivateMdArtTabFromEventTarget } from '../tabListInteract'

// ── SVG builder ───────────────────────────────────────────────────────────────

const COLORS = ['#ff0000', '#00aa00', '#0000ff', '#ff8800', '#8800ff']

function buildTabSvg(numTabs: number): string {
  const tabHits = Array.from({ length: numTabs }, (_, i) => {
    const color = COLORS[i % COLORS.length]
    const isActive = i === 0
    const fill = isActive ? color : `${color}22`
    const stroke = isActive ? 'none' : `${color}55`
    const textFill = isActive ? '#ffffff' : '#999999'
    const weight = isActive ? '700' : '400'
    return `
    <g class="mdart-tab-hit" data-tab="${i}" data-color="${color}" style="cursor:pointer">
      <rect class="mdart-tab-rect" width="40" height="20" fill="${fill}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="1"` : ''}/>
      <text class="mdart-tab-label" fill="${textFill}" font-weight="${weight}">Tab${i}</text>
    </g>`
  }).join('\n')

  const panels = Array.from({ length: numTabs }, (_, i) =>
    `<g class="mdart-tab-panel" data-tab="${i}" visibility="${i === 0 ? 'visible' : 'hidden'}"><text>Panel${i}</text></g>`
  ).join('\n')

  return `<svg xmlns="http://www.w3.org/2000/svg">
  <g class="mdart-tab-root" data-text-muted="#999999">
    ${tabHits}
    <rect class="mdart-tab-content-bg" fill="${COLORS[0]}11" stroke="${COLORS[0]}44" stroke-width="1.2"/>
    ${panels}
  </g>
</svg>`
}

// ── activateMdArtTab ──────────────────────────────────────────────────────────

describe('activateMdArtTab: panel visibility', () => {

  it('∀ n < k: activating tab n makes panel n visible', { timeout: 15000 }, () => {
    forAll(
      (k: number, n: number) => {
        const targetTab = n % k
        const doc = new DOMParser().parseFromString(buildTabSvg(k), 'image/svg+xml')
        const root = doc.querySelector('.mdart-tab-root')!
        activateMdArtTab(root, targetTab)
        return doc.querySelector(`.mdart-tab-panel[data-tab="${targetTab}"]`)?.getAttribute('visibility') === 'visible'
      },
      Gen.inRange(2, 5),
      Gen.inRange(0, 4),
    )
  })

  it('∀ n < k: all OTHER panels become hidden when tab n is activated', { timeout: 15000 }, () => {
    forAll(
      (k: number, n: number) => {
        const targetTab = n % k
        const doc = new DOMParser().parseFromString(buildTabSvg(k), 'image/svg+xml')
        const root = doc.querySelector('.mdart-tab-root')!
        activateMdArtTab(root, targetTab)
        // Every panel except targetTab must be hidden
        return Array.from({ length: k }, (_, i) => i)
          .filter(i => i !== targetTab)
          .every(i =>
            doc.querySelector(`.mdart-tab-panel[data-tab="${i}"]`)?.getAttribute('visibility') === 'hidden'
          )
      },
      Gen.inRange(2, 5),
      Gen.inRange(0, 4),
    )
  })

  it('∀ n < k: content-bg fill updates to active tab color + "11"', { timeout: 15000 }, () => {
    forAll(
      (k: number, n: number) => {
        const targetTab = n % k
        const color = COLORS[targetTab % COLORS.length]
        const doc = new DOMParser().parseFromString(buildTabSvg(k), 'image/svg+xml')
        const root = doc.querySelector('.mdart-tab-root')!
        activateMdArtTab(root, targetTab)
        const bg = doc.querySelector('.mdart-tab-content-bg')!
        return bg.getAttribute('fill') === `${color}11`
      },
      Gen.inRange(2, 4),
      Gen.inRange(0, 3),
    )
  })

  it('∀ n < k: content-bg stroke updates to active tab color + "44"', { timeout: 15000 }, () => {
    forAll(
      (k: number, n: number) => {
        const targetTab = n % k
        const color = COLORS[targetTab % COLORS.length]
        const doc = new DOMParser().parseFromString(buildTabSvg(k), 'image/svg+xml')
        const root = doc.querySelector('.mdart-tab-root')!
        activateMdArtTab(root, targetTab)
        const bg = doc.querySelector('.mdart-tab-content-bg')!
        return bg.getAttribute('stroke') === `${color}44`
      },
      Gen.inRange(2, 4),
      Gen.inRange(0, 3),
    )
  })

  it('re-activating the same tab is idempotent', { timeout: 15000 }, () => {
    forAll(
      (k: number, n: number) => {
        const targetTab = n % k
        const doc = new DOMParser().parseFromString(buildTabSvg(k), 'image/svg+xml')
        const root = doc.querySelector('.mdart-tab-root')!
        activateMdArtTab(root, targetTab)
        activateMdArtTab(root, targetTab)  // second call
        return doc.querySelector(`.mdart-tab-panel[data-tab="${targetTab}"]`)?.getAttribute('visibility') === 'visible'
      },
      Gen.inRange(2, 4),
      Gen.inRange(0, 3),
    )
  })

})

// ── tryActivateMdArtTabFromEventTarget ────────────────────────────────────────

describe('tryActivateMdArtTabFromEventTarget', () => {

  it('∀ element inside mdart-tab-hit: returns true', { timeout: 15000 }, () => {
    forAll(
      (k: number, n: number) => {
        const targetTab = n % k
        const doc = new DOMParser().parseFromString(buildTabSvg(k), 'image/svg+xml')
        // Target the label inside the tab hit group
        const label = doc.querySelector(`.mdart-tab-hit[data-tab="${targetTab}"] .mdart-tab-label`)!
        return tryActivateMdArtTabFromEventTarget(label) === true
      },
      Gen.inRange(2, 4),
      Gen.inRange(0, 3),
    )
  })

  it('∀ element inside mdart-tab-hit: panel becomes visible after activation', { timeout: 15000 }, () => {
    forAll(
      (k: number, n: number) => {
        const targetTab = n % k
        const doc = new DOMParser().parseFromString(buildTabSvg(k), 'image/svg+xml')
        const label = doc.querySelector(`.mdart-tab-hit[data-tab="${targetTab}"] .mdart-tab-label`)!
        tryActivateMdArtTabFromEventTarget(label)
        return doc.querySelector(`.mdart-tab-panel[data-tab="${targetTab}"]`)?.getAttribute('visibility') === 'visible'
      },
      Gen.inRange(2, 4),
      Gen.inRange(0, 3),
    )
  })

  it('∀ element outside tab UI: returns false', { timeout: 15000 }, () => {
    forAll(
      (tagIdx: number) => {
        const tags = ['span', 'div', 'p', 'section', 'article']
        const tag = tags[tagIdx % tags.length]
        const doc = new DOMParser().parseFromString(`<html><body><${tag}>x</${tag}></body></html>`, 'text/html')
        const el = doc.querySelector(tag)!
        return tryActivateMdArtTabFromEventTarget(el) === false
      },
      Gen.inRange(0, 4),
    )
  })

})
