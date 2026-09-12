"use client";

import { toast } from "sonner";
import { AutomationLogger } from "./automation-logger";
import { type AutomationExtended, type AutomationEvent } from "./automation-types";

export class AutomationEngine {
  private static instance: AutomationEngine;
  
  private constructor() {}

  public static getInstance(): AutomationEngine {
    if (!AutomationEngine.instance) {
      AutomationEngine.instance = new AutomationEngine();
    }
    return AutomationEngine.instance;
  }

  public async processEvent(
    event: AutomationEvent, 
    payload: any, 
    automations: AutomationExtended[],
    dataActions: { addLead?: any; updateLead?: any; addTask?: any; trackRun?: (id: number) => void }
  ) {
    const startTime = Date.now();
    console.log(`[Engine] Processando evento: ${event} para ${payload.name || payload.company}`);
    
    const relevant = automations.filter(a => a.active && a.triggerEvent === event);
    if (relevant.length === 0) return;

    for (const automation of relevant) {
      try {
        if (automation.conditions && !automation.conditions(payload)) continue;

        let actionDesc = "";
        
        switch (automation.actionType) {
          case 'create_task':
            if (dataActions.addTask && automation.actionConfig?.title) {
              dataActions.addTask({
                title: automation.actionConfig.title,
                lead: payload.company || payload.name || "Lead do Workflow",
                owners: [payload.owner || "Admin"],
                due: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                priority: automation.priority === 'urgente' ? 'urgente' : 'media',
                done: false,
                subtasks: []
              });
              actionDesc = `Tarefa Criada: ${automation.actionConfig.title}`;
            }
            break;

          case 'move_lead':
            if (dataActions.updateLead && automation.actionConfig?.pipelineId) {
              await dataActions.updateLead(payload.id, { 
                pipelineId: automation.actionConfig.pipelineId,
                stage: automation.actionConfig.stage || "Leads",
                prevScore: payload.score
              });
              actionDesc = `Handoff: Movido para Funil ${automation.actionConfig.pipelineId}`;
              toast.info(`Handoff concluído: ${payload.company} agora está na Operação.`);
            }
            break;

          case 'add_note':
            if (dataActions.updateLead && automation.actionConfig?.text) {
              const note = {
                id: `act-${Date.now()}`,
                type: 'note' as const,
                description: `[ROBÔ] ${automation.name}: ${automation.actionConfig.text}`,
                timestamp: new Date().toLocaleString('pt-BR'),
                user: 'Comet Automation'
              };
              dataActions.updateLead(payload.id, { 
                activities: [note, ...(payload.activities || [])] 
              });
              actionDesc = "Anotação de Histórico Adicionada";
            }
            break;

          case 'notify':
            if (automation.actionConfig?.message) {
              toast(automation.name, {
                description: automation.actionConfig.message,
                icon: automation.priority === 'urgente' ? '🚨' : '🤖'
              });
              actionDesc = "Notificação Toast disparada";
            }
            break;

          case 'update_score':
             if (dataActions.updateLead && automation.actionConfig?.points) {
               const newScore = Math.min(100, Math.max(0, (payload.score || 0) + (automation.actionConfig.points || 0)));
               dataActions.updateLead(payload.id, { score: newScore });
               actionDesc = `Score ajustado em ${automation.actionConfig.points} pts`;
             }
             break;
        }

        if (actionDesc) {
          if (dataActions.trackRun) dataActions.trackRun(automation.id);
          AutomationLogger.addLog({
            automationId: automation.id,
            targetId: payload.id || "N/A",
            targetName: payload.company || payload.name || "Global",
            action: actionDesc,
            result: 'sucesso',
            durationMs: Date.now() - startTime
          });
        }

      } catch (error: any) {
        AutomationLogger.addLog({ automationId: automation.id, targetId: payload.id || "N/A", targetName: payload.company || "Global", action: automation.actionType, result: 'falha', durationMs: Date.now() - startTime, error: error.message });
      }
    }
  }
}