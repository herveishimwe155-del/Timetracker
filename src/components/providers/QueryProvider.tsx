"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { signUpUrl } from "@/lib/guest";

export function QueryProvider({ guest = false, children }: { guest?: boolean; children: React.ReactNode }) {
  const router = useRouter();
  const [client] = useState(
    () =>
      new QueryClient({
        // Safety net for guests: any save the UI didn't intercept fails at the
        // database, so send them to sign up instead of showing that error.
        mutationCache: guest
          ? new MutationCache({
              onError: () => {
                router.push(signUpUrl(window.location.pathname + window.location.search));
                // The mutation's own error toast fires after this; clear it.
                window.setTimeout(() => toast.dismiss(), 0);
              },
            })
          : undefined,
        defaultOptions: {
          queries: {
            // Realtime keeps entries fresh; refetching on every focus would only add load.
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
