import { notFound } from "next/navigation";

interface ProjectPageProps {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;

  if (!projectId) {
    notFound();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Project Details</h1>
      <p className="mt-2 text-muted-foreground">Project ID: {projectId}</p>
    </div>
  );
}
