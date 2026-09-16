"use client";

import React, { useState, useEffect } from "react";
import { 
  ClipboardList, CheckCircle2, ChevronRight, ChevronLeft, 
  Maximize2, Minimize2, Sparkles, ShieldCheck, Zap, ArrowRight,
  TrendingUp, Award, UserCheck, Flame, Phone, Mail, Building, User,
  Gift, FileText, MessageCircle, ExternalLink, Download, Copy, Check
} from "lucide-react";
import { type Survey, type SurveyQuestion } from "@/hooks/use-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AutomationEngine } from "@/lib/automation-engine";
import { submitSurveyResponseToDrive } from "@/services/googleDriveDatabaseService";

interface DeepFindSurveyViewerProps {
  survey: Partial<Survey>;
  leadId?: string;
  leadData?: {
    name?: string;
    email?: string;
    whatsapp?: string;
    company?: string;
  };
  onComplete?: (answers: Record<string, any>, calculatedScore?: number, leadData?: any) => void;
  isStandalone?: boolean;
}

// Helper para gerar um subtítulo que reforça a importância da resposta do participante
function getSurveySubtitle(survey: Partial<Survey>): string {
  if (survey.settings?.headline && survey.settings.headline !== survey.name && !survey.settings.headline.toLowerCase().includes("pesquisa de satisfação")) {
    return survey.settings.headline.toUpperCase();
  }
  const nameLower = (survey.name || "").toLowerCase();
  const idLower = (survey.id || "").toLowerCase();

  if (nameLower.includes("satisfação") || nameLower.includes("csat") || nameLower.includes("nps") || idLower.includes("csat")) {
    return "SUA RESPOSTA É MUITO IMPORTANTE";
  }
  if (nameLower.includes("mercado") || nameLower.includes("tendência") || idLower.includes("mercado")) {
    return "SUA OPINIÃO É MUITO IMPORTANTE";
  }
  if (nameLower.includes("qualificação") || nameLower.includes("min") || nameLower.includes("temperatura") || idLower.includes("min")) {
    return "SUA RESPOSTA É MUITO IMPORTANTE";
  }
  if (nameLower.includes("feedback") || nameLower.includes("avaliação")) {
    return "SUA OPINIÃO É MUITO IMPORTANTE";
  }
  if (nameLower.includes("cadastro") || nameLower.includes("inscrição") || nameLower.includes("contato")) {
    return "SUA PARTICIPAÇÃO FAZ A DIFERENÇA";
  }
  return "SUA RESPOSTA É MUITO IMPORTANTE";
}

export function DeepFindSurveyViewer({
  survey,
  leadId,
  leadData,
  onComplete,
  isStandalone = false
}: DeepFindSurveyViewerProps) {
  // Fluxo Inverso: Primeiro coleta os dados, depois responde as perguntas, depois entra o brinde/recompensa
  const [hasStarted, setHasStarted] = useState(Boolean(leadData?.name && leadData?.whatsapp));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedVoucher, setCopiedVoucher] = useState(false);
  
  // Informações de contato: Nome completo, Whatsapp, Email e Empresa (selecionável como opção)
  const [contactInfo, setContactInfo] = useState({
    name: leadData?.name || "",
    email: leadData?.email || "",
    whatsapp: leadData?.whatsapp || "",
    hasCompany: (leadData?.company ? "yes" : "no") as "no" | "yes",
    company: leadData?.company || ""
  });

  useEffect(() => {
    if (leadData?.name || leadData?.whatsapp || leadData?.email) {
      setContactInfo(prev => ({
        ...prev,
        name: leadData.name || prev.name,
        email: leadData.email || prev.email,
        whatsapp: leadData.whatsapp || prev.whatsapp,
        company: leadData.company || prev.company,
        hasCompany: leadData.company ? "yes" : prev.hasCompany
      }));
      if (leadData.name && leadData.whatsapp) {
        setHasStarted(true);
      }
    }
  }, [leadData?.name, leadData?.whatsapp, leadData?.email, leadData?.company]);

  const questions: SurveyQuestion[] = survey.questions || [];
  const currentQ = questions[currentIdx];
  const progressPercent = questions.length > 0 ? Math.round(((currentIdx + 1) / questions.length) * 100) : 0;

  // Alterna tela cheia
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const handleStartSurvey = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!contactInfo.name || contactInfo.name.trim().length < 2) {
      toast.error("Por favor, informe seu nome completo para continuar.");
      return;
    }
    if (!contactInfo.whatsapp || contactInfo.whatsapp.trim().length < 8) {
      toast.error("Por favor, informe seu número de WhatsApp para contato.");
      return;
    }
    setHasStarted(true);
    setCurrentIdx(0);
  };

  const handleSelectOption = (optionValue: string) => {
    if (!currentQ) return;
    const qKey = currentQ.id || `q_${currentIdx}`;
    
    const newAnswers = {
      ...answers,
      [qKey]: optionValue
    };
    setAnswers(newAnswers);

    // Se for a última pergunta, finaliza e envia automaticamente
    if (currentIdx === questions.length - 1) {
      setTimeout(() => {
        finalizeSubmission(newAnswers);
      }, 260);
    } else {
      // Auto-avanço suave após seleção
      setTimeout(() => {
        setCurrentIdx(prev => prev + 1);
      }, 260);
    }
  };

  const handleTextAnswer = (text: string) => {
    if (!currentQ) return;
    const qKey = currentQ.id || `q_${currentIdx}`;
    setAnswers(prev => ({
      ...prev,
      [qKey]: text
    }));
  };

  const calculateScoreAndTemperature = (ansMap: Record<string, any> = answers) => {
    let score = 50;
    let minProfile = {
      momento: "Neutro",
      interesse: "Neutro",
      necessidade: "Neutro",
      temperatura: "Morno" as "Quente" | "Morno" | "Frio"
    };

    const allValues = Object.values(ansMap).map(v => String(v).toLowerCase());

    // Análise de calor / temperatura
    const hotKeywords = ["sim, frequentemente", "compromete o crescimento", "sim, com alta prioridade", "imediato (esta semana)", "sim, prontos para investir", "crítico e urgente", "tomador de decisão", "sim, verba já aprovada", "excelente", "superou as expectativas"];
    const coldKeywords = ["não enfrento", "pouco impacto", "talvez em outro momento", "sem pressa", "ainda não temos orçamento", "impacto baixo", "apenas pesquisando", "não temos verba", "péssimo", "não atendeu"];

    let hotMatches = 0;
    let coldMatches = 0;

    allValues.forEach(val => {
      if (hotKeywords.some(hk => val.includes(hk.toLowerCase()))) hotMatches++;
      if (coldKeywords.some(ck => val.includes(ck.toLowerCase()))) coldMatches++;
    });

    if (hotMatches >= 3) {
      score = 90 + Math.min(10, hotMatches * 2);
      minProfile.temperatura = "Quente";
      minProfile.momento = "Imediato";
      minProfile.interesse = "Alto";
      minProfile.necessidade = "Crítica";
    } else if (coldMatches >= 3) {
      score = 25 - Math.min(15, coldMatches * 2);
      minProfile.temperatura = "Frio";
      minProfile.momento = "Longo Prazo";
      minProfile.interesse = "Baixo";
      minProfile.necessidade = "Baixa";
    } else {
      score = 65;
      minProfile.temperatura = "Morno";
      minProfile.momento = "Médio Prazo (30d)";
      minProfile.interesse = "Moderado";
      minProfile.necessidade = "Moderada";
    }

    return { score, minProfile };
  };

  const finalizeSubmission = async (finalAnswers: Record<string, any> = answers) => {
    setIsSubmitting(true);
    const { score, minProfile } = calculateScoreAndTemperature(finalAnswers);

    const minM: 0 | 1 = minProfile.momento === "Imediato" ? 1 : 0;
    const minI: 0 | 1 = minProfile.interesse === "Alto" ? 1 : 0;
    const minN: 0 | 1 = minProfile.necessidade === "Crítica" ? 1 : 0;
    const minTotal = minM + minI + minN;
    const minClassification = minProfile.temperatura.toUpperCase() as "QUENTE" | "MORNO" | "FRIO" | "DESCARTE";
    const minScoreCode = minTotal === 3 ? "MIN" : (minTotal === 2 ? "MI" : (minTotal === 1 ? "M" : "Nenhum"));

    const minQualificationObj = {
      m: minM,
      i: minI,
      n: minN,
      total: minTotal,
      classification: minClassification,
    };

    try {
      // 1. Atualiza dados no localStorage do CRM
      const rawLocal = localStorage.getItem("comet_crm_data");
      let crmData: any = rawLocal ? JSON.parse(rawLocal) : { leads: [], surveys: [] };

      // Se pesquisa tem ID, incrementa completions
      if (survey.id && Array.isArray(crmData.surveys)) {
        crmData.surveys = crmData.surveys.map((s: any) => 
          s.id === survey.id ? { ...s, completions: (s.completions || 0) + 1 } : s
        );
      }

      let targetLead: any = null;
      const companyFinal = contactInfo.hasCompany === "yes" ? (contactInfo.company || "Empresa Respondente") : "Pessoa Física";

      // 2. Se já existe leadId, atualiza
      if (leadId && Array.isArray(crmData.leads)) {
        crmData.leads = crmData.leads.map((l: any) => {
          if (l.id === leadId) {
            targetLead = {
              ...l,
              score: Math.max(l.score || 0, score),
              temperature: minProfile.temperatura,
              minScore: minScoreCode,
              minQualification: minQualificationObj,
              tags: Array.from(new Set([...(l.tags || []), "pesquisa-concluida", "min-qualificado", `temp-${minProfile.temperatura.toLowerCase()}`])),
              notes: `${l.notes || ""}\n[${new Date().toLocaleDateString()}] Pesquisa: ${survey.name} (Score: ${score}/100, Temp: ${minProfile.temperatura}, MIN: ${minScoreCode})`.trim()
            };
            return targetLead;
          }
          return l;
        });
      } else if (contactInfo.name || contactInfo.whatsapp || contactInfo.email) {
        // Cria novo lead no CRM
        targetLead = {
          id: `lead_${Date.now()}`,
          name: contactInfo.name || "Participante Pesquisa",
          company: companyFinal,
          whatsapp: contactInfo.whatsapp || "",
          email: contactInfo.email || "",
          score: score,
          temperature: minProfile.temperatura,
          minScore: minScoreCode,
          minQualification: minQualificationObj,
          source: `Pesquisa: ${survey.name || "Questionário Interativo"}`,
          stage: minProfile.temperatura === "Quente" ? "Oportunidade" : "Leads",
          tags: ["pesquisa-interativa", "min-qualificado", `temp-${minProfile.temperatura.toLowerCase()}`],
          value: minProfile.temperatura === "Quente" ? 8500 : 3500,
          created_at: new Date().toISOString()
        };
        if (!Array.isArray(crmData.leads)) crmData.leads = [];
        crmData.leads.unshift(targetLead);
      }

      localStorage.setItem("comet_crm_data", JSON.stringify(crmData));

      // 3. Dispara evento no motor de automação (AutomationEngine)
      if (targetLead) {
        AutomationEngine.processEvent({
          event: "survey.responded",
          lead: targetLead,
          metadata: {
            surveyName: survey.name,
            score,
            minProfile,
            answers: finalAnswers
          }
        });
      }

      // 4. Salva no banco local de respostas de pesquisa (comet_crm_survey_responses) para exibição imediata
      try {
        const rawSurveyResponses = localStorage.getItem("comet_crm_survey_responses");
        const existingResponses = rawSurveyResponses ? JSON.parse(rawSurveyResponses) : [];
        const newResponseItem = {
          id: `resp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          survey_id: survey.id || "pesquisa_custom",
          surveyId: survey.id || "pesquisa_custom",
          survey_name: survey.name || "Pesquisa de Qualificação",
          surveyTitle: survey.name || "Pesquisa de Qualificação",
          lead_id: targetLead?.id || leadId || "",
          leadId: targetLead?.id || leadId || "",
          lead_name: contactInfo.name || targetLead?.name || "",
          leadName: contactInfo.name || targetLead?.name || "",
          lead_email: contactInfo.email || targetLead?.email || "",
          leadEmail: contactInfo.email || targetLead?.email || "",
          lead_whatsapp: contactInfo.whatsapp || targetLead?.whatsapp || "",
          leadWhatsapp: contactInfo.whatsapp || targetLead?.whatsapp || "",
          lead_company: contactInfo.company || targetLead?.company || "",
          answers: finalAnswers,
          score,
          minScore: score,
          minClassification: minProfile.temperatura,
          created_at: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        if (Array.isArray(existingResponses)) {
          existingResponses.unshift(newResponseItem);
          localStorage.setItem("comet_crm_survey_responses", JSON.stringify(existingResponses.slice(0, 500)));
        }

        // Atualiza o lead no banco de dados via API se leadId existir
        if (targetLead?.id || leadId) {
          const lId = targetLead?.id || leadId;
          fetch(`/api/leads/${encodeURIComponent(lId)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              score: Math.max(targetLead?.score || 0, score),
              temperature: minProfile.temperatura,
              minScore: minScoreCode,
              minQualification: minQualificationObj,
              quizAnswers: { ...(targetLead?.quizAnswers || {}), ...finalAnswers },
              surveyAnswers: finalAnswers,
              metadata: {
                ...(targetLead?.metadata || {}),
                surveyId: survey.id,
                surveyName: survey.name,
                surveyScore: score,
                surveyTemperature: minProfile.temperatura,
                minQualification: minQualificationObj,
                surveyAnswers: finalAnswers,
                surveyAnsweredAt: new Date().toISOString()
              }
            })
          }).catch(() => {});
        }
      } catch (saveErr) {
        console.warn("Aviso ao processar respostas da pesquisa:", saveErr);
      }

      // 5. Envia para o endpoint do servidor Express /api/surveys/responses
      try {
        fetch("/api/surveys/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            surveyId: survey.id || "pesquisa_custom",
            leadId: targetLead?.id || leadId || null,
            leadForm: {
              name: contactInfo.name || targetLead?.name || "",
              whatsapp: contactInfo.whatsapp || targetLead?.whatsapp || "",
              email: contactInfo.email || targetLead?.email || "",
              company: contactInfo.company || targetLead?.company || ""
            },
            answers: finalAnswers,
            score,
            duration: 0,
            extraPayload: {
              surveyName: survey.name,
              score,
              temperature: minProfile.temperatura,
              minProfile,
              minQualification: minQualificationObj,
              minScore: minScoreCode,
            }
          })
        }).catch(() => {});
      } catch {}

      // 6. Envia resposta para o Google Drive / Google Sheets (em tabela separada da Pesquisa)
      try {
        submitSurveyResponseToDrive({
          surveyId: survey.id || "pesquisa_custom",
          surveyName: survey.name || "Pesquisa",
          leadName: contactInfo.name || targetLead?.name || "",
          leadWhatsapp: contactInfo.whatsapp || targetLead?.whatsapp || "",
          leadEmail: contactInfo.email || targetLead?.email || "",
          leadCompany: contactInfo.company || targetLead?.company || "",
          score,
          temperature: minProfile.temperatura,
          answers: finalAnswers,
          questions: questions.map(q => ({ id: q.id, question: q.question }))
        }).catch(() => {});
      } catch {}

      setIsSubmitted(true);
      toast.success("Questionário finalizado com sucesso!");
      if (onComplete) onComplete(finalAnswers, score, contactInfo);
    } catch (err) {
      console.error("Erro ao salvar respostas:", err);
      setIsSubmitted(true);
      if (onComplete) onComplete(finalAnswers, score, contactInfo);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      finalizeSubmission(answers);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1);
    } else {
      // Volta para a etapa de dados do usuário
      setHasStarted(false);
    }
  };

  const handleCopyVoucher = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedVoucher(true);
      toast.success("Código do voucher copiado!");
      setTimeout(() => setCopiedVoucher(false), 2500);
    });
  };

  // -------------------------------------------------------------
  // TELA 3: APÓS A PESQUISA - RECOMPENSA / BRINDE / VOUCHER / PDF
  // -------------------------------------------------------------
  if (isSubmitted) {
    const { score, minProfile } = calculateScoreAndTemperature();
    const cleanWhatsapp = (survey.reward?.value || "5511999999999").replace(/\D/g, "");
    const whatsappMessage = encodeURIComponent(
      `Olá! Acabei de responder ao questionário "${survey.name || "Pesquisa"}". Meu nome é ${contactInfo.name || "Participante"} e gostaria de resgatar meu brinde / benefício exclusivo!`
    );

    return (
      <div className={isStandalone ? "min-h-screen bg-[#070B14] text-white flex flex-col justify-between p-4 md:p-8 font-sans selection:bg-orange-500 selection:text-white" : "w-full h-full flex flex-col justify-between p-2 sm:p-4 text-white overflow-y-auto"}>
        {/* Header */}
        <header className="flex items-center justify-between max-w-5xl w-full mx-auto py-2 border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-500 text-white grid place-items-center shadow-[0_0_20px_rgba(255,107,0,0.5)]">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm md:text-base tracking-wider uppercase text-white">
                {survey.name || "QUESTIONÁRIO"}
              </h1>
              <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">
                {getSurveySubtitle(survey)}
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="h-3.5 w-3.5" /> 100% Concluído
          </div>
        </header>

        {/* Card Central de Entrega do Brinde / Recompensa / Voucher */}
        <main className="max-w-4xl w-full mx-auto my-auto space-y-6 py-4">
          <div className="text-center space-y-6 relative">
            <div className="h-16 w-16 rounded-2xl bg-orange-500/10 border-2 border-orange-500/30 text-orange-400 grid place-items-center mx-auto shadow-[0_0_30px_rgba(255,107,0,0.25)] animate-in zoom-in-90">
              <Gift className="h-8 w-8 text-orange-400" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-[11px] font-bold uppercase tracking-widest">
                <Sparkles className="h-3.5 w-3.5" /> Respostas Registradas com Sucesso
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                {survey.settings?.thankYouMessage || "Obrigado por sua participação!"}
              </h2>
              <p className="text-xs md:text-sm text-zinc-400 max-w-lg mx-auto">
                Olá, <strong className="text-white">{contactInfo.name || "amigo(a)"}</strong>! Suas respostas foram salvas com sucesso. Confira e resgate seu benefício abaixo:
              </p>
            </div>

            {/* DESTAQUE DA RECOMPENSA / BRINDE / VOUCHER / PDF */}
            <div className="bg-gradient-to-b from-[#131D31] to-[#0D1525] border-2 border-orange-500/40 rounded-2xl p-6 md:p-8 space-y-5 text-left relative overflow-hidden shadow-[0_0_35px_rgba(255,107,0,0.15)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-orange-500 text-white grid place-items-center shadow-[0_0_20px_rgba(255,107,0,0.4)] shrink-0">
                    {survey.reward?.type === 'file' ? (
                      <FileText className="h-6 w-6" />
                    ) : survey.reward?.type === 'whatsapp' ? (
                      <MessageCircle className="h-6 w-6" />
                    ) : (
                      <Gift className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-orange-400 block">
                      {survey.reward?.type === 'file' ? "Material / PDF Liberado" : survey.reward?.type === 'whatsapp' ? "Atendimento & Brinde Exclusivo" : "Voucher & Benefício Especial"}
                    </span>
                    <h3 className="font-extrabold text-lg md:text-xl text-white">
                      {survey.reward?.title || "Seu Benefício Exclusivo de Participação"}
                    </h3>
                  </div>
                </div>

                {/* Badge do Tipo */}
                <span className="px-3 py-1 rounded-lg bg-orange-500/20 border border-orange-500/30 text-orange-300 text-[10px] font-black uppercase tracking-wider">
                  Liberado Imediatamente
                </span>
              </div>

              <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
                {survey.reward?.type === 'file' 
                  ? "Seu arquivo exclusivo está pronto para download imediato. Clique no botão abaixo para baixar seu material completo."
                  : survey.reward?.type === 'whatsapp'
                    ? "Nosso time já recebeu seu cadastro. Clique no botão abaixo para falar diretamente no WhatsApp e resgatar seu brinde com atendimento prioritário."
                    : "Apresente este voucher ou acesse o link exclusivo abaixo para garantir suas condições e benefícios especiais."
                }
              </p>

              {/* Ações Específicas conforme o tipo de brinde */}
              {survey.reward?.type === 'whatsapp' ? (
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <a
                    href={`https://wa.me/${cleanWhatsapp}?text=${whatsappMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-black font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(37,211,102,0.35)] transition-all cursor-pointer"
                  >
                    <MessageCircle className="h-5 w-5 fill-black" />
                    Resgatar Brinde no WhatsApp
                  </a>
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" /> Atendimento direto e sem filas
                  </span>
                </div>
              ) : survey.reward?.type === 'file' ? (
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <a
                    href={survey.reward?.value || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(255,107,0,0.4)] transition-all cursor-pointer"
                  >
                    <Download className="h-5 w-5" />
                    Baixar Arquivo / PDF Agora
                  </a>
                </div>
              ) : survey.reward?.value ? (
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <a
                    href={survey.reward.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(255,107,0,0.4)] transition-all cursor-pointer"
                  >
                    <ExternalLink className="h-5 w-5" />
                    Acessar Voucher / Link Exclusivo
                  </a>
                </div>
              ) : (
                /* Fallback de Voucher Padrão */
                <div className="pt-2 space-y-3">
                  <div className="flex flex-wrap items-center gap-3 bg-[#070B14] p-3 rounded-xl border border-[#1E293B]">
                    <div className="flex-1 min-w-[200px]">
                      <span className="text-[10px] text-zinc-500 uppercase font-black block">Código do Seu Voucher:</span>
                      <span className="text-base font-mono font-black text-orange-400 tracking-wider">VIP-PARTICIPANTE-2026</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyVoucher("VIP-PARTICIPANTE-2026")}
                      className="px-4 py-2 rounded-lg bg-[#162035] hover:bg-[#1f2d4a] text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedVoucher ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      {copiedVoucher ? "Copiado!" : "Copiar Código"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Resumo da Participação */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 space-y-1">
                <div className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">Participante</div>
                <div className="text-sm font-bold text-white truncate">{contactInfo.name || "Registrado"}</div>
              </div>

              <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 space-y-1">
                <div className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">Contato</div>
                <div className="text-sm font-bold text-white truncate">{contactInfo.whatsapp || "Registrado"}</div>
              </div>

              <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 space-y-1">
                <div className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">Empresa / Perfil</div>
                <div className="text-sm font-bold text-white truncate">
                  {contactInfo.hasCompany === "yes" && contactInfo.company ? contactInfo.company : "Pessoa Física"}
                </div>
              </div>

              <div className="bg-[#111A2E] border border-[#1E293B] rounded-2xl p-4 space-y-1">
                <div className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">Respostas</div>
                <div className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {questions.length} enviadas
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/20 text-xs text-zinc-300 flex items-center justify-center gap-2">
              <ShieldCheck className="h-4 w-4 text-orange-400 shrink-0" />
              <span>Dados protegidos com segurança e sincronizados com a equipe.</span>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center py-4 border-t border-[#1E293B] text-[11px] text-zinc-500 uppercase tracking-widest">
          Questionário Interativo • Respostas Seguras
        </footer>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TELA 1: DADOS DO PARTICIPANTE PRIMEIRO (Antes das perguntas)
  // -------------------------------------------------------------
  if (!hasStarted) {
    return (
      <div className={isStandalone ? "min-h-screen bg-[#070B14] text-white flex flex-col justify-between p-4 md:p-8 font-sans selection:bg-orange-500 selection:text-white" : "w-full h-full flex flex-col justify-between p-2 sm:p-4 text-white overflow-y-auto"}>
        {/* Header Superior */}
        <header className="flex items-center justify-between max-w-5xl w-full mx-auto py-2 border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-orange-500 text-white grid place-items-center shadow-[0_0_20px_rgba(255,107,0,0.4)]">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-base md:text-lg tracking-widest uppercase text-white">
                {survey.name || "PESQUISA"}
              </h1>
              <p className="text-[10px] md:text-xs text-zinc-400 font-bold uppercase tracking-[0.2em]">
                {getSurveySubtitle(survey)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl border border-[#1E293B] bg-[#0B111E] hover:bg-[#111A2E] text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </header>

        {/* Formulário Inicial de Identificação */}
        <main className="max-w-4xl w-full mx-auto my-auto py-4">
          <form onSubmit={handleStartSurvey} className="space-y-6">
            
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-orange-500/40 bg-orange-500/10 text-orange-400 text-xs font-bold uppercase tracking-widest">
                <UserCheck className="h-3.5 w-3.5" /> Identificação do Participante
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight">
                {survey.settings?.headline || "Preencha seus dados para começar"}
              </h2>
              <p className="text-xs md:text-sm text-zinc-400">
                {survey.settings?.description || "Sua resposta é muito importante para nós! Informe seus dados abaixo para iniciar e liberar seu benefício exclusivo ao concluir."}
              </p>
            </div>

            <div className="space-y-4">
              {/* Nome Completo */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-orange-400" /> Nome Completo <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={contactInfo.name}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Carlos Silva"
                  className="w-full bg-[#070B14] border border-[#1E293B] focus:border-orange-500 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* WhatsApp */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-orange-400" /> WhatsApp <span className="text-orange-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={contactInfo.whatsapp}
                    onChange={(e) => setContactInfo(prev => ({ ...prev, whatsapp: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-[#070B14] border border-[#1E293B] focus:border-orange-500 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors"
                  />
                </div>

                {/* E-mail (Geral, não precisa ser corporativo) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-orange-400" /> E-mail
                  </label>
                  <input
                    type="email"
                    value={contactInfo.email}
                    onChange={(e) => setContactInfo(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="seuemail@exemplo.com"
                    className="w-full bg-[#070B14] border border-[#1E293B] focus:border-orange-500 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Empresa (Selecionável como Opção) */}
              <div className="space-y-2 pt-2">
                <label className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-orange-400" /> Você possui ou representa uma empresa?
                </label>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setContactInfo(prev => ({ ...prev, hasCompany: "no" }))}
                    className={cn(
                      "p-3.5 rounded-xl border text-center font-bold text-xs md:text-sm transition-all cursor-pointer flex items-center justify-center gap-2",
                      contactInfo.hasCompany === "no"
                        ? "border-orange-500 bg-[#162035] text-white ring-2 ring-orange-500/40 shadow-[0_0_15px_rgba(255,107,0,0.25)]"
                        : "border-[#1E293B] bg-[#070B14] text-zinc-400 hover:border-zinc-700 hover:text-white"
                    )}
                  >
                    <div className={cn(
                      "h-3.5 w-3.5 rounded-full border flex items-center justify-center",
                      contactInfo.hasCompany === "no" ? "border-orange-500 bg-orange-500" : "border-zinc-600"
                    )}>
                      {contactInfo.hasCompany === "no" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    Não, sou Pessoa Física / Autônomo
                  </button>

                  <button
                    type="button"
                    onClick={() => setContactInfo(prev => ({ ...prev, hasCompany: "yes" }))}
                    className={cn(
                      "p-3.5 rounded-xl border text-center font-bold text-xs md:text-sm transition-all cursor-pointer flex items-center justify-center gap-2",
                      contactInfo.hasCompany === "yes"
                        ? "border-orange-500 bg-[#162035] text-white ring-2 ring-orange-500/40 shadow-[0_0_15px_rgba(255,107,0,0.25)]"
                        : "border-[#1E293B] bg-[#070B14] text-zinc-400 hover:border-zinc-700 hover:text-white"
                    )}
                  >
                    <div className={cn(
                      "h-3.5 w-3.5 rounded-full border flex items-center justify-center",
                      contactInfo.hasCompany === "yes" ? "border-orange-500 bg-orange-500" : "border-zinc-600"
                    )}>
                      {contactInfo.hasCompany === "yes" && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    Sim, possuo Empresa / CNPJ
                  </button>
                </div>

                {/* Campo de Nome da Empresa quando selecionado "Sim" */}
                {contactInfo.hasCompany === "yes" && (
                  <div className="pt-2 animate-in fade-in duration-200">
                    <input
                      type="text"
                      value={contactInfo.company}
                      onChange={(e) => setContactInfo(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Nome da sua Empresa ou Negócio"
                      className="w-full bg-[#070B14] border border-[#1E293B] focus:border-orange-500 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Botão de Iniciar */}
            <div className="pt-4 border-t border-[#1E293B] flex items-center justify-end">
              <button
                type="submit"
                disabled={!contactInfo.name || !contactInfo.whatsapp}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(255,107,0,0.4)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                {survey.settings?.buttonText || "Iniciar Questionário"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        </main>

        {/* Footer */}
        <footer className="w-full max-w-5xl mx-auto text-center py-4">
          <div className="flex items-center justify-center gap-4 text-[10px] md:text-xs text-zinc-500 uppercase tracking-[0.25em] font-bold">
            <div className="h-px bg-[#1E293B] flex-1" />
            <span>Questionário Interativo • Respostas Seguras</span>
            <div className="h-px bg-[#1E293B] flex-1" />
          </div>
        </footer>
      </div>
    );
  }

  // -------------------------------------------------------------
  // TELA 2: PERGUNTAS DA PESQUISA (Após preencher os dados)
  // -------------------------------------------------------------
  if (!currentQ) {
    return (
      <div className="min-h-screen bg-[#070B14] text-white flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <ClipboardList className="h-12 w-12 text-zinc-500 mx-auto" />
          <h2 className="text-xl font-bold">Nenhuma pergunta cadastrada nesta pesquisa.</h2>
        </div>
      </div>
    );
  }

  const selectedAnswer = answers[currentQ.id || `q_${currentIdx}`];

  return (
    <div className={isStandalone ? "min-h-screen bg-[#070B14] text-white flex flex-col justify-between p-4 md:p-8 font-sans selection:bg-orange-500 selection:text-white" : "w-full h-full flex flex-col justify-between p-2 sm:p-4 text-white overflow-y-auto"}>
      {/* HEADER SUPERIOR */}
      <header className="flex items-center justify-between max-w-6xl w-full mx-auto py-2 border-b border-[#1E293B]">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-orange-500 text-white grid place-items-center shadow-[0_0_20px_rgba(255,107,0,0.4)]">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-base md:text-lg tracking-widest uppercase text-white">
              {survey.name || "PESQUISA"}
            </h1>
            <p className="text-[10px] md:text-xs text-zinc-400 font-bold uppercase tracking-[0.2em]">
              {getSurveySubtitle(survey)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-zinc-400 bg-[#0B111E] px-3.5 py-1.5 rounded-xl border border-[#1E293B]">
            <span className="text-orange-400 font-black">{currentIdx + 1}</span> de {questions.length}
          </div>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-xl border border-[#1E293B] bg-[#0B111E] hover:bg-[#111A2E] text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* ÁREA CENTRAL PRINCIPAL - PERGUNTAS */}
      <main className="max-w-5xl w-full mx-auto my-auto py-4">
        <div className="space-y-6 animate-in fade-in duration-300">

          {/* Categoria / Pill Superior */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center px-4 py-1.5 rounded-full border border-orange-500/40 bg-orange-500/10 text-orange-400 text-[11px] md:text-xs font-black uppercase tracking-[0.15em] shadow-sm">
              {currentQ.category || "QUESTIONÁRIO"}
            </span>
            <span className="text-xs text-zinc-400 font-bold">
              Respondendo como <strong className="text-white">{contactInfo.name}</strong>
            </span>
          </div>

          {/* Enunciado da Pergunta */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-snug tracking-tight">
            {currentQ.question}
          </h2>

          {/* Opções de Resposta em Grid Horizontal */}
          {currentQ.type === "nps" ? (
            /* NPS Scale 0 a 10 */
            <div className="space-y-3">
              <div className="grid grid-cols-6 sm:grid-cols-11 gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const isSelected = selectedAnswer === num || selectedAnswer === String(num);
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleSelectOption(String(num))}
                      className={cn(
                        "py-4 rounded-2xl border text-center font-black text-sm transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-1",
                        isSelected
                          ? "border-orange-500 bg-[#162035] text-white ring-2 ring-orange-500/50 shadow-[0_0_20px_rgba(255,107,0,0.3)] scale-105"
                          : "border-[#1E293B] bg-[#0E1626] text-zinc-400 hover:border-orange-500/50 hover:bg-[#131D31] hover:text-white"
                      )}
                    >
                      <div className={cn(
                        "h-3 w-3 rounded-full border flex items-center justify-center",
                        isSelected ? "border-orange-500 bg-orange-500" : "border-zinc-600"
                      )}>
                        {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                      </div>
                      {num}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500 uppercase font-black tracking-widest px-1">
                <span>Pouco Provável</span>
                <span>Extremamente Provável</span>
              </div>
            </div>
          ) : currentQ.options && currentQ.options.length > 0 ? (
            /* Cards de Escolha */
            <div className={cn(
              "grid gap-3.5",
              currentQ.options.length <= 3 
                ? "grid-cols-1 sm:grid-cols-3" 
                : currentQ.options.length === 4 
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" 
                  : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
            )}>
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = selectedAnswer === opt;
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => handleSelectOption(opt)}
                    className={cn(
                      "group p-5 rounded-2xl border text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-3 min-h-[110px]",
                      isSelected
                        ? "border-orange-500 bg-[#162035] text-white ring-2 ring-orange-500/50 shadow-[0_0_25px_rgba(255,107,0,0.35)] scale-[1.02]"
                        : "border-[#1E293B] bg-[#0E1626] text-zinc-400 hover:border-orange-500/40 hover:bg-[#131D31] hover:text-white"
                    )}
                  >
                    {/* Indicador Circular */}
                    <div className={cn(
                      "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                      isSelected
                        ? "border-orange-500 bg-orange-500 shadow-[0_0_10px_rgba(255,107,0,0.8)]"
                        : "border-zinc-600 group-hover:border-zinc-400"
                    )}>
                      {isSelected && <div className="h-2 w-2 rounded-full bg-white animate-in zoom-in-50" />}
                    </div>

                    {/* Texto da Opção */}
                    <span className={cn(
                      "text-xs md:text-sm font-bold leading-tight transition-colors",
                      isSelected ? "text-white" : "text-zinc-300 group-hover:text-white"
                    )}>
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Campo de Texto Curto / Longo */
            <div className="space-y-3">
              <textarea
                value={selectedAnswer || ""}
                onChange={(e) => handleTextAnswer(e.target.value)}
                placeholder="Escreva sua resposta detalhada aqui..."
                rows={4}
                className="w-full bg-[#0E1626] border border-[#1E293B] focus:border-orange-500 rounded-2xl p-4 text-sm text-white placeholder:text-zinc-600 outline-none transition-colors"
              />
            </div>
          )}

          {/* Controles de Navegação */}
          <div className="flex items-center justify-between pt-6 border-t border-[#1E293B]">
            <button
              type="button"
              onClick={handlePrev}
              className="px-4 py-2.5 rounded-xl border border-[#1E293B] bg-[#070B14] text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Anterior
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_20px_rgba(255,107,0,0.3)] hover:shadow-[0_0_25px_rgba(255,107,0,0.5)] cursor-pointer transition-all disabled:opacity-50"
              >
                {currentIdx === questions.length - 1 ? (isSubmitting ? "Finalizando..." : "Concluir e Resgatar Brinde") : "Próxima Pergunta"}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER INFORMATIVO COM DIVISOR */}
      <footer className="w-full max-w-5xl mx-auto text-center py-4">
        <div className="flex items-center justify-center gap-4 text-[10px] md:text-xs text-zinc-500 uppercase tracking-[0.25em] font-bold">
          <div className="h-px bg-[#1E293B] flex-1" />
          <span>Questionário Interativo • Respostas Seguras</span>
          <div className="h-px bg-[#1E293B] flex-1" />
        </div>
      </footer>
    </div>
  );
}
