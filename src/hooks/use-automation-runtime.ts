"use client";

import { useEffect, useRef, useMemo } from "react";
import { useData } from "./use-data";
import { AutomationEngine } from "@/lib/automation-engine";
import { calculateSLA } from "@/lib/sla";
import { type AutomationExtended } from "@/lib/automation-types";

export function useAutomationRuntime() {
  const { leads, addLead, updateLead, addTask, automations, updateAutomation, initialized } = useData();
  const engine = AutomationEngine.getInstance();
  
  const isReady = useRef(false);
  const prevLeadsStages = useRef<Record<string, string>>({});
  const prevSlaStatus = useRef<Record<string, string>>({});

  // Regras de Handoff Predefinidas do Sistema (Hardcoded Logic)
  const handoffAutomations: AutomationExtended[] = [
    {
      id: 9991,
      name: "Handoff: Venda -> Operação",
      category: 'SLA',
      triggerEvent: 'lead.stage_changed',
      priority: 'alta',
      active: true,
      conditions: (l) => l.stage === "Ganho",
      actionType: 'move_lead',
      actionConfig: { pipelineId: "execution", stage: "Onboarding" }
    },
    {
      id: 9992,
      name: "Handoff: Entrega -> Pós-Venda",
      category: 'SLA',
      triggerEvent: 'lead.stage_changed',
      priority: 'media',
      active: true,
      conditions: (l) => l.stage === "Entrega Final",
      actionType: 'move_lead',
      actionConfig: { pipelineId: "cs", stage: "Acompanhamento" }
    }
  ];

  const activeAutomations = useMemo(() => {
    const dynamic = automations.map(a => ({
      ...a,
      triggerEvent: a.triggerEvent as any,
      priority: (a.priority || 'media') as any,
      actionType: a.actionType as any,
      actionConfig: a.actionConfig
    } as AutomationExtended));

    return [...handoffAutomations, ...dynamic];
  }, [automations]);

  useEffect(() => {
    if (!initialized) return;

    if (!isReady.current) {
      leads.forEach(l => {
        prevLeadsStages.current[l.id] = l.stage;
        prevSlaStatus.current[l.id] = l.sla;
      });
      isReady.current = true;
      return;
    }

    const dataActions = { 
      addLead, 
      updateLead, 
      addTask,
      trackRun: (id: number) => {
        const aut = automations.find(a => a.id === id);
        if (aut) updateAutomation(id, { runs: (aut.runs || 0) + 1 });
      }
    };

    leads.forEach(l => {
      const oldStage = prevLeadsStages.current[l.id];
      if (oldStage && oldStage !== l.stage) {
        engine.processEvent('lead.stage_changed', l, activeAutomations, dataActions);
      }
      prevLeadsStages.current[l.id] = l.stage;
    });

  }, [leads, initialized, activeAutomations]);

  useEffect(() => {
    if (!initialized) return;
    const heartbeat = setInterval(() => {
      if (!isReady.current) return;
      leads.forEach(l => {
        const currentSla = calculateSLA(l.lastInteraction);
        const oldSla = prevSlaStatus.current[l.id];
        if (currentSla !== oldSla && (currentSla === 'critico' || currentSla === 'vencido')) {
          engine.processEvent('lead.sla_breach', l, activeAutomations, { addLead, updateLead, addTask });
        }
        prevSlaStatus.current[l.id] = currentSla;
      });
    }, 30000);
    return () => clearInterval(heartbeat);
  }, [leads, initialized, activeAutomations]);
}