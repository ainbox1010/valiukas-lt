export default function HomePage() {
  return (
    <div>
      <section className="hero">
        <div className="tag">Personal site</div>
        <div className="tag">AI + IT projects</div>
        <h1>Trust-first AI work, built for real-world constraints.</h1>
        <p>
          I help teams build credible AI experiences with strong privacy and
          compliance guarantees. This site is a home for my work, services, and a
          grounded AI assistant that answers only from verified sources.
        </p>
      </section>

      <section className="section">
        <h2>What you can explore</h2>
        <div className="grid">
          <div className="card">
            <strong>About</strong>
            <div className="list">
              <div>Background, focus areas, and how I work.</div>
            </div>
          </div>
          <div className="card">
            <strong>Services</strong>
            <div className="list">
              <div>Clear packages for delivery and advisory work.</div>
            </div>
          </div>
          <div className="card">
            <strong>Projects</strong>
            <div className="list">
              <div>Short, factual case studies.</div>
            </div>
          </div>
          <div className="card">
            <strong>AI Me</strong>
            <div className="list">
              <div>AI answers backed by citations.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Privacy and security first</h2>
        <div className="card">
          <div className="list">
            <div>Answers are grounded in curated documents.</div>
            <div>User-supplied API keys are never stored or logged.</div>
            <div>Failure modes are intentional and user-friendly.</div>
          </div>
        </div>
      </section>
    </div>
  );
}
