"use client";

import React, { useState, useEffect } from 'react';
import { MessageCircle, ChevronLeft, ChevronRight, CheckCircle2, ArrowRight, Gift, FileDown, CheckSquare } from "lucide-react";
import { cn, formatPhone } from "@/lib/utils";
import { type LandingPage, type SurveyQuestion } from "@/data/mock";

interface InteractionCardProps {
  lp: Partial<LandingPage> & { questions: SurveyQuestion[] };
  s: { card: string; button: string; input: string };
  isSurvey: boolean;
  surveyStep: number;
  submitted: boolean;
  form: { name: string; email: string; whatsapp: string };
  setForm: (form: any) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleNextSurvey: (answer?: any) => void;
  handlePrevSurvey?: () => void;
}

export function InteractionCard({ 
  lp, s, isSurvey, surveyStep, submitted, form, setForm, handleSubmit, handleNextSurvey, handlePrevSurvey 
}: InteractionCardProps) {
  
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [subjectiveValue, setSubjectiveValue] = useState("");

  const questions = lp.questions || [];
  const currentQuestion = isSurvey && surveyStep >= 0 && surveyStep < questions.length ? questions[surveyStep] : null;

  useEffect(() => {
    setSelectedOptions([]);
    setSubjectiveValue("");
  }, [surveyStep]);

  const handleWhatsAppRedirect = () => {
    const rawNumber = lp.whatsappNumbers?.[0] || "";
    const clean = rawNumber.replace(/\D/g, "");
    const phone = clean.startsWith("55") ? clean : `55${clean}`;
    const message = encodeURIComponent(lp.whatsappMessage || "Olá! Acabei de finalizar o cadastro.");
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  const handleDownload = () => {
    if (!lp.rewardFile) return;
    const link = document.createElement('a');
    link.href = lp.rewardFile;
    link.download = lp.rewardFileName || 'presente-comet';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleOption = (opt: string) => {
    if (currentQuestion?.allowMultiple || currentQuestion?.type === 'multiple') {
      setSelectedOptions(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]);
    } else {
      handleNextSurvey(opt);
    }
  };

  const onConfirm = () => {
    if (currentQuestion?.type === 'objective' || currentQuestion?.type === 'multiple' || currentQuestion?.type === 'single') {
      if (selectedOptions.length > 0) handleNextSurvey(selectedOptions);
      else if (currentQuestion.type === 'single' || currentQuestion.type === 'objective') {
          // Fallback para seleção única que não disparou handleNextSurvey imediato
      }
    } else {
      if (subjectiveValue.trim()) handleNextSurvey(subjectiveValue);
    }
  };

  const hasReward = !!(lp.rewardFile || lp.rewardTitle);

  return (
    <div className={cn("rounded-[2rem] overflow-hidden border flex flex-col max-h-[85vh] transition-all duration-500 shadow-2xl", s.card)}>
      <div className="p-5 md:p-6 overflow-y-auto scrollbar-none">
        {submitted ? (
          <div className="text-center space-y-4 animate-in zoom-in-95 duration-500 py-4">
            <div className="relative mx-auto w-16 h-16">
              <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
              <div className="relative h-16 w-16 bg-gradient-primary text-white rounded-full grid place-items-center border-4 border-background shadow-2xl">
                <CheckCircle2 className="h-8 w-8" />
              </div>
            </div>
            
            <div className="space-y-1">
              <h2 className="font-display text-xl font-black tracking-tight">Sucesso!</h2>
              <p className="text-[10px] opacity-70 leading-relaxed px-4">
                Sua resposta foi registrada. Nossa equipe entrará em contato em breve.
              </p>
            </div>

            {hasReward ? (
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3 mt-4 animate-in slide-in-from-bottom-4 duration-700 delay-300">
                <div className="flex flex-col items-center gap-1">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary grid place-items-center">
                    <Gift className="h-4 w-4" />
                  </div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-primary">{lp.rewardTitle || "Seu Presente Exclusivo"}</div>
                </div>

                <div className="grid gap-2">
                  {lp.rewardFile && (
                    <button 
                      onClick={handleDownload}
                      className="w-full py-3 rounded-xl bg-white text-black font-black text-[9px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <FileDown className="h-3.5 w-3.5" /> BAIXAR DOCUMENTO
                    </button>
                  )}
                  
                  <button 
                    onClick={handleWhatsAppRedirect} 
                    className={cn("w-full font-black py-3 rounded-xl flex items-center justify-center gap-2 text-[9px] tracking-widest uppercase shadow-elegant hover:scale-[1.02] active:scale-95 transition-all", s.button)}
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> FALAR COM CONSULTOR
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-4">
                <button 
                  onClick={() => window.location.reload()} 
                  className="text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors"
                >
                  VOLTAR AO INÍCIO
                </button>
              </div>
            )}
          </div>
        ) : isSurvey && surveyStep !== 99 && surveyStep !== -1 ? (
          <div className="space-y-4 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                {surveyStep > 0 && handlePrevSurvey && (
                  <button onClick={handlePrevSurvey} className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                )}
                <div className="text-[8px] font-black opacity-50 uppercase tracking-widest">Passo {surveyStep + 1} de {questions.length}</div>
              </div>
              <div className="h-1 w-16 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-gradient-primary transition-all duration-700" style={{ width: `${((surveyStep + 1) / questions.length) * 100}%` }} />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="font-display text-lg font-black leading-tight tracking-tight">{currentQuestion?.question}</h3>
              {(currentQuestion?.allowMultiple || currentQuestion?.type === 'multiple') && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[7px] font-black text-primary uppercase tracking-widest">
                  <CheckSquare className="h-2 w-2" /> Seleção Múltipla
                </div>
              )}
            </div>

            <div className="grid gap-1.5">
              {['objective', 'multiple', 'single', 'boolean', 'satisfaction'].includes(currentQuestion?.type || '') ? (
                <>
                  <div className="grid gap-1.5">
                    {currentQuestion?.options?.map((opt: string) => {
                      const isSelected = selectedOptions.includes(opt);
                      return (
                        <button 
                          key={opt} 
                          onClick={() => toggleOption(opt)} 
                          className={cn(
                            "w-full text-left p-3 rounded-xl border-2 transition-all text-[11px] font-bold flex items-center justify-between group",
                            isSelected ? "border-primary bg-primary/10 text-primary shadow-lg" : "border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10"
                          )}
                        >
                          {opt}
                          <div className={cn(
                            "h-4 w-4 rounded-full border-2 flex items-center justify-center transition-all",
                            isSelected ? "bg-primary border-primary" : "border-white/10"
                          )}>
                            {isSelected && <CheckCircle2 className="h-2.5 w-2.5 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {(currentQuestion?.allowMultiple || currentQuestion?.type === 'multiple') && (
                    <button 
                      onClick={onConfirm}
                      disabled={selectedOptions.length === 0}
                      className={cn("w-full font-black py-3 rounded-xl flex items-center justify-center gap-2 text-[9px] tracking-widest uppercase mt-1 transition-all shadow-elegant", s.button, selectedOptions.length === 0 && "opacity-50 cursor-not-allowed")}
                    >
                      CONFIRMAR <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <textarea 
                    autoFocus 
                    value={subjectiveValue}
                    onChange={e => setSubjectiveValue(e.target.value)}
                    placeholder="Digite sua resposta aqui..." 
                    className={cn("w-full rounded-xl p-3 text-xs min-h-[100px] outline-none border-2 transition-all focus:ring-4 focus:ring-primary/10", s.input)} 
                  />
                  <button 
                    onClick={onConfirm}
                    disabled={!subjectiveValue.trim()}
                    className={cn("w-full font-black py-3 rounded-xl flex items-center justify-center gap-2 text-[9px] tracking-widest uppercase transition-all shadow-elegant", s.button, !subjectiveValue.trim() && "opacity-50 cursor-not-allowed")}
                  >
                    PRÓXIMA ETAPA <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-500">
            <div className="text-center space-y-0.5">
              <h3 className="font-display text-lg font-black tracking-tight">Começar Agora</h3>
              <p className="text-[10px] opacity-60">Preencha seus dados para iniciar.</p>
            </div>
            <div className="space-y-2">
              <div className="space-y-0.5">
                <label className="text-[8px] font-black uppercase opacity-40 tracking-widest ml-1">Nome Completo</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={cn("w-full rounded-xl px-3 py-2.5 text-xs outline-none border-2 transition-all focus:ring-4 focus:ring-primary/10", s.input)} placeholder="Ex: João Silva" />
              </div>
              <div className="space-y-0.5">
                <label className="text-[8px] font-black uppercase opacity-40 tracking-widest ml-1">E-mail Corporativo</label>
                <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={cn("w-full rounded-xl px-3 py-2.5 text-xs outline-none border-2 transition-all focus:ring-4 focus:ring-primary/10", s.input)} placeholder="joao@empresa.com" />
              </div>
              <div className="space-y-0.5">
                <label className="text-[8px] font-black uppercase opacity-40 tracking-widest ml-1">WhatsApp</label>
                <input required value={form.whatsapp} onChange={e => setForm({...form, whatsapp: formatPhone(e.target.value)})} className={cn("w-full rounded-xl px-3 py-2.5 text-xs outline-none border-2 transition-all focus:ring-4 focus:ring-primary/10", s.input)} placeholder="(11) 99999-9999" />
              </div>
            </div>
            <button type="submit" className={cn("w-full font-black py-3.5 rounded-xl shadow-elegant flex items-center justify-center gap-2 text-[9px] tracking-widest uppercase mt-1 transition-transform hover:scale-[1.02] active:scale-95", s.button)}>
              {questions.length > 0 ? "INICIAR QUESTIONÁRIO" : "CONCLUIR CADASTRO"} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}