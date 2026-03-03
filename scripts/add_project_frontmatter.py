#!/usr/bin/env python3
"""Add ownership and type to project frontmatter based on rules."""

import re
from pathlib import Path

AI_TAGS = {"ai", "rag", "llm", "agentic-systems", "anomaly-detection", "retrieval-first", "citation-enforcement"}
AUTOMATION_TAGS = {"rpa", "automation", "workflow", "ocr", "document-processing", "data-extraction", "integrations"}


def infer_type(tags: list[str]) -> str | None:
    tags_lower = {t.lower() for t in tags}
    if tags_lower & AI_TAGS:
        return "ai"
    if tags_lower & AUTOMATION_TAGS:
        return "automation"
    return "systems"


def infer_ownership(partner: str | None, doc_id: str) -> str:
    if partner:
        return "partner"
    if "beelogic" in (doc_id or "").lower():
        return "partner"
    return "self"


def process_file(path: Path) -> tuple[str, str, str] | None:
    content = path.read_text(encoding="utf-8")
    if not content.startswith("---"):
        return None
    parts = content.split("---", 2)
    fm_str = parts[1]
    body = parts[2]

    # Parse
    partner = None
    doc_id = None
    tags = []
    industry = None
    for line in fm_str.split("\n"):
        m = re.match(r'^partner:\s*["\']?([^"\'\n]+)', line)
        if m:
            partner = m.group(1).strip('"\'')
        m = re.match(r'^doc_id:\s*["\']?([^"\'\n]+)', line)
        if m:
            doc_id = m.group(1).strip('"\'')
        m = re.match(r'^tags:\s*\[(.*)\]', line)
        if m:
            tags = re.findall(r'["\']([^"\']+)["\']', m.group(1))
        m = re.match(r'^industry:\s*["\']([^"\']+)["\']', line)
        if m:
            industry = m.group(1)

    ownership = infer_ownership(partner, doc_id)
    type_val = infer_type(tags)

    # Update frontmatter: add/update ownership and type
    has_ownership = re.search(r'^ownership:\s*', fm_str, re.MULTILINE)
    has_type = re.search(r'^type:\s*', fm_str, re.MULTILINE)

    if has_ownership:
        fm_str = re.sub(r'^ownership:\s*[^\n]+', f'ownership: "{ownership}"', fm_str, count=1, flags=re.MULTILINE)
    else:
        fm_str = re.sub(r'^(content_type:\s*[^\n]+)', rf'\1\nownership: "{ownership}"', fm_str, count=1, flags=re.MULTILINE)

    if type_val:
        if has_type:
            fm_str = re.sub(r'^type:\s*[^\n]+', f'type: "{type_val}"', fm_str, count=1, flags=re.MULTILINE)
        else:
            fm_str = re.sub(r'^(ownership:\s*[^\n]+)', rf'\1\ntype: "{type_val}"', fm_str, count=1, flags=re.MULTILINE)

    new_content = "---" + fm_str + "---" + body
    path.write_text(new_content, encoding="utf-8")
    return (ownership, type_val or "-", industry or "-")


def main():
    base = Path(__file__).parent.parent
    projects_dir = base / "content/pages/projects"
    for f in sorted(projects_dir.glob("*.md")):
        result = process_file(f)
        if result:
            own, typ, ind = result
            print(f"{f.name} -> ownership: {own} -> type: {typ} -> industry: {ind}")


if __name__ == "__main__":
    main()
