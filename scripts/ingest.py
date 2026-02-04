from __future__ import annotations

import argparse
import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import tiktoken
from openai import OpenAI
from pinecone import Pinecone
from pypdf import PdfReader


@dataclass
class Chunk:
    text: str
    section: str
    chunk_id: str


SECTION_PATTERNS = {
    "profile": re.compile(r"^(profile|summary|about)\b", re.IGNORECASE),
    "experience": re.compile(
        r"^(experience|work experience|employment)\b", re.IGNORECASE
    ),
    "education": re.compile(r"^(education|studies)\b", re.IGNORECASE),
    "skills": re.compile(r"^(skills|technologies|stack)\b", re.IGNORECASE),
    "projects": re.compile(r"^(projects|selected projects)\b", re.IGNORECASE),
    "facts": re.compile(r"^(facts|highlights|achievements|notable facts)\b", re.IGNORECASE),
    "languages": re.compile(r"^(languages)\b", re.IGNORECASE),
    "tools": re.compile(r"^(tools)\b", re.IGNORECASE),
}

HEADING_PATTERN = re.compile(
    r"\b("
    r"profile|summary|about|experience|work experience|employment|education|studies|"
    r"skills|technologies|stack|projects|selected projects|facts|highlights|"
    r"achievements|notable facts|languages|tools"
    r")\b",
    re.IGNORECASE,
)


def extract_pdf_text(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    parts: list[str] = []
    for page in reader.pages:
        text = page.extract_text() or ""
        parts.append(text.strip())
    return "\n".join(part for part in parts if part)


def normalize_lines(text: str) -> list[str]:
    lines = []
    for line in text.splitlines():
        cleaned = " ".join(line.split())
        if cleaned:
            lines.append(cleaned)
    return lines


def _normalize_section(heading: str) -> str:
    lowered = heading.lower()
    if lowered in {"summary", "about"}:
        return "profile"
    if lowered in {"work experience", "employment"}:
        return "experience"
    if lowered in {"technologies", "stack"}:
        return "skills"
    if lowered in {"selected projects"}:
        return "projects"
    if lowered in {"highlights", "achievements", "notable facts"}:
        return "facts"
    return lowered.replace(" ", "_")


def detect_section(line: str) -> str | None:
    for section, pattern in SECTION_PATTERNS.items():
        if pattern.search(line):
            return section
    if line.isupper() and 3 <= len(line) <= 60:
        return line.lower().replace(" ", "_")
    return None


def split_line_by_headings(line: str) -> list[tuple[str | None, str]]:
    matches = list(HEADING_PATTERN.finditer(line))
    if not matches:
        return [(None, line)]

    segments: list[tuple[str | None, str]] = []
    for index, match in enumerate(matches):
        start = match.start()
        end = match.end()
        next_start = matches[index + 1].start() if index + 1 < len(matches) else len(line)

        if index == 0 and start > 0:
            prefix = line[:start].strip()
            if prefix:
                segments.append((None, prefix))

        heading = match.group(0)
        remainder = line[end:next_start].strip()
        segments.append((_normalize_section(heading), remainder))

    return segments


def split_into_sections(lines: list[str]) -> dict[str, list[str]]:
    current_section = "profile"
    sections: dict[str, list[str]] = {current_section: []}

    for line in lines:
        segments = split_line_by_headings(line)
        for section, remainder in segments:
            if section:
                current_section = section
                sections.setdefault(current_section, [])
                if remainder:
                    sections[current_section].append(remainder)
                continue

            matched = detect_section(remainder)
            if matched:
                current_section = matched
                sections.setdefault(current_section, [])
                continue

            if remainder:
                sections[current_section].append(remainder)

    return sections


def chunk_section(
    section: str,
    lines: list[str],
    tokenizer: tiktoken.Encoding,
    max_tokens: int,
    doc_id: str,
    lang: str,
) -> list[Chunk]:
    chunks: list[Chunk] = []
    buffer: list[str] = []
    token_count = 0
    index = 1

    for line in lines:
        line_tokens = len(tokenizer.encode(line))
        if token_count + line_tokens > max_tokens and buffer:
            text = " ".join(buffer).strip()
            chunk_id = f"{doc_id}_{lang}_{section}_{index:02d}"
            chunks.append(Chunk(text=text, section=section, chunk_id=chunk_id))
            buffer = []
            token_count = 0
            index += 1
        buffer.append(line)
        token_count += line_tokens

    if buffer:
        text = " ".join(buffer).strip()
        chunk_id = f"{doc_id}_{lang}_{section}_{index:02d}"
        chunks.append(Chunk(text=text, section=section, chunk_id=chunk_id))

    return chunks


def chunk_text(
    text: str,
    doc_id: str,
    lang: str,
    max_tokens: int,
    tokenizer: tiktoken.Encoding,
) -> list[Chunk]:
    lines = normalize_lines(text)
    sections = split_into_sections(lines)
    chunks: list[Chunk] = []
    for section, section_lines in sections.items():
        if not section_lines:
            continue
        chunks.extend(
            chunk_section(section, section_lines, tokenizer, max_tokens, doc_id, lang)
        )
    return chunks


def write_jsonl(path: Path, records: Iterable[dict]) -> None:
    with path.open("w", encoding="utf-8") as file:
        for record in records:
            file.write(json.dumps(record, ensure_ascii=False) + "\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest CV PDF into Pinecone.")
    parser.add_argument("--pdf", required=True, help="Path to CV PDF.")
    parser.add_argument("--lang", default="en", help="Language code (e.g., en).")
    parser.add_argument("--doc-id", default="cv_tomas_valiukas_2025")
    parser.add_argument("--doc-type", default="cv")
    parser.add_argument("--title", default="CV — Tomas Valiukas")
    parser.add_argument("--source", default="cv_pdf_en")
    parser.add_argument("--max-tokens", type=int, default=700)
    parser.add_argument(
        "--replace-doc",
        action="store_true",
        help="Delete existing vectors for this doc_id before upserting.",
    )
    parser.add_argument("--namespace", default=os.environ.get("PINECONE_NAMESPACE"))
    parser.add_argument("--index", default=os.environ.get("PINECONE_INDEX"))
    args = parser.parse_args()

    pdf_path = Path(args.pdf).expanduser().resolve()
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    if not args.namespace or not args.index:
        raise RuntimeError("PINECONE_NAMESPACE and PINECONE_INDEX must be set.")

    openai_key = os.environ.get("OPENAI_API_KEY")
    pinecone_key = os.environ.get("PINECONE_API_KEY")
    embed_model = os.environ.get("OPENAI_EMBED_MODEL", "text-embedding-3-small")
    if not openai_key or not pinecone_key:
        raise RuntimeError("OPENAI_API_KEY and PINECONE_API_KEY must be set.")

    project_root = Path(__file__).resolve().parents[1]
    output_dir = project_root / "OutputData"
    output_dir.mkdir(parents=True, exist_ok=True)

    extracted_text = extract_pdf_text(pdf_path)
    extracted_path = output_dir / "cv_en_extracted.txt"
    extracted_path.write_text(extracted_text, encoding="utf-8")

    tokenizer = tiktoken.get_encoding("cl100k_base")
    chunks = chunk_text(
        extracted_text, args.doc_id, args.lang, args.max_tokens, tokenizer
    )

    jsonl_path = output_dir / "cv_en_chunks.jsonl"
    chunk_records: list[dict] = []
    for chunk in chunks:
        chunk_records.append(
            {
                "doc_id": args.doc_id,
                "doc_type": args.doc_type,
                "title": args.title,
                "section": chunk.section,
                "source": args.source,
                "chunk_id": chunk.chunk_id,
                "lang": args.lang,
                "text": chunk.text,
            }
        )
    write_jsonl(jsonl_path, chunk_records)

    openai_client = OpenAI(api_key=openai_key)
    pinecone_client = Pinecone(api_key=pinecone_key)
    index = pinecone_client.Index(args.index)

    if args.replace_doc:
        index.delete(filter={"doc_id": args.doc_id}, namespace=args.namespace)

    vectors = []
    for record in chunk_records:
        embedding = openai_client.embeddings.create(
            model=embed_model, input=record["text"]
        ).data[0].embedding
        vectors.append(
            {
                "id": record["chunk_id"],
                "values": embedding,
                "metadata": record,
            }
        )

    batch_size = 50
    upserted = 0
    for start in range(0, len(vectors), batch_size):
        batch = vectors[start : start + batch_size]
        response = index.upsert(vectors=batch, namespace=args.namespace)
        upserted += response.get("upserted_count", len(batch))

    report_path = output_dir / "cv_en_upsert_report.json"
    report_path.write_text(
        json.dumps(
            {
                "pdf": str(pdf_path),
                "chunks": len(chunk_records),
                "upserted": upserted,
                "namespace": args.namespace,
                "index": args.index,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    print(f"Extracted text: {extracted_path}")
    print(f"Chunk file: {jsonl_path}")
    print(f"Upsert report: {report_path}")


if __name__ == "__main__":
    main()
