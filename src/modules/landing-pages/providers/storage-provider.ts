// src/modules/landing-pages/providers/storage-provider.ts
import { cloudStore } from "@/services/cloudStorageService";

export interface StorageProvider {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  subscribe?(key: string, listener: () => void): () => void;
}

const memoryStore = new Map<string, string>();
const keyListeners = new Map<string, Set<() => void>>();

function notifyKey(key: string) {
  const listeners = keyListeners.get(key);
  if (listeners) {
    listeners.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
  }
}

export const localStorageProvider: StorageProvider = {
  getItem(k) {
    if (k.includes("analytics")) {
      const events = cloudStore.getState().lpAnalytics?.events;
      if (Array.isArray(events)) {
        return JSON.stringify(events);
      }
      return memoryStore.get(k) ?? null;
    }
    if (k.includes("lps") || k.includes("landing")) {
      const lps = cloudStore.getState().landingPages || [];
      if (lps.length > 0 || cloudStore.getStatus().loadedFromCloud) {
        return JSON.stringify(lps);
      }
    }
    return memoryStore.get(k) ?? null;
  },
  setItem(k, v) {
    if (k.includes("analytics")) {
      try {
        const parsed = JSON.parse(v);
        if (Array.isArray(parsed)) {
          cloudStore.mutate((draft) => {
            draft.lpAnalytics = {
              ...(draft.lpAnalytics || {}),
              events: parsed.slice(-5000),
              updatedAt: new Date().toISOString(),
            };
          });
        }
      } catch {}
    }
    memoryStore.set(k, v);
    notifyKey(k);
  },
  removeItem(k) {
    if (k.includes("analytics")) {
      cloudStore.mutate((draft) => {
        draft.lpAnalytics = {
          ...(draft.lpAnalytics || {}),
          events: [],
          updatedAt: new Date().toISOString(),
        };
      });
    }
    memoryStore.delete(k);
    notifyKey(k);
  },
  subscribe(k, listener) {
    if (!keyListeners.has(k)) {
      keyListeners.set(k, new Set());
    }
    keyListeners.get(k)!.add(listener);
    const unsubCloud = cloudStore.subscribe(() => {
      if (k.includes("lps") || k.includes("landing") || k.includes("analytics")) {
        listener();
      }
    });
    return () => {
      keyListeners.get(k)?.delete(listener);
      unsubCloud();
    };
  },
};
