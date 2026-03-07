# AI Me — Prompt Templates

Each `.md` file in this directory is a system prompt used by AI Me.

**Format:** Plain text. No special structure required.

**Active prompt:** Selected in `backend/app/llm/prompts.py` via `ACTIVE_PROMPT` (e.g. `"iteration0"`).

**Adding a new iteration:** Create `iterationN.md` (e.g. `iteration2.md`) with your prompt text. Update `ACTIVE_PROMPT` in `prompts.py` to use it.
