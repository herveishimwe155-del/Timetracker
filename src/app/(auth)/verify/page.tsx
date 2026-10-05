import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VerifyForm } from "./VerifyForm";

export const metadata: Metadata = { title: "Two-step verification" };

export default async function VerifyPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) redirect("/login");
  if (data.claims.aal === "aal2") redirect("/timer");
  const { data: ok } = await supabase.rpc("session_assurance_ok");
  if (ok !== false) redirect("/timer");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <VerifyForm />
    </main>
  );
}
