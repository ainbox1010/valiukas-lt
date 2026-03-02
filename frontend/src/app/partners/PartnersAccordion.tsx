"use client";

import { useRef, useCallback } from "react";

export type Partner = {
  id: string;
  name: string;
  tagline: string;
  bestFor: string[];
  collaborationModel: string;
  linkLabel: string;
  linkUrl: string | null;
};

type PartnersAccordionProps = {
  partners: Partner[];
};

export default function PartnersAccordion({ partners }: PartnersAccordionProps) {
  const detailsRefs = useRef<(HTMLDetailsElement | null)[]>([]);

  const handleToggle = useCallback(
    (index: number) => {
      const target = detailsRefs.current[index];
      if (!target?.open) return;
      detailsRefs.current.forEach((el, i) => {
        if (el && i !== index) el.open = false;
      });
    },
    []
  );

  return (
    <div className="partners-list">
      {partners.map((partner, index) => (
        <details
          key={partner.id}
          ref={(el) => {
            detailsRefs.current[index] = el;
          }}
          className="projects-details card partners-details"
          onToggle={() => handleToggle(index)}
        >
          <summary className="projects-summary">
            <strong>{partner.name}</strong>
            <div className="list partners-tagline">
              <div>{partner.tagline}</div>
            </div>
          </summary>
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
        </details>
      ))}
    </div>
  );
}
