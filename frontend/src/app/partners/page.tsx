import {
  loadMarkdown,
  loadMarkdownCollection,
} from "@/lib/content/loadMarkdown";

const withExternalLinkTarget = (value: string) =>
  value.replace(
    /<a\s+href="https?:\/\/[^"]*"/gi,
    (match) => `${match} target="_blank" rel="noopener noreferrer"`
  );

export default async function PartnersPage() {
  const { frontmatter, html } = await loadMarkdown("pages/partners.md");
  const title =
    typeof frontmatter.title === "string" ? frontmatter.title : "Partners";
  const summary =
    typeof frontmatter.summary === "string" ? frontmatter.summary : "";
  const normalizedHtml = withExternalLinkTarget(
    html.replace(/^<h1[^>]*>.*?<\/h1>\n?/i, "")
  );
  const partnerFiles = await loadMarkdownCollection("pages/partners");
  const partners = partnerFiles
    .map((file) => {
      const order =
        typeof file.frontmatter.order === "number"
          ? file.frontmatter.order
          : Number.MAX_SAFE_INTEGER;
      return { ...file, order };
    })
    .sort((a, b) => a.order - b.order);

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
        {partners.map((partner) => (
          <div className="card" key={partner.name}>
            <div
              className="markdown"
              dangerouslySetInnerHTML={{
                __html: withExternalLinkTarget(partner.html),
              }}
            />
          </div>
        ))}
      </section>
    </div>
  );
}
