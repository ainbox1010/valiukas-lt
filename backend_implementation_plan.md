# Backend Implementation Plan — AI Me RAG Upgrade

**Status:** Planning (no implementation yet)  
**Reference:** `backend_ai_me_source_of_truth.md` (authoritative backend spec)

---

## 1. Content Contract (Finalized Fields)

Fields we will rely on for ingestion, retrieval, and citations.

### Required for all ingested content
| Field | Type | Notes |
|-------|------|-------|
| `doc_id` | string | Stable id for deduplication, updates, citations |
| `slug` | string | Canonical route (e.g. `projects/ai-me`). Used for citation links |
| `title` | string | Display title |
| `content_type` | string | `project`, `project_rag`, `partner`, `page`, etc. |
| `visibility` | string | `public` = ingest; `rag` / `rag_only` = RAG-only; `private` = skip |

### Project-specific (when content_type = project)
| Field | Type | Notes |
|-------|------|-------|
| `summary` | string | Short description |
| `type` | string | `ai` \| `automation` \| `systems` |
| `industry` | string | e.g. "Professional services / Accounting" |
| `partner` | string | e.g. "erobot.ai", "beelogic.io" (omit for self) |
| `ownership` | string | `self` \| `partner` |

### Validation before ingestion
- All ingested files must have: `doc_id`, `slug`, `title`, `content_type`, `visibility`
- Projects must have: `type`, `ownership`; `partner` only when ownership = partner
- Run validation script before ingestion pipeline

---

## 2. Implementation Order

1. **Content contract** — Finalize fields, add validation script, ensure all content conforms
2. **Ingestion pipeline** — Chunking rules, metadata mapping, id strategy, upsert, delete/reindex
3. **Query layer** — Filters (type/industry/partner/ownership), top-k, rerank (optional), strict citation policy
4. **Frontend wiring** — "Ask AI Me about projects" pulls from Pinecone with citations + links to `/projects/{slug}`
5. **Design tweaks** — Last

### Pre-step: Retrieval testing
- Add manual test cases or small eval set before frontend wiring
- Validate chunking and filters produce expected results

---

## 3. Gaps vs Current Backend Spec

`backend_ai_me_source_of_truth.md` §8 defines metadata schema:
- `doc_id`, `doc_type`, `title`, `section`, `source`, `chunk_id`, `text`

**Align with content contract:**
- Map `doc_type` ← `content_type`
- Add `slug` for citation links
- Add `summary`, `type`, `industry`, `partner`, `ownership` for filtering
- `source` = file path or doc_id for traceability

---

## 4. Content Sources

| Source | Path | Visibility | Notes |
|--------|------|------------|-------|
| Public projects | `content/pages/projects/*.md` | public | Has type, industry, partner, ownership |
| RAG projects | `content/rag/projects/*.md` | rag / rag_only | Richer detail, shared slug with public |
| Partners | `content/pages/partners/*.md` | public | |
| RAG partners | `content/rag/partners/*.md` | rag | |
| Pages | `content/pages/*.md` | public | home, services, projects index, etc. |

---

## 5. Citation Policy (Strict)

- No answer without retrieval
- Every claim must be traceable to a chunk
- Links in response: `/projects/{slug}` (strip `projects/` prefix for route)

---

*Update this file as we progress. Do not delete — it is the implementation checklist.*
