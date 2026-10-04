import type { Metadata } from "next";
import { ProjectsManager } from "@/components/projects/ProjectsManager";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <>
      <PageHeader title="Projects" />
      <ProjectsManager />
    </>
  );
}
