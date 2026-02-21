---
title: "InBlock AI — Agentic Crypto Risk Evaluation MVP"
slug: "projects/inblock-ai"
content_type: "project"
summary: "Deterministic, explainable crypto token risk evaluation system built using multi-agent LLM orchestration."
industry: "FinTech / AI / Crypto Infrastructure"
tags: ["agentic systems", "llm orchestration", "risk scoring", "crypto analysis", "rag"]
visibility: "public"
language: "en"
doc_id: "project_inblock_ai_public"
---

## InBlock AI

InBlock AI was a multi-agent, tool-using LLM system designed to evaluate the credibility and risk profile of crypto tokens using structured, deterministic heuristics.

The first iteration focused on preventing users from entering high-risk or low-credibility tokens by combining automated data retrieval with rule-based scoring and transparent reasoning.

### What I Built

- Multi-agent orchestration layer (LangChain-based)
- Tool-using LLM architecture with conditional routing
- Retrieval-Augmented Generation (RAG) knowledge base
- API integrations with crypto market data providers
- Exchange-tier verification logic
- Ownership distribution checks
- Liquidity-based risk indicators
- Deterministic red/green flag system
- Composite risk scoring with structured reasoning output

The orchestrator dynamically selected tools:

- If token not found on major exchanges → query secondary exchanges  
- If structured data incomplete → trigger web search fallback  
- Consolidate findings into structured evaluation  

### Core Logic

The risk score was generated through deterministic checks including:

- Exchange listing presence (tier-based credibility proxy)
- Liquidity signals
- Ownership concentration patterns
- Additional predefined industry heuristics

The system produced:

- A clear risk rating
- Explicit red and green flags
- Structured explanation of conclusions

Users could review the reasoning and form their own judgment.

### Outcome

The MVP demonstrated:

- Reliable multi-source token evaluation workflows
- Transparent and explainable scoring logic
- Feasibility of scalable agentic crypto analysis systems

The project was discontinued after the founding team did not secure seed funding.  
The technical MVP and architecture were fully implemented.

*This project was developed and delivered by me.*
