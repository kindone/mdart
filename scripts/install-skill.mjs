#!/usr/bin/env node
/**
 * install-skill.mjs — copy skills/mdart/ to one or more target directories.
 *
 * Why this exists: the canonical skill content lives in this repo at
 *   skills/mdart/{SKILL.md, anti-patterns.md}
 * but Claude (and other agent harnesses) discover skills from their own
 * lookup paths (typically ~/.claude/skills/). Rather than maintain a
 * symlink — which is fragile across environments, fresh clones, and
 * non-Unix systems — this script does a deterministic copy.
 *
 * Usage:
 *
 *   # Default: install to mdart's own .claude/skills/mdart (project-scoped,
 *   # matches the convention consumers like steward use).
 *   npm run install:skill
 *
 *   # Install globally instead:
 *   npm run install:skill -- --no-default --target=$HOME/.claude/skills/mdart
 *
 *   # Custom targets via CLI (repeatable):
 *   npm run install:skill -- --target=/path/to/dest --target=/another/dest
 *
 *   # Custom targets via env var (colon-separated):
 *   MDART_SKILL_TARGETS=/a:/b npm run install:skill
 *
 *   # Skip default and add extras:
 *   npm run install:skill -- --no-default --target=/path/to/dest
 *
 *   # Dry-run:
 *   npm run install:skill -- --dry-run
 *
 * Re-run after every regeneration (`skills/regen-skill.md`) or `git pull`
 * that touches `skills/mdart/`.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const HERE   = path.dirname(fileURLToPath(import.meta.url))
const ROOT   = path.resolve(HERE, '..')
const SOURCE = path.join(ROOT, 'packages', 'mdart', 'skills', 'mdart')

// ── Argument parsing ──────────────────────────────────────────────────────
const args      = process.argv.slice(2)
const dryRun    = args.includes('--dry-run')
const noDefault = args.includes('--no-default')
const cliTargets = args
  .filter(a => a.startsWith('--target='))
  .map(a => a.slice('--target='.length))
const envTargets = (process.env.MDART_SKILL_TARGETS ?? '')
  .split(':')
  .map(s => s.trim())
  .filter(Boolean)

// Default target = mdart's own .claude/skills/, project-scoped (matches the
// convention consumers like steward use). Pass --target to install elsewhere
// (e.g. global ~/.claude/skills/mdart).
const defaultTarget = path.join(ROOT, '.claude', 'skills', 'mdart')

const targets = []
if (!noDefault && cliTargets.length === 0 && envTargets.length === 0) {
  targets.push(defaultTarget)
}
targets.push(...cliTargets, ...envTargets)

if (targets.length === 0) {
  console.error('No install targets resolved. Pass --target=<path> or set MDART_SKILL_TARGETS.')
  process.exit(1)
}

// ── Verify source exists ──────────────────────────────────────────────────
try {
  await fs.access(SOURCE)
} catch {
  console.error(`Source not found: ${SOURCE}`)
  console.error('Expected the canonical skill at skills/mdart/ relative to repo root.')
  process.exit(1)
}

// ── Copy ──────────────────────────────────────────────────────────────────
async function copyTree (src, dst) {
  const stat = await fs.stat(src)
  if (stat.isDirectory()) {
    if (!dryRun) await fs.mkdir(dst, { recursive: true })
    for (const entry of await fs.readdir(src)) {
      await copyTree(path.join(src, entry), path.join(dst, entry))
    }
  } else {
    if (!dryRun) await fs.copyFile(src, dst)
    console.log(`  ${dryRun ? '[dry-run] ' : ''}${dst}`)
  }
}

const sourceVersion = await readVersionFooter()
console.log(`Source: ${SOURCE}${sourceVersion ? ` (${sourceVersion})` : ''}`)
console.log()

for (const target of targets) {
  const absolute = path.resolve(target)
  console.log(`→ ${absolute}`)
  if (!dryRun) await fs.mkdir(absolute, { recursive: true })
  await copyTree(SOURCE, absolute)
  console.log(`  ✓ ${dryRun ? 'would install' : 'installed'} mdart skill`)
  console.log()
}

if (dryRun) {
  console.log('Dry-run complete — no files were written.')
}

// ── Helpers ───────────────────────────────────────────────────────────────
async function readVersionFooter () {
  try {
    const skill = await fs.readFile(path.join(SOURCE, 'SKILL.md'), 'utf8')
    const m = skill.match(/derived from mdart (v[\d.]+)/)
    return m ? m[1] : null
  } catch {
    return null
  }
}
