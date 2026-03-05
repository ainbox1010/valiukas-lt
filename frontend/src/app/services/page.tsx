import { loadMarkdown } from "@/lib/content/loadMarkdown";
import Link from "next/link";
import ServicesAccordion, { type ServiceSection } from "./ServicesAccordion";
import ServicesLevelsVisual from "./ServicesLevelsVisual";

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
    <section className="section services-page-stack services-page">
        <h1>{title}</h1>
        {summary ? <p>{summary}</p> : null}
        {intro.length > 0 ? (
          <div className="services-intro">
            {intro.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <ServicesLevelsVisual />
            <p className="services-intro-cta">
              Not sure where you fit?{" "}
              <Link href="/ai" className="cta-button cta-button-secondary">
                Ask AI Me
              </Link>
            </p>
          </div>
        ) : null}
            <div className="services-stack-accordion">
        <ServicesAccordion
          sections={sections}
          dividerAfterIndex={2}
          dividerTitle="How I work"
        />
            </div>
    </section>
  );
}
