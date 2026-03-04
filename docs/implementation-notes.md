# Implementation notes & decisions

Reference for future work: what was implemented and why. Update this when making significant changes.

**How this relates to `.cursor/rules/`:**
- **`.cursor/rules/`** = instructions for the AI (what to follow, what to do next, product behavior). Examples: `backend-implementation-rules.mdc` (points to backend spec & plan), `backend-to-do.md` (sprint tasks), `ai-me-product-behavior.mdc` (limits, CTAs, tone), `valiukas-lt-system-rules.mdc` (architecture, security, RAG discipline).
- **This file** = record of what was actually built and where it lives (current state, past decisions). Use it when you need to know “how is X implemented?” or “why did we do Y?” — not as a rule set, but as documentation the rules produced.

---

## Reference index — where is what documented?

| Topic | Primary doc | Notes |
|-------|-------------|--------|
| **Project architecture** | `valiukas_lt_source_of_truth.md` §1 (high-level), `backend_ai_me_source_of_truth.md` §3–4 (tech stack, repo structure) | Frontend: Next.js (Vercel). Backend: FastAPI (Railway). RAG: Pinecone. One LLM call per message. |
| **RAG design** | `backend_ai_me_source_of_truth.md` §8 (metadata, chunking, retrieval) | Current behaviour (intent routing, general source, dedupe): this file, section "AI Me — RAG & retrieval". Chunking: ~1400 chars, 200 overlap — see `backend/app/rag/chunking.py` and `index_projects.py`. |
| **Pinecone namespaces** | **This file** (below) | Specs mention generic namespace; actual namespaces are defined in code and summarized here. |
| **AI-Me behaviour rules** | `backend_ai_me_source_of_truth.md` §9 (identity, source priority, refusal, tone), `.cursor/rules/ai-me-product-behavior.mdc` (limits, CTAs, tone) | Current prompts and scope check: this file, "AI Me — Prompts & scope". |
| **Page structure** | **This file** (below) | `valiukas_lt_source_of_truth.md` §3 has an older site map; current routes are listed here. |

### Pinecone namespaces (current)

| Namespace | Purpose | Source |
|-----------|---------|--------|
| `projects_public` | Public project pages (summary, metadata) | `content/pages/projects/*.md` |
| `projects_rag` | RAG-only project content + general methodology | `content/rag/projects/*.md`, `content/rag/general/*.md` |
| `dev_ai_me` | CV / career (background intent) | Ingested separately (e.g. CV pipeline); not from `index_projects.py` |

- Default retrieval: query all three, merge by score, dedupe by slug (max 1 per slug), cap ~24 chunks.
- Background intent (e.g. "background", "career", "cv"): query `dev_ai_me` first (top_k=12), then `projects_public` and `projects_rag` (top_k=2 each); CV chunks always first in context.

### Page structure (current)

- `/` — Home
- `/ai` — AI Me chat
- `/services` — Services
- `/projects` — Projects list
- `/projects/[slug]` — Project detail
- `/partners` — Partners
- `/contact` — Contact
- `/about` — About
- `/timeline` — Timeline
- `/privacy` — Privacy
- `/security` — Security
- `/sign-in` — Sign in (for future auth)

Frontend app routes: `frontend/src/app/` (e.g. `ai/page.tsx`, `projects/[slug]/page.tsx`). Layout and nav: `frontend/src/app/layout.tsx`.

---

## AI Me — RAG & retrieval

### General knowledge source
- **File:** `content/rag/general/tomas-approach.md` (methodology, decision framework, RAG approach, deployment).
- **Ingestion:** `backend/app/rag/index_projects.py` — `load_rag_general()` loads `content/rag/general/*.md` into namespace `projects_rag`, `source_type=rag`, slug as-is (e.g. `general/tomas-approach`).
- **Reindex:** `cd backend && source .venv/bin/activate && set -a && source .env && set +a && python -m app.rag.index_projects --full-reindex`

### Intent-based namespace routing (CV / background)
- **File:** `backend/app/rag/retrieval.py`
- **Logic:** If message matches background intent (e.g. "background", "career", "cv", "companies"), query order is: `dev_ai_me` (top_k=12) first, then `projects_public` and `projects_rag` (top_k=2 each). CV chunks are merged first so the model sees them before project chunks.
- **ContextChunk:** Includes `namespace` and `vector_id`; dedupe is namespace-aware for background intent.
- **Prompt:** If CV sources (namespace `dev_ai_me`) are present, base company/role list on those; do not treat partners as employers unless stated in CV.

### Citations
- **Frontend:** `frontend/src/app/ai/page.tsx` — source links only when `slug.startsWith("projects/")`. For `general/*` or CV, show title only (no link) unless a `/general/...` page exists later.

### Caching
- **Retrieval:** key `retrieval:{hash(message)}`, TTL 600s.
- **Chat answer:** key `answer:{hash(normalized_message)}` (when in preset set).
- **Embeddings:** key `embedding:{hash(text)}`, TTL 1800s.
- Backend uses Redis if `REDIS_URL` set, else in-memory.

---

## AI Me — Prompts & scope

### System prompt (`backend/app/llm/prompts.py`)
- Scope: professional background, projects (including this site and AI Me), architecture/tech/implementation, methodology, education when relevant.
- First person ("I"); no "Tomas's perspective" framing.
- Questions about "this site", "AI Me", "how this was built" are in scope.
- Answering rules: (1) background/career — list companies from CV, roles, responsibilities; (2) education — chronological when asked; (3) projects — use sources, dedupe by slug; (4) methodology — documented approach, 3–5 examples.
- Formatting: bullets preferred; if numbered lists, use 1., 2., 3. sequentially (never repeat "1.").

### Scope check (`backend/app/core/security.py`)
- `is_in_scope(message)`: allows e.g. "tomas", "projects", "background", "this site", "this website", "dev stack", "tech stack", "architecture", "stack", and pattern "how was/is ... built/made/created" so site/stack questions are not refused.

### Refusal
- **Message:** "This assistant is focused on Tomas and his work. I can help with questions about his experience, projects, or how he approaches problems." — in `backend/app/api/chat.py` `_refusal_message()`, returned when `is_disallowed_topic()` or `not is_in_scope()`.

---

## Frontend — AI Me page UX

### Clear chat
- **Placement:** Same line as "Requests left: X out of Y" (status row), right-aligned; only when `hasStarted`.
- **Safeguard:** Confirmation modal: "Clear chat?" / "All messages will be permanently lost." Cancel and "Clear chat" (destructive style: dark red border/text).
- **Styles:** `.chat-action` and `.chat-action.secondary` use `background: transparent` and `appearance: none` so Safari doesn’t show a light default button background; `.chat-action-destructive` for modal clear button.

### Scope notice
- **Text:** Above chat transcript: "This is not a general-purpose assistant. It answers ONLY questions related to my professional background, projects, and approach to automation and AI, using documented knowledge sources." ("only" in uppercase via `.chat-scope-only`.)
- **Style:** `.chat-scope-notice` — card background, border, padding, muted text.

### Empty state
- **Text:** "I represent Tomas's work and thinking. Ask about projects, architecture decisions, or automation strategy." (Replaces previous "Hi — I'm an AI representation of Tomas...")

### Scroll behavior
- When a new assistant message is added, only the **chat transcript** scrolls to show the start of the answer (not the whole page). Implemented in `scrollToLastMessageInTranscript()` using the transcript container ref.

### Spacing (AI Me page)
- `.ai-me-page .hero` — reduced bottom padding (24px).
- `.ai-me-page .section.chat-shell` — reduced top padding (12px) to shrink gap between hero and scope notice.

---

## Favicon

- **Serving:** Use `public/favicon.ico` and `public/favicon-32x32.ico`. Do **not** put `favicon.ico` in `app/` as a file — it caused 500 in Next.js. Static files in `public/` are served at root.
- **Metadata:** `layout.tsx` — `icons: { icon: "/favicon.ico", apple: "/apple-icon.png" }`.
- **Safari:** Explicit `background` and `appearance: none` on buttons to avoid default light gray; favicon in `public/` with correct format (.ico) for Safari.

---

## Reindex / ingestion

- **Projects + general:** `content/pages/projects` → `projects_public`; `content/rag/projects` + `content/rag/general` → `projects_rag`.
- **Env:** Load `.env` before running indexer (e.g. `set -a && source .env && set +a`).

---

*Last updated: 2025-02 — session covering general RAG source, intent routing, prompts, scope, Clear chat UX, scope notice, empty state, spacing, favicon, caching.*
