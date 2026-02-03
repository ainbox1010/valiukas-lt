
# valiukas.lt — Source of Truth (Full Dev & Compliance Plan)

## 0) Vision & Goal
valiukas.lt is a personal, trust-first website for Tomas that combines:
- SEO-friendly personal and professional pages
- An AI agent that answers questions strictly based on Tomas’s materials (RAG)
- Strong privacy, security, and compliance guarantees
- Clear conversion paths (contact, call, email)

The site must feel:
- credible to technical users,
- safe under GDPR scrutiny,
- and useful even when AI limits are reached.

---

## 1) High-Level Architecture

Frontend:
- Next.js (React) on Vercel
- Static Site Generation (SSG) for SEO pages
- Minimal, professional design (content-first)

Backend:
- Python FastAPI on Railway
- Single-call-per-message AI agent
- Deterministic RAG (no agent loops)

AI:
- OpenAI ChatGPT API
- Default: platform API key
- Optional: Bring Your Own API Key (BYO)

Vector DB:
- Pinecone (primary)
- Namespaces:
  - prod_docs
  - semantic_cache

---

## 2) Design Principles

- Text-first, not animation-first
- Agent enhances the site; it is not the site
- Everything important must exist as real HTML
- Agent answers must be verifiable and citable
- Failure modes must look intentional, not broken

---

## 3) Site Map

Public (SEO):
- /
- /about
- /services
- /projects
- /projects/[slug]
- /timeline
- /contact
- /privacy
- /security

Global component:
- “Ask Tomas” chat widget (bottom-right)

---

## 4) Content Strategy

Static content:
- About: positioning, background, focus areas
- Services: clearly packaged offerings
- Projects: short, factual case studies
- Timeline: curated professional + life milestones
- Privacy & Security: explicit, readable policies

Agent corpus (RAG):
- Sanitized CV
- Selected project writeups
- Blog posts / notes
- Public talks or articles

Never ingest:
- personal identifiers
- confidential client data
- private contact details

---

## 5) RAG Design

Chunking:
- 300–800 tokens
- Prefer section-based splits
- Metadata:
  - doc_id
  - title
  - section
  - version
  - tags

Retrieval:
- TopK = 8–12
- No LLM-based reranking (Phase 1)

Rules:
- If not in sources → say so
- Always cite sources
- Short answer first, details second

---

## 6) OpenAI Usage & Limits

Org limits:
- RPM: 3
- RPD: 200

Design implications:
- Aggressive caching
- Gating
- No multi-call agent chains

Model strategy:
- Default: gpt-4.1-mini
- Escalation: gpt-5.1 (rare)

---

## 7) Gating & Usage Limits

Per-user limits:
- Anonymous: 5 live messages/day
- Verified (email/OAuth): 20 live messages/day
- BYO API key users: unlimited (external quota)

Verification options:
- Email magic link
- Google OAuth
- Optional CAPTCHA escalation

---

## 8) BYO API Key Mode

Purpose:
- Remove platform limits
- Give power users control
- Increase trust & transparency

Key rules:
- Key never stored
- Key never logged
- Key never visible to site owner
- Key exists only in memory per session

Routing logic:
1. If user key present → use it
2. Else use platform key
3. Else fallback

---

## 9) UI COPY — “Use Your Own API Key” Modal

Title:
Use your own OpenAI API key

Body:
This option lets you ask unlimited questions using *your own* OpenAI API quota.

Why this exists:
- The public demo is rate-limited.
- Power users may want uninterrupted access.
- You stay fully in control of your API usage.

Privacy & security guarantees:
✔ Your API key is **never stored**
✔ Your API key is **never logged**
✔ Your API key is **never visible to me**
✔ Your API key is **used only to answer your question**
✔ Your API key is **discarded immediately after use**

Technical details (plain language):
- The key lives only in your browser memory.
- It is sent securely (HTTPS) with your request.
- The backend removes it before any logging or analytics.
- Refreshing the page removes the key.

Input label:
OpenAI API key (sk-...)

Actions:
[ Use my key for this session ]
[ Cancel ]

Footer note:
If you prefer, you can continue with the limited free mode or contact Tomas directly.

---

## 10) Caching Strategy

Static FAQ:
- 20–50 curated questions
- No API calls

Semantic cache:
- Vector similarity ≥ 0.90
- Cache answer + citations
- Invalidate on doc version change

Exact-match cache:
- LRU in Redis/Postgres

---

## 11) Graceful Degradation

When limits hit:
- Show explanation
- Offer:
  - Use your own API key
  - Email Tomas
  - Book a call
  - View services

Never show raw errors.

---

## 12) Backend API

POST /chat:
- One OpenAI call max
- Returns:
  - answer
  - citations
  - followups
  - cached flag

POST /ingest (admin):
- Protected via token
- Indexes docs into Pinecone

---

## 13) GDPR Review (Technical Audit View)

Lawful basis:
- Legitimate interest (Q&A, analytics)
- Consent for email capture

Data collected:
- Questions (sanitized)
- Feedback (thumbs up/down)
- Optional email

Data NOT collected:
- API keys
- IP addresses (beyond transient rate limiting)
- Sensitive personal data

User rights:
- Right to access
- Right to deletion
- Right to explanation (privacy page)

Retention:
- Logs: max 30 days
- Emails: until user requests deletion

---

## 14) Security Review Checklist

- HTTPS everywhere
- CORS restricted to domain
- Rate limiting enforced server-side
- No secrets in frontend bundle
- No API keys in logs
- No API keys in error traces
- No API keys in analytics

Critical severity if violated.

---

## 15) Repo Structure

/frontend
  /app
  /components
  /content
  /lib

/backend
  /app
    main.py
    rag/
    security/
  requirements.txt
  Dockerfile

/scripts
  ingest.py
  sanitize.py

---

## 16) Milestones

M1: Static site live
M2: Agent backend
M3: Chat widget
M4: Caching + gating
M5: Compliance polish

---

## 17) Cursor Rules (Summary)

- Do not invent APIs or data
- Follow this file as source of truth
- Ask before changing architecture
- Hallucinations are unacceptable
