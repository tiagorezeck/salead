// src/modules/landing-pages/providers/analytics-provider.ts

import { localStorageProvider, type StorageProvider } from "./storage-provider";

export type AnalyticsEventType = "visit" | "lead" | "cta-click";

export interface AnalyticsEvent {
  id: string;
  lpId: string;
  slug: string;
  type: AnalyticsEventType;
  source: string;
  utm: Partial<Record<string, string>>;
  referrer?: string;
  ts: number;
  meta?: Record<string, unknown>;
}

export interface ChannelStats {
  visits: number;
  leads: number;
  conv: number;
}

export interface LPStats {
  visits: number;
  leads: number;
  conv: number;
  byChannel: Record<string, ChannelStats>;
  timeline: { date: string; visits: number; leads: number }[];
}

export interface AnalyticsProvider {
  track(event: Omit<AnalyticsEvent, "id" | "ts">): void;
  getEvents(lpId: string): AnalyticsEvent[];
  getStats(lpId: string): LPStats;
  clear(lpId?: string): void;
}

const KEY = "app:lp-analytics:v1";

export function createLocalAnalytics(
  store: StorageProvider = localStorageProvider,
): AnalyticsProvider {
  const load = (): AnalyticsEvent[] => {
    try {
      return JSON.parse(store.getItem(KEY) || "[]");
    } catch {
      return [];
    }
  };
  const save = (arr: AnalyticsEvent[]) =>
    store.setItem(KEY, JSON.stringify(arr.slice(-5000)));

  return {
    track(e) {
      const ev: AnalyticsEvent = {
        ...e,
        id: Math.random().toString(36).slice(2, 10),
        ts: Date.now(),
      };
      const all = load();
      all.push(ev);
      save(all);
    },
    getEvents(lpId) {
      return load().filter((e) => e.lpId === lpId);
    },
    getStats(lpId) {
      const evs = load().filter((e) => e.lpId === lpId);
      const visits = evs.filter((e) => e.type === "visit").length;
      const leads = evs.filter((e) => e.type === "lead").length;

      const byChannel: Record<string, ChannelStats> = {};
      for (const e of evs) {
        const c = e.source || "direct";
        byChannel[c] ??= { visits: 0, leads: 0, conv: 0 };
        if (e.type === "visit") byChannel[c].visits++;
        else if (e.type === "lead") byChannel[c].leads++;
      }
      Object.values(byChannel).forEach((v) => {
        v.conv = v.visits ? Math.round((v.leads / v.visits) * 1000) / 10 : 0;
      });

      const days: Record<string, { visits: number; leads: number }> = {};
      for (const e of evs) {
        const d = new Date(e.ts).toISOString().slice(0, 10);
        days[d] ??= { visits: 0, leads: 0 };
        if (e.type === "visit") days[d].visits++;
        else if (e.type === "lead") days[d].leads++;
      }
      const timeline = Object.entries(days)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .slice(-14)
        .map(([date, v]) => ({ date, ...v }));

      return {
        visits,
        leads,
        conv: visits ? Math.round((leads / visits) * 1000) / 10 : 0,
        byChannel,
        timeline,
      };
    },
    clear(lpId) {
      if (!lpId) {
        store.removeItem(KEY);
        return;
      }
      const remaining = load().filter((e) => e.lpId !== lpId);
      save(remaining);
    },
  };
}
