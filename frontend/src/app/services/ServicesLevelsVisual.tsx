"use client";

import { Fragment } from "react";

const LEVELS = [
  { label: "Structure", tier: "Level 1", targetId: "level-1-process-clarity" },
  { label: "Automation", tier: "Level 2", targetId: "level-2-workflow-automation" },
  { label: "AI", tier: "Level 3", targetId: "level-3-applied-ai" },
] as const;

export default function ServicesLevelsVisual() {
  const handleClick = (targetId: string) => {
    const details = document.getElementById(targetId);
    if (details && details instanceof HTMLDetailsElement) {
      details.open = true;
      const summary = details.querySelector("summary");
      summary?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="services-levels-visual" aria-hidden>
      {LEVELS.map((level, index) => (
        <Fragment key={level.targetId}>
          {index > 0 ? (
            <span className="services-levels-arrow" aria-hidden>
              →
            </span>
          ) : null}
          <button
            type="button"
            className="services-levels-item"
            onClick={() => handleClick(level.targetId)}
            aria-label={`Go to ${level.label}, ${level.tier}`}
          >
            <span className="services-levels-label">{level.label}</span>
            <span className="services-levels-tier">{level.tier}</span>
          </button>
        </Fragment>
      ))}
    </div>
  );
}
