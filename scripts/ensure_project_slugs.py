#!/usr/bin/env python3
"""Ensure every project has a stable slug shared between public and RAG."""

import re
from pathlib import Path


def normalize_title_for_match(t: str) -> str:
    """Normalize title for fuzzy matching."""
    t = t.lower()
    t = re.sub(r"\s*\(rag\)\s*", " ", t)
    t = re.sub(r"[^\w\s]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def match_rag_to_public(
    rag_file: Path, by_file: dict, by_slug_stem: dict, by_title: dict
) -> str | None:
    """Return public slug for this RAG file, or None if uncertain."""
    stem = rag_file.stem
    content = rag_file.read_text(encoding="utf-8")
    title_match = re.search(r'^title:\s*["\']([^"\']+)["\']', content, re.MULTILINE)
    title = title_match.group(1) if title_match else ""

    # Same filename as public?
    if stem in by_file:
        return by_file[stem]

    # project_*_rag_v1 pattern -> extract keywords
    if stem.startswith("project_") and "_rag_" in stem:
        # e.g. project_telecom_equipment_automation_rag_v1 -> telecom-equipment-automation
        inner = stem.replace("project_", "").split("_rag_")[0]
        slug_stem = inner.replace("_", "-")
        if slug_stem in by_slug_stem:
            return by_slug_stem[slug_stem]
        if slug_stem in by_file:
            return by_file[slug_stem]
        # Prefix match: saas-monthly-report -> saas-monthly-report-automation (only if unique)
        prefix_matches = [s for ss, s in by_slug_stem.items() if ss.startswith(slug_stem)]
        if len(prefix_matches) == 1:
            return prefix_matches[0]
        # Try matching by title
        norm = normalize_title_for_match(title)
        if norm in by_title:
            return by_title[norm]
        # Fuzzy: find public slug with most keyword overlap
        norm_words = set(norm.split())
        best = None
        best_score = 0
        for nt, slug in by_title.items():
            nt_words = set(nt.split())
            overlap = len(norm_words & nt_words)
            if overlap > best_score:
                best_score = overlap
                best = slug
        if best_score >= 3:
            return best
    return None


def ensure_slug_in_file(filepath: Path, slug: str) -> bool:
    """Add or update slug in frontmatter. Returns True if changed."""
    content = filepath.read_text(encoding="utf-8")
    if not content.startswith("---"):
        return False
    parts = content.split("---", 2)
    fm_str = parts[1]
    body = parts[2]
    # Check if slug exists
    slug_match = re.search(r'^slug:\s*["\']?([^"\'\s\n]*)', fm_str, re.MULTILINE)
    if slug_match:
        current = slug_match.group(1).strip('"\'')
        if current == slug:
            return False
        # Replace
        new_fm = re.sub(r'^slug:\s*[^\n]+', f'slug: "{slug}"', fm_str, count=1, flags=re.MULTILINE)
    else:
        # Add after first key (usually title)
        new_fm = re.sub(r'^(title:\s*[^\n]+)', r'\1\nslug: "' + slug + '"', fm_str, count=1, flags=re.MULTILINE)
    new_content = "---" + new_fm + "---" + body
    filepath.write_text(new_content, encoding="utf-8")
    return True


def ensure_public_slugs(base: Path) -> dict:
    """Ensure each public project has slug. Returns by_file map."""
    public_dir = base / "content/pages/projects"
    if not public_dir.exists():
        return {}
    by_file = {}
    for f in public_dir.glob("*.md"):
        stem = f.stem
        content = f.read_text(encoding="utf-8")
        match = re.search(r'^slug:\s*["\']?([^"\'\s]+)', content, re.MULTILINE)
        if match:
            slug = match.group(1)
            if not slug.startswith("projects/"):
                slug = f"projects/{slug}"
        else:
            slug = f"projects/{stem}"
            changed = ensure_slug_in_file(f, slug)
            if changed:
                print(f"Public: added slug to {f.name} -> {slug}")
        by_file[stem] = slug
    return by_file


def main():
    base = Path(__file__).parent.parent
    # Ensure public files have slugs first
    by_file = ensure_public_slugs(base)
    by_slug_stem = {s.replace("projects/", "", 1): s for s in by_file.values()}
    by_title = {}
    for f in (base / "content/pages/projects").glob("*.md"):
        content = f.read_text(encoding="utf-8")
        m = re.search(r'^title:\s*["\']([^"\']+)["\']', content, re.MULTILINE)
        if m and f.stem in by_file:
            by_title[normalize_title_for_match(m.group(1))] = by_file[f.stem]

    rag_dir = base / "content/rag/projects"
    if not rag_dir.exists():
        return
    needs_review = []
    for f in sorted(rag_dir.glob("*.md")):
        slug = match_rag_to_public(f, by_file, by_slug_stem, by_title)
        if slug:
            changed = ensure_slug_in_file(f, slug)
            if changed:
                print(f"RAG: Updated {f.name} -> slug: {slug}")
        else:
            needs_review.append(f.name)
    if needs_review:
        print("\nNEEDS REVIEW (no slug added):")
        for n in needs_review:
            print(f"  - {n}")


if __name__ == "__main__":
    main()
