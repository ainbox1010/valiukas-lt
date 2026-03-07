from pathlib import Path

from app.rag.retrieval import ContextChunk

_PROMPT_TEMPLATES_DIR = Path(__file__).resolve().parent / "prompt_templates"

ACTIVE_PROMPT = "iteration1"


def list_available_prompts() -> list[str]:
    """Return sorted list of available prompt names (iteration0, iteration1, ...)."""
    return sorted(p.stem for p in _PROMPT_TEMPLATES_DIR.glob("iteration*.md"))


def get_prompt_version() -> str:
    """Return the active prompt name. Useful for API responses and debugging."""
    return ACTIVE_PROMPT


def load_system_prompt(prompt_name: str) -> str:
    """Load system prompt from prompt_templates/{prompt_name}.md. Validates against available prompts."""
    available = list_available_prompts()
    if prompt_name not in available:
        raise ValueError(
            f"Unknown prompt template: {prompt_name!r}. Available: {available}"
        )
    path = _PROMPT_TEMPLATES_DIR / f"{prompt_name}.md"
    content = path.read_text(encoding="utf-8").strip()
    if not content:
        raise ValueError(f"Prompt template is empty: {path}")
    return content


def _format_chunk(chunk: ContextChunk) -> str:
    metadata = []
    if chunk.namespace:
        metadata.append(f"namespace: {chunk.namespace}")
    if chunk.slug:
        metadata.append(f"slug: {chunk.slug}")
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
        "Answer using the sources when possible. Keep your answer short (4–6 lines unless the user asked for detail). "
        "If the user asks for a factual claim not supported by sources, say: \"I don't have that documented.\" "
        "When listing projects, list each unique project once (by slug); do not list the same project twice. "
        "Do not include slugs or paths (e.g. projects/xxx) in your answer; use project titles only. "
        "Use bullets (-) for lists, or numbers 1., 2., 3. in sequence—never repeat '1.' for different items."
    )

    system_prompt = load_system_prompt(ACTIVE_PROMPT)
    return system_prompt, user_prompt
