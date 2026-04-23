#!/usr/bin/env node
/**
 * Inject rendered SVGs into docs/syntax.md after each top-level ```mdart fence.
 *
 * - Idempotent: strips any previously-injected image before re-emitting.
 * - Skips demo fences inside 4-backtick `markdown` blocks (syntax examples of
 *   the fence syntax itself, not real diagrams to render).
 * - Writes per-fence SVGs to docs/examples/syntax/<type>-<hash>.svg. Orphans
 *   are cleared on every run so removed fences don't leave stale files.
 *
 * Run: node scripts/gen-syntax-images.mjs
 */

import { renderMdArt } from '../packages/mdart/dist/index.js'
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const root  = join(__dir, '..')

const SYNTAX_MD   = join(root, 'docs', 'syntax.md')
const IMG_DIR_ABS = join(root, 'docs', 'examples', 'syntax')
const IMG_PREFIX  = './examples/syntax/'

await mkdir(IMG_DIR_ABS, { recursive: true })

// Clear stale SVGs so removed fences don't leave orphans
for (const f of await readdir(IMG_DIR_ABS)) {
  if (f.endsWith('.svg')) await unlink(join(IMG_DIR_ABS, f))
}

const lines = (await readFile(SYNTAX_MD, 'utf8')).split('\n')
const out = []
let i = 0, count = 0, failed = 0

// State: are we inside a 4+-backtick outer fence (e.g. ````markdown)?
// Inside such a fence, triple-backtick `mdart` fences are content, not diagrams.
let outerFence = null  // null | { depth: number }

while (i < lines.length) {
  const line = lines[i]

  // Track outer (4+-backtick) fences so nested ```mdart content isn't processed
  const openAny = line.match(/^(`{3,})(.*)$/)
  if (outerFence) {
    if (openAny && openAny[1].length >= outerFence.depth && openAny[2].trim() === '') {
      outerFence = null
    }
    out.push(line); i++; continue
  }

  if (openAny && openAny[1].length >= 4) {
    outerFence = { depth: openAny[1].length }
    out.push(line); i++; continue
  }

  // Only process top-level triple-backtick `mdart` fences
  const mdartOpen = line.match(/^```mdart(?:\s+(\S+))?\s*$/)
  if (!mdartOpen) { out.push(line); i++; continue }

  const inlineType = mdartOpen[1]

  // Find the closing ``` line (must be bare, same or more backticks)
  let j = i + 1
  while (j < lines.length && !/^```\s*$/.test(lines[j])) j++
  if (j >= lines.length) { out.push(line); i++; continue }  // unclosed fence

  const source = lines.slice(i + 1, j).join('\n')

  // Copy the fence verbatim
  for (let k = i; k <= j; k++) out.push(lines[k])
  i = j + 1

  // If a previously-injected image follows, strip it (plus surrounding blanks).
  // Older runs used ![](...) bare image syntax; current runs use <picture>.
  let p = i
  while (p < lines.length && lines[p].trim() === '') p++
  if (p < lines.length && /^!\[.*?\]\(\.\/examples\/syntax\/.+\.svg\)\s*$/.test(lines[p])) {
    i = p + 1
    if (i < lines.length && lines[i].trim() === '') i++
  } else if (p < lines.length && lines[p].trim() === '<picture>') {
    // Skip until we find </picture>
    let q = p + 1
    while (q < lines.length && lines[q].trim() !== '</picture>') q++
    if (q < lines.length) {
      i = q + 1
      if (i < lines.length && lines[i].trim() === '') i++
    }
  }

  if (!source.trim()) continue

  const renderable = inlineType && !/^\s*type\s*:/m.test(source)
    ? `type: ${inlineType}\n${source}`
    : source

  let svgDark, svgLight
  try {
    svgDark  = renderMdArt(renderable)
    svgLight = renderMdArt(renderable, undefined, { mode: 'light' })
  } catch (err) {
    console.warn(`[syntax-img] render failed near line ${j + 1}: ${err.message}`)
    failed++
    continue
  }

  const typeSlug =
    inlineType
    || renderable.match(/^\s*type\s*:\s*([a-z0-9-]+)/im)?.[1]
    || 'mdart'
  const hash = createHash('sha256').update(renderable).digest('hex').slice(0, 10)
  const fnameDark  = `${typeSlug}-${hash}.svg`
  const fnameLight = `${typeSlug}-${hash}-light.svg`
  await writeFile(join(IMG_DIR_ABS, fnameDark),  svgDark,  'utf8')
  await writeFile(join(IMG_DIR_ABS, fnameLight), svgLight, 'utf8')

  out.push('')
  out.push('<picture>')
  out.push(`  <source media="(prefers-color-scheme: dark)" srcset="${IMG_PREFIX}${fnameDark}">`)
  out.push(`  <img alt="${typeSlug}" src="${IMG_PREFIX}${fnameLight}">`)
  out.push('</picture>')
  out.push('')
  count++
}

await writeFile(SYNTAX_MD, out.join('\n'), 'utf8')
console.log(`✓  Injected ${count} diagram images → docs/examples/syntax/${failed ? ` (${failed} failed)` : ''}`)
