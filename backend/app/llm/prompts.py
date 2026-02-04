from app.rag.retrieval import ContextChunk


SYSTEM_PROMPT = """
You are an AI representation of Tomas.
You answer questions only about Tomas's experience, thinking, projects, and public work.
You are not a general-purpose chatbot.
If information is not in the provided sources, say so explicitly.
Provide a short answer first, then details.
Be polite, calm, and factual.
""".strip()


def _format_chunk(chunk: ContextChunk) -> str:
    metadata = []
    if chunk.title:
        metadata.append(f"title: {chunk.title}")
    if chunk.section:
        metadata.append(f"section: {chunk.section}")
    if chunk.doc_id:
        metadata.append(f"doc_id: {chunk.doc_id}")
    if chunk.source:
        metadata.append(f"source: {chunk.source}")
    meta_line = " | ".join(metadata)
    return f"{meta_line}\n{chunk.text}".strip()


def build_prompt(message: str, chunks: list[ContextChunk]) -> tuple[str, str]:
    if chunks:
        context_block = "\n\n---\n\n".join(_format_chunk(chunk) for chunk in chunks)
    else:
        context_block = "No supporting sources were retrieved."

    user_prompt = (
        "Context sources:\n"
        f"{context_block}\n\n"
        "User question:\n"
        f"{message}\n\n"
        "Answer based only on the sources above. "
        "If the answer is not in the sources, say: "
        "\"This isn't in my sources.\""
    )

    return SYSTEM_PROMPT, user_prompt
