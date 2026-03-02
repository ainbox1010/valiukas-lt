import { loadMarkdown } from "@/lib/content/loadMarkdown";
import ServicesAccordion, { type ServiceSection } from "./ServicesAccordion";

export default async function ServicesPage() {
  const { frontmatter } = await loadMarkdown("pages/services.md");
  const title =
    typeof frontmatter.title === "string" ? frontmatter.title : "Services";
  const summary =
    typeof frontmatter.summary === "string" ? frontmatter.summary : "";
  const intro = Array.isArray(frontmatter.intro)
    ? (frontmatter.intro as string[])
    : [];
  const sections = Array.isArray(frontmatter.sections)
    ? (frontmatter.sections as ServiceSection[])
    : [];

  return (
    <div className="section services-page">
      <section className="hero">
        <h1>{title}</h1>
        {summary ? <p>{summary}</p> : null}
        {intro.length > 0 ? (
          <div className="services-intro">
            {intro.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : null}
      </section>

      <section className="section">
        <ServicesAccordion
          sections={sections}
          dividerAfterIndex={2}
          dividerTitle="How I work"
        />
      </section>
    </div>
  );
}
