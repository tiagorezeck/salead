"use client";

import { supabase } from "@/integrations/supabase/client";
import { type AutomationLog } from "./automation-types";

let logsCache: AutomationLog[] = [];
let listeners: (() => void)[] = [];
let isPolling = false;

const notify = () => listeners.forEach(fn => fn());

async function fetchLogs() {
  try {
    const { data } = await supabase
      .from('automation_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);
    
    if (data) {
      logsCache = data.map(l => ({
        id: l.id,
        automationId: l.automation_id,
        timestamp: l.timestamp,
        targetId: l.target_id,
        targetName: l.target_name,
        action: l.action,
        result: l.result,
        durationMs: l.duration_ms,
        error: l.error
      }));
      notify();
    }
  } catch (e) {
    console.error("[AutomationLogger] Fetch error:", e);
  }
}

function startPolling() {
  if (isPolling) return;
  isPolling = true;
  fetchLogs(); // initial
  const interval = setInterval(fetchLogs, 5000);
  // No cleanup for simplicity in this context
}

export const AutomationLogger = {
  getLogs: (): AutomationLog[] => {
    if (!isPolling) startPolling();
    return logsCache;
  },

  addLog: async (log: Omit<AutomationLog, 'id' | 'timestamp'>) => {
    const newLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString()
    };
    logsCache = [newLog, ...logsCache].slice(0, 100);
    notify();
    
    try {
      await supabase.from('automation_logs').insert([{
        automation_id: log.automationId,
        target_id: log.targetId,
        target_name: log.targetName,
        action: log.action,
        result: log.result,
        duration_ms: log.durationMs,
        error: log.error
      }]);
    } catch (e) {
      console.error("[AutomationLogger] Insert error:", e);
    }
  },

  subscribe: (fn: () => void) => {
    listeners.push(fn);
    if (!isPolling) startPolling();
    return () => { listeners = listeners.filter(l => l !== fn); };
  },

  clearLogs: async () => {
    logsCache = [];
    notify();
    await supabase.from('automation_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }
};