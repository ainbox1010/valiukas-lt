"use client";

import { useRef } from "react";

export type ServiceSection = {
  id: string;
  title: string;
  summary: string;
  use_cases: string[];
  what_you_get: string[];
  good_fit_when: string[];
  not_fit_when?: string[];
};

type ServicesAccordionProps = {
  sections: ServiceSection[];
};

export default function ServicesAccordion({ sections }: ServicesAccordionProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const setAllOpen = (open: boolean) => {
    const node = wrapperRef.current;
    if (!node) return;
    const details = node.querySelectorAll("details");
    details.forEach((item) => {
      item.open = open;
    });
  };

  return (
    <div className="services-accordion-wrapper" ref={wrapperRef}>
      <div className="services-controls">
        <button
          type="button"
          className="services-control-button"
          onClick={() => setAllOpen(true)}
        >
          Expand all
        </button>
        <button
          type="button"
          className="services-control-button"
          onClick={() => setAllOpen(false)}
        >
          Collapse all
        </button>
      </div>

      <div className="services-accordion-list">
        {sections.map((section) => (
          <details key={section.id} className="services-details">
            <summary className="services-summary">
              <strong>{section.title}</strong>
              <div className="services-summary-sub">{section.summary}</div>
            </summary>

            <div className="services-details-content">
              <h3>Typical use cases</h3>
              <ul>
                {section.use_cases.map((item) => (
                  <li key={`${section.id}-use-${item}`}>{item}</li>
                ))}
              </ul>

              <h3>What you get</h3>
              <ul>
                {section.what_you_get.map((item) => (
                  <li key={`${section.id}-get-${item}`}>{item}</li>
                ))}
              </ul>

              <h3>Good fit when</h3>
              <ul>
                {section.good_fit_when.map((item) => (
                  <li key={`${section.id}-fit-${item}`}>{item}</li>
                ))}
              </ul>

              {section.not_fit_when && section.not_fit_when.length > 0 ? (
                <>
                  <h3>Not a fit when</h3>
                  <ul>
                    {section.not_fit_when.map((item) => (
                      <li key={`${section.id}-not-${item}`}>{item}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
