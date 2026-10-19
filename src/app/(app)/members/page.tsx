import type { Metadata } from "next";
import { MembersManager } from "@/components/members/MembersManager";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = { title: "Members" };

export default function MembersPage() {
  return (
    <>
      <PageHeader title="Members" />
      <MembersManager />
    </>
  );
}
