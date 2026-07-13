// ── Persistence layer ──────────────────────────────────────────────
// A tiny localStorage-backed "database" for the mock backend. The whole
// DB is serialised under one key so mutations survive page reloads.
// Bump VERSION to invalidate an old seed shape after schema changes.

const STORAGE_KEY = "msts-db";
// v3: every record carries an `entityId` for customer scoping.
// v4: added the scheduledReports collection.
// v5: added the whitelabel partners collection.
// v6: partners carry designTemplate + portal copy (solution builder).
// v7: added the broadcast announcements collection.
// v8: added the value-added-services (VAS) requests collection.
const VERSION = 8;

interface Envelope<T> {
  __v: number;
  data: T;
}

/**
 * Load the DB from localStorage, or build+persist a fresh seed if absent
 * or from an older schema version.
 */
export function loadDb<T>(seed: () => T): T {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const env = JSON.parse(raw) as Envelope<T>;
      if (env && env.__v === VERSION && env.data) return env.data;
    }
  } catch {
    /* corrupt payload — fall through to reseed */
  }
  const data = seed();
  saveDb(data);
  return data;
}

/** Write the entire DB back to localStorage. Called after every mutation. */
export function saveDb(data: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ __v: VERSION, data } satisfies Envelope<unknown>)
    );
  } catch {
    /* quota / serialisation issue — non-fatal for a prototype */
  }
}

/** Remove the persisted DB (used by "reset demo data"). */
export function clearDb(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
