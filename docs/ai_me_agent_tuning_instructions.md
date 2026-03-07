# AI Me — Tuning Instructions for Cursor

## Objective
Refine AI Me so it behaves as a business-facing assistant that:
- represents Tomas and his work faithfully
- answers from RAG without hallucinating unsupported facts
- accepts business-related discovery questions even when Tomas is not mentioned explicitly
- gently redirects unrelated topics back toward Tomas, his work, or the user's business challenge
- supports continuation turns like "yes" or "go deeper" without breaking
- is implemented in small, testable increments

---

## Product intent
AI Me is a hybrid assistant.
It should do all three of these jobs:
1. showcase Tomas's background, projects, methodology, partners, and current work
2. qualify business leads by engaging with business problems and vague commercial inquiries
3. demonstrate Tomas's thinking style and approach to automation, AI, process redesign, and product/system decisions

This means the assistant is **not** limited to biography questions.
Business questions are in scope even when they do not explicitly mention Tomas.

Examples that **must be treated as in scope**:
- "I have a coffee shop, how can you help me?"
- "We import fruits and need help"
- "I have some problem I would like to solve. where do i begin?"
- "We have too much manual work"
- "How do I know whether AI is actually needed?"

Examples that are in scope because they are about Tomas directly:
- background / CV / experience / career
- projects
- partners
- architecture / stack / this site / AI Me
- methodology / decision-making / how Tomas approaches problems

Examples that should be out of scope and redirected:
- weather
- politics
- general trivia
- geography
- dating / sex
- science questions unrelated to business
- coding questions unrelated to Tomas's work or the user's business problem

---

## Core architecture decision
### Remove deterministic positive scope filtering
The current deterministic `is_in_scope()` allow-list is too narrow and rejects valid lead-intent business questions.

That approach should be removed.

### Keep only a minimal hard-block
Keep a deterministic hard-block only for clearly taboo / unsafe content, such as:
- porn / sexual content
- explicit NSFW
- illegal drugs
- crime / harmful intent
- optionally self-harm if desired

Everything else should go through a **single LLM call**.
Do **not** introduce a second classification call.

### Let the system prompt decide scope
The single LLM call should decide whether the message is:
- about Tomas / his work / his projects
- about a business problem where Tomas's approach may help
- unrelated and should be gently redirected

This keeps architecture simple and avoids brittle keyword scope logic.

---

## Retrieval policy
### Background / CV questions
For background, CV, career, work-history, employment, experience, and similar questions, retrieval should continue to prioritize the `dev_ai_me` namespace.

Current behavior already points in the right direction here and should remain.

### Business / project / methodology questions
For business, project, methodology, AI, automation, workflow, architecture, and related queries, use the existing project-related retrieval behavior.

### Follow-up affirmatives
When the user replies with short continuation messages such as:
- yes
- sure
- go on
- continue
- elaborate
- tell me more

retrieval must **not** use that short affirmative text by itself.
Instead, retrieval should use the **last substantive user/business message** from recent history.

Example:
- user: "I have a coffee shop, how can you help me?"
- assistant: answers
- user: "yes"

Retrieval query should be based on:
- "I have a coffee shop, how can you help me?"

not on:
- "yes"

---

## Conversation history policy
### Use client-side history, not server-side memory
For MVP, keep backend stateless.
Do not build server-side conversation storage.

Frontend should keep recent chat turns in state and send recent history with each new request.

That means:
- no DB needed for chat memory
- no backend session storage required
- backend remains stateless
- model still receives context for follow-ups

### What this means technically
The frontend should send something like:

```json
{
  "message": "yes",
  "visitor_id": "...",
  "history": [
    {"role": "user", "content": "I have a coffee shop, how can you help me?"},
    {"role": "assistant", "content": "Potentially, yes. I would first look at where the operational friction is..."}
  ]
}
```

The backend should:
- accept optional `history`
- pass it into prompt construction / LLM messages
- use it to resolve follow-up affirmatives for retrieval

### Distinguish prompt history vs retrieval history
These are different:

1. **Prompt history**
   - gives the model conversational context
   - so a message like "yes" makes sense

2. **Retrieval history**
   - helps choose a meaningful retrieval query
   - so retrieval does not run on meaningless affirmatives

Both should be implemented.

---

## Rate-limit change
The current anonymous free cap of 5 messages is too low for a useful lead-qualification flow.

Increase anonymous cap from:
- 5 → 10

Reason:
A normal useful interaction may already take 5–6 turns:
1. user describes business
2. assistant asks clarifying question
3. user answers
4. assistant suggests likely approach
5. user asks to go deeper
6. assistant expands

If the limit stays at 5, genuine business interest gets cut off too early.

---

## Desired reply behavior
### If user asks about Tomas directly
Answer using RAG and Tomas's documented sources.
Do not hallucinate unsupported claims.
If a factual claim is not in sources, say so clearly.

### If user brings a business problem
Treat it as in scope.
Respond on Tomas's behalf using his documented thinking, methodology, examples, and approach.

The assistant should:
- briefly frame how Tomas would approach such a situation
- suggest likely problem areas or solution directions when grounded in sources
- ask 1–3 clarifying questions only when genuinely useful
- stay practical and commercially relevant
- avoid generic fluff

Good pattern:
- short framing
- likely areas to inspect
- invitation to describe the challenge

Example style:
> Potentially, yes. I usually start by understanding where the operational friction is. In a business like that, the issue is often around workflow, inventory, coordination, customer communication, or repetitive admin work. Describe your challenge in a few lines, and I’ll try to frame how I would approach it.

### If user asks something unrelated
Do not answer the unrelated topic directly.
Do not use a robotic refusal unless content is hard-blocked.
Instead, gently redirect back toward:
- Tomas's work
- Tomas's projects
- the user's business problem

Example style:
> I stay focused on Tomas's work, projects, and business problems where this approach may help. If you describe your business situation, I can help frame how I would approach it.

---

## Prompt changes required
Update the system prompt so it explicitly states:

1. business-related questions are in scope even when Tomas is not mentioned explicitly
2. vague lead-intent messages are in scope
3. the assistant should answer on Tomas's behalf using his approach and RAG-supported material
4. unsupported factual claims must not be invented
5. out-of-scope topics should be gently redirected instead of answered directly
6. background / CV questions should remain grounded in `dev_ai_me` sources

The prompt should explicitly cover three buckets:

### Bucket A — Tomas / biography / projects / architecture / methodology
Answer directly from sources.

### Bucket B — business discovery / automation / AI / operations / workflows
Treat as in scope.
Respond as Tomas would.
Frame likely approach, ask clarifying questions if useful, and stay grounded in sources.

### Bucket C — unrelated topics
Do not answer directly.
Politely redirect to Tomas's work or the user's business challenge.

---

## Code changes — implement step by step
Make these changes in small increments, verifying after each step.
Do not refactor everything at once.

### Step 1 — Remove brittle scope rejection
Files:
- `backend/app/api/chat.py`
- `backend/app/core/security.py`

Actions:
- remove the hard refusal based on `is_in_scope()`
- keep only the hard-block taboo filter
- leave all other flow unchanged for now

Goal:
Business questions like coffee shop / fruit import should stop being refused.

### Step 2 — Improve system prompt
File:
- `backend/app/llm/prompts.py`

Actions:
- update system prompt to explicitly allow business discovery questions
- add redirect behavior for unrelated topics
- preserve current RAG discipline
- preserve current background-answering rules and `dev_ai_me` grounding

Goal:
Single LLM call decides answer vs redirect.

### Step 3 — Raise anonymous message cap
File:
- `backend/app/core/limits.py`

Actions:
- increase anonymous cap from 5 to 10

Goal:
Allow useful lead-qualification conversations.

### Step 4 — Add client-side history payload
Files:
- `frontend/src/app/ai/page.tsx`
- `frontend/src/app/api/chat/route.ts`
- `backend/app/api/chat.py`

Actions:
- send recent history from frontend in each request
- extend backend `ChatRequest` to accept optional `history`
- forward that history into prompt / LLM call
- keep history window capped, e.g. last 6–10 messages

Goal:
Follow-up messages like "yes" or "go deeper" become understandable.

### Step 5 — Make retrieval history-aware
File:
- `backend/app/rag/retrieval.py`
- potentially small helper in `security.py` or chat orchestration

Actions:
- if current message is a follow-up affirmative, use last substantive user message from history for retrieval
- do not retrieve on "yes" alone

Goal:
Follow-up turns return relevant RAG context.

### Step 6 — Only after above works, add optional response metadata
Files:
- backend response model / frontend rendering

Optional later fields:
- `status: ok | limit_reached | blocked | redirected`
- `cta: none | email | call`
- `intent: background | project | business_problem | redirect`

Goal:
Better frontend UX without changing core logic first.

---

## Important implementation guidance
- Make changes in **small increments**.
- After each step, test manually with real prompts.
- Do not combine scope removal, prompt rewrite, history, retrieval changes, and frontend CTA work into one big change.
- Preserve current working parts where possible.
- Keep to one main LLM call.
- Do not add LangGraph / agent loops.
- Do not add extra OpenAI calls for convenience.

---

## Manual test cases after each increment
### Should answer
- "I have a coffee shop, how can you help me?"
- "We import fruits and need help"
- "I have some problem I would like to solve. where do i begin?"
- "What is your background?"
- "How do you decide between RPA, AI, and custom software?"
- "How was this site built?"

### Should continue naturally
- user asks business question
- assistant replies
- user says: "yes"
- assistant should expand, not refuse and not lose context

### Should redirect
- "What is the weather in Vilnius?"
- "Who is the president of France?"
- "Teach me geography"
- "Help me with dating"

### Should hard-block
- explicit porn / NSFW requests
- illegal drugs
- explicit criminal / harmful intent

---

## Final note for Cursor
This is not about turning AI Me into a general-purpose assistant.
It should remain a focused business-facing assistant for Tomas.

The target behavior is:
- talk on Tomas's behalf
- stay grounded in sources
- engage with real business problems
- qualify leads naturally
- redirect unrelated topics
- preserve a clean, simple architecture

Implement gradually and verify behavior after each step.

