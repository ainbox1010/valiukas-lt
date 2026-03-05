import Link from "next/link";

import { loadMarkdown } from "@/lib/content/loadMarkdown";

export default async function HomePage() {
  const { frontmatter } = await loadMarkdown("pages/home.md");
  const title =
    typeof frontmatter.title === "string" ? frontmatter.title : "Home";
  const summary =
    typeof frontmatter.summary === "string" ? frontmatter.summary : "";
  const proofPoints = Array.isArray(frontmatter.proof_points)
    ? (frontmatter.proof_points as string[])
    : [];
  const icp = Array.isArray(frontmatter.icp) ? (frontmatter.icp as string[]) : [];
  const levelsIntro =
    typeof frontmatter.levels_intro === "string"
      ? frontmatter.levels_intro
      : "Work begins at the right level — depending on your situation.";
  const levels = Array.isArray(frontmatter.levels)
    ? (frontmatter.levels as Array<{
        id?: string;
        title?: string;
        descriptor?: string;
        summary?: string;
        expand_bullets?: string[];
        ai_me_prompt?: string;
      }>)
    : [];

  return (
    <div>
      <section className="hero">
        <h1>{title}</h1>
        {summary ? <p>{summary}</p> : null}
        <p className="hero-levels-intro">{levelsIntro}</p>
        <div className="hero-levels">
          {levels.map((level) => (
            <details key={level.id ?? level.title} className="hero-level-card">
              <summary className="hero-level-summary">
                <strong>{level.title}</strong>
                {level.descriptor ? (
                  <span className="hero-level-descriptor">{level.descriptor}</span>
                ) : null}
              </summary>
              <div className="hero-level-content-wrapper">
                <div className="hero-level-content">
                {level.summary ? <p>{level.summary}</p> : null}
                {Array.isArray(level.expand_bullets) &&
                level.expand_bullets.length > 0 ? (
                  <ul>
                    {level.expand_bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                ) : null}
                {level.ai_me_prompt ? (
                  <div className="hero-level-ai-option">
                    <p>
                      Explore your situation with AI Me — or discuss your case
                      directly.
                    </p>
                    <div className="cta-two-buttons">
                      <Link
                        className="cta-button cta-button-secondary"
                        href={`/ai?q=${encodeURIComponent(level.ai_me_prompt)}`}
                      >
                        AI Me — explore how your process, automation, or AI
                        initiative should start.
                      </Link>
                      <Link
                        className="cta-button cta-button-secondary"
                        href="/contact"
                      >
                        Discuss your case directly
                      </Link>
                    </div>
                  </div>
                ) : null}
              </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="grid homepage-conversion-grid homepage-proof-fit-grid">
          <div className="card">
            <h2>Previous results</h2>
            <ul className="homepage-proof-list">
              {proofPoints.length > 0 ? (
                proofPoints.map((item) => <li key={item}>{item}</li>)
              ) : (
                <li>Proof points will be updated with quantified outcomes.</li>
              )}
            </ul>
            <p className="homepage-proof-link">
              <Link href="/projects">View Projects →</Link>
            </p>
          </div>
          <div className="card">
            <h2>Best fit for</h2>
            <ul className="homepage-proof-list">
              {icp.length > 0 ? (
                icp.map((item) => <li key={item}>{item}</li>)
              ) : (
                <li>Teams with operational workflows and clear outcomes to improve.</li>
              )}
            </ul>
            <p className="homepage-proof-link">
              <Link href="/services">View Services →</Link>
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card card-cta">
          <h2>Not sure where to start?</h2>
          <p>
            Explore your situation with AI Me — or discuss your case directly.
          </p>
          <div className="cta-two-buttons">
            <Link
              className="cta-button cta-button-secondary"
              href="/ai"
            >
              AI Me — explore how your process, automation, or AI initiative
              should start.
            </Link>
            <Link
              className="cta-button cta-button-secondary"
              href="/contact"
            >
              Discuss your case directly
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
