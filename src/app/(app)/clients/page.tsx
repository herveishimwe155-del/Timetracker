import type { Metadata } from "next";
import { Briefcase } from "lucide-react";
import { EmptyState } from "@/components/shell/EmptyState";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage() {
  return (
    <>
      <PageHeader title="Clients" />
      <EmptyState icon={Briefcase} title="No clients yet">
        Clients sit above projects, so you can see time per customer.
      </EmptyState>
    </>
  );
}
