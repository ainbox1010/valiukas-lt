import Link from "next/link";

import { loadMarkdown } from "@/lib/content/loadMarkdown";

type ExploreItem = {
  title?: string;
  href?: string;
  desc?: string;
};

type AiMeBlock = {
  href?: string;
  subtext?: string;
  credibility?: string;
  cta_label?: string;
  prompts?: string[];
};

type EntryOfferBlock = {
  title?: string;
  subtitle?: string;
  cta_label?: string;
  cta_href?: string;
};

export default async function HomePage() {
  const { frontmatter, html } = await loadMarkdown("pages/home.md");
  const title =
    typeof frontmatter.title === "string" ? frontmatter.title : "Home";
  const summary =
    typeof frontmatter.summary === "string" ? frontmatter.summary : "";
  const explore = Array.isArray(frontmatter.explore)
    ? (frontmatter.explore as ExploreItem[])
    : [];
  const aiMe = (frontmatter.ai_me ?? {}) as AiMeBlock;
  const aiMePrompts = Array.isArray(aiMe.prompts) ? aiMe.prompts : [];
  const entryOffer = (frontmatter.entry_offer ?? {}) as EntryOfferBlock;
  const proofPoints = Array.isArray(frontmatter.proof_points)
    ? (frontmatter.proof_points as string[])
    : [];
  const icp = Array.isArray(frontmatter.icp) ? (frontmatter.icp as string[]) : [];
  const contactEmail =
    typeof frontmatter.contact_email === "string"
      ? frontmatter.contact_email
      : "";

  return (
    <div>
      <section className="hero">
        <h1>{title}</h1>
        {summary ? <p>{summary}</p> : null}
        <div className="hero-actions">
          <Link className="cta-button" href="/contact">
            Book a call
          </Link>
          <Link className="cta-button cta-button-secondary" href="/ai">
            Ask AI Me
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="grid homepage-conversion-grid">
          <div className="card">
            <h2>Start here</h2>
            <div className="list">
              <strong>{entryOffer.title ?? "Workflow Diagnostic"}</strong>
              {entryOffer.subtitle ? <div>{entryOffer.subtitle}</div> : null}
              <div>
                <Link
                  className="cta-button"
                  href={entryOffer.cta_href ?? "/contact"}
                >
                  {entryOffer.cta_label ?? "Start with a diagnostic"}
                </Link>
              </div>
            </div>
          </div>
          <div className="card">
            <h2>Proof</h2>
            <ul className="homepage-proof-list">
              {proofPoints.length > 0 ? (
                proofPoints.map((item) => <li key={item}>{item}</li>)
              ) : (
                <li>Proof points will be updated with quantified outcomes.</li>
              )}
            </ul>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card">
          <h2>Ideal fit</h2>
          <ul className="homepage-proof-list">
            {icp.length > 0 ? (
              icp.map((item) => <li key={item}>{item}</li>)
            ) : (
              <li>Teams with operational workflows and clear outcomes to improve.</li>
            )}
          </ul>
        </div>
      </section>

      <section className="section">
        <h2>What you can do here</h2>
        <div className="card card-hero">
          <div className="card-hero-content">
            <div>
              <strong>AI Me</strong>
              {aiMe.subtext ? <div className="list">{aiMe.subtext}</div> : null}
              {aiMe.credibility ? (
                <div className="list">{aiMe.credibility}</div>
              ) : null}
              {aiMePrompts.length > 0 ? (
                <div className="prompt-chips">
                  {aiMePrompts.map((prompt) => (
                    <Link
                      key={prompt}
                      href={`/ai?q=${encodeURIComponent(prompt)}`}
                      className="prompt-chip"
                    >
                      {prompt}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            <Link className="cta-button" href={aiMe.href ?? "/ai"}>
              {aiMe.cta_label ?? "Ask AI Me"}
            </Link>
          </div>
        </div>

        <div className="grid grid-compact">
          {explore.map((item) => {
            if (!item || !item.href || !item.title) {
              return null;
            }
            const href = String(item.href);
            return (
              <Link key={href} href={href} className="card card-link">
                <strong>{item.title}</strong>
                {item.desc ? (
                  <div className="list">
                    <div>{item.desc}</div>
                  </div>
                ) : null}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="card">
          <div
            className="markdown"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </section>

      <section className="section" id="contact">
        <div className="card">
          <div className="markdown">
            <h2>Contact</h2>
            <p>
              <strong>
                Tell me what you want to automate and what systems you use.
              </strong>
            </p>
            <p>You will get a clear next step within one conversation.</p>
            {contactEmail ? (
              <p>
                Email:{" "}
                <a href={`mailto:${contactEmail}`}>
                  {contactEmail}
                </a>
              </p>
            ) : null}
            <p>Location: Lithuania / remote</p>
            <p>
              Prefer a structured intake? Use the{" "}
              <Link href="/contact">Contact page</Link>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
