"use client";

import { type AutomationLog } from "./automation-types";
import { cloudStore } from "@/services/cloudStorageService";

let listeners: (() => void)[] = [];

if (typeof window !== "undefined") {
  cloudStore.subscribe(() => {
    listeners.forEach(fn => fn());
  });
}

export const AutomationLogger = {
  getLogs: (): AutomationLog[] => {
    const logs = cloudStore.getState().automationLogs;
    return Array.isArray(logs) ? (logs as AutomationLog[]) : [];
  },

  addLog: async (log: Omit<AutomationLog, 'id' | 'timestamp'>) => {
    const newLog: AutomationLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString()
    };
    cloudStore.mutate((draft) => {
      const current = Array.isArray(draft.automationLogs) ? draft.automationLogs : [];
      draft.automationLogs = [newLog, ...current].slice(0, 100);
    });
    listeners.forEach(fn => fn());
  },

  subscribe: (fn: () => void) => {
    listeners.push(fn);
    return () => { listeners = listeners.filter(l => l !== fn); };
  },

  clearLogs: async () => {
    cloudStore.mutate((draft) => {
      draft.automationLogs = [];
    });
    listeners.forEach(fn => fn());
  }
};
