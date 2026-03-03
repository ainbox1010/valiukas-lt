#!/usr/bin/env python3
"""Add partner frontmatter when body mentions beelogic."""

import re
from pathlib import Path


def process_file(path: Path) -> str:
    content = path.read_text(encoding="utf-8")
    if not content.startswith("---"):
        return "unchanged (no frontmatter)"
    parts = content.split("---", 2)
    fm_str = parts[1]
    body = parts[2]

    # Rule 1: Already has partner -> keep as-is
    if re.search(r"^partner:\s*", fm_str, re.MULTILINE):
        return "unchanged (has partner)"

    # Rule 2: Body contains beelogic.io or "Delivered by beelogic" (case-insensitive)
    body_lower = body.lower()
    if "beelogic.io" in body_lower or "delivered by beelogic" in body_lower:
        # Add partner after last frontmatter key (before ---)
        # Insert before the closing ---, after the last line of frontmatter
        fm_lines = fm_str.rstrip().split("\n")
        # Add partner as new line before end
        fm_lines.append('partner: "beelogic.io"')
        new_fm = "\n".join(fm_lines) + "\n"
        new_content = "---" + new_fm + "---" + body
        path.write_text(new_content, encoding="utf-8")
        return 'added partner: "beelogic.io"'
    return "unchanged (no beelogic in body)"


def main():
    base = Path(__file__).parent.parent
    projects_dir = base / "content/pages/projects"
    for f in sorted(projects_dir.glob("*.md")):
        result = process_file(f)
        print(f"{f.name} -> {result}")


if __name__ == "__main__":
    main()
