import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partners | valiukas.lt",
};

const PARTNERS = [
  {
    id: "erobot-ai",
    name: "erobot.ai",
    tagline:
      "Automation and robotic process automation (RPA) specialists focused on operational digitalization.",
    bestFor: [
      "Process robotization",
      "Public sector automation",
      "High-volume document workflows",
      "RPA + AI-assisted automation",
    ],
    collaborationModel:
      "I collaborate with erobot.ai as an AI and strategic partner, contributing architecture thinking and system-level design where applicable.",
    linkLabel: "Website",
    linkUrl: "https://erobot.ai",
  },
  {
    id: "beelogic-io",
    name: "beelogic.io",
    tagline:
      "Custom software development team delivering web platforms and operational systems.",
    bestFor: [
      "Industrial and logistics systems",
      "Workflow-driven web platforms",
      "Monitoring and control applications",
      "AI-integrated operational tools",
    ],
    collaborationModel:
      "I collaborate with beelogic.io as a strategic AI and automation partner, contributing system architecture, workflow design, and applied AI integration where relevant.",
    linkLabel: "Website",
    linkUrl: "https://beelogic.io",
  },
  {
    id: "copla-com",
    name: "copla.com",
    tagline: "Compliance and regulatory advisory partner.",
    bestFor: [
      "DORA readiness",
      "NIS2 advisory",
      "Operational risk structuring",
      "Compliance-aware system design",
    ],
    collaborationModel:
      "Where projects require regulatory alignment or compliance structuring, copla.com provides specialized advisory support.",
    linkLabel: "Website",
    linkUrl: "https://copla.com",
  },
  {
    id: "darius-gudaciauskas",
    name: "Darius Gudačiauskas",
    tagline:
      "Enterprise transformation and governance advisor with extensive executive experience across banking, telecommunications, retail, media, and insurance sectors. Experienced in leading large organizations (up to EUR200M revenue and 2000 employees) through restructuring, integration, and operational redesign.",
    bestFor: [
      "Enterprise-level organizational transformation",
      "Governance and executive structure design",
      "Post-merger integration and restructuring",
      "Business process architecture (pre-automation stage)",
      "Strategic diagnostics for complex organizations",
    ],
    collaborationModel:
      "Darius contributes as a strategic advisory partner in large-scale transformation initiatives. I act as the central orchestrator and business-technology bridge, engaging Darius where executive-level restructuring, governance alignment, and enterprise-scale process design expertise are required.",
    linkLabel: "LinkedIn",
    linkUrl: "https://www.linkedin.com/in/gudaciauskas/",
  },
];

export default function PartnersPage() {
  return (
    <div className="section">
      <section className="hero">
        <h1>Partners</h1>
        <p>Delivery partners and collaboration model.</p>
      </section>

      <section className="section">
        <h2>Collaboration Model</h2>
        <div className="markdown partners-collaboration-intro">
          <p>
            While I architect and design AI-enabled systems, certain projects
            require specialized delivery teams, industry experience, or
            additional implementation capacity.
          </p>
          <p>For such cases, I collaborate with trusted partners.</p>
          <p>
            Projects listed on this site clearly indicate whether they were
            delivered directly by me or in cooperation with a partner.
          </p>
          <p>
            Some projects are anonymized where confidentiality agreements
            apply.
          </p>
        </div>

        <div className="projects-list">
          {PARTNERS.map((partner) => (
            <details
              key={partner.id}
              className="projects-details card"
            >
              <summary className="projects-summary">
                <strong>{partner.name}</strong>
                <div className="list">
                  <div>{partner.tagline}</div>
                </div>
              </summary>
              <div className="projects-details-content markdown">
                <p>
                  <strong>Best for:</strong>
                </p>
                <ul>
                  {partner.bestFor.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p>
                  <strong>Collaboration model:</strong> {partner.collaborationModel}
                </p>
                {partner.linkUrl ? (
                  <p>
                    <strong>{partner.linkLabel}:</strong>{" "}
                    <a
                      href={partner.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {partner.linkLabel === "LinkedIn"
                        ? partner.name
                        : partner.linkUrl}
                    </a>
                  </p>
                ) : null}
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
