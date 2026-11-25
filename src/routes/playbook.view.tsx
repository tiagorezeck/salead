"use client";

import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useData } from "@/hooks/use-data";
import { 
  BookOpen, ShieldAlert, MessageSquare, Zap, Search, X, 
  CheckCircle2, Circle, Target, Flag, AlertTriangle, 
  FileDown, Save, User, Users, ChevronRight, Play, Check, Timer, FileCheck, Sparkles, Layers,
  RotateCcw, FileText, Plus, Eye
} from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { type Playbook, type Lead, type CopilotInterviewDocument } from "@/data/mock";
import { calculateMinQualification, getMinClassificationBadge } from "@/lib/min-qualification";
import { toast } from "sonner";

export const Route = createFileRoute("/playbook/view")({ 
  component: PlaybookCopilotPage,
  validateSearch: (search: Record<string, unknown>) => ({
    leadId: (search.leadId as string) || undefined,
  }),
});

function PlaybookCopilotPage() {
  const { leadId } = useSearch({ from: "/playbook/view" });
  const { playbooks, leads, updateLead, initialized, surveys = [], surveysResponses = [], currentUser } = useData();
  
  const [selectedPBId, setSelectedPBId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leadId || null);
  const [sessionActive, setSessionActive] = useState(false);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  
  // Estados da Sessão
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (leadId) {
      setSelectedLeadId(leadId);
    }
  }, [leadId]);

  const currentLead = useMemo(() => leads.find(l => l.id === selectedLeadId), [leads, selectedLeadId]);
  const currentPB = useMemo(() => playbooks.find(p => p.id === selectedPBId) || playbooks[0], [playbooks, selectedPBId]);

  const leadCopilotDocs = useMemo<CopilotInterviewDocument[]>(() => {
    if (!currentLead) return [];
    const docs = Array.isArray(currentLead.copilotDocuments)
      ? currentLead.copilotDocuments
      : Array.isArray(currentLead.metadata?.copilotDocuments)
      ? currentLead.metadata.copilotDocuments
      : [];
    return [...docs].sort((a, b) => (Number(b.interviewNumber) || 0) - (Number(a.interviewNumber) || 0));
  }, [currentLead]);

  const leadMinBadge = useMemo(() => {
    if (!currentLead) return null;
    let minQual = currentLead.minQualification;
    if (!minQual && currentLead.minScore && currentLead.minScore !== "Nenhum") {
      const m = currentLead.minScore.includes("M") ? 1 : 0;
      const i = currentLead.minScore.includes("I") ? 1 : 0;
      const n = currentLead.minScore.includes("N") ? 1 : 0;
      minQual = calculateMinQualification(m, i, n);
    }
    if (!minQual) return null;
    return getMinClassificationBadge(minQual);
  }, [currentLead]);

  const currentLeadSurveys = useMemo(() => {
    if (!currentLead) return [];
    return surveysResponses.filter(
      (r: any) =>
        r.leadId === currentLead.id ||
        r.lead_id === currentLead.id ||
        r.answers?.leadId === currentLead.id ||
        (r.answers?.email && currentLead.email && String(r.answers.email).toLowerCase() === String(currentLead.email).toLowerCase())
    );
  }, [surveysResponses, currentLead]);

  if (!initialized) return <div className="p-8 text-center text-primary font-black animate-pulse">Iniciando Copiloto...</div>;

  const resetQuestionnaire = (activateSession = false) => {
    setChecklist({});
    setAnswers({});
    setFlags({});
    setNotes("");
    setViewingDocId(null);
    if (activateSession) {
      setSessionActive(true);
    }
    toast.success("Questionário zerado para nova entrevista! Os documentos anteriores permanecem salvos.");
  };

  const startSession = () => {
    if (!selectedLeadId) return toast.error("Selecione um lead para iniciar.");
    setChecklist({});
    setAnswers({});
    setFlags({});
    setNotes("");
    setViewingDocId(null);
    setSessionActive(true);
    toast.success(`Entrevista #${leadCopilotDocs.length + 1} iniciada! Siga o roteiro.`);
  };

  const loadDocumentIntoView = (doc: CopilotInterviewDocument) => {
    if (doc.playbookId) {
      setSelectedPBId(doc.playbookId);
    }
    setChecklist(doc.checklist || {});
    setAnswers(doc.answers || {});
    const restoredFlags: Record<string, boolean> = {};
    (doc.greenFlags || []).forEach((f) => { restoredFlags[f.id] = true; });
    (doc.redFlags || []).forEach((f) => { restoredFlags[f.id] = true; });
    setFlags(restoredFlags);
    setNotes(doc.notes || "");
    setViewingDocId(doc.id);
    setSessionActive(false);
    toast.info(`Visualizando ${doc.title}`);
  };

  const handleFinish = async () => {
    if (!currentLead) return;

    const existingDocs: CopilotInterviewDocument[] = Array.isArray(currentLead.copilotDocuments)
      ? currentLead.copilotDocuments
      : Array.isArray(currentLead.metadata?.copilotDocuments)
      ? currentLead.metadata.copilotDocuments
      : [];

    const nextInterviewNumber =
      existingDocs.reduce((maxN, d) => Math.max(maxN, Number(d.interviewNumber) || 0), 0) + 1;

    // Gerar Resumo para o Histórico
    const summary = `
QUALIFICAÇÃO EXECUTIVA: ${currentPB.title} (Entrevista #${nextInterviewNumber})
----------------------------------------
CHECKLIST: ${Object.values(checklist).filter(v => v).length}/${currentPB.initialChecklist.length} concluídos.
RESPOSTAS:
${currentPB.mandatoryQuestions.map(q => `- ${q.text}: ${answers[q.id] || "N/A"}`).join('\n')}

FLAGS DETECTADAS:
- Green: ${currentPB.greenFlags.filter(f => flags[f.id]).map(f => f.text).join(', ') || 'Nenhuma'}
- Red: ${currentPB.redFlags.filter(f => flags[f.id]).map(f => f.text).join(', ') || 'Nenhuma'}

NOTAS ADICIONAIS:
${notes || 'Sem observações.'}
    `;

    const nowIso = new Date().toISOString();
    const newDoc: CopilotInterviewDocument = {
      id: `doc_copilot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      interviewNumber: nextInterviewNumber,
      title: `Entrevista #${nextInterviewNumber} — ${currentPB.title}`,
      playbookId: currentPB.id,
      playbookTitle: currentPB.title,
      createdAt: nowIso,
      interviewer: currentUser?.name || "Copiloto de Vendas",
      leadId: currentLead.id,
      leadName: currentLead.name,
      leadCompany: currentLead.company,
      checklist: { ...checklist },
      checklistLabels: currentPB.initialChecklist.map((item) => ({
        id: item.id,
        text: item.text,
        done: Boolean(checklist[item.id]),
      })),
      mandatoryQuestions: currentPB.mandatoryQuestions.map((q) => ({
        id: q.id,
        text: q.text,
        answer: answers[q.id] || "",
      })),
      answers: { ...answers },
      greenFlags: currentPB.greenFlags
        .filter((f) => flags[f.id])
        .map((f) => ({ id: f.id, text: f.text })),
      redFlags: currentPB.redFlags
        .filter((f) => flags[f.id])
        .map((f) => ({ id: f.id, text: f.text })),
      notes: notes || "",
      nextAction: currentPB.nextAction,
      summary,
    };

    const nextDocs = [newDoc, ...existingDocs];

    const newActivity = {
      id: `qual-${Date.now()}`,
      type: 'note' as const,
      description: `[COPILOTO] Entrevista #${nextInterviewNumber} Finalizada: ${currentPB.title}\n\n${summary}`,
      timestamp: new Date().toLocaleString('pt-BR'),
      user: currentUser?.name || 'Copiloto de Vendas'
    };

    await updateLead(currentLead.id, { 
      copilotDocuments: nextDocs,
      metadata: {
        ...(currentLead.metadata || {}),
        copilotDocuments: nextDocs,
      },
      activities: [newActivity, ...(currentLead.activities || [])] 
    });

    toast.success(`Entrevista #${nextInterviewNumber} salva no cadastro do lead e no Copiloto!`);
    setSessionActive(false);
    setViewingDocId(newDoc.id);
    generatePDF();
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;
    toast.loading("Gerando documento PDF...");
    
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(reportRef.current);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Qualificacao_${currentLead?.company.replace(/\s/g, '_')}_${Date.now()}.pdf`);
      toast.dismiss();
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      toast.dismiss();
      toast.error("Erro ao gerar PDF.");
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col font-sans">
      <header className="h-16 border-b border-white/10 bg-black/40 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary grid place-items-center shadow-elegant">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-display font-black text-sm tracking-tight">COMET COPILOT</div>
            <div className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground">Sales Execution Engine</div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {!sessionActive ? (
            <>
              <div className="relative group">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                <select 
                  value={selectedLeadId || ""} 
                  onChange={(e) => {
                    setSelectedLeadId(e.target.value);
                    setViewingDocId(null);
                  }}
                  className="pl-9 pr-8 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold focus:outline-none focus:border-primary/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled className="bg-[#121214]">Selecionar Lead...</option>
                  {leads.map(l => <option key={l.id} value={l.id} className="bg-[#121214]">{l.company ? `${l.company} (${l.name})` : l.name}</option>)}
                </select>
              </div>
              <button
                type="button"
                onClick={() => resetQuestionnaire(false)}
                className="px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer"
                title="Zera os campos para preencher nova entrevista sem apagar as entrevistas salvas"
              >
                <RotateCcw className="h-3.5 w-3.5 text-amber-400" /> Zerar Questionário
              </button>
              <button 
                type="button"
                onClick={startSession}
                className="px-6 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-elegant hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Play className="h-3.5 w-3.5" /> Iniciar Entrevista #{leadCopilotDocs.length + 1}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2.5 flex-wrap">
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 border border-success/30 text-success animate-pulse">
                  <div className="h-1.5 w-1.5 rounded-full bg-success" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Entrevista #{leadCopilotDocs.length + 1}: {currentLead?.company || currentLead?.name}</span>
               </div>
               <button
                type="button"
                onClick={() => resetQuestionnaire(true)}
                className="px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer"
                title="Limpar respostas atuais para recomeçar o questionário sem apagar entrevistas anteriores"
              >
                <RotateCcw className="h-3.5 w-3.5 text-amber-400" /> Zerar Questionário
              </button>
               <button 
                type="button"
                onClick={handleFinish}
                className="px-6 py-2 rounded-xl bg-success text-white text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Check className="h-4 w-4" /> Finalizar e Salvar no Lead
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Navegação de Scripts */}
        <aside className="w-72 border-r border-white/10 overflow-y-auto p-4 space-y-6 bg-black/20">
          <div className="space-y-1">
            <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-3 mb-3">Qualificações Disponíveis</div>
            {playbooks.map(pb => (
              <button 
                key={pb.id}
                disabled={sessionActive}
                onClick={() => setSelectedPBId(pb.id)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl transition-all border group",
                  selectedPBId === pb.id ? "bg-primary border-primary text-white shadow-elegant" : "bg-white/5 border-transparent text-muted-foreground hover:bg-white/10",
                  sessionActive && selectedPBId !== pb.id && "opacity-30"
                )}
              >
                <div className="text-[8px] font-black uppercase opacity-60 group-hover:opacity-100">{pb.category}</div>
                <div className="text-xs font-bold mt-1 truncate">{pb.title}</div>
              </button>
            ))}
          </div>
        </aside>

        {/* Console do Copiloto */}
        <main className="flex-1 overflow-y-auto p-8 lg:p-12 scrollbar-thin relative">
          <div className="max-w-5xl mx-auto space-y-12">
            
            {/* Header do Script */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                 <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/30">
                  {currentPB.specialty}
                 </span>
                 <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                   <Timer className="h-3 w-3" /> Tempo Sugerido: {currentPB.avgDuration}
                 </span>
              </div>
              <h1 className="font-display text-4xl font-black tracking-tight">{currentPB.title}</h1>
              <p className="text-lg text-muted-foreground leading-relaxed italic border-l-4 border-primary/40 pl-6">
                "{currentPB.objective}"
              </p>
            </div>

            {/* PAINEL DE QUALIFICAÇÃO MIN & PESQUISAS DO LEAD SELECIONADO */}
            {currentLead && (
              <section className="p-6 rounded-[2rem] bg-gradient-to-r from-purple-950/40 via-black/40 to-white/5 border border-purple-500/30 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-purple-400">
                        Lead Selecionado
                      </div>
                      <div className="text-lg font-black text-white flex items-center gap-2">
                        <span>{currentLead.name}</span>
                        {currentLead.company && <span className="text-muted-foreground font-normal text-sm">({currentLead.company})</span>}
                      </div>
                    </div>
                  </div>

                  {/* Badge MIN */}
                  {leadMinBadge && (
                    <div className={cn("px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-black uppercase shadow-sm", leadMinBadge.bg, leadMinBadge.text, leadMinBadge.border)}>
                      <span>{leadMinBadge.emoji}</span>
                      <span>Qualificação MIN: {leadMinBadge.label}</span>
                      <span className="text-[10px] opacity-80">({leadMinBadge.scoreText})</span>
                    </div>
                  )}
                </div>

                {/* Entrevistas / Formulários Salvos do Lead (Copiloto) */}
                <div className="pt-3 border-t border-white/10 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-emerald-400" />
                      <span>Formulários &amp; Entrevistas Salvas no Lead ({leadCopilotDocs.length})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => resetQuestionnaire(true)}
                      className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> Nova Entrevista #{leadCopilotDocs.length + 1}
                    </button>
                  </div>

                  {leadCopilotDocs.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-3">
                      {leadCopilotDocs.map((doc) => {
                        const isViewing = viewingDocId === doc.id;
                        const answeredCount = (doc.mandatoryQuestions || []).filter((q) => q.answer?.trim()).length;
                        return (
                          <div
                            key={doc.id}
                            className={cn(
                              "p-3.5 rounded-2xl border space-y-2 text-xs transition-all",
                              isViewing
                                ? "bg-emerald-500/15 border-emerald-400"
                                : "bg-black/50 border-white/10 hover:border-white/25"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-bold text-white">{doc.title}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  {new Date(doc.createdAt).toLocaleString("pt-BR")} · {doc.interviewer || "Copiloto"}
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-black shrink-0">
                                {answeredCount}/{doc.mandatoryQuestions?.length || 0} resp.
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-white/10">
                              <span className="text-[10px] text-muted-foreground">
                                {doc.greenFlags?.length || 0} Green · {doc.redFlags?.length || 0} Red
                              </span>
                              <button
                                type="button"
                                onClick={() => loadDocumentIntoView(doc)}
                                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="h-3 w-3" /> Abrir Entrevista
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground italic">
                      Nenhuma entrevista finalizada ainda. Ao finalizar uma entrevista, o formulário ficará salvo aqui e no cadastro do lead.
                    </div>
                  )}
                </div>

                {/* Respostas de Pesquisa do Lead */}
                {currentLeadSurveys.length > 0 ? (
                  <div className="pt-3 border-t border-white/10 space-y-3">
                    <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                      <FileCheck className="h-4 w-4 text-purple-400" />
                      <span>Respostas das Pesquisas Fornecidas na Landing Page ({currentLeadSurveys.length})</span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      {currentLeadSurveys.map((resp: any, idx: number) => {
                        const survey = surveys.find((s) => s.id === resp.survey_id || s.id === resp.surveyId);
                        const answersObj = resp.answers || {};
                        return (
                          <div key={resp.id || idx} className="p-3.5 rounded-2xl bg-black/50 border border-white/10 space-y-2 text-xs">
                            <div className="font-bold text-white flex items-center justify-between border-b border-white/10 pb-1.5">
                              <span>{survey?.title || survey?.name || "Pesquisa de Qualificação"}</span>
                              {resp.minClassification && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-500/20 text-purple-300">
                                  {resp.minClassification}
                                </span>
                              )}
                            </div>
                            <div className="space-y-1.5 pt-1">
                              {survey?.questions?.map((q: any, qIdx: number) => {
                                const qLabel = q.text || q.question || `Pergunta ${qIdx + 1}`;
                                const ans = answersObj[q.id] || answersObj[qLabel] || "Não informado";
                                return (
                                  <div key={q.id || qIdx} className="text-[11px]">
                                    <span className="text-muted-foreground block font-medium">{qLabel}:</span>
                                    <span className="font-bold text-purple-200">{String(ans)}</span>
                                  </div>
                                );
                              }) || (
                                Object.entries(answersObj).map(([k, v]) => (
                                  <div key={k} className="text-[11px]">
                                    <span className="text-muted-foreground">{k}:</span> <strong className="text-purple-200">{String(v)}</strong>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic pt-2 border-t border-white/10">
                    Nenhuma pesquisa de qualificação respondida na LP por este lead ainda.
                  </div>
                )}
              </section>
            )}

            {/* Checklist de Entrada */}
            <section className="space-y-6">
               <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-primary">
                  <CheckCircle2 className="h-4 w-4" /> Checklist Pré-Qualificação
               </div>
               <div className="grid sm:grid-cols-2 gap-3">
                  {currentPB.initialChecklist.map(item => (
                    <button 
                      key={item.id}
                      onClick={() => setChecklist(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-2xl border transition-all text-left group",
                        checklist[item.id] ? "bg-primary/10 border-primary/50 text-white" : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                      )}
                    >
                      <div className={cn("h-5 w-5 rounded-lg border-2 flex items-center justify-center transition-all", checklist[item.id] ? "bg-primary border-primary" : "border-white/20")}>
                        {checklist[item.id] && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <span className="text-xs font-bold">{item.text}</span>
                    </button>
                  ))}
               </div>
            </section>

            {/* Perguntas Interativas */}
            <section className="space-y-8">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-primary">
                    <MessageSquare className="h-4 w-4" /> Roteiro de Perguntas
                  </div>
                  <span className="text-[9px] font-black text-muted-foreground uppercase bg-white/5 px-2 py-1 rounded">Obrigatórias ({currentPB.mandatoryQuestions.length})</span>
               </div>
               <div className="space-y-4">
                  {currentPB.mandatoryQuestions.map((q, idx) => (
                    <div key={q.id} className="p-6 rounded-[2rem] bg-white/5 border border-white/5 space-y-4 group hover:border-primary/30 transition-all">
                      <div className="flex items-start gap-4">
                        <span className="h-8 w-8 rounded-xl bg-primary/10 text-primary grid place-items-center text-xs font-black shrink-0">{idx + 1}</span>
                        <div className="flex-1">
                          <label className="text-sm font-bold block mb-3">{q.text}</label>
                          <textarea 
                            value={answers[q.id] || ""}
                            onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                            placeholder="Registre a resposta do cliente..."
                            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 transition-all min-h-[80px] resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
               </div>
            </section>

            {/* Sinais e Alertas (Flags) */}
            <div className="grid md:grid-cols-2 gap-8">
               <section className="space-y-6">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-success">
                    <Flag className="h-4 w-4" /> Green Flags
                  </div>
                  <div className="grid gap-2">
                    {currentPB.greenFlags.map(f => (
                      <button 
                        key={f.id}
                        onClick={() => setFlags(prev => ({ ...prev, [f.id]: !prev[f.id] }))}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                          flags[f.id] ? "bg-success/20 border-success/50 text-white" : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                        )}
                      >
                        <span className="text-[11px] font-bold">{f.text}</span>
                        {flags[f.id] && <CheckCircle2 className="h-4 w-4 text-success" />}
                      </button>
                    ))}
                  </div>
               </section>

               <section className="space-y-6">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-destructive">
                    <AlertTriangle className="h-4 w-4" /> Red Flags
                  </div>
                  <div className="grid gap-2">
                    {currentPB.redFlags.map(f => (
                      <button 
                        key={f.id}
                        onClick={() => setFlags(prev => ({ ...prev, [f.id]: !prev[f.id] }))}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border transition-all text-left",
                          flags[f.id] ? "bg-destructive/20 border-destructive/50 text-white" : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                        )}
                      >
                        <span className="text-[11px] font-bold">{f.text}</span>
                        {flags[f.id] && <AlertTriangle className="h-4 w-4 text-destructive" />}
                      </button>
                    ))}
                  </div>
               </section>
            </div>

            {/* Objeções e Próximos Passos */}
            <div className="grid md:grid-cols-[1fr_350px] gap-8 pb-20">
               <section className="space-y-6">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-primary">
                    <ShieldAlert className="h-4 w-4" /> Contorno de Objeções Rápido
                  </div>
                  <div className="space-y-3">
                    {currentPB.commonObjections.map(obj => (
                      <div key={obj.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                        <div className="text-[9px] font-black text-primary uppercase">Objeção: "{obj.objection}"</div>
                        <div className="text-[11px] text-muted-foreground leading-relaxed italic">Resposta: {obj.response}</div>
                      </div>
                    ))}
                    {currentPB.commonObjections.length === 0 && <div className="text-xs text-muted-foreground opacity-50 italic">Nenhuma objeção mapeada para este roteiro.</div>}
                  </div>
               </section>

               <section className="bg-primary/5 border border-primary/20 rounded-[2rem] p-8 space-y-6">
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-primary">Direcionamento</div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block mb-2">Próxima Ação Recomentada</label>
                      <div className="text-sm font-bold text-white">{currentPB.nextAction}</div>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div>
                      <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block mb-2">Notas do Atendimento</label>
                      <textarea 
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Observações críticas..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs focus:outline-none min-h-[120px]"
                      />
                    </div>
                  </div>
               </section>
            </div>
          </div>
        </main>
      </div>

      {/* Template Oculto para o PDF */}
      <div className="hidden">
        <div ref={reportRef} className="p-12 bg-white text-slate-900 w-[800px] space-y-8 font-sans">
          <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6">
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight">RELATÓRIO DE QUALIFICAÇÃO</h1>
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">COMET COMMERCIAL OS — COPILOT ENGINE</p>
            </div>
            <div className="text-right">
              <div className="text-sm font-black uppercase text-slate-400">Data de Emissão</div>
              <div className="text-lg font-bold">{new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">Informações do Cliente</h3>
               <div className="space-y-1">
                 <div className="text-xs font-black uppercase text-slate-500">Empresa</div>
                 <div className="text-xl font-bold">{currentLead?.company}</div>
               </div>
               <div className="space-y-1">
                 <div className="text-xs font-black uppercase text-slate-500">Decisor</div>
                 <div className="text-base font-bold">{currentLead?.name}</div>
               </div>
            </div>
            <div className="space-y-4">
               <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">Contexto do Script</h3>
               <div className="space-y-1">
                 <div className="text-xs font-black uppercase text-slate-500">Roteiro Aplicado</div>
                 <div className="text-xl font-bold">{currentPB.title}</div>
               </div>
               <div className="space-y-1">
                 <div className="text-xs font-black uppercase text-slate-500">Responsável</div>
                 <div className="text-base font-bold">Equipe Comet</div>
               </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2">Respostas e Diagnóstico</h3>
            {currentPB.mandatoryQuestions.map(q => (
              <div key={q.id} className="space-y-2">
                <div className="text-xs font-black text-slate-600">{q.text}</div>
                <div className="p-4 bg-slate-50 rounded-xl text-sm leading-relaxed border border-slate-100">{answers[q.id] || "Nenhuma resposta registrada."}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
               <div className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-3">Green Flags</div>
               <div className="text-xs font-bold space-y-1">
                 {currentPB.greenFlags.filter(f => flags[f.id]).map(f => <div key={f.id}>• {f.text}</div>)}
                 {currentPB.greenFlags.filter(f => flags[f.id]).length === 0 && <div className="opacity-40 italic">Nenhum sinal detectado</div>}
               </div>
            </div>
            <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100">
               <div className="text-[10px] font-black text-rose-700 uppercase tracking-widest mb-3">Red Flags</div>
               <div className="text-xs font-bold space-y-1">
                 {currentPB.redFlags.filter(f => flags[f.id]).map(f => <div key={f.id}>• {f.text}</div>)}
                 {currentPB.redFlags.filter(f => flags[f.id]).length === 0 && <div className="opacity-40 italic">Nenhum sinal detectado</div>}
               </div>
            </div>
          </div>

          <div className="p-8 bg-slate-900 text-white rounded-3xl space-y-4">
             <div className="text-[10px] font-black uppercase tracking-widest opacity-50">Direcionamento de Venda</div>
             <div className="text-lg font-bold">{currentPB.nextAction}</div>
             <div className="h-px bg-white/10" />
             <div className="text-sm opacity-80 leading-relaxed italic">"{notes || 'Sem observações adicionais.'}"</div>
          </div>
        </div>
      </div>
    </div>
  );
}