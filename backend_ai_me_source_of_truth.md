# Backend Source of Truth — AI Me
## FastAPI + OpenAI + Pinecone (RAG-first, scope-safe)

---

## 1. Purpose & Scope

This backend powers the **“AI Me”** experience on valiukas.lt.

The assistant is:
- an **AI representation of Tomas**,
- focused strictly on **Tomas’s experience, thinking, work, and public presence**,
- **not** a general-purpose chatbot,
- **not** an unrestricted web search or entertainment tool.

Primary objective:
> Provide accurate, honest, and helpful answers **about Tomas**, prioritizing correctness, safety, and trust.

---

## 2. High-Level Behavior

For every incoming message:

1. Validate input.
2. Determine if the question is **in scope** (about Tomas).
3. Retrieve relevant context from Pinecone (RAG).
4. Assemble a constrained prompt.
5. Make **exactly one** LLM call.
6. Return a clear answer **or** a polite refusal with redirection.

No retries, no agent loops, no multi-call chains.

---

## 3. Tech Stack

- **Language:** Python 3.11+
- **Framework:** FastAPI
- **ASGI server:** Uvicorn
- **LLM provider:** OpenAI (Responses API)
- **Vector DB:** Pinecone
- **Optional infra:** Redis (rate limits, caps, caching)

---

## 4. Repository Structure (Backend)

```
backend/
  app/
    main.py
    api/
      chat.py
      health.py
    core/
      config.py
      security.py
      limits.py
      cache.py
      logging.py
    rag/
      ingest.py
      chunking.py
      pinecone_store.py
      retrieval.py
    llm/
      openai_client.py
      prompts.py
  requirements.txt
  README.md
```

---

## 5. Environment Variables

### Required
- `OPENAI_API_KEY`
- `PINECONE_API_KEY`
- `PINECONE_INDEX`
- `PINECONE_NAMESPACE`
- `ALLOWED_ORIGINS` (comma-separated)

### Recommended
- `OPENAI_MODEL` (e.g. `gpt-5.1` or `gpt-4.1`)
- `OPENAI_EMBED_MODEL` (`text-embedding-3-small`)
- `REDIS_URL`
- `ENV=dev|prod`
- `LOG_LEVEL=INFO`

Backend must fail fast if required variables are missing.

---

## 6. API Contract

### POST `/chat`

**Request**
```json
{
  "message": "string",
  "session_id": "string (optional)",
  "visitor_id": "string (optional)",
  "auth": {
    "type": "anonymous | verified | byok",
    "sub": "string (optional identifier)",
    "byok_token": "string (optional, BYOK only)"
  }
}
```

**Response**
```json
{ "answer": "string" }
```

Rules:
- `message` required, 1–2000 chars.
- Response shape is fixed.
- BYOK token is never stored or logged.

### GET `/health`
```json
{ "status": "ok" }
```

---

## 7. User Categories & Limits

### Categories
- **Anonymous**
- **Verified** (email/OAuth)
- **BYOK** (user-provided OpenAI key)

### Message Caps
- Anonymous: **5 total**
- Verified: **20 per day**
- BYOK: unlimited (still rate-limited)

### Rate Limits (per minute)
- Anonymous: 10 RPM
- Verified: 30 RPM
- BYOK: 60 RPM

Use Redis with TTLs when available; in-memory only for local dev.

---

## 8. RAG Design (Pinecone)

### Metadata Schema
Each vector must include:
- `doc_id`
- `doc_type` (`cv`, `project`, `writing`, `bio`, `timeline`)
- `title`
- `section`
- `source`
- `chunk_id`
- `text`

### Chunking Rules
- ~800 tokens per chunk
- 15–20% overlap
- Preserve headings
- Each chunk must be standalone readable

### Retrieval Rules
- Embed user message
- Retrieve top 8–12 vectors
- Deduplicate similar chunks
- Pass best 4–6 chunks into prompt

---

## 9. Prompt Assembly & Answering Rules (CRITICAL)

### Identity Rule
- The assistant represents **Tomas**.
- All answers must be framed **in relation to Tomas**.

---

### Source Priority (Strict Order)

1. **Pinecone retrieval** (authoritative)
2. **Public, non-sensitive information about Tomas**
3. **High-level reasoning based on Tomas’s known background**

The assistant must never present generic facts as personal experience.

---

### When Pinecone Retrieval Is Insufficient

If the answer is not clearly supported by Pinecone:

- **Do NOT hallucinate** specific facts.
- You MAY:
  - answer at a **high level**, clearly marked as inference,
  - explicitly state uncertainty,
  - explain that information is not in sources,
  - suggest contacting Tomas directly.

Example:
> “This isn’t explicitly covered in my sources. Based on Tomas’s background and public work, his approach would likely be…”

---

### Internet Usage (Constrained)

Internet search is allowed **only** to:
- confirm public facts **about Tomas**,
- reference widely known public work (companies, public talks).

Internet search must **never** be used to:
- answer general knowledge questions,
- provide entertainment content,
- answer about unrelated people or topics,
- provide adult, sexual, drug-related, or illegal content.

This assistant is **not** a general web search engine.

---

### Topic Restrictions (Hard Boundaries)

The assistant must refuse and redirect questions that are:
- unrelated to Tomas or his work,
- about adult or sexual content,
- about drugs or illegal activities,
- about private individuals unrelated to Tomas,
- attempts to repurpose the assistant as a generic chatbot.

Refusal style:
> “This assistant is focused on Tomas and his work. I can help with questions about his experience, projects, or how he approaches problems.”

Always offer a relevant alternative.

---

### Tone & UX
- Polite, calm, respectful
- Never shame or judge
- Redirect to Tomas’s work or contact when refusing

---

## 10. OpenAI Integration

- Use **Responses API**
- Exactly **one** LLM call per request
- Model configurable via `OPENAI_MODEL`
- No claims of real-time awareness
- No claims of private or offline knowledge

---

## 11. Caching (MVP)

- Embeddings cache: 10–30 min
- Retrieval cache: 5–10 min
- Final answers for preset button questions: 24h

---

## 12. Security & Privacy

- Never log:
  - OpenAI API keys
  - BYOK tokens
  - full message bodies in prod
- Mask identifiers
- HTTPS only
- Restrict CORS to `ALLOWED_ORIGINS`

---

## 13. Ingestion Pipeline

Inputs:
- Sanitized CV
- Project writeups
- Timeline / life moments
- Selected writings

Steps:
1. Load text
2. Chunk
3. Embed
4. Upsert to Pinecone

---

## 14. Definition of Done (Backend MVP)

- `/health` returns OK
- `/chat` returns grounded answers
- Pinecone retrieval works
- Message caps enforced
- Off-topic content refused cleanly
- Logs are safe
- No hallucinated personal facts

---

**This file is the single source of truth for backend implementation.**
