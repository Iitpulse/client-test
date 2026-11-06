// Typed fixtures for M6 states whose routes are not live yet (or can't be reached on demand: a key correction, a
// summary that fails). A page reads `?fixture=<state>` only when fixtures are allowed: dev builds, staging hosts, or
// NEXT_PUBLIC_M6_FIXTURES=1. Production (frozen on M5) never reads it.

export function fixturesAllowed(): boolean {
  if (process.env.NEXT_PUBLIC_M6_FIXTURES === "1") return true;
  if (process.env.NODE_ENV !== "production") return true;
  if (typeof window === "undefined") return false;
  return /^staging-|^localhost$|^127\.0\.0\.1$/.test(window.location.hostname);
}

/** The `?fixture=` value when fixtures are allowed, else null. Call it in an effect or event (it reads location). */
export function fixtureParam(): string | null {
  if (typeof window === "undefined" || !fixturesAllowed()) return null;
  return new URLSearchParams(window.location.search).get("fixture");
}
