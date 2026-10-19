import type { Metadata } from "next";
import { TagsManager } from "@/components/projects/TagsManager";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = { title: "Tags" };

export default function TagsPage() {
  return (
    <>
      <PageHeader title="Tags" />
      <TagsManager />
    </>
  );
}
