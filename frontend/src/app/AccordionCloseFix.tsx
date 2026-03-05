"use client";

import { useEffect } from "react";
import { smoothCloseAccordion } from "./accordionUtils";

const ACCORDION_SELECTOR =
  ".hero-level-card, .services-details, .projects-details, .partners-details";

export default function AccordionCloseFix() {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const summary = (e.target as HTMLElement).closest("summary");
      if (!summary) return;
      const details = summary.closest(ACCORDION_SELECTOR) as HTMLDetailsElement | null;
      if (!details) return;

      if (details.open && !details.classList.contains("accordion-closing")) {
        e.preventDefault();
        smoothCloseAccordion(details);
      }
    };

    document.addEventListener("click", handleClick, { capture: true });

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, []);

  return null;
}
