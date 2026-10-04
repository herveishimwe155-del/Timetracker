export const HOME_PATH = "/timer";

/**
 * Only same-site paths are allowed as a post-sign-in destination, so a crafted
 * ?next= link can't send people to another site.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return HOME_PATH;
  }
  if (next === "/login" || next.startsWith("/auth/")) return HOME_PATH;
  return next;
}

/** A valid IANA time zone such as "Europe/Paris", or UTC. */
export function safeTimeZone(tz: string | null | undefined): string {
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}
