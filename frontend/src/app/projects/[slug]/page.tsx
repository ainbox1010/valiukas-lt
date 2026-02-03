type ProjectPageProps = {
  params: { slug: string };
};

export function generateStaticParams() {
  return [{ slug: "example" }];
}

export const dynamicParams = false;

export default function ProjectPage({ params }: ProjectPageProps) {
  return (
    <div className="section">
      <h2>Project: {params.slug}</h2>
      <div className="card">
        <div className="list">
          <div>This is a placeholder project page.</div>
          <div>Case studies will be added from verified materials.</div>
        </div>
      </div>
    </div>
  );
}
