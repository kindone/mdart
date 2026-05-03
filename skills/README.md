# mdart skill

Reference content that teaches an AI agent (Claude Code, opencode, etc.) to use mdart proficiently — both syntactically (valid output) and judgmentally (picking the right diagram type for the user's intent).

## Files

| File | Loaded by harness | Purpose |
|---|---|---|
| `mdart/SKILL.md` | always (when triggered) | Frontmatter + family cheat sheet (§1) + selection decision tree (§2) + brief anti-pattern reminders. |
| `mdart/anti-patterns.md` | on demand (mentioned by name in SKILL.md) | Full 7-category catalog of failure modes seen in practice. |
| `regen-skill.md` | not a skill file — a meta-prompt | Run via `claude -p "$(cat skills/regen-skill.md)"` to update the skill content after mdart's `layouts/` directory changes. |

## Install

The skill content lives in this repo as the source of truth. To make it discoverable by Claude (which scans `~/.claude/skills/`), copy it with:

```bash
npm run install:skill
```

That copies `skills/mdart/` → `~/.claude/skills/mdart/` by default. Customise:

```bash
# Multiple targets via CLI
npm run install:skill -- --target=/path/A --target=/path/B

# Or via env var (colon-separated)
MDART_SKILL_TARGETS=/path/A:/path/B npm run install:skill

# Skip the default ~/.claude/skills/mdart and use only your own targets
npm run install:skill -- --no-default --target=/your/path

# Preview what would be copied
npm run install:skill -- --dry-run
```

Re-run the install whenever:
- You `git pull` and the diff touches `skills/mdart/`
- You regenerate the skill via the meta-prompt (see below)

## Regenerate (when mdart evolves)

The skill content is *derived* from mdart's `packages/mdart/src/layouts/` directory. When new diagram types are added or removed, regenerate:

```bash
claude -p "$(cat skills/regen-skill.md)"
```

The meta-prompt is self-contained — it tells Claude how to enumerate types, classify aliases, diff against the current skill, and surgically update only what changed. It also reminds you to run `npm run install:skill` afterwards.

## Why no symlinks

A symlink from `~/.claude/skills/mdart` → this repo's `skills/mdart/` would auto-track edits, but:
- Fresh clones in new environments need manual symlink setup
- The symlink path embeds an absolute repo location that varies per machine
- Some platforms / agent harnesses don't follow symlinks consistently

A copy via `npm run install:skill` is reproducible: clone, install, run once, done. The cost is one extra command per regeneration.
