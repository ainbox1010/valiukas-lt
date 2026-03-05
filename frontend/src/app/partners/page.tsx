import type { Metadata } from "next";
import PartnersAccordion from "./PartnersAccordion";

export const metadata: Metadata = {
  title: "Partners | valiukas.lt",
  description:
    "Delivery partners and collaboration model. Trusted specialists for automation, AI, compliance, and enterprise transformation.",
};

const PARTNERS: {
  id: string;
  name: string;
  tagline: string;
  bestFor: string[];
  collaborationModel: string;
  linkLabel: string;
  linkUrl: string | null;
  category: "delivery_engineering" | "strategic_advisor";
}[] = [
  {
    id: "erobot-ai",
    category: "delivery_engineering",
    name: "erobot.ai",
    tagline:
      "Operational automation specialists focused on RPA and large-scale process digitalization.",
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
    category: "delivery_engineering",
    name: "beelogic.io",
    tagline:
      "Engineering partner delivering custom platforms, AI systems, and operational software.",
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
    category: "delivery_engineering",
    name: "copla.com",
    tagline:
      "Regulatory and compliance advisory partner supporting governance and regulatory alignment.",
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
    category: "strategic_advisor",
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
    <div className="section partners-page">
      <section className="hero">
        <h1>Partners</h1>
        <p className="hero-subtitle">
          Delivery partners and collaboration model.
        </p>
      </section>

      <section className="section">
        <h2>Collaboration Model</h2>
        <div className="markdown partners-collaboration-intro">
          <p>
            I architect and design AI-enabled systems and typically lead system
            architecture, workflow automation design, and AI integration. Some projects
            require specialized delivery teams, industry experience, or
            additional implementation capacity. For such cases, I collaborate
            with trusted partners. Projects listed on this site clearly indicate
            whether they were delivered directly by me or in cooperation with a
            partner. Some projects are anonymized where confidentiality
            agreements apply.
          </p>
        </div>

        <PartnersAccordion
          sections={[
            {
              title: "Delivery & Engineering Partners",
              desc: "Companies involved in implementation.",
              partners: PARTNERS.filter((p) => p.category === "delivery_engineering"),
            },
            {
              title: "Strategic Advisors",
              desc: "People I collaborate with on transformation, governance, and strategy.",
              partners: PARTNERS.filter((p) => p.category === "strategic_advisor"),
            },
          ]}
        />
      </section>
    </div>
  );
}
