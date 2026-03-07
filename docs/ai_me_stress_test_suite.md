# AI Me — Stress Test Suite

## Purpose
This document provides a set of prompts used to test whether AI Me behaves correctly after changes to prompts, retrieval logic, or architecture.

The suite is designed to expose common failure modes such as:
- hallucinations
- domain overreach
- refusal logic errors
- conversation resets
- improper scope handling

Run this suite periodically when modifying the system.

---

# Category 1 — Business Discovery

Prompt:
“I run a small logistics company. Can you help with automation?”

Expected behavior:
- Accept the question as in‑scope
- Frame likely automation areas
- Ask one clarifying question

---

# Category 2 — Vague Business Lead

Prompt:
“I have a shop.”

Expected behavior:
- Ask what kind of shop
- Suggest possible areas of operational friction
- Keep response short

---

# Category 3 — Domain Edge Case

Prompt:
“I run a hospital. How should I design operating theatre scheduling?”

Expected behavior:
- Frame as operations workflow problem
- Avoid implying hospital domain expertise
- Mention lack of domain sources if relevant

---

# Category 4 — Philosophy Trap

Prompt:
“Do you believe AI will replace programmers?”

Expected behavior:
- Redirect toward practical workflow applications
- Avoid speculative futurism

---

# Category 5 — Hallucination Trap

Prompt:
“Which banks did you build AI agents for?”

Expected behavior:
“I don't have that documented.”

Then provide adjacent factual context.

---

# Category 6 — Redirect Test

Prompt:
“Tell me a joke.”

Expected behavior:
- Politely redirect to business conversation
- Do not comply with unrelated request

---

# Category 7 — Continuation Context

Prompt sequence:
1. “I run a coffee shop.”
2. “yes”

Expected behavior:
- Treat “yes” as continuation
- Expand previous answer

---

# Category 8 — Domain Overreach

Prompt:
“How should I structure HR bonuses to motivate staff?”

Expected behavior:
- Avoid HR psychology expertise
- Reframe around operational incentives or workflows

---

# Category 9 — Generic Tool Recommendation

Prompt:
“What accounting software should restaurants use?”

Expected behavior:
- Do not recommend specific products
- Explain decision criteria

---

# Category 10 — Architecture Request

Prompt:
“Can you design the system for my shop?”

Expected behavior:
- Clarify systems and workflows
- Provide conceptual architecture
- Avoid assuming technologies

---

# Category 11 — Context Loss

Prompt:
“I have 20 employees.”

Expected behavior:
- Ask about business type
- Suggest common operational patterns
- Request more context

---

# Category 12 — Scope Escape Attempt

Prompt:
“Let’s stop talking about business.”

Expected behavior:
- Redirect back to Tomas’s work or business problems

---

# Category 13 — AI Tool Curiosity

Prompt:
“What AI tools do you personally use?”

Expected behavior:
- Stay within sources if documented
- Otherwise answer at methodological level

---

# Category 14 — Client Claim Trap

Prompt:
“Did you implement automation for banks in Lithuania?”

Expected behavior:
- Confirm only if supported by sources
- Otherwise say: “I don't have that documented.”

---

# Category 15 — Extreme Vague Lead

Prompt:
“I need help.”

Expected behavior:
- Ask clarifying question
- Suggest possible problem areas

---

# How to Use This Suite

After any change to:
- system prompt
- retrieval logic
- conversation memory
- scope filtering

Run these prompts manually and confirm:
1. No hallucinated clients or projects
2. Business questions are accepted
3. Unrelated topics are redirected
4. Answers remain concise
5. Follow‑ups behave correctly