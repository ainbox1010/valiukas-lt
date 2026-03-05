"use client";

import { useRef, useCallback } from "react";
import { smoothCloseAccordion } from "../accordionUtils";

export type Partner = {
  id: string;
  name: string;
  tagline: string;
  bestFor: string[];
  collaborationModel: string;
  linkLabel: string;
  linkUrl: string | null;
};

export type PartnersSection = {
  title: string;
  desc: string;
  partners: Partner[];
};

type PartnersAccordionProps = {
  sections: PartnersSection[];
};

function PartnerCard({
  partner,
  index,
  detailsRefs,
  handleToggle,
}: {
  partner: Partner;
  index: number;
  detailsRefs: React.MutableRefObject<(HTMLDetailsElement | null)[]>;
  handleToggle: (index: number) => void;
}) {
  return (
    <div className="partners-card-wrap card">
      <details
        ref={(el) => {
          detailsRefs.current[index] = el;
        }}
        className="projects-details partners-details"
        onToggle={() => handleToggle(index)}
      >
          <summary className="projects-summary">
            <strong>{partner.name}</strong>
            <div className="list partners-tagline">
              <div>{partner.tagline}</div>
            </div>
          </summary>
          <div className="accordion-expand-wrapper">
            <div className="projects-details-content markdown">
            <p className="partners-section-label">
              <strong>Best for:</strong>
            </p>
            <ul>
              {partner.bestFor.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="partners-section-label">
              <strong>Collaboration model:</strong>
            </p>
            <p>{partner.collaborationModel}</p>
            {partner.linkUrl ? (
              <p className="partners-section-label">
                <strong>{partner.linkLabel}:</strong>{" "}
                <a
                  href={partner.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="partners-external-link"
                >
                  {partner.linkLabel === "LinkedIn"
                    ? partner.name
                    : partner.linkUrl}
                  <span className="partners-external-icon" aria-hidden>
                    {" "}↗
                  </span>
                </a>
              </p>
            ) : null}
            </div>
          </div>
        </details>
    </div>
  );
}

export default function PartnersAccordion({ sections }: PartnersAccordionProps) {
  const detailsRefs = useRef<(HTMLDetailsElement | null)[]>([]);

  const handleToggle = useCallback(
    (index: number) => {
      const target = detailsRefs.current[index];
      if (!target?.open) return;
      detailsRefs.current.forEach((el, i) => {
        if (el && i !== index) smoothCloseAccordion(el);
      });
    },
    []
  );

  let partnerIndex = 0;
  return (
    <>
      {sections.map((section) => (
        <div key={section.title}>
          <h3 className="partners-section-title">{section.title}</h3>
          <p className="partners-section-desc">{section.desc}</p>
          <div className="partners-list">
            {section.partners.map((partner) => (
              <PartnerCard
                key={partner.id}
                partner={partner}
                index={partnerIndex++}
                detailsRefs={detailsRefs}
                handleToggle={handleToggle}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
