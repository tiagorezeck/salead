"use client";

import { type AutomationLog } from "./automation-types";

const STORAGE_KEY = "comet_automation_logs";

function getInitialLogs(): AutomationLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

let logsCache: AutomationLog[] = getInitialLogs();
let listeners: (() => void)[] = [];

const notify = () => {
  listeners.forEach(fn => fn());
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logsCache.slice(0, 100)));
    } catch {}
  }
};

export const AutomationLogger = {
  getLogs: (): AutomationLog[] => {
    if (logsCache.length === 0 && typeof window !== "undefined") {
      logsCache = getInitialLogs();
    }
    return logsCache;
  },

  addLog: async (log: Omit<AutomationLog, 'id' | 'timestamp'>) => {
    const newLog: AutomationLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString()
    };
    logsCache = [newLog, ...logsCache].slice(0, 100);
    notify();
  },

  subscribe: (fn: () => void) => {
    listeners.push(fn);
    return () => { listeners = listeners.filter(l => l !== fn); };
  },

  clearLogs: async () => {
    logsCache = [];
    notify();
  }
};
