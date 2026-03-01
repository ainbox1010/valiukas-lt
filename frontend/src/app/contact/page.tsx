import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="section">
      <section className="hero">
        <h1>Contact</h1>
        <p>
          Tell me what you want to automate and what systems you use. I will
          reply with a clear next step.
        </p>
      </section>

      <div className="card">
        <div className="markdown">
          <h2>Best fit projects</h2>
          <ul>
            <li>Operations-heavy teams with repetitive manual workflows</li>
            <li>Document-heavy processes (PDFs, emails, attachments)</li>
            <li>Companies that need clear ROI from automation</li>
            <li>Organizations preparing to scale with structured systems</li>
          </ul>

          <h2>Include these 4 details</h2>
          <ul>
            <li>What triggers the workflow</li>
            <li>Who touches it and where delays happen</li>
            <li>Which tools are involved today</li>
            <li>What output you expect at the end</li>
          </ul>

          <h2>Reach out</h2>
          <p>
            Email:{" "}
            <a href="mailto:ainbox1010@gmail.com?subject=Automation%20project%20inquiry">
              ainbox1010@gmail.com
            </a>
          </p>
          <p>I usually reply within 1 business day.</p>
          <p>Location: Lithuania / remote</p>
          <p className="contact-note">
            If you prefer, start by asking{" "}
            <Link href="/ai">AI Me</Link> and then continue by email.
          </p>
        </div>
      </div>
    </div>
  );
}
