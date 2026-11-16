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
    if (k.includes("lps") || k.includes("landing")) {
      const lps = cloudStore.getState().landingPages || [];
      if (lps.length > 0 || cloudStore.getStatus().loadedFromCloud) {
        return JSON.stringify(lps);
      }
    }
    return memoryStore.get(k) ?? null;
  },
  setItem(k, v) {
    memoryStore.set(k, v);
    notifyKey(k);
  },
  removeItem(k) {
    memoryStore.delete(k);
    notifyKey(k);
  },
  subscribe(k, listener) {
    if (!keyListeners.has(k)) {
      keyListeners.set(k, new Set());
    }
    keyListeners.get(k)!.add(listener);
    const unsubCloud = cloudStore.subscribe(() => {
      if (k.includes("lps") || k.includes("landing")) {
        listener();
      }
    });
    return () => {
      keyListeners.get(k)?.delete(listener);
      unsubCloud();
    };
  },
};
