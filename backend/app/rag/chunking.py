"""Heading-aware chunking for Markdown content."""

import re

# Defaults aligned with Task 2 spec
DEFAULT_CHUNK_SIZE = 1400
DEFAULT_OVERLAP = 200


def _split_by_headings(text: str) -> list[tuple[str, str]]:
    """
    Split text into (heading, content) segments.
    Content includes the heading line and everything until the next heading.
    """
    # Match ## Heading or # Heading
    heading_pattern = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)
    segments: list[tuple[str, str]] = []
    last_end = 0

    for m in heading_pattern.finditer(text):
        if m.start() > last_end:
            # Content before first heading
            pre = text[last_end : m.start()].strip()
            if pre:
                segments.append(("", pre))
        # Heading + content until next heading
        heading_line = m.group(0)
        segments.append((heading_line, heading_line))
        last_end = m.end()

    # Remainder after last heading
    if last_end < len(text):
        rest = text[last_end:].strip()
        if rest:
            segments.append(("", rest))

    # If no headings, treat whole text as one segment
    if not segments:
        if text.strip():
            segments.append(("", text.strip()))

    return segments


def _merge_small_segments(
    segments: list[tuple[str, str]], min_size: int = 200
) -> list[str]:
    """Merge very small segments to avoid tiny chunks."""
    merged: list[str] = []
    buffer = ""

    for _, content in segments:
        if len(buffer) + len(content) < min_size and buffer:
            buffer += "\n\n" + content
        else:
            if buffer:
                merged.append(buffer.strip())
            buffer = content

    if buffer:
        merged.append(buffer.strip())
    return merged


def chunk_text(
    text: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    overlap: int = DEFAULT_OVERLAP,
) -> list[str]:
    """
    Chunk text with heading awareness and overlap.

    - Splits by Markdown headings to keep sections together when possible
    - Target chunk size ~chunk_size chars, overlap ~overlap chars
    - Each chunk is standalone readable
    """
    if not text or not text.strip():
        return []

    text = text.strip()
    segments = _split_by_headings(text)
    merged = _merge_small_segments(segments, min_size=chunk_size // 3)

    chunks: list[str] = []
    for seg in merged:
        if len(seg) <= chunk_size:
            chunks.append(seg)
            continue

        # Split long segment by paragraphs with overlap
        parts = re.split(r"\n\n+", seg)
        current = ""
        for part in parts:
            candidate = current + ("\n\n" + part if current else part)
            if len(candidate) <= chunk_size:
                current = candidate
            else:
                if current:
                    chunks.append(current)
                # Start next chunk with overlap from end of current
                if overlap > 0 and len(current) >= overlap:
                    overlap_text = current[-overlap:]
                    space = overlap_text.find(" ")
                    if space != -1:
                        overlap_text = overlap_text[space + 1 :]
                    current = overlap_text + "\n\n" + part
                else:
                    current = part
        if current:
            chunks.append(current)

    return [c for c in chunks if c.strip()]
