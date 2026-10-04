import type { Metadata } from "next";
import { FolderKanban } from "lucide-react";
import { EmptyState } from "@/components/shell/EmptyState";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <>
      <PageHeader title="Projects" />
      <EmptyState icon={FolderKanban} title="No projects yet">
        Projects group your time and give each entry a colour. Create your first one here soon.
      </EmptyState>
    </>
  );
}
