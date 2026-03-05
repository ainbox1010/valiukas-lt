"use client";

import { Fragment } from "react";

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
  dividerAfterIndex?: number;
  dividerTitle?: string;
};

export default function ServicesAccordion({
  sections,
  dividerAfterIndex,
  dividerTitle = "How I work",
}: ServicesAccordionProps) {
  return (
    <div className="services-accordion-wrapper">
      <div className="services-accordion-list">
        {sections.map((section, index) => (
          <Fragment key={section.id}>
            {dividerAfterIndex !== undefined &&
            index === dividerAfterIndex + 1 &&
            dividerTitle ? (
              <h2 className="services-delivery-heading">{dividerTitle}</h2>
            ) : null}
            <details
            key={section.id}
            id={section.id}
            className="services-details"
          >
            <summary className="services-summary">
              <strong>{section.title}</strong>
              {section.summary ? (
                <div className="services-summary-sub">{section.summary}</div>
              ) : null}
            </summary>

            <div className="accordion-expand-wrapper">
              <div className="services-details-content">
              {!["how-delivery-works", "engagement-models"].includes(
                section.id
              ) ? (
                <>
                  <h3>Use cases</h3>
                  <ul>
                    {section.use_cases.map((item) => (
                      <li key={`${section.id}-use-${item}`}>{item}</li>
                    ))}
                  </ul>
                </>
              ) : (
                <ul>
                  {section.use_cases.map((item) => (
                    <li key={`${section.id}-use-${item}`}>{item}</li>
                  ))}
                </ul>
              )}

              <h3>Outcomes</h3>
              <ul>
                {section.what_you_get.map((item) => (
                  <li key={`${section.id}-get-${item}`}>{item}</li>
                ))}
              </ul>

              <h3>Good fit</h3>
              <ul>
                {section.good_fit_when.map((item) => (
                  <li key={`${section.id}-fit-${item}`}>{item}</li>
                ))}
              </ul>

              {section.not_fit_when && section.not_fit_when.length > 0 ? (
                <>
                  <h3>Not a fit</h3>
                  <ul>
                    {section.not_fit_when.map((item) => (
                      <li key={`${section.id}-not-${item}`}>{item}</li>
                    ))}
                  </ul>
                </>
              ) : null}
              </div>
            </div>
          </details>
          </Fragment>
        ))}
      </div>
    </div>
  );
}
