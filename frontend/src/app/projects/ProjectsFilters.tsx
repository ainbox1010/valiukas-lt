const TYPE_LABELS: Record<string, string> = {
  ai: "AI",
  automation: "Automation",
  systems: "Systems",
};

const OWNERSHIP_LABELS: Record<string, string> = {
  self: "Self",
  partner: "Partner",
};

type ProjectsFiltersProps = {
  types: string[];
  industries: string[];
  partners: string[];
  ownerships: ("self" | "partner")[];
  currentType: string;
  currentIndustry: string;
  currentPartner: string;
  currentOwnership: string;
};

export default function ProjectsFilters({
  types,
  industries,
  partners,
  ownerships,
  currentType,
  currentIndustry,
  currentPartner,
  currentOwnership,
}: ProjectsFiltersProps) {
  const hasFilters =
    types.length > 1 ||
    industries.length > 1 ||
    partners.length > 0 ||
    ownerships.length > 1;
  if (!hasFilters) return null;

  return (
    <form method="get" action="/projects" className="projects-filters">
      {ownerships.length > 1 && (
        <div className="projects-filter-group">
          <label htmlFor="filter-ownership">Ownership</label>
          <select
            id="filter-ownership"
            name="ownership"
            defaultValue={currentOwnership}
            aria-label="Filter by ownership"
          >
            <option value="">All</option>
            {ownerships.map((o) => (
              <option key={o} value={o}>
                {OWNERSHIP_LABELS[o] ?? o}
              </option>
            ))}
          </select>
        </div>
      )}
      {types.length > 1 && (
        <div className="projects-filter-group">
          <label htmlFor="filter-type">Type</label>
          <select id="filter-type" name="type" defaultValue={currentType} aria-label="Filter by type">
            <option value="">All</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t] ?? t}
              </option>
            ))}
          </select>
        </div>
      )}
      {industries.length > 1 && (
        <div className="projects-filter-group">
          <label htmlFor="filter-industry">Industry</label>
          <select id="filter-industry" name="industry" defaultValue={currentIndustry} aria-label="Filter by industry">
            <option value="">All</option>
            {industries.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>
      )}
      {partners.length > 0 && (
        <div className="projects-filter-group">
          <label htmlFor="filter-partner">Partner</label>
          <select id="filter-partner" name="partner" defaultValue={currentPartner} aria-label="Filter by partner">
            <option value="">All</option>
            {partners.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="projects-filter-group">
        <button type="submit" className="projects-filter-submit">
          Filter
        </button>
      </div>
    </form>
  );
}
