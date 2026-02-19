# Content Frontmatter Schema

Use this YAML frontmatter for all Markdown content files. Slugs must NOT include a
leading slash.

```yaml
---
title: "About"
slug: "about"
content_type: "page"
section: "about"
summary: "Short positioning and background."
language: "en"
visibility: "public"
tags: ["bio", "positioning"]
updated_at: "2026-02-06"
doc_id: "about_v1"
---
```

## Field Notes
- `slug`: no leading `/` (route becomes `/<slug>`).
- `content_type`: preferred over `type`.
- `visibility`: use `public` for ingest; `private` to skip.
- `doc_id`: stable id for citations and re-ingest.
