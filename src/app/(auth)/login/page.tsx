import type { Metadata } from "next";
import { safeNextPath } from "@/lib/auth/redirect";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <LoginForm next={safeNextPath(first(params.next))} linkError={first(params.error) === "link"} />
    </main>
  );
}
