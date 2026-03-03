#!/usr/bin/env python3
"""
Task 1 — Content Contract (metadata schema) for Web Presence.

Enforces metadata contract for:
- content/pages/projects/*.md (PUBLIC)
- content/rag/projects/*.md (RAG)

Only edits YAML frontmatter. Does not change body content.
"""

import re
from pathlib import Path
from dataclasses import dataclass, field


@dataclass
class Report:
    slug_duplicates_fixed: list[str] = field(default_factory=list)
    rag_matched: list[tuple[str, str]] = field(default_factory=list)
    rag_marked_rag_only: list[str] = field(default_factory=list)
    missing_required: list[tuple[str, list[str]]] = field(default_factory=list)


def parse_frontmatter(content: str) -> tuple[dict, str]:
    """Parse frontmatter and body. Returns (dict of key->value, body)."""
    if not content.startswith("---"):
        return {}, content
    parts = content.split("---", 2)
    fm_str = parts[1]
    body = parts[2]
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


def write_frontmatter(data: dict, body: str, key_order: list[str] | None = None) -> str:
    """Build YAML frontmatter from dict, omitting empty values."""
    # Preferred order for readability
    order = key_order or [
        "title", "slug", "content_type", "ownership", "type", "summary", "industry",
        "visibility", "partner", "language", "doc_id", "tags",
    ]
    lines = []
    seen = set()
    for k in order:
        if k in data and k not in seen:
            v = data[k]
            if v is None or v == "" or v == []:
                continue
            seen.add(k)
            if isinstance(v, list):
                formatted = "[" + ", ".join(f'"{x}"' for x in v) + "]"
                lines.append(f"{k}: {formatted}")
            else:
                lines.append(f'{k}: "{v}"')
    for k, v in data.items():
        if k not in seen and v is not None and v != "" and v != []:
            if isinstance(v, list):
                formatted = "[" + ", ".join(f'"{x}"' for x in v) + "]"
                lines.append(f"{k}: {formatted}")
            else:
                lines.append(f'{k}: "{v}"')
    return "---\n" + "\n".join(lines) + "\n---" + body


def filename_to_slug(fname: str) -> str:
    """Convert filename stem to kebab-case slug with projects/ prefix."""
    stem = Path(fname).stem
    slug = re.sub(r"[_\s]+", "-", stem).lower()
    slug = re.sub(r"-+", "-", slug).strip("-")
    return f"projects/{slug}" if slug else "projects/unknown"


def normalize_title(t: str) -> str:
    """Normalize title for matching (case-insensitive, strip punctuation)."""
    t = t.lower()
    t = re.sub(r"\s*\(rag\)\s*", " ", t)
    t = re.sub(r"[^\w\s]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def main() -> None:
    base = Path(__file__).parent.parent
    public_dir = base / "content/pages/projects"
    rag_dir = base / "content/rag/projects"
    report = Report()

    if not public_dir.exists():
        print("Public projects dir not found")
        return

    # --- PUBLIC FILES ---
    public_files = list(public_dir.glob("*.md"))
    public_slugs: dict[str, str] = {}  # slug -> filename (for duplicate detection)
    public_by_slug: dict[str, dict] = {}
    public_by_title: dict[str, str] = {}
    public_by_filename_stem: dict[str, str] = {}

    for f in sorted(public_files):
        content = f.read_text(encoding="utf-8")
        data, body = parse_frontmatter(content)
        stem = f.stem
        filename_slug = f"projects/{stem}"

        # Slug
        slug = data.get("slug") or filename_slug
        if not slug.startswith("projects/"):
            slug = f"projects/{slug}"
        slug = slug.strip()

        # Duplicate slug?
        if slug in public_slugs and public_slugs[slug] != f.name:
            base_slug = slug
            suffix = 2
            while slug in public_slugs:
                slug = f"{base_slug}-{suffix}"
                suffix += 1
            report.slug_duplicates_fixed.append(f"{f.name} -> {slug}")
        public_slugs[slug] = f.name

        # Ownership + partner
        partner = data.get("partner")
        if partner:
            data["ownership"] = "partner"
        else:
            data["ownership"] = "self"
            data.pop("partner", None)

        # Required fields
        data["title"] = data.get("title") or ""
        data["summary"] = data.get("summary") or ""
        data["type"] = data.get("type") or ""
        data["industry"] = data.get("industry") or ""
        data["visibility"] = "public"

        if not data.get("slug"):
            data["slug"] = slug

        # Omit empty fields
        data = {k: v for k, v in data.items() if v != "" and v is not None}

        # Ensure required fields present
        missing = []
        if not data.get("title"):
            missing.append("title")
        if not data.get("summary"):
            missing.append("summary")
        if not data.get("slug"):
            missing.append("slug")
        if not data.get("ownership"):
            missing.append("ownership")
        if missing:
            report.missing_required.append((f.name, missing))

        # Write back
        new_content = write_frontmatter(data, body)
        f.write_text(new_content, encoding="utf-8")

        public_by_slug[slug] = data
        if data.get("title"):
            public_by_title[normalize_title(data["title"])] = slug
        public_by_filename_stem[stem] = slug

    # --- RAG FILES ---
    if not rag_dir.exists():
        _print_report(report)
        return

    for f in sorted(rag_dir.glob("*.md")):
        content = f.read_text(encoding="utf-8")
        data, body = parse_frontmatter(content)
        stem = f.stem
        filename_slug = f"projects/{re.sub(r'[_\s]+', '-', stem).lower()}"

        # Confident match?
        existing_slug = data.get("slug")
        existing_slug = (existing_slug or "").strip()
        if not existing_slug.startswith("projects/"):
            existing_slug = f"projects/{existing_slug}" if existing_slug else ""

        title = data.get("title") or ""
        matched_slug: str | None = None

        if existing_slug and existing_slug in public_by_slug:
            matched_slug = existing_slug
        elif title and normalize_title(title) in public_by_title:
            matched_slug = public_by_title[normalize_title(title)]
        elif stem in public_by_filename_stem:
            matched_slug = public_by_filename_stem[stem]
        else:
            # Filename normalized: project_telecom_equipment_automation_rag_v1 -> try telecom-equipment-automation
            if stem.startswith("project_") and "_rag_" in stem:
                inner = stem.replace("project_", "").split("_rag_")[0]
                slug_stem = inner.replace("_", "-")
                for ps, _ in public_by_slug.items():
                    if ps.replace("projects/", "") == slug_stem or ps.replace("projects/", "").startswith(slug_stem):
                        matched_slug = ps
                        break
                if not matched_slug:
                    for ps in public_by_slug:
                        if slug_stem in ps.replace("projects/", ""):
                            matched_slug = ps
                            break

        if matched_slug:
            data["slug"] = matched_slug
            data["visibility"] = "rag"
            report.rag_matched.append((f.name, matched_slug))
        else:
            data["slug"] = existing_slug or filename_slug
            data["visibility"] = "rag_only"
            report.rag_marked_rag_only.append(f.name)

        # Normalize internal_rag -> rag_only
        if data.get("visibility") == "internal_rag":
            data["visibility"] = "rag_only"

        # Omit empty optional fields
        required_rag = ["title", "slug", "visibility"]
        for k in list(data.keys()):
            if k not in required_rag and (data[k] == "" or data[k] is None):
                del data[k]

        missing = []
        if not data.get("title"):
            missing.append("title")
        if not data.get("slug"):
            missing.append("slug")
        if not data.get("visibility"):
            missing.append("visibility")
        if missing:
            report.missing_required.append((f.name, missing))

        new_content = write_frontmatter(data, body)
        f.write_text(new_content, encoding="utf-8")

    _print_report(report)


def _print_report(r: Report) -> None:
    print("\n=== Content Contract Report ===\n")
    print("A) Public: slug duplicates fixed")
    if r.slug_duplicates_fixed:
        for x in r.slug_duplicates_fixed:
            print(f"   - {x}")
    else:
        print("   (none)")

    print("\nB) RAG: files matched to public slugs")
    for fname, slug in r.rag_matched:
        print(f"   - {fname} -> {slug}")

    print("\nC) RAG: files marked rag_only (unmatched)")
    if r.rag_marked_rag_only:
        for x in r.rag_marked_rag_only:
            print(f"   - {x}")
    else:
        print("   (none)")

    print("\nD) Files missing required fields after pass")
    if r.missing_required:
        for fname, fields in r.missing_required:
            print(f"   - {fname}: {', '.join(fields)}")
    else:
        print("   (none)")

    print()


if __name__ == "__main__":
    main()
