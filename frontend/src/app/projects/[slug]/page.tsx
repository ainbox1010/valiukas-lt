import { notFound } from "next/navigation";

import { loadMarkdown, loadMarkdownCollection } from "@/lib/content/loadMarkdown";

type ProjectPageProps = {
  params: { slug: string };
};

export async function generateStaticParams() {
  const files = await loadMarkdownCollection("pages/projects");
  return files
    .map((file) => file.frontmatter)
    .filter(
      (frontmatter) =>
        frontmatter.content_type === "project" &&
        frontmatter.visibility === "public" &&
        frontmatter.case_visibility === "public_detail" &&
        typeof frontmatter.slug === "string" &&
        String(frontmatter.slug).startsWith("projects/")
    )
    .map((frontmatter) => ({
      slug: String(frontmatter.slug).replace(/^projects\//, ""),
    }));
}

export const dynamicParams = false;

export default async function ProjectPage({ params }: ProjectPageProps) {
  const filePath = `pages/projects/${params.slug}.md`;
  let content;
  try {
    content = await loadMarkdown(filePath);
  } catch {
    notFound();
  }

  const title =
    typeof content.frontmatter.title === "string"
      ? content.frontmatter.title
      : params.slug;
  const summary =
    typeof content.frontmatter.summary === "string"
      ? content.frontmatter.summary
      : "";
  const normalizedHtml = content.html.replace(/^<h1[^>]*>.*?<\/h1>\n?/i, "");

  return (
    <div className="section">
      <section className="hero">
        <h1>{title}</h1>
        {summary ? <p>{summary}</p> : null}
      </section>
      <section className="section">
        <div className="card">
          <div
            className="markdown"
            dangerouslySetInnerHTML={{ __html: normalizedHtml }}
          />
        </div>
      </section>
    </div>
  );
}
