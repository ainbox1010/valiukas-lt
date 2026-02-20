import { loadMarkdown, loadMarkdownCollection } from "@/lib/content/loadMarkdown";

type ProjectIndexItem = {
  title: string;
  slug: string;
  summary: string;
  html: string;
  case_visibility: "public_detail" | "link_only" | "rag_only";
  links: { label?: string; url?: string }[];
  visibility: string;
};

function normalizeProject(
  frontmatter: Record<string, unknown>,
  html: string
): ProjectIndexItem | null {
  if (frontmatter.content_type !== "project") return null;
  const visibility = String(frontmatter.visibility ?? "public");
  const caseVisibility = String(frontmatter.case_visibility ?? "public_detail") as
    | "public_detail"
    | "link_only"
    | "rag_only";
  if (visibility !== "public" || caseVisibility === "rag_only") return null;
  const title = String(frontmatter.title ?? "");
  const slug = String(frontmatter.slug ?? "");
  if (!title || !slug.startsWith("projects/")) return null;
  const summary = String(frontmatter.summary ?? "");
  const links = Array.isArray(frontmatter.links)
    ? (frontmatter.links as { label?: string; url?: string }[])
    : [];
  return {
    title,
    slug,
    summary,
    html,
    case_visibility: caseVisibility,
    links,
    visibility,
  };
}

export default async function ProjectsPage() {
  const { frontmatter } = await loadMarkdown("pages/projects.md");
  const title =
    typeof frontmatter.title === "string" ? frontmatter.title : "Projects";
  const summary =
    typeof frontmatter.summary === "string" ? frontmatter.summary : "";

  const files = await loadMarkdownCollection("pages/projects");
  const projects = files
    .map((file) => normalizeProject(file.frontmatter, file.html))
    .filter((item): item is ProjectIndexItem => Boolean(item))
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="section">
      <section className="hero">
        <h1>{title}</h1>
        {summary ? <p>{summary}</p> : null}
      </section>

      <section className="section">
        <div className="projects-list">
          {projects.map((project) => {
            if (project.case_visibility === "link_only") {
              const firstLink = project.links.find((link) => link.url);
              return (
                <a
                  key={project.slug}
                  className="card card-link"
                  href={firstLink?.url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                >
                  <strong>{project.title}</strong>
                  <div className="list">
                    <div>{project.summary}</div>
                    <div>{firstLink?.label ?? "View on partner site"}</div>
                  </div>
                </a>
              );
            }
            return (
              <details key={project.slug} className="projects-details card">
                <summary className="projects-summary">
                  <strong>{project.title}</strong>
                  <div className="list">
                    <div>{project.summary}</div>
                    <div>Click to expand project details.</div>
                  </div>
                </summary>
                <div className="projects-details-content markdown">
                  <div dangerouslySetInnerHTML={{ __html: project.html }} />
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
