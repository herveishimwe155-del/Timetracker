import type { Metadata } from "next";
import { ClientsManager } from "@/components/projects/ClientsManager";
import { PageHeader } from "@/components/shell/PageHeader";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage() {
  return (
    <>
      <PageHeader title="Clients" />
      <ClientsManager />
    </>
  );
}
