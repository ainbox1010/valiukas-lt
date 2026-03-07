"""
Task 2 — Pinecone ingestion pipeline for projects.

Upserts:
- content/pages/projects/*.md → namespace projects_public
- content/pages/partners/*.md → namespace projects_public (source_type=partner)
- content/rag/projects/*.md → namespace projects_rag
- content/rag/general/*.md → namespace projects_rag (source_type=rag; empty for now)
- content/rag/tomas/*.md → namespace tomas (source_type=tomas, slug e.g. tomas/approach-methodology)

Future: content/internal/*.md will be added (not in current scope).

Vector ID: {namespace}:{slug_safe}:{source_type}:{chunk_index:04d}
Metadata: slug, title, source_type, visibility, doc_id, source_doc_id, ownership,
  partner, type, industry, tags, language, filepath, chunk_index,
  chunk_char_start, chunk_char_end

Delete before upsert by filter {slug, source_type} (Pinecone 3.2.2+).
Use --full-reindex to clear namespace before upsert (orphan cleanup).

Run: python -m app.rag.index_projects [--dry-run] [--slug SLUG] [--namespace public|rag|tomas|both|all]
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

# Add backend to path when run as script
if __name__ == "__main__":
    backend_root = Path(__file__).resolve().parent.parent.parent
    if str(backend_root) not in sys.path:
        sys.path.insert(0, str(backend_root))

from app.rag.chunking import chunk_text

NAMESPACE_PUBLIC = "projects_public"
NAMESPACE_RAG = "projects_rag"
NAMESPACE_TOMAS = "tomas"


def parse_frontmatter(content: str) -> tuple[dict, str]:
    """Parse YAML frontmatter and body. Returns (dict, body)."""
    if not content.startswith("---"):
        return {}, content
    parts = content.split("---", 2)
    fm_str = parts[1]
    body = parts[2].lstrip("\n")
    data: dict[str, str | list[str]] = {}
    for line in fm_str.split("\n"):
        m = re.match(r"^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$", line)
        if m:
            key = m.group(1)
            raw = m.group(2).strip()
            if raw.startswith("[") and raw.endswith("]"):
                data[key] = re.findall(r'["\']([^"\']+)["\']', raw)
            elif raw.startswith('"') and raw.endswith('"'):
                data[key] = raw[1:-1].replace('\\"', '"')
            elif raw.startswith("'") and raw.endswith("'"):
                data[key] = raw[1:-1].replace("\\'", "'")
            else:
                data[key] = raw
    return data, body


def slug_to_id_safe(slug: str) -> str:
    """Convert slug (e.g. projects/ai-me) to safe ID segment."""
    return slug.replace("/", "_").replace(" ", "-")


def load_public_projects(base: Path) -> dict[str, dict]:
    """Load public projects, return slug -> metadata."""
    public_dir = base / "content/pages/projects"
    if not public_dir.exists():
        return {}
    result: dict[str, dict] = {}
    for f in sorted(public_dir.glob("*.md")):
        content = f.read_text(encoding="utf-8")
        data, _ = parse_frontmatter(content)
        slug = (data.get("slug") or f"projects/{f.stem}").strip()
        if not slug.startswith("projects/"):
            slug = f"projects/{slug}"
        result[slug] = {
            "slug": slug,
            "title": data.get("title") or "",
            "summary": data.get("summary") or "",
            "type": data.get("type") or "",
            "industry": data.get("industry") or "",
            "ownership": data.get("ownership") or "self",
            "partner": data.get("partner") or "",
            "doc_id": data.get("doc_id") or "",
            "visibility": "public",
            "tags": data.get("tags") or [],
            "language": data.get("language") or "en",
        }
    return result


def load_rag_projects(base: Path, public_by_slug: dict[str, dict]) -> list[tuple[Path, dict, str]]:
    """Load RAG projects. Returns [(path, metadata, body), ...]. Metadata includes derived fields from public."""
    rag_dir = base / "content/rag/projects"
    if not rag_dir.exists():
        return []
    result: list[tuple[Path, dict, str]] = []
    for f in sorted(rag_dir.glob("*.md")):
        content = f.read_text(encoding="utf-8")
        data, body = parse_frontmatter(content)
        slug = (data.get("slug") or f"projects/{f.stem}").strip()
        if not slug.startswith("projects/"):
            slug = f"projects/{slug}"
        public = public_by_slug.get(slug, {})
        meta = {
            "slug": slug,
            "title": data.get("title") or "",
            "summary": data.get("summary") or "",
            "type": public.get("type") or "",
            "industry": public.get("industry") or "",
            "ownership": public.get("ownership") or "self",
            "partner": public.get("partner") or "",
            "doc_id": data.get("doc_id") or "",
            "visibility": data.get("visibility") or "rag",
            "tags": data.get("tags") or [],
            "language": data.get("language") or "en",
        }
        result.append((f, meta, body))
    return result


def load_rag_general(base: Path) -> list[tuple[Path, dict, str]]:
    """Load general RAG content. Returns [(path, metadata, body), ...].
    Slugs stay as-is (e.g. general/...). Empty for now."""
    general_dir = base / "content/rag/general"
    if not general_dir.exists():
        return []
    result: list[tuple[Path, dict, str]] = []
    for f in sorted(general_dir.glob("*.md")):
        content = f.read_text(encoding="utf-8")
        data, body = parse_frontmatter(content)
        slug = (data.get("slug") or f"general/{f.stem}").strip()
        meta = {
            "slug": slug,
            "title": data.get("title") or "",
            "summary": data.get("summary") or "",
            "type": data.get("type") or "",
            "industry": data.get("industry") or "",
            "ownership": data.get("ownership") or "self",
            "partner": data.get("partner") or "",
            "doc_id": data.get("doc_id") or "",
            "visibility": data.get("visibility") or "rag",
            "tags": data.get("tags") or [],
            "language": data.get("language") or "en",
        }
        result.append((f, meta, body))
    return result


def load_rag_tomas(base: Path) -> list[tuple[Path, dict, str]]:
    """Load Tomas content (approach, methodology, etc.). Returns [(path, metadata, body), ...].
    Upserts to namespace tomas. Slugs e.g. tomas/approach-methodology."""
    tomas_dir = base / "content/rag/tomas"
    if not tomas_dir.exists():
        return []
    result: list[tuple[Path, dict, str]] = []
    for f in sorted(tomas_dir.glob("*.md")):
        content = f.read_text(encoding="utf-8")
        data, body = parse_frontmatter(content)
        slug = (data.get("slug") or f"tomas/{f.stem}").strip()
        if not slug.startswith("tomas/"):
            slug = f"tomas/{slug}"
        meta = {
            "slug": slug,
            "title": data.get("title") or "",
            "summary": data.get("summary") or "",
            "type": data.get("type") or "methodology",
            "industry": data.get("industry") or "",
            "ownership": data.get("ownership") or "self",
            "partner": data.get("partner") or "",
            "doc_id": data.get("doc_id") or "",
            "visibility": data.get("visibility") or "rag",
            "tags": data.get("tags") or [],
            "language": data.get("language") or "en",
        }
        result.append((f, meta, body))
    return result


def load_partner_pages(base: Path) -> list[tuple[Path, dict, str]]:
    """Load partner pages. Returns [(path, metadata, body), ...]. Slug e.g. partners/erobot-ai."""
    partners_dir = base / "content/pages/partners"
    if not partners_dir.exists():
        return []
    result: list[tuple[Path, dict, str]] = []
    for f in sorted(partners_dir.glob("*.md")):
        content = f.read_text(encoding="utf-8")
        data, body = parse_frontmatter(content)
        slug = (data.get("slug") or f"partners/{f.stem}").strip()
        if not slug.startswith("partners/"):
            slug = f"partners/{slug}"
        meta = {
            "slug": slug,
            "title": data.get("title") or "",
            "summary": data.get("summary") or "",
            "type": data.get("content_type") or "partner",
            "industry": data.get("industry") or "",
            "ownership": "self",
            "partner": "",
            "doc_id": data.get("doc_id") or "",
            "visibility": data.get("visibility") or "public",
            "tags": data.get("tags") or [],
            "language": data.get("language") or "en",
        }
        result.append((f, meta, body))
    return result


def build_doc_text(title: str, summary: str, body: str) -> str:
    """Build full document text for chunking (no YAML)."""
    parts = []
    if title:
        parts.append(title)
    if summary:
        parts.append(summary)
    if body.strip():
        parts.append(body.strip())
    return "\n\n".join(parts)


def collect_vectors(
    base: Path,
    slug_filter: str | None,
    namespace_filter: str | None,
) -> tuple[list[dict], set[str], set[str]]:
    """
    Collect all vectors to upsert.
    Returns (vectors, public_slugs, rag_slugs).
    """
    public_by_slug = load_public_projects(base)
    public_files = list((base / "content/pages/projects").glob("*.md")) if (base / "content/pages/projects").exists() else []
    rag_items = load_rag_projects(base, public_by_slug) + load_rag_general(base)
    partner_items = load_partner_pages(base)
    tomas_items = load_rag_tomas(base)

    vectors: list[dict] = []
    public_slugs: set[str] = set()
    rag_slugs: set[str] = set()
    tomas_slugs: set[str] = set()

    def include_slug(slug: str, ns: str) -> bool:
        if slug_filter and slug != slug_filter and not slug.endswith("/" + slug_filter):
            return False
        if namespace_filter == "public" and ns != "public":
            return False
        if namespace_filter == "rag" and ns != "rag":
            return False
        if namespace_filter == "tomas" and ns != "tomas":
            return False
        if namespace_filter is None and ns == "tomas":
            return False  # "both" = public+rag only
        if namespace_filter == "all":
            return True
        return True

    # Public projects
    for f in public_files:
        content = f.read_text(encoding="utf-8")
        data, body = parse_frontmatter(content)
        slug = (data.get("slug") or f"projects/{f.stem}").strip()
        if not slug.startswith("projects/"):
            slug = f"projects/{slug}"
        if not include_slug(slug, "public"):
            continue
        public_slugs.add(slug)
        meta = public_by_slug.get(slug, {})
        doc_text = build_doc_text(
            meta.get("title") or data.get("title") or "",
            meta.get("summary") or data.get("summary") or "",
            body,
        )
        chunks = chunk_text(doc_text)
        slug_safe = slug_to_id_safe(slug)
        namespace = NAMESPACE_PUBLIC
        source_type = "public"
        doc_id = meta.get("doc_id") or data.get("doc_id") or f"project_{f.stem}_public"
        for i, chunk in enumerate(chunks):
            vid = f"{namespace}:{slug_safe}:{source_type}:{i:04d}"
            start = doc_text.find(chunk)
            end = start + len(chunk) if start >= 0 else 0
            vec = {
                "id": vid,
                "metadata": {
                    "slug": slug,
                    "title": meta.get("title") or "",
                    "source_type": source_type,
                    "visibility": "public",
                    "doc_id": doc_id,
                    "source_doc_id": doc_id,
                    "ownership": meta.get("ownership") or "self",
                    "partner": meta.get("partner") or "",
                    "type": meta.get("type") or "",
                    "industry": meta.get("industry") or "",
                    "tags": meta.get("tags") or [],
                    "language": meta.get("language") or "en",
                    "filepath": str(f.relative_to(base)),
                    "chunk_index": i,
                    "chunk_char_start": start,
                    "chunk_char_end": end,
                },
                "text": chunk,
            }
            vectors.append(vec)

    # Partner pages (same namespace as public so "who are my partners" retrieves them)
    for f, meta, body in partner_items:
        slug = meta["slug"]
        if not include_slug(slug, "public"):
            continue
        public_slugs.add(slug)
        doc_text = build_doc_text(meta["title"], meta["summary"], body)
        chunks = chunk_text(doc_text)
        slug_safe = slug_to_id_safe(slug)
        namespace = NAMESPACE_PUBLIC
        source_type = "partner"
        doc_id = meta.get("doc_id") or f"partner_{f.stem}"
        for i, chunk in enumerate(chunks):
            vid = f"{namespace}:{slug_safe}:{source_type}:{i:04d}"
            start = doc_text.find(chunk)
            end = start + len(chunk) if start >= 0 else 0
            vec = {
                "id": vid,
                "metadata": {
                    "slug": slug,
                    "title": meta.get("title") or "",
                    "source_type": source_type,
                    "visibility": "public",
                    "doc_id": doc_id,
                    "source_doc_id": doc_id,
                    "ownership": "self",
                    "partner": meta.get("partner") or "",
                    "type": meta.get("type") or "partner",
                    "industry": meta.get("industry") or "",
                    "tags": meta.get("tags") or [],
                    "language": meta.get("language") or "en",
                    "filepath": str(f.relative_to(base)),
                    "chunk_index": i,
                    "chunk_char_start": start,
                    "chunk_char_end": end,
                },
                "text": chunk,
            }
            vectors.append(vec)

    # RAG projects
    for f, meta, body in rag_items:
        slug = meta["slug"]
        if not include_slug(slug, "rag"):
            continue
        rag_slugs.add(slug)
        doc_text = build_doc_text(meta["title"], meta["summary"], body)
        chunks = chunk_text(doc_text)
        slug_safe = slug_to_id_safe(slug)
        namespace = NAMESPACE_RAG
        source_type = "rag"
        doc_id = meta.get("doc_id") or f"project_{f.stem}_rag"
        for i, chunk in enumerate(chunks):
            vid = f"{namespace}:{slug_safe}:{source_type}:{i:04d}"
            start = doc_text.find(chunk)
            end = start + len(chunk) if start >= 0 else 0
            vec = {
                "id": vid,
                "metadata": {
                    "slug": slug,
                    "title": meta.get("title") or "",
                    "source_type": source_type,
                    "visibility": meta.get("visibility") or "rag",
                    "doc_id": doc_id,
                    "source_doc_id": doc_id,
                    "ownership": meta.get("ownership") or "self",
                    "partner": meta.get("partner") or "",
                    "type": meta.get("type") or "",
                    "industry": meta.get("industry") or "",
                    "tags": meta.get("tags") or [],
                    "language": meta.get("language") or "en",
                    "filepath": str(f.relative_to(base)),
                    "chunk_index": i,
                    "chunk_char_start": start,
                    "chunk_char_end": end,
                },
                "text": chunk,
            }
            vectors.append(vec)

    # Tomas content (approach, methodology) → namespace tomas
    for f, meta, body in tomas_items:
        slug = meta["slug"]
        if not include_slug(slug, "tomas"):
            continue
        tomas_slugs.add(slug)
        doc_text = build_doc_text(meta["title"], meta["summary"], body)
        chunks = chunk_text(doc_text)
        slug_safe = slug_to_id_safe(slug)
        namespace = NAMESPACE_TOMAS
        source_type = "tomas"
        doc_id = meta.get("doc_id") or f"tomas_{f.stem}"
        for i, chunk in enumerate(chunks):
            vid = f"{namespace}:{slug_safe}:{source_type}:{i:04d}"
            start = doc_text.find(chunk)
            end = start + len(chunk) if start >= 0 else 0
            vec = {
                "id": vid,
                "metadata": {
                    "slug": slug,
                    "title": meta.get("title") or "",
                    "source_type": source_type,
                    "visibility": meta.get("visibility") or "rag",
                    "doc_id": doc_id,
                    "source_doc_id": doc_id,
                    "ownership": meta.get("ownership") or "self",
                    "partner": meta.get("partner") or "",
                    "type": meta.get("type") or "methodology",
                    "industry": meta.get("industry") or "",
                    "tags": meta.get("tags") or [],
                    "language": meta.get("language") or "en",
                    "filepath": str(f.relative_to(base)),
                    "chunk_index": i,
                    "chunk_char_start": start,
                    "chunk_char_end": end,
                },
                "text": chunk,
            }
            vectors.append(vec)

    return vectors, public_slugs, rag_slugs


def delete_by_slug_source(index, namespace: str, slug: str, source_type: str) -> None:
    """Delete vectors by metadata filter (Pinecone 3.2.2 supports filter)."""
    from pinecone.exceptions import NotFoundException

    try:
        index.delete(
            filter={
                "$and": [
                    {"slug": {"$eq": slug}},
                    {"source_type": {"$eq": source_type}},
                ]
            },
            namespace=namespace,
        )
    except NotFoundException:
        # First run: namespace doesn't exist yet; nothing to delete
        pass


def delete_orphans(
    index,
    namespace: str,
    current_slugs: set[str],
    source_type: str,
) -> None:
    """Delete vectors for slugs no longer in current set. Requires list+delete by slug."""
    # Pinecone doesn't support "delete where slug NOT IN set". We'd need to list all
    # vectors with a filter, get unique slugs, then delete those not in current_slugs.
    # list_index with filter is limited. Simpler: skip orphan cleanup for now, or
    # do a full namespace delete and re-upsert. For MVP we document that full
    # reindex clears orphans. Alternative: use describe_index_stats with filter to
    # get namespace stats - but that doesn't give per-slug. We'll implement a
    # simpler orphan cleanup: if --orphans, delete entire namespace and rely on
    # upsert. Or: query with a dummy vector and top_k=10000 to get all IDs, then
    # filter by slug - expensive. For now we skip automatic orphan cleanup and
    # add a --full-reindex flag that deletes all in namespace before upsert.
    pass


def run(
    base: Path,
    dry_run: bool = False,
    slug_filter: str | None = None,
    namespace_filter: str | None = None,
    full_reindex: bool = False,
) -> None:
    """Run ingestion pipeline."""
    vectors, public_slugs, rag_slugs = collect_vectors(base, slug_filter, namespace_filter)
    if not vectors:
        print("No vectors to upsert.")
        return

    if dry_run:
        print(f"[DRY RUN] Would upsert {len(vectors)} vectors")
        for v in vectors[:3]:
            print(f"  - {v['id']} ({len(v['text'])} chars)")
        if len(vectors) > 3:
            print(f"  ... and {len(vectors) - 3} more")
        return

    from app.llm.openai_client import get_embeddings_batch
    from app.rag.pinecone_store import get_pinecone_index

    texts = [v["text"] for v in vectors]
    print(f"Embedding {len(texts)} chunks...")
    embeddings = get_embeddings_batch(texts)

    for i, v in enumerate(vectors):
        v["values"] = embeddings[i] if i < len(embeddings) else []

    index = get_pinecone_index()

    # Group by namespace for delete + upsert
    by_ns: dict[str, list[dict]] = {}
    for v in vectors:
        st = v["metadata"]["source_type"]
        if st == "tomas":
            ns = NAMESPACE_TOMAS
        elif st in ("public", "partner"):
            ns = NAMESPACE_PUBLIC
        else:
            ns = NAMESPACE_RAG
        if ns not in by_ns:
            by_ns[ns] = []
        by_ns[ns].append(v)

    from pinecone.exceptions import NotFoundException

    for ns, vecs in by_ns.items():
        # Collect unique (slug, source_type) to delete
        to_delete: set[tuple[str, str]] = set()
        for v in vecs:
            to_delete.add((v["metadata"]["slug"], v["metadata"]["source_type"]))

        if full_reindex:
            try:
                index.delete(delete_all=True, namespace=ns)
                print(f"Deleted all vectors in namespace {ns}")
            except NotFoundException:
                pass  # Namespace doesn't exist yet
        else:
            for slug, st in to_delete:
                delete_by_slug_source(index, ns, slug, st)
                print(f"Deleted existing vectors: {ns} slug={slug} source_type={st}")

        # Upsert in batches of 100
        batch_size = 100
        for i in range(0, len(vecs), batch_size):
            batch = vecs[i : i + batch_size]
            upsert_batch = []
            for v in batch:
                meta = dict(v["metadata"])
                meta["text"] = v["text"]  # Required for retrieval to pass to LLM
                # Pinecone metadata: tags as comma-separated string (simpler for filtering)
                if isinstance(meta.get("tags"), list):
                    meta["tags"] = ",".join(meta["tags"])
                upsert_batch.append({
                    "id": v["id"],
                    "values": v["values"],
                    "metadata": meta,
                })
            index.upsert(vectors=upsert_batch, namespace=ns)
            print(f"Upserted {len(batch)} vectors to {ns}")

    print(f"Done. {len(vectors)} vectors indexed.")


def _find_repo_base() -> Path:
    """Find repo root (directory containing content/pages/projects)."""
    p = Path(__file__).resolve()
    for _ in range(6):
        if (p / "content/pages/projects").exists():
            return p
        p = p.parent
    return Path.cwd()


def main() -> None:
    parser = argparse.ArgumentParser(description="Index projects to Pinecone")
    parser.add_argument("--dry-run", action="store_true", help="Do not upsert")
    parser.add_argument("--slug", type=str, help="Only process this slug (e.g. projects/ai-me)")
    parser.add_argument(
        "--namespace",
        choices=["public", "rag", "tomas", "both", "all"],
        default="both",
        help="Which namespace(s) to process",
    )
    parser.add_argument("--full-reindex", action="store_true", help="Delete all in namespace before upsert (orphan cleanup)")
    parser.add_argument("--base", type=Path, default=None, help="Repo base (parent of content/)")
    args = parser.parse_args()

    base = args.base or _find_repo_base()
    ns_filter = None
    if args.namespace == "both":
        ns_filter = None  # public + rag
    elif args.namespace == "all":
        ns_filter = "all"
    else:
        ns_filter = args.namespace
    run(
        base=base,
        dry_run=args.dry_run,
        slug_filter=args.slug,
        namespace_filter=ns_filter,
        full_reindex=args.full_reindex,
    )


if __name__ == "__main__":
    main()
