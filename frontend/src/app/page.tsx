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

  return (
    <div>
      <section className="hero">
        <h1>{title}</h1>
        {summary ? <p>{summary}</p> : null}
      </section>

      <section className="section">
        <h2>What you can explore</h2>
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
    </div>
  );
}
