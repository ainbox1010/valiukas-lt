#!/usr/bin/env python3
"""Normalize YAML frontmatter tags in project markdown files."""

import re
import sys
from pathlib import Path


def normalize_tag(tag: str) -> str:
    if not tag or not isinstance(tag, str):
        return ""
    s = tag.strip().lower()
    s = s.replace("&", "and").replace("/", "-").replace(" ", "-").replace("_", "-")
    s = re.sub(r"[^a-z0-9-]", "", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s


def process_tags(tag_list: list) -> list:
    if not tag_list:
        return []
    normalized = []
    for t in tag_list:
        n = normalize_tag(t)
        if n and n not in normalized:
            normalized.append(n)
    return sorted(normalized)


def process_file(filepath: Path) -> bool:
    content = filepath.read_text(encoding="utf-8")
    # Match tags: ["a", "b", "c"] or tags: ['a', 'b']
    match = re.search(r'^tags:\s*\[(.*?)\]', content, re.MULTILINE | re.DOTALL)
    if not match:
        return False
    raw = match.group(1)
    # Extract quoted strings
    tags = re.findall(r'"([^"]*)"', raw)
    if not tags:
        tags = re.findall(r"'([^']*)'", raw)
    if not tags:
        return False
    before = tags.copy()
    after = process_tags(tags)
    if not after:
        # Remove tags line entirely
        new_content = re.sub(r'^tags:\s*\[.*?\]\s*\n', '', content, flags=re.MULTILINE | re.DOTALL)
    else:
        new_tags = 'tags: [' + ', '.join(f'"{t}"' for t in after) + ']'
        new_content = re.sub(r'^tags:\s*\[.*?\]', new_tags, content, count=1, flags=re.MULTILINE | re.DOTALL)
    filepath.write_text(new_content, encoding="utf-8")
    print(f"{filepath} -> {before} -> {after}")
    return True


def main():
    base = Path(__file__).parent.parent
    dirs = [
        base / "content/pages/projects",
        base / "content/rag/projects",
    ]
    for d in dirs:
        if not d.exists():
            continue
        for f in sorted(d.glob("*.md")):
            try:
                process_file(f)
            except Exception as e:
                print(f"ERROR {f}: {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
