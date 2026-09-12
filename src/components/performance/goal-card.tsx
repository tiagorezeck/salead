"use client";

import React, { useMemo } from 'react';
import { type User, type ExtendedLead, type Task } from '@/hooks/use-data';
import { formatCurrency, cn } from '@/lib/utils';
import { CheckCircle2, Timer, Target, TrendingUp, DollarSign, Activity, Award, Star, Hash, Clock, Percent, AlertCircle } from 'lucide-react';
import { isWithinInterval } from 'date-fns';

interface GoalCardProps {
  user: User;
  leads: ExtendedLead[];
  tasks: Task[];
  dateRange: { from: Date; to: Date };
}

const ICON_MAP: Record<string, any> = {
  money: DollarSign,
  conversion: Percent,
  loss: TrendingDown,
  ticket_count: Hash,
  avg_ticket: Target,
  sla_min: Clock
};

export function GoalCard({ user, leads, tasks, dateRange }: GoalCardProps) {
  // Filtra dados do usuário no período
  const userLeads = leads.filter(l => 
    l.owner === user.name && 
    isWithinInterval(new Date(l.createdAt), { start: dateRange.from, end: dateRange.to })
  );
  
  const wonLeads = userLeads.filter(l => l.stage === "Ganho" || l.stage === "Recebimento");

  // Processa cada meta e calcula o atingimento
  const processedGoals = useMemo(() => {
    const goals = user.goals || [];
    const opGoals = user.operationalGoals || [];
    const totalMetas = goals.length + opGoals.length;
    
    if (totalMetas === 0) return { list: [], score: 0, pointsPerGoal: 0 };

    const pointsPerGoal = 10 / totalMetas;
    let totalScore = 0;

    const list = [
      ...goals.map(g => {
        let achieved = 0;
        let isHit = false;

        if (g.type === 'money') {
          achieved = wonLeads.reduce((acc, curr) => acc + curr.value, 0);
          isHit = achieved >= g.target;
        } else if (g.type === 'conversion') {
          achieved = userLeads.length > 0 ? (wonLeads.length / userLeads.length) * 100 : 0;
          isHit = achieved >= g.target;
        } else if (g.type === 'loss') {
          const lostCount = userLeads.filter(l => l.stage === "Perdido").length;
          achieved = userLeads.length > 0 ? (lostCount / userLeads.length) * 100 : 0;
          isHit = achieved <= g.target; // Perda é batida se for MENOR que o alvo
        } else if (g.type === 'ticket_count') {
          achieved = wonLeads.length;
          isHit = achieved >= g.target;
        } else if (g.type === 'avg_ticket') {
          achieved = wonLeads.length > 0 ? (wonLeads.reduce((acc, curr) => acc + curr.value, 0) / wonLeads.length) : 0;
          isHit = achieved >= g.target;
        }

        if (isHit) totalScore += pointsPerGoal;

        return {
          id: g.id,
          type: g.type,
          label: g.label,
          target: g.target,
          achieved,
          isHit,
          unit: g.unit,
          points: pointsPerGoal
        };
      }),
      ...opGoals.map(og => {
        if (og.completed) totalScore += pointsPerGoal;
        return {
          id: og.id,
          type: 'operational',
          label: og.label,
          target: "Sim",
          achieved: og.completed ? "Sim" : "Não",
          isHit: og.completed,
          unit: 'boolean',
          points: pointsPerGoal
        };
      })
    ];

    return { list, score: totalScore, pointsPerGoal };
  }, [user, userLeads, wonLeads]);

  const displayScore = processedGoals.score.toFixed(1);

  return (
    <div className="bg-card border border-border rounded-[3rem] p-8 md:p-12 shadow-2xl max-w-4xl mx-auto relative overflow-hidden group">
      {/* Background Decor */}
      <div className="absolute -right-10 -top-10 opacity-5 group-hover:opacity-10 transition-opacity">
        <Award className="h-64 w-64" />
      </div>

      <div className="flex flex-col md:flex-row items-center gap-8 mb-12 border-b border-border pb-12">
        <div className="relative">
          <div className="h-32 w-32 rounded-full bg-gradient-primary overflow-hidden border-4 border-background shadow-xl">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-black text-3xl text-white">{user.avatar}</div>
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-primary text-white border-4 border-background flex items-center justify-center shadow-lg">
             <span className="text-sm font-black">{processedGoals.list.length}</span>
          </div>
        </div>
        <div className="text-center md:text-left flex-1">
          <h2 className="font-display font-black text-3xl md:text-4xl tracking-tight">{user.name}</h2>
          <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-3">
            <span className="text-[11px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-widest">{user.role}</span>
            <span className="text-[11px] font-black bg-muted text-muted-foreground px-3 py-1 rounded-full uppercase tracking-widest">Placar de Metas</span>
          </div>
        </div>

        <div className="flex flex-col items-center md:items-end">
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] mb-2">SCORE DE ENTREGA</div>
          <div className="flex items-center gap-6">
            <div className="text-right">
               <div className="font-display font-black text-6xl text-primary leading-none">{displayScore}</div>
               <div className="text-sm font-bold text-muted-foreground mt-1">de 10.0 pts</div>
            </div>
            <div className="h-20 w-20 rounded-full border-8 border-muted relative flex items-center justify-center">
                <svg className="absolute inset-0 h-full w-full -rotate-90">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" strokeWidth="8" className="text-primary opacity-10" />
                    <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" strokeWidth="8" strokeDasharray={201} strokeDashoffset={201 - (201 * (processedGoals.score / 10))} className="text-primary transition-all duration-1000" />
                </svg>
                <Star className={cn("h-7 w-7", processedGoals.score >= 9 ? "text-primary animate-pulse" : "text-muted-foreground/20")} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-x-12 gap-y-6">
        <div className="space-y-4">
          <div className="text-xs font-black text-primary uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4" /> Métricas de Performance
          </div>
          {processedGoals.list.filter(g => g.type !== 'operational').map((item) => {
            const Icon = ICON_MAP[item.type] || Target;
            return (
              <div key={item.id} className={cn(
                "p-5 rounded-3xl border transition-all flex items-center justify-between group/row",
                item.isHit ? "bg-success/5 border-success/20" : "bg-muted/30 border-border"
              )}>
                <div className="flex items-center gap-4">
                  <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center", item.isHit ? "bg-success text-white" : "bg-muted text-muted-foreground")}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-black">{item.label}</div>
                    <div className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">
                      Meta: <span className="text-foreground">{formatValue(item.target, item.unit)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn("text-lg font-black", item.isHit ? "text-success" : "text-warning")}>
                    {formatValue(item.achieved, item.unit)}
                  </div>
                  <div className="text-[9px] font-black text-muted-foreground uppercase">
                    {item.isHit ? `+${item.points.toFixed(1)} pts` : "Pendente"}
                  </div>
                </div>
              </div>
            );
          })}
          {processedGoals.list.filter(g => g.type !== 'operational').length === 0 && (
            <div className="py-10 text-center border-2 border-dashed border-border rounded-[2rem] text-muted-foreground text-[10px] font-black uppercase">
              Nenhuma métrica de valor ativa
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4" /> Metas Operacionais
          </div>
          {processedGoals.list.filter(g => g.type === 'operational').map((item) => (
            <div key={item.id} className={cn(
              "p-5 rounded-3xl border transition-all flex items-center justify-between",
              item.isHit ? "bg-info/5 border-info/20" : "bg-muted/30 border-border"
            )}>
              <div className="flex items-center gap-4">
                <div className={cn("h-6 w-6 rounded-lg flex items-center justify-center border-2", item.isHit ? "bg-info border-info text-white" : "bg-background border-border text-transparent")}>
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="text-sm font-bold">{item.label}</div>
              </div>
              <div className="text-right">
                <div className={cn("text-[10px] font-black px-2 py-1 rounded-full", item.isHit ? "bg-info/10 text-info" : "bg-muted text-muted-foreground")}>
                   {item.isHit ? `+${item.points.toFixed(1)} PTS` : "0 PTS"}
                </div>
              </div>
            </div>
          ))}
          {processedGoals.list.filter(g => g.type === 'operational').length === 0 && (
            <div className="py-10 text-center border-2 border-dashed border-border rounded-[2rem] text-muted-foreground text-[10px] font-black uppercase">
              Nenhuma meta operacional
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Sincronizado com CRM em tempo real</span>
        </div>
        {processedGoals.score >= 10 ? (
          <div className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest italic">
            <Award className="h-5 w-5" /> PERFORMANCE PERFEITA (100%)
          </div>
        ) : (
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            {((processedGoals.score / 10) * 100).toFixed(0)}% do objetivo alcançado
          </div>
        )}
      </div>
    </div>
  );
}

function formatValue(val: any, unit: any) {
  if (typeof val === 'string') return val;
  if (unit === 'currency') return formatCurrency(val);
  if (unit === 'percent') return `${Math.round(val)}%`;
  if (unit === 'minutes') return `${val}min`;
  return val;
}

function TrendingDown(props: any) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>
    )
}