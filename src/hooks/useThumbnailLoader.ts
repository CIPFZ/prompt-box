import { useRef, useCallback, useEffect } from "react";
import { readThumbnail } from "../lib/tauri-api";

const MAX_CACHE = 60;
const cache = new Map<string, string>();

function evictLRU() {
  while (cache.size > MAX_CACHE) {
    const first = cache.keys().next().value;
    if (first) {
      const url = cache.get(first);
      if (url) URL.revokeObjectURL(url);
      cache.delete(first);
    }
  }
}

export function useThumbnailLoader() {
  const pending = useRef<Map<string, Promise<string>>>(new Map());

  const load = useCallback(async (filename: string): Promise<string> => {
    if (!filename) return "";

    // Check cache
    if (cache.has(filename)) {
      // Move to end (LRU)
      const url = cache.get(filename)!;
      cache.delete(filename);
      cache.set(filename, url);
      return url;
    }

    // Check pending
    if (pending.current.has(filename)) {
      return pending.current.get(filename)!;
    }

    // Start loading
    const promise = (async () => {
      try {
        const bytes = await readThumbnail(filename);
        const blob = new Blob([new Uint8Array(bytes)]);
        const url = URL.createObjectURL(blob);

        cache.set(filename, url);
        evictLRU();
        return url;
      } catch {
        return "";
      }
    })();

    pending.current.set(filename, promise);
    promise.finally(() => {
      pending.current.delete(filename);
    });

    return promise;
  }, []);

  // Cleanup all blob URLs on unmount
  useEffect(() => {
    return () => {
      cache.forEach((url) => URL.revokeObjectURL(url));
      cache.clear();
      pending.current.clear();
    };
  }, []);

  return { load, cache };
}
