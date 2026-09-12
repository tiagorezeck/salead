// src/modules/landing-pages/providers/storage-provider.ts

export interface StorageProvider {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  subscribe?(key: string, listener: () => void): () => void;
}

export const localStorageProvider: StorageProvider = {
  getItem(k) {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem(k, v) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(k, v);
    } catch {
      /* quota */
    }
  },
  removeItem(k) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(k);
    } catch {
      /* noop */
    }
  },
  subscribe(k, listener) {
    if (typeof window === "undefined") return () => {};
    const handler = (e: StorageEvent) => {
      if (e.key === k) listener();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  },
};
