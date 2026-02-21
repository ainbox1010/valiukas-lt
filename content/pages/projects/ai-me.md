---
title: "AI Me — AI Designed for Real-World Deployment"
slug: "projects/ai-me"
content_type: "project"
summary: "A structured, citation-grounded AI website assistant built for controlled deployment under real-world constraints."
status: "live"
year: 2026
industry: "Professional services"
tags: ["rag", "ai-architecture", "website-assistant", "pinecone", "fastapi", "nextjs", "openai"]
visibility: "public"
language: "en"
doc_id: "project_ai_me_public_v5"
---

## Overview

AI Me is a live AI assistant integrated into my website.  
It answers questions using curated sources and operates under explicit architectural constraints designed for reliable production use.

This is not a generic chatbot implementation.  
It is a controlled deployment of AI inside a real operational environment.

## What it demonstrates

- Retrieval-first architecture (no answer without retrieved sources)
- Explicit citation rendering in every response
- Clear refusal when information is outside available sources
- One LLM call per user message (cost discipline)
- Scope gating and usage limits
- Separation of public and RAG-only content
- Structured Markdown -> embedding -> vector pipeline

## Design principles

This system prioritizes:

- Predictable behavior over impressive output
- Structural discipline over experimentation
- Deployment realism over feature stacking
- Modular evolution without architectural drift

## Architecture (high level)

- Frontend: Next.js
- Backend: FastAPI
- Vector database: Pinecone
- LLM & embeddings: OpenAI
- Ingestion pipeline for Markdown and PDF content
- Metadata-based citation rendering

## Why this project matters

AI Me demonstrates how large language models can be integrated into production systems with defined boundaries, traceability, and controlled behavior.

The architecture is modular and designed to evolve without compromising stability.

*This project was developed and delivered by me.*
