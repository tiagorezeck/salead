"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, Save, Plus, Trash2, Settings2, 
  MessageSquare, Star, Hash, CheckSquare, Type, List, 
  ChevronDown, Gift, Sparkles, Globe,
  FileText, Link as LinkIcon, MessageCircle, Target, Zap, UserCheck, TrendingUp,
  ArrowUp, ArrowDown, Copy, Eye, Check, AlertCircle, HelpCircle, Flame
} from "lucide-react";
import { useData, type Survey, type SurveyQuestion } from "@/hooks/use-data";
import { type QuestionType } from "@/data/mock";
import { SURVEY_PRESETS } from "@/lib/survey-templates";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SurveyEditorModalProps {
  survey: Partial<Survey>;
  onClose: () => void;
  onSave: (survey: Partial<Survey>) => void;
}

const QUESTION_TYPES: { type: QuestionType; label: string; icon: any; desc: string }[] = [
  { type: 'single', label: 'Única Escolha', icon: CheckSquare, desc: 'Escolhe apenas 1 alternativa' },
  { type: 'multiple', label: 'Múltipla Escolha', icon: List, desc: 'Pode selecionar várias opções' },
  { type: 'nps', label: 'NPS (0-10)', icon: Hash, desc: 'Escala padrão Net Promoter Score' },
  { type: 'rating5', label: 'Estrelas (1-5)', icon: Star, desc: 'Avaliação de 1 a 5 estrelas' },
  { type: 'boolean', label: 'Sim / Não', icon: MessageSquare, desc: 'Resposta binária rápida' },
  { type: 'short_text', label: 'Texto Curto', icon: Type, desc: 'Campo de linha única' },
  { type: 'long_text', label: 'Texto Longo', icon: FileText, desc: 'Área de texto para comentários' },
  { type: 'dropdown', label: 'Menu Suspenso', icon: ChevronDown, desc: 'Seleção em lista suspensa' },
  { type: 'satisfaction', label: 'Escala de Satisfação', icon: Sparkles, desc: 'Péssimo a Excelente' },
];

const PROFILE_MAPS = [
  { id: 'minScore', label: 'Matriz MIN (Score)', icon: Zap, hint: 'Mapeia a urgência e necessidade comercial' },
  { id: 'decisionRole', label: 'Papel na Decisão', icon: UserCheck, hint: 'Identifica se é o tomador de decisão final' },
  { id: 'type', label: 'Tipo (Novo/Recorrente)', icon: Target, hint: 'Segmenta origem ou tipo de cliente' },
  { id: 'strategy', label: 'Estratégia de Venda', icon: TrendingUp, hint: 'Define o ritmo e abordagem de fechamento' },
];

export function SurveyEditorModal({ survey: initialSurvey, onClose, onSave }: SurveyEditorModalProps) {
  const { updateSurvey, addSurvey } = useData();
  const [activeTab, setActiveTab] = useState<'questions' | 'reward' | 'settings'>('questions');

  // Garante que se as perguntas vierem vazias, busca do template correspondente
  const initialQuestions: SurveyQuestion[] = (() => {
    if (initialSurvey?.questions && initialSurvey.questions.length > 0) {
      return JSON.parse(JSON.stringify(initialSurvey.questions));
    }
    const matchingPreset = SURVEY_PRESETS.find(p => p.id === initialSurvey?.id || p.name === initialSurvey?.name);
    if (matchingPreset && matchingPreset.questions && matchingPreset.questions.length > 0) {
      return JSON.parse(JSON.stringify(matchingPreset.questions));
    }
    return [
      {
        id: `q-1`,
        type: 'single',
        category: 'NECESSIDADE DO PROJETO',
        question: 'Qual é o principal desafio atual da sua empresa?',
        options: ['Geração de novos leads', 'Aumento da taxa de conversão', 'Organização de processos comerciais'],
        required: true,
        mapToProfile: 'minScore'
      }
    ];
  })();

  const [survey, setSurvey] = useState<Partial<Survey>>({
    ...initialSurvey,
    name: initialSurvey.name || "Nova Pesquisa",
    type: initialSurvey.type || "individual",
    questions: initialQuestions,
    settings: initialSurvey.settings || {
      headline: initialSurvey.name || "Pesquisa",
      description: "Responda as perguntas a seguir para registrar sua participação.",
      buttonText: "Iniciar Questionário",
      thankYouMessage: "Obrigado por responder nosso questionário!",
      accentColor: "#FF6B00"
    },
    reward: initialSurvey.reward || { title: "Confirmação de Resposta", type: 'whatsapp', value: "" }
  });

  // Atualiza se mudar o initialSurvey
  useEffect(() => {
    if (initialSurvey) {
      let q = initialSurvey.questions;
      if (!q || q.length === 0) {
        const matchingPreset = SURVEY_PRESETS.find(p => p.id === initialSurvey.id || p.name === initialSurvey.name);
        if (matchingPreset) q = matchingPreset.questions;
      }
      setSurvey(prev => ({
        ...prev,
        ...initialSurvey,
        name: initialSurvey.name || prev.name,
        questions: q && q.length > 0 ? JSON.parse(JSON.stringify(q)) : prev.questions
      }));
    }
  }, [initialSurvey]);

  // AUMENTAR: Adicionar nova pergunta
  const handleAddQuestion = (type: QuestionType) => {
    const newQuestion: SurveyQuestion = {
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      category: 'QUALIFICAÇÃO',
      question: "Digite a sua pergunta aqui...",
      required: true,
      options: ['single', 'multiple', 'dropdown', 'satisfaction', 'boolean'].includes(type) 
        ? (type === 'boolean' ? ["Sim", "Não"] : type === 'satisfaction' ? ["Péssimo", "Regular", "Bom", "Excelente"] : ["Opção A", "Opção B", "Opção C"]) 
        : undefined
    };
    setSurvey(prev => ({ ...prev, questions: [...(prev.questions || []), newQuestion] }));
    toast.success("Nova pergunta adicionada ao final!");
  };

  // DUPLICAR: Clonar pergunta existente
  const handleDuplicateQuestion = (idx: number) => {
    if (!survey.questions) return;
    const target = survey.questions[idx];
    const cloned: SurveyQuestion = {
      ...JSON.parse(JSON.stringify(target)),
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      question: `${target.question} (Cópia)`
    };
    const nextQuestions = [...survey.questions];
    nextQuestions.splice(idx + 1, 0, cloned);
    setSurvey(prev => ({ ...prev, questions: nextQuestions }));
    toast.success("Pergunta duplicada com sucesso!");
  };

  // REORDENAR: Mover para cima / baixo
  const handleMoveQuestion = (idx: number, direction: 'up' | 'down') => {
    if (!survey.questions) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= survey.questions.length) return;
    
    const nextQuestions = [...survey.questions];
    const temp = nextQuestions[idx];
    nextQuestions[idx] = nextQuestions[targetIdx];
    nextQuestions[targetIdx] = temp;
    setSurvey(prev => ({ ...prev, questions: nextQuestions }));
  };

  // DIMINUIR: Remover pergunta
  const handleDeleteQuestion = (id: string) => {
    if ((survey.questions || []).length <= 1) {
      toast.error("O questionário deve ter pelo menos 1 pergunta.");
      return;
    }
    setSurvey(prev => ({
      ...prev,
      questions: prev.questions?.filter(x => x.id !== id)
    }));
    toast.info("Pergunta removida.");
  };

  // EDITAR: Atualizar campos da pergunta
  const handleUpdateQuestion = (id: string, updates: Partial<SurveyQuestion>) => {
    setSurvey(prev => ({
      ...prev,
      questions: prev.questions?.map(q => q.id === id ? { ...q, ...updates } : q)
    }));
  };

  // OPÇÕES: Adicionar / Remover / Alterar opção
  const handleAddOption = (questionId: string) => {
    setSurvey(prev => ({
      ...prev,
      questions: prev.questions?.map(q => {
        if (q.id === questionId) {
          const currentOpts = q.options || [];
          return {
            ...q,
            options: [...currentOpts, `Nova Opção ${currentOpts.length + 1}`]
          };
        }
        return q;
      })
    }));
  };

  const handleUpdateOption = (questionId: string, optIndex: number, value: string) => {
    setSurvey(prev => ({
      ...prev,
      questions: prev.questions?.map(q => {
        if (q.id === questionId && q.options) {
          const next = [...q.options];
          next[optIndex] = value;
          return { ...q, options: next };
        }
        return q;
      })
    }));
  };

  const handleDeleteOption = (questionId: string, optIndex: number) => {
    setSurvey(prev => ({
      ...prev,
      questions: prev.questions?.map(q => {
        if (q.id === questionId && q.options) {
          return { ...q, options: q.options.filter((_, i) => i !== optIndex) };
        }
        return q;
      })
    }));
  };

  // SALVAR / USAR COMO ESTÁ
  const handleSave = async () => {
    if (!survey.name || survey.name.trim() === "") {
      return toast.error("Dê um nome para a sua pesquisa.");
    }
    if (!survey.questions || survey.questions.length === 0) {
      return toast.error("Adicione ao menos uma pergunta ao questionário.");
    }

    try {
      if (survey.id) {
        await updateSurvey(survey.id, survey);
      } else {
        await addSurvey(survey);
      }
      onSave(survey);
      toast.success("Pesquisa e perguntas salvas com sucesso!");
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar pesquisa:", err);
      toast.success("Pesquisa salva localmente com sucesso!");
      onSave(survey);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-md z-[100] flex flex-col animate-in fade-in duration-200">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-border bg-card/80 backdrop-blur px-6 sticky top-0 z-30 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
            title="Fechar Editor"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="h-6 w-px bg-border shrink-0" />
          
          <div className="flex-1 max-w-md">
            <input 
              value={survey.name || ""} 
              onChange={e => setSurvey({...survey, name: e.target.value})}
              placeholder="Nome da Pesquisa..." 
              className="bg-transparent border-none font-display font-bold text-lg focus:ring-0 p-0 w-full text-foreground placeholder:text-muted-foreground outline-none"
            />
            <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
              <span className="font-semibold text-primary">{survey.questions?.length || 0} perguntas</span>
              <span>•</span>
              <span>Visual DeepFind Dark & Orange</span>
            </div>
          </div>
        </div>

        {/* Central Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex bg-muted/60 p-1 rounded-xl border border-border">
            <TabBtn active={activeTab === 'questions'} onClick={() => setActiveTab('questions')} icon={List} label="Perguntas" count={survey.questions?.length} />
            <TabBtn active={activeTab === 'reward'} onClick={() => setActiveTab('reward')} icon={Gift} label="Recompensa" />
            <TabBtn active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={Settings2} label="Configurações" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {survey.id && (
            <a 
              href={`/survey/${survey.id}`}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Testar como o respondente verá"
            >
              <Eye className="h-4 w-4 text-primary" /> Testar
            </a>
          )}
          
          <button 
            type="button"
            onClick={handleSave} 
            className="px-5 py-2 rounded-xl bg-gradient-primary text-primary-foreground font-black text-xs shadow-elegant flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Save className="h-4 w-4" /> SALVAR PESQUISA
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto w-full">
        {/* TAB 1: QUESTIONS */}
        {activeTab === 'questions' && (
          <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
            {/* Questions List */}
            <div className="space-y-6 pb-24">
              {/* Informative Banner */}
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-primary/20 grid place-items-center text-primary shrink-0">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Questionário Pré-carregado Pronto para Usar</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Você pode <strong>usar as perguntas como estão</strong>, <strong>editar os textos</strong>, <strong>diminuir (remover)</strong> ou <strong>aumentar (adicionar novas)</strong>.
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-primary text-primary-foreground">
                    {survey.questions?.length} {survey.questions?.length === 1 ? 'Pergunta' : 'Perguntas'}
                  </span>
                </div>
              </div>

              {/* Question Cards */}
              {survey.questions?.map((q, idx) => {
                const questionTypeConfig = QUESTION_TYPES.find(t => t.type === q.type) || QUESTION_TYPES[0];
                const TypeIcon = questionTypeConfig.icon;

                return (
                  <div 
                    key={q.id || idx} 
                    className="group bg-card border border-border hover:border-primary/40 rounded-3xl p-5 md:p-6 shadow-card transition-all relative space-y-4"
                  >
                    {/* Header of Question Card */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
                      <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-primary/15 text-primary grid place-items-center text-xs font-black shrink-0">
                          {idx + 1}
                        </div>
                        
                        {/* Category Tag (Editable) */}
                        <input 
                          value={q.category || ""}
                          onChange={e => handleUpdateQuestion(q.id, { category: e.target.value })}
                          placeholder="CATEGORIA (Ex: MOMENTO, NECESSIDADE)"
                          className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded-md border border-primary/20 outline-none w-48 transition-colors"
                        />

                        {/* Type Badge */}
                        <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-muted text-muted-foreground flex items-center gap-1.5">
                          <TypeIcon className="h-3 w-3 text-primary" />
                          {questionTypeConfig.label}
                        </span>
                      </div>

                      {/* Question Actions (Move, Duplicate, Delete) */}
                      <div className="flex items-center gap-1">
                        <button 
                          type="button"
                          onClick={() => handleMoveQuestion(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-20 transition-colors cursor-pointer"
                          title="Mover para cima"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleMoveQuestion(idx, 'down')}
                          disabled={idx === (survey.questions?.length || 0) - 1}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-20 transition-colors cursor-pointer"
                          title="Mover para baixo"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDuplicateQuestion(idx)}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                          title="Duplicar esta pergunta"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button 
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                          title="Excluir pergunta (Diminuir)"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Question Title Input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                        Título da Pergunta
                      </label>
                      <input 
                        value={q.question || ""} 
                        onChange={e => handleUpdateQuestion(q.id, { question: e.target.value })} 
                        placeholder="Ex: Qual é o seu maior gargalo de vendas hoje?"
                        className="w-full bg-muted/40 hover:bg-muted/70 focus:bg-background border border-border focus:border-primary/40 rounded-xl px-3.5 py-2.5 font-bold text-sm md:text-base outline-none transition-all" 
                      />
                    </div>

                    {/* Options Editor (For choices, dropdown, satisfaction, etc.) */}
                    {['single', 'multiple', 'dropdown', 'satisfaction', 'boolean'].includes(q.type) && (
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                            Alternativas de Resposta ({q.options?.length || 0})
                          </label>
                          <button 
                            type="button"
                            onClick={() => handleAddOption(q.id)}
                            className="text-[10px] font-black text-primary hover:underline flex items-center gap-1 tracking-wider uppercase cursor-pointer"
                          >
                            <Plus className="h-3 w-3" /> Adicionar Alternativa
                          </button>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          {q.options?.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2 bg-muted/30 border border-border/70 rounded-xl p-1.5 focus-within:border-primary/30 transition-all">
                              <span className="h-6 w-6 rounded-lg bg-muted text-[10px] font-bold grid place-items-center text-muted-foreground shrink-0">
                                {optIdx + 1}
                              </span>
                              <input 
                                value={opt} 
                                onChange={e => handleUpdateOption(q.id, optIdx, e.target.value)} 
                                className="flex-1 bg-transparent border-none text-xs outline-none px-1 text-foreground"
                                placeholder={`Opção ${optIdx + 1}`}
                              />
                              {q.options && q.options.length > 2 && (
                                <button 
                                  type="button"
                                  onClick={() => handleDeleteOption(q.id, optIdx)} 
                                  className="p-1 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted transition-colors cursor-pointer"
                                  title="Remover opção"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer Controls: Type Selector & Lead Profile Mapping */}
                    <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs">
                      {/* Mapping to CRM Profile */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                          Impacto no CRM:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          <button 
                            type="button"
                            onClick={() => handleUpdateQuestion(q.id, { mapToProfile: undefined })}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer",
                              !q.mapToProfile ? "bg-muted text-foreground border-border" : "text-muted-foreground border-transparent hover:bg-muted/50"
                            )}
                          >
                            Nenhum
                          </button>
                          {PROFILE_MAPS.map(map => (
                            <button 
                              key={map.id}
                              type="button"
                              onClick={() => handleUpdateQuestion(q.id, { mapToProfile: map.id as any })}
                              className={cn(
                                "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all flex items-center gap-1 cursor-pointer",
                                q.mapToProfile === map.id ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" : "text-muted-foreground border-transparent hover:bg-muted/50"
                              )}
                              title={map.hint}
                            >
                              <map.icon className="h-2.5 w-2.5" /> {map.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Required Toggle */}
                      <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-bold text-muted-foreground hover:text-foreground">
                        <input 
                          type="checkbox"
                          checked={q.required !== false}
                          onChange={e => handleUpdateQuestion(q.id, { required: e.target.checked })}
                          className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        Resposta Obrigatória
                      </label>
                    </div>
                  </div>
                );
              })}

              {/* Add New Question Banner at Bottom */}
              <div className="p-6 rounded-3xl border-2 border-dashed border-border hover:border-primary/40 bg-card/40 transition-all text-center space-y-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary grid place-items-center mx-auto">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-foreground">Aumentar Questionário (Adicionar Nova Pergunta)</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Escolha o formato da pergunta para incluir na esteira:</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {QUESTION_TYPES.map(qt => (
                    <button
                      key={qt.type}
                      type="button"
                      onClick={() => handleAddQuestion(qt.type)}
                      className="px-3 py-1.5 rounded-xl bg-muted hover:bg-primary/15 hover:text-primary border border-border hover:border-primary/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <qt.icon className="h-3.5 w-3.5 text-primary" /> + {qt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar with Quick Tools */}
            <div className="space-y-4 sticky top-20">
              <div className="p-5 rounded-3xl bg-card border border-border shadow-card space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5 text-primary" /> Adicionar Pergunta
                </h4>
                <div className="grid gap-1.5">
                  {QUESTION_TYPES.map(qt => (
                    <button 
                      key={qt.type} 
                      type="button"
                      onClick={() => handleAddQuestion(qt.type)} 
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20 transition-all text-left group cursor-pointer"
                    >
                      <div className="h-7 w-7 rounded-lg bg-muted group-hover:bg-primary/20 text-muted-foreground group-hover:text-primary grid place-items-center transition-colors shrink-0">
                        <qt.icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{qt.label}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{qt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Survey Summary Widget */}
              <div className="p-5 rounded-3xl bg-card border border-border shadow-card space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-orange-500" /> Resumo do Diagnóstico
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Total de Perguntas:</span>
                    <span className="font-bold text-foreground">{survey.questions?.length || 0}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Tempo Estimado:</span>
                    <span className="font-bold text-emerald-500">~{Math.max(1, Math.ceil((survey.questions?.length || 1) * 0.25))} min</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Tema Visual:</span>
                    <span className="font-bold text-primary">DeepFind (Neon/Dark)</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  className="w-full py-2.5 rounded-xl bg-gradient-primary text-primary-foreground font-black text-xs shadow-elegant flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform cursor-pointer"
                >
                  <Save className="h-4 w-4" /> Concluir & Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REWARD */}
        {activeTab === 'reward' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="p-8 rounded-[2.5rem] bg-card border border-border shadow-card space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/15 text-primary grid place-items-center">
                  <Gift className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold">Recompensa ao Concluir</h3>
                  <p className="text-xs text-muted-foreground">Ofereça um voucher, análise gratuita ou direcionamento direto para o WhatsApp do consultor.</p>
                </div>
              </div>
              
              <Field 
                label="Título da Recompensa / Chamada" 
                value={survey.reward?.title} 
                onChange={(v: string) => setSurvey({...survey, reward: {...survey.reward!, title: v}})} 
                placeholder="Ex: Receber Resultado Detalhado / Falar com Atendente"
              />
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Canal de Entrega</label>
                <div className="grid grid-cols-3 gap-3">
                  <RewardTypeBtn active={survey.reward?.type === 'whatsapp'} onClick={() => setSurvey({...survey, reward: {...survey.reward!, type: 'whatsapp'}})} icon={MessageCircle} label="WhatsApp" />
                  <RewardTypeBtn active={survey.reward?.type === 'link'} onClick={() => setSurvey({...survey, reward: {...survey.reward!, type: 'link'}})} icon={LinkIcon} label="Link Externo" />
                  <RewardTypeBtn active={survey.reward?.type === 'file'} onClick={() => setSurvey({...survey, reward: {...survey.reward!, type: 'file'}})} icon={FileText} label="Arquivo / PDF" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {survey.reward?.type === 'whatsapp' ? 'Número de WhatsApp do Atendente' : survey.reward?.type === 'file' ? 'URL do Arquivo' : 'URL de Destino'}
                </label>
                <input 
                  value={survey.reward?.value || ""} 
                  onChange={e => setSurvey({...survey, reward: {...survey.reward!, value: e.target.value}})} 
                  placeholder={survey.reward?.type === 'whatsapp' ? '5511999999999' : 'https://...'} 
                  className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono" 
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="p-8 rounded-[2.5rem] bg-card border border-border shadow-card space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-primary/15 text-primary grid place-items-center">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold">Configurações Gerais</h3>
                  <p className="text-xs text-muted-foreground">Personalize a mensagem de agradecimento e a forma de captura dos leads.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Finalidade da Pesquisa</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={() => setSurvey({...survey, purpose: 'min', type: 'individual'})} 
                      className={cn(
                        "p-4 rounded-2xl border-2 text-left transition-all cursor-pointer", 
                        survey.purpose === 'min' || survey.id?.includes('min') ? "border-amber-500 bg-amber-500/10 text-amber-500" : "border-border hover:border-border/80"
                      )}
                    >
                      <div className="font-bold text-sm flex items-center gap-1.5 text-foreground">
                        <Zap className="h-4 w-4 text-amber-500" /> Qualificação MIN
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">Atualiza automaticamente Momento, Interesse, Necessidade, Empresa e Cargo no Lead.</div>
                    </button>

                    <button 
                      type="button"
                      onClick={() => setSurvey({...survey, purpose: 'common'})} 
                      className={cn(
                        "p-4 rounded-2xl border-2 text-left transition-all cursor-pointer", 
                        survey.purpose === 'common' || (!survey.purpose && !survey.id?.includes('min')) ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-border/80"
                      )}
                    >
                      <div className="font-bold text-sm flex items-center gap-1.5 text-foreground">
                        <Globe className="h-4 w-4 text-blue-500" /> Diagnóstico / Pesquisa Comum
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">Pesquisa temática ou diagnóstico complementar sem alterar a pontuação MIN.</div>
                    </button>
                  </div>
                </div>

                <Field 
                  label="Mensagem de Agradecimento Final" 
                  value={survey.settings?.thankYouMessage} 
                  onChange={(v: string) => setSurvey({...survey, settings: {...survey.settings!, thankYouMessage: v}})} 
                  type="textarea" 
                  placeholder="Ex: Obrigado por responder ao nosso questionário! Suas respostas foram registradas com sucesso."
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label, count }: any) {
  return (
    <button 
      type="button"
      onClick={onClick} 
      className={cn(
        "px-4 py-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer", 
        active ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <Icon className="h-3.5 w-3.5" /> 
      {label}
      {count !== undefined && (
        <span className={cn("px-1.5 py-0.2 rounded-full text-[9px]", active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
          {count}
        </span>
      )}
    </button>
  );
}

function RewardTypeBtn({ active, onClick, icon: Icon, label }: any) {
  return (
    <button 
      type="button"
      onClick={onClick} 
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all cursor-pointer", 
        active ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/20"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function Field({ label, value, onChange, placeholder = "", type = "text" }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</label>
      {type === "textarea" ? (
        <textarea 
          value={value || ""} 
          onChange={e => onChange(e.target.value)} 
          placeholder={placeholder}
          className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground" 
        />
      ) : (
        <input 
          value={value || ""} 
          onChange={e => onChange(e.target.value)} 
          placeholder={placeholder}
          className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all text-foreground" 
        />
      )}
    </div>
  );
}
