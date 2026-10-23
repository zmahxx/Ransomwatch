import { useCallback, useEffect, useState } from "react";

/**
 * Hydration-safe localStorage state. The first render always returns the
 * initial value (so SSR markup matches), then the stored value is applied.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore malformed entries */
    }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable */
    }
  }, [key, value, hydrated]);

  const reset = useCallback(() => setValue(initialValue), [initialValue]);

  return [value, setValue, { hydrated, reset }] as const;
}
