# MdArt Playground

Interactive demo for the MdArt renderer + chat co-pilot. Ships as a Steward mini-app but can also run standalone.

## Inside Steward

When started from the Steward Apps panel the playground inherits every environment variable defined in the root `.env` (Anthropic/OpenAI/Gemini keys, `CLAUDE_PATH`, etc.). Nothing extra to configure — pick “claude” or “opencode” per session in the sidebar.

## Standalone Usage

Run the playground without Steward when you want to embed it in another stack or develop locally.

1. Install dependencies at the repo root once:

   ```bash
   npm install
   ```

2. Install the CLI(s) you plan to use:
   - **Claude CLI** — <https://console.anthropic.com/claude/download>
   - **OpenCode CLI** — <https://opencode.ai>

3. Export the environment variables needed by those CLIs before launching the playground (or drop them in a shell-specific rc file):

   | Variable | Required for | Notes |
   | --- | --- | --- |
   | `CLAUDE_PATH` | Claude CLI | Defaults to `~/.local/bin/claude`; override if the binary lives elsewhere. |
   | `OPENCODE_PATH` | OpenCode CLI | Defaults to `~/.opencode/bin/opencode` after running the installer. |
   | `GEMINI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` | Google/Gemini models via OpenCode | Either key works; OpenCode forward them to Google’s Generative AI API. |
   | `OPENAI_API_KEY` | OpenAI models via OpenCode | Optional unless you pick an `openai/*` model. |
   | `ANTHROPIC_API_KEY` | Anthropic models via OpenCode | Optional unless you pick an `anthropic/*` model. |
   | `OPENCODE_DEFAULT_MODEL` | OpenCode CLI | Fallback model when the session picker stays on “Default (env)”. Example: `google/gemini-2.5-flash`. |
   | `OPENCODE_ENABLE_EXA` | OpenCode CLI | Default `1`; keep it to enable web search. |

   Example:

   ```bash
   export CLAUDE_PATH="$HOME/.local/bin/claude"
   export OPENCODE_PATH="$HOME/.opencode/bin/opencode"
   export GEMINI_API_KEY=ai-xxxx
   export OPENCODE_DEFAULT_MODEL=google/gemini-2.5-flash
   ```

4. Start the playground server on any port:

   ```bash
   cd apps/playground
   npx tsx src/server.ts 4001
   ```

5. Visit <http://localhost:4001/demo>. The **AI** button opens the chat panel where you can select `claude` or `opencode` per session and switch models inside the chosen adapter.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `Error: Model not found: google/gemma-4-31b-it` | OpenCode process started without Google/Gemini env vars | Export `GEMINI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` before running `npx tsx …`. |
| `ENOENT: no such file or directory, spawn claude` | `CLAUDE_PATH` not pointing at the Claude CLI | Install the CLI and export `CLAUDE_PATH` (or install to `~/.local/bin`). |
| Model dropdown disabled even before first turn | The session already contains history | Create a new session (plus button) to start with a clean resume id. |

The playground is just an Express app; you can wrap it behind any reverse proxy as long as the process environment contains the provider credentials you expect the CLI adapters to use.
