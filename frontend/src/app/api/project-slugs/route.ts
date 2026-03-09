import { NextResponse } from "next/server";

import { loadMarkdownCollection } from "@/lib/content/loadMarkdown";

export const revalidate = 3600; // Cache for 1 hour

/**
 * Returns valid project slugs for link validation.
 * Uses same filtering as projects list: visibility public, case_visibility not rag_only.
 * Treats missing case_visibility as public_detail (allowed).
 */
export async function GET() {
  try {
    const files = await loadMarkdownCollection("pages/projects");
    const slugs = files
      .map((file) => file.frontmatter)
      .filter(
        (frontmatter) =>
          frontmatter.content_type === "project" &&
          String(frontmatter.visibility ?? "public") === "public" &&
          String(frontmatter.case_visibility ?? "public_detail") !== "rag_only" &&
          typeof frontmatter.slug === "string" &&
          String(frontmatter.slug).startsWith("projects/")
      )
      .map((frontmatter) => String(frontmatter.slug));

    return NextResponse.json({ slugs });
  } catch (error) {
    console.error("project-slugs error:", error);
    return NextResponse.json(
      { error: "Failed to load project slugs." },
      { status: 500 }
    );
  }
}
