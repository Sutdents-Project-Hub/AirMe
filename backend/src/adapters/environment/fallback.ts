import type { Location } from '@airme/contracts';

/** Try the authoritative source first, keeping the fallback policy explicit and testable. */
export function withFallback<T>(
  primary: (location: Location) => Promise<T>,
  fallback: (location: Location) => Promise<T>,
): (location: Location) => Promise<T> {
  return async (location) => {
    try {
      return await primary(location);
    } catch {
      return fallback(location);
    }
  };
}
