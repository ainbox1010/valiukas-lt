import Link from "next/link";

const placeholderProjects = [
  { slug: "example", title: "Example case study" },
];

export default function ProjectsPage() {
  return (
    <div className="section">
      <h2>Projects</h2>
      <div className="card">
        <div className="list">
          <div>Short, factual case studies will appear here.</div>
          <div>Each project page links to verifiable sources.</div>
        </div>
      </div>
      <div className="card">
        <div className="list">
          {placeholderProjects.map((project) => (
            <Link key={project.slug} href={`/projects/${project.slug}`}>
              {project.title}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
