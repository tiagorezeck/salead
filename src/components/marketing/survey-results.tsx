"use client";

import React, { useMemo, useState } from 'react';
import { 
  BarChart3, Users, TrendingUp, MessageSquare, PieChart, 
  ArrowLeft, Calendar, Clock, User, ChevronRight, Download,
  Search, Filter, Mail, Phone
} from "lucide-react";
import { useData, type Survey, type SurveyResponse } from "@/hooks/use-data";
import { cn, formatPhone } from "@/lib/utils";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RePie, Pie, Cell 
} from 'recharts';

interface SurveyResultsProps {
  survey: Survey;
  onBack: () => void;
}

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#eab308'];

export function SurveyResults({ survey, onBack }: SurveyResultsProps) {
  const { surveyResponses, leads } = useData();
  const [view, setView] = useState<'stats' | 'responses'>('stats');
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);

  const responses = useMemo(() => 
    surveyResponses.filter(r => 
      r.surveyId === survey.id || 
      (r as any).survey_id === survey.id ||
      (r as any).survey_name === survey.name ||
      (r as any).surveyTitle === survey.name ||
      ((survey as any).slug && (r.surveyId === (survey as any).slug || (r as any).survey_id === (survey as any).slug))
    ),
    [surveyResponses, survey.id, survey.name, (survey as any).slug]
  );

  const stats = useMemo(() => {
    return survey.questions.map(q => {
      const data: any[] = [];
      if (['single', 'multiple', 'dropdown', 'boolean', 'satisfaction'].includes(q.type)) {
        const counts: Record<string, number> = {};
        responses.forEach(r => {
          const ans = r.answers[q.id];
          if (Array.isArray(ans)) {
            ans.forEach(v => counts[v] = (counts[v] || 0) + 1);
          } else if (ans) {
            counts[ans] = (counts[ans] || 0) + 1;
          }
        });
        Object.entries(counts).forEach(([name, value]) => data.push({ name, value }));
      }
      return { ...q, data };
    });
  }, [survey.questions, responses]);

  const selectedResponse = useMemo(() => 
    responses.find(r => r.id === selectedResponseId),
    [responses, selectedResponseId]
  );

  const respondentLead = useMemo(() => {
    if (!selectedResponse) return null;
    const rLeadId = selectedResponse.leadId || (selectedResponse as any).lead_id;
    const rEmail = selectedResponse.leadEmail ? selectedResponse.leadEmail.trim().toLowerCase() : "";
    const rPhone = selectedResponse.leadWhatsapp ? selectedResponse.leadWhatsapp.replace(/\D/g, "") : "";

    return leads.find(l => 
      (rLeadId && l.id === rLeadId) ||
      (rEmail && l.email && l.email.trim().toLowerCase() === rEmail) ||
      (rPhone && l.whatsapp && l.whatsapp.replace(/\D/g, "") === rPhone)
    );
  }, [leads, selectedResponse]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-muted rounded-xl transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-primary font-black">Relatórios de Pesquisa</div>
            <h2 className="font-display text-3xl font-bold mt-1">{survey.name}</h2>
          </div>
        </div>
        <div className="flex bg-muted p-1 rounded-xl border border-border">
          <button 
            onClick={() => setView('stats')}
            className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2", view === 'stats' ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}
          >
            <BarChart3 className="h-4 w-4" /> ESTATÍSTICAS
          </button>
          <button 
            onClick={() => setView('responses')}
            className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2", view === 'responses' ? "bg-background shadow-sm text-primary" : "text-muted-foreground")}
          >
            <Users className="h-4 w-4" /> RESPOSTAS
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Kpi label="Total Respostas" value={responses.length.toString()} icon={MessageSquare} />
        <Kpi label="Taxa de Conclusão" value={`${((responses.length / Math.max(survey.visits, 1)) * 100).toFixed(1)}%`} icon={TrendingUp} />
        <Kpi label="Tempo Médio" value="2m 14s" icon={Clock} />
        <Kpi label="Última Resposta" value={responses.length > 0 ? "Hoje" : "-"} icon={Calendar} />
      </div>

      {view === 'stats' ? (
        <div className="grid gap-6">
          {stats.map((q, i) => (
            <div key={q.id} className="p-8 rounded-[2rem] bg-card border border-border shadow-card space-y-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-primary uppercase tracking-widest">Pergunta #{i + 1}</span>
                  <h3 className="font-display text-xl font-bold">{q.question}</h3>
                </div>
              </div>

              {q.data.length > 0 ? (
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={q.data} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={120} fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '12px' }} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {q.data.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {q.data.map((d, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                        <div className="flex items-center gap-3">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="text-xs font-bold">{d.name}</span>
                        </div>
                        <span className="text-xs font-black text-primary">{d.value} ({((d.value / responses.length) * 100).toFixed(0)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-muted/20 border border-dashed border-border text-center italic text-sm text-muted-foreground">
                  Respostas de texto livre. Visualize os detalhes na aba "Respostas".
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid lg:grid-cols-[400px_1fr] gap-8 items-start">
          <div className="bg-card border border-border rounded-[2rem] shadow-card overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input placeholder="Buscar respondente..." className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-xs outline-none" />
              </div>
            </div>
            <div className="max-h-[600px] overflow-y-auto divide-y divide-border">
              {responses.map(r => {
                const lead = leads.find(l => l.id === r.leadId);
                const leadName = lead?.name || "Usuário Anônimo";
                const initials = leadName.split(" ").map((n: string) => n[0]).join("").toUpperCase();

                return (
                  <button 
                    key={r.id}
                    onClick={() => setSelectedResponseId(r.id)}
                    className={cn(
                      "w-full text-left p-4 flex items-center gap-4 transition-all hover:bg-muted/50",
                      selectedResponseId === r.id ? "bg-primary/5 border-l-4 border-primary" : "border-l-4 border-transparent"
                    )}
                  >
                    <div className="h-10 w-10 rounded-full bg-gradient-primary grid place-items-center text-[10px] font-bold text-white shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{leadName}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{new Date(r.completedAt || Date.now()).toLocaleDateString('pt-BR')}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>

          {selectedResponse ? (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              <div className="p-8 rounded-[2rem] bg-gradient-surface border border-border shadow-card space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary grid place-items-center">
                      <User className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="font-display text-2xl font-bold">{respondentLead?.name || "Respondente"}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="h-3.5 w-3.5" /> {respondentLead?.email}</div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3.5 w-3.5" /> {respondentLead?.whatsapp}</div>
                      </div>
                    </div>
                  </div>
                  <button className="px-4 py-2 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all flex items-center gap-2">
                    <Download className="h-3.5 w-3.5" /> EXPORTAR PDF
                  </button>
                </div>

                <div className="grid gap-4 pt-6 border-t border-border">
                  {survey.questions.map((q, i) => (
                    <div key={q.id} className="p-5 rounded-2xl bg-muted/30 border border-border space-y-2">
                      <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Pergunta {i + 1}</div>
                      <div className="font-bold text-sm">{q.question}</div>
                      <div className="pt-2 text-primary font-medium">
                        {Array.isArray(selectedResponse.answers[q.id]) 
                          ? selectedResponse.answers[q.id].join(", ") 
                          : selectedResponse.answers[q.id] || <span className="italic opacity-40">Não respondida</span>
                        }
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-[2rem] text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-20" />
              <p>Selecione um respondente para ver o detalhamento individual.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, icon: Icon }: any) {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex items-center gap-4">
      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{label}</div>
        <div className="font-display text-xl font-bold">{value}</div>
      </div>
    </div>
  );
}