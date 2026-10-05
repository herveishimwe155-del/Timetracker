"use client";

import { createContext, useCallback, useContext } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Guest mode: signed-out visitors can look around the app (it's empty), and are
 * sent to sign up the moment they try to save anything. The database refuses
 * signed-out reads and writes anyway; this keeps the app from asking.
 */
const GuestContext = createContext(false);

export function GuestProvider({ guest, children }: { guest: boolean; children: React.ReactNode }) {
  return <GuestContext.Provider value={guest}>{children}</GuestContext.Provider>;
}

export function useIsGuest(): boolean {
  return useContext(GuestContext);
}

/**
 * Query options for guests: don't fetch, show `empty` as if loaded.
 * Spread into useQuery: `...guestQuery(guest, [])`.
 */
export function guestQuery<T>(guest: boolean, empty: T): { enabled?: false; initialData?: T } {
  return guest ? { enabled: false, initialData: empty } : {};
}

/** Where sign-up should send a guest back to afterwards. */
export function signUpUrl(next: string): string {
  return `/login?mode=signup&next=${encodeURIComponent(next)}`;
}

/**
 * For actions that save something. Returns true (and sends the guest to sign up)
 * when there's no account yet, so callers can `if (requireAccount()) return;`.
 */
export function useRequireAccount(): () => boolean {
  const guest = useIsGuest();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  return useCallback(() => {
    if (!guest) return false;
    const query = search.toString();
    router.push(signUpUrl(query ? `${pathname}?${query}` : pathname));
    return true;
  }, [guest, router, pathname, search]);
}
