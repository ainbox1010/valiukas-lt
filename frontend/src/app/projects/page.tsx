import Link from "next/link";
import { loadMarkdown, loadMarkdownCollection } from "@/lib/content/loadMarkdown";
import ProjectsFilters from "./ProjectsFilters";

const AI_ME_PROJECTS_PROMPT = "Show me projects by type, industry, or partner";

export const dynamic = "force-dynamic";

const TYPE_ORDER = ["ai", "automation", "systems"] as const;

function formatType(type: ProjectIndexItem["type"]): string | null {
  if (type === "ai") return "AI system";
  if (type === "automation") return "Workflow automation";
  if (type === "systems") return "Systems";
  return null;
}

type ProjectIndexItem = {
  title: string;
  slug: string;
  summary: string;
  html: string;
  case_visibility: "public_detail" | "link_only" | "rag_only";
  links: { label?: string; url?: string }[];
  visibility: string;
  ownership: "self" | "partner";
  type: "ai" | "automation" | "systems" | null;
  industry: string | null;
  partner: string | null;
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
  const partner =
    typeof frontmatter.partner === "string" ? frontmatter.partner : null;
  const ownership =
    frontmatter.ownership === "self" || frontmatter.ownership === "partner"
      ? frontmatter.ownership
      : partner
        ? "partner"
        : "self";
  const type =
    frontmatter.type === "ai" ||
    frontmatter.type === "automation" ||
    frontmatter.type === "systems"
      ? frontmatter.type
      : null;
  const industry =
    typeof frontmatter.industry === "string" ? frontmatter.industry : null;
  return {
    title,
    slug,
    summary,
    html,
    case_visibility: caseVisibility,
    links,
    visibility,
    ownership,
    type,
    industry,
    partner,
  };
}

function sortProjects(projects: ProjectIndexItem[]): ProjectIndexItem[] {
  return [...projects].sort((a, b) => {
    const pinSlug = "projects/ai-me";
    const aIsPinned = a.slug === pinSlug;
    const bIsPinned = b.slug === pinSlug;
    if (aIsPinned && !bIsPinned) return -1;
    if (bIsPinned && !aIsPinned) return 1;

    const ownershipOrder = (o: "self" | "partner") => (o === "self" ? 0 : 1);
    if (ownershipOrder(a.ownership) !== ownershipOrder(b.ownership)) {
      return ownershipOrder(a.ownership) - ownershipOrder(b.ownership);
    }
    const typeOrder = (t: string | null) => {
      if (!t) return TYPE_ORDER.length;
      const i = TYPE_ORDER.indexOf(t as (typeof TYPE_ORDER)[number]);
      return i >= 0 ? i : TYPE_ORDER.length;
    };
    if (typeOrder(a.type) !== typeOrder(b.type)) {
      return typeOrder(a.type) - typeOrder(b.type);
    }
    const ia = a.industry ?? "\uFFFF";
    const ib = b.industry ?? "\uFFFF";
    const ic = ia.localeCompare(ib);
    if (ic !== 0) return ic;
    return a.title.localeCompare(b.title);
  });
}

export default async function ProjectsPage(props: {
  searchParams?: Promise<{ type?: string | string[]; industry?: string | string[]; partner?: string | string[]; ownership?: string | string[] }> | { type?: string | string[]; industry?: string | string[]; partner?: string | string[]; ownership?: string | string[] };
}) {
  let params: { type?: string | string[]; industry?: string | string[]; partner?: string | string[]; ownership?: string | string[] } = {};
  try {
    const sp = props.searchParams;
    params = sp instanceof Promise ? await sp : sp ?? {};
  } catch {
    params = {};
  }
  const typeFilter = String(Array.isArray(params.type) ? params.type[0] ?? "" : params.type ?? "").trim();
  const industryFilter = String(Array.isArray(params.industry) ? params.industry[0] ?? "" : params.industry ?? "").trim();
  const partnerFilter = String(Array.isArray(params.partner) ? params.partner[0] ?? "" : params.partner ?? "").trim();
  const ownershipFilter = String(Array.isArray(params.ownership) ? params.ownership[0] ?? "" : params.ownership ?? "").trim();

  const { frontmatter } = await loadMarkdown("pages/projects.md");
  const title =
    typeof frontmatter.title === "string" ? frontmatter.title : "Projects";
  const summary =
    typeof frontmatter.summary === "string" ? frontmatter.summary : "";

  const files = await loadMarkdownCollection("pages/projects");
  let projects = files
    .map((file) => normalizeProject(file.frontmatter, file.html))
    .filter((item): item is ProjectIndexItem => Boolean(item));

  const types = Array.from(
    new Set(projects.map((p) => p.type).filter(Boolean))
  ).sort() as string[];
  const industries = Array.from(
    new Set(projects.map((p) => p.industry).filter(Boolean))
  ).sort() as string[];
  const partners = Array.from(
    new Set(projects.map((p) => p.partner).filter(Boolean))
  ).sort() as string[];
  const ownerships = Array.from(
    new Set(projects.map((p) => p.ownership))
  ).sort() as ("self" | "partner")[];

  if (typeFilter) {
    projects = projects.filter((p) => p.type === typeFilter);
  }
  if (industryFilter) {
    projects = projects.filter((p) => p.industry === industryFilter);
  }
  if (partnerFilter) {
    projects = projects.filter((p) => p.partner === partnerFilter);
  }
  if (ownershipFilter) {
    projects = projects.filter((p) => p.ownership === ownershipFilter);
  }

  const sorted = sortProjects(projects);

  return (
    <div className="section projects-page">
      <section className="hero">
        <h1>{title}</h1>
        {summary ? <p>{summary}</p> : null}
        <div className="projects-ai-strip">
          <p className="projects-ai-strip-text">
            Prefer asking instead of browsing? AI Me can navigate the projects for you.
          </p>
          <Link
            href={`/ai?q=${encodeURIComponent(AI_ME_PROJECTS_PROMPT)}`}
            className="projects-ai-strip-button"
          >
            Ask AI Me about projects
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="projects-section">
          <ProjectsFilters
            types={types}
            industries={industries}
            partners={partners}
            ownerships={ownerships}
            currentType={typeFilter}
            currentIndustry={industryFilter}
            currentPartner={partnerFilter}
            currentOwnership={ownershipFilter}
          />
          <div className="projects-list">
            {sorted.map((project) => {
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
                      <div className="projects-meta">
                        {formatType(project.type) && (
                          <span className="projects-meta-pill">Type: {formatType(project.type)}</span>
                        )}
                        {project.industry && (
                          <span className="projects-meta-pill">Industry: {project.industry}</span>
                        )}
                      </div>
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
                      <div className="projects-meta">
                        {formatType(project.type) && (
                          <span className="projects-meta-pill">Type: {formatType(project.type)}</span>
                        )}
                        {project.industry && (
                          <span className="projects-meta-pill">Industry: {project.industry}</span>
                        )}
                      </div>
                    </div>
                  </summary>
                  <div className="accordion-expand-wrapper">
                    <div className="projects-details-content markdown">
                      <div dangerouslySetInnerHTML={{ __html: project.html }} />
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
