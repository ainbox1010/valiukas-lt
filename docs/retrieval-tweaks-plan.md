# Retrieval tweaks — implementation plan

Refined plan (ChatGPT + Cursor agreement) for improving AI Me retrieval. Implement step-by-step.

---

## A. Compose retrieval query for short follow-ups

**Trigger when:** affirmatives (yes, ok, sure, continue, go on) **or** short narrowing replies.

**Exclude:** short question starters (how, what, why, when, where, who).

**Rule:**
- `<= 2 words` → trigger composition
- `<= 3 words` and no question starter → trigger composition
- Else → use current message as-is

**Action:** `retrieval_query = last_substantive_user_message + " " + current_message`

**Substantive message:** Last user message that is NOT affirmative and NOT short narrowing (so we don't chain "yes" → "inventory" → "yes").

---

## B. Add methodology intent

**Keywords:** approach, methodology, framework, decide, decision, when to use, how do you, when do you, how do you approach.

**Action:** When detected, query namespaces in order: `tomas` (top_k=12) → `projects_rag` (top_k=2) → `projects_public` (top_k=2). Merge by score (same pattern as `background_intent`).

**Note:** Separate from existing `background_intent` (CV/background).

---

## C. Guarantee at least one tomas chunk for business discovery

**When:** Query looks like vague business discovery (e.g. "I run a coffee shop", "we import fruits", "I need help", "we have too much manual work").

**Action:** If merged chunks contain no tomas chunk, run one extra query to tomas and add the top chunk to context.

---

## Implementation steps

| Step | Task | File |
|------|------|------|
| 1 | Add `_is_short_narrowing_reply(message)` | chat.py |
| 2 | Extend `_retrieval_query()` for composition | chat.py |
| 3 | Add methodology intent detection and routing | retrieval.py |
| 4 | Guarantee tomas chunk for business discovery | retrieval.py |
| 5 | Test retrieval tweaks | manual/automated |

---

## Test cases

- **Short follow-ups:** "yes", "inventory", "documents", "orders", "how" (should NOT compose)
- **Methodology:** "how do you decide if AI is needed", "what is your framework"
- **Business discovery:** "I run a coffee shop", "we import fruits", "I need help", "coffee shop", "logistics company"

## Automated tests

Unit tests in `backend/tests/test_retrieval_tweaks.py`. Run:

```bash
cd backend && source .venv/bin/activate && pytest tests/test_retrieval_tweaks.py -v
```

---

## Future improvement (postponed): broader follow-up detection

**Reminder:** Extend `_retrieval_query()` in `backend/app/api/chat.py` to handle more natural conversational confirmations. Current logic is sufficient for MVP.

### Context

The logic composes a retrieval query using the previous substantive user message only when:
1. `is_followup_affirmative(message)` returns True
2. `_is_short_narrowing_reply(message)` returns True

Otherwise `retrieval_query = message`.

### Potential issue

Some follow-ups are clearly affirmations but are not detected:
- "yes, I would very much like that because I think it is important" → no domain keywords, weak retrieval
- "yes exactly", "that's right", "correct", "exactly that", "pretty much", "close", "not exactly but close" → may not be detected

The LLM still receives `history`, so conversation stays coherent; the limitation mainly affects retrieval quality.

### Proposed improvement

1. **Affirmative prefixes** — Detect if message begins with: yes, exactly, correct, right, true (even if message is long). Example: "yes that is exactly the issue".

2. **Corrective follow-ups** — Detect: "not exactly", "not really", "close but", "the real issue is". Trigger composition with previous substantive message.

3. **Partial agreement** — Detect: "pretty much", "more or less", "that's roughly it".

### Goal

Improve retrieval context quality without another LLM call. Logic should remain deterministic and fast.

---

*Created 2025-02. See `docs/implementation-notes.md` for current RAG state.*
