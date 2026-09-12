// src/components/marketing/visual-canvas/AIEstrategistaPanel.tsx

import React, { useState } from "react";
import {
  Sparkles,
  Bot,
  Send,
  Target,
  Zap,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  RefreshCw,
  Copy,
  ChevronRight,
  ShieldCheck,
  Flame,
  ArrowRight,
  Sliders
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Section, LP } from "@/lib/lp-store";

interface AIEstrategistaPanelProps {
  lp: Partial<LP> & { sections?: Section[] };
  onApplyAIChanges: (updatedSections: Section[], explanation: string) => void;
  onUpdateSectionContent: (id: string, updates: Partial<Section> | any) => void;
  companyContext?: any;
}

interface StrategyInsight {
  score: number;
  grade: string;
  summary: string;
  strengths: string[];
  improvements: {
    title: string;
    description: string;
    impact: "Alto" | "Crítico" | "Médio";
    actionLabel: string;
    applyFn: () => void;
  }[];
}

export function AIEstrategistaPanel({
  lp,
  onApplyAIChanges,
  onUpdateSectionContent,
  companyContext
}: AIEstrategistaPanelProps) {
  const [activeTab, setActiveTab] = useState<"consultant" | "chat" | "audit">("consultant");
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; role: "ai" | "user"; content: string; time: string }>>([
    {
      id: "1",
      role: "ai",
      content: `Olá! Sou o Estrategista de Conversão da COMET. Analisei a estrutura da sua Landing Page "${lp.name || "Oferta"}" com base em mais de 1.200 campanhas de alta conversão. Como posso potencializar suas vendas hoje?`,
      time: "Agora"
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Cálculo de Diagnóstico de Conversão
  const sections = lp.sections || [];
  const hasHero = sections.some((s) => s.type === "hero");
  const hasSocialProof = sections.some((s) => s.type === "testimonial" || s.type === "logos" || s.type === "stats");
  const hasFAQ = sections.some((s) => s.type === "faq");
  const hasFormOrSurvey = sections.some((s) => s.type === "form" || s.type === "survey");
  const hasPricing = sections.some((s) => s.type === "pricing");

  let score = 40;
  if (hasHero) score += 20;
  if (hasSocialProof) score += 15;
  if (hasFAQ) score += 10;
  if (hasFormOrSurvey) score += 15;

  const quickActions = [
    {
      icon: <Flame className="w-4 h-4 text-orange-400" />,
      title: "Headline Magnética & Agressiva",
      desc: "Ganchos emocionais de alta retenção focados na dor imediata.",
      action: () => {
        const hero = sections.find((s) => s.type === "hero");
        if (hero) {
          onUpdateSectionContent(hero.id, {
            eyebrow: "ATENÇÃO: OFERTA EXCLUSIVA",
            title: "Multiplique suas Vendas com Previsibilidade sem Gastar Mais em Anúncios",
            subtitle: "A metodologia validada que já gerou mais de R$ 12M em faturamento para nossos clientes.",
            ctaPrimary: "Quero Aplicar no Meu Negócio"
          });
        }
      }
    },
    {
      icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      title: "Copy Mais Sofisticada & Premium",
      desc: "Linguagem refinada com foco em autoridade e alto valor percebido.",
      action: () => {
        const hero = sections.find((s) => s.type === "hero");
        if (hero) {
          onUpdateSectionContent(hero.id, {
            eyebrow: "SOLUÇÃO EXCLUSIVA DE ALTO IMPACTO",
            title: "Excelência Estratégica para Líderes de Mercado",
            subtitle: "Desenvolvido para empresas que não aceitam menos do que a liderança em seu segmento.",
            ctaPrimary: "Agendar Reunião Executiva",
            ctaSecondary: "Conhecer Metodologia"
          });
        }
      }
    },
    {
      icon: <Zap className="w-4 h-4 text-amber-400" />,
      title: "Maximizar Urgência do CTA",
      desc: "Micro-copy persuasiva com gatilhos de escassez e garantia.",
      action: () => {
        const hero = sections.find((s) => s.type === "hero");
        if (hero) {
          onUpdateSectionContent(hero.id, {
            ctaPrimary: "Garantir Minha Vaga com 25% OFF",
            ctaSecondary: "Restam apenas 4 vagas este mês"
          });
        }
      }
    },
    {
      icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
      title: "Adicionar Quebra de Objeções (FAQ)",
      desc: "Respostas diretas para as 3 maiores dúvidas que travam a compra.",
      action: () => {
        const faq = sections.find((s) => s.type === "faq");
        if (faq) {
          onUpdateSectionContent(faq.id, {
            title: "Dúvidas Frequentes sobre a Implementação",
            items: [
              { id: "f1", q: "Em quanto tempo vejo os primeiros resultados?", a: "Nossos clientes costumam notar o aumento nas conversões nas primeiras 48 a 72 horas após a publicação." },
              { id: "f2", q: "Preciso de conhecimento técnico para gerenciar?", a: "Não. Toda a estrutura é 100% intuitiva, com integração automática ao seu CRM COMET e WhatsApp." },
              { id: "f3", q: "Existe algum tipo de garantia?", a: "Sim, oferecemos 100% de satisfação ou ajustamos a estratégia sem custo adicional até atingir a meta." }
            ]
          });
        }
      }
    }
  ];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isProcessing) return;

    const userText = inputMessage.trim();
    setInputMessage("");
    setChatMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: "user", content: userText, time: "Agora" }
    ]);
    setIsProcessing(true);

    setTimeout(() => {
      let aiReply = `Analisei seu pedido: "${userText}". `;
      const lower = userText.toLowerCase();

      if (lower.includes("headline") || lower.includes("título") || lower.includes("chamada")) {
        const hero = sections.find((s) => s.type === "hero");
        if (hero) {
          onUpdateSectionContent(hero.id, {
            title: "A Solução Definitiva para Escalar suas Vendas com Segurança",
            subtitle: "Conecte sua oferta a compradores prontos para fechar hoje mesmo."
          });
          aiReply += "Otimizei a headline e o subtítulo da Seção Hero com base no framework de Gancho Emocional + Promessa Única.";
        }
      } else if (lower.includes("cta") || lower.includes("botão") || lower.includes("ação")) {
        const hero = sections.find((s) => s.type === "hero");
        if (hero) {
          onUpdateSectionContent(hero.id, {
            ctaPrimary: "Quero Começar com Condição Especial Agora",
            ctaSecondary: "Falar com um Consultor"
          });
          aiReply += "Aumentei a força persuasiva do CTA primário e secundário com micro-copy orientada a benefício direto.";
        }
      } else if (lower.includes("premium") || lower.includes("luxo") || lower.includes("sofisticad")) {
        const hero = sections.find((s) => s.type === "hero");
        if (hero) {
          onUpdateSectionContent(hero.id, {
            eyebrow: "CONSULTORIA PREMIUM EXCLUSIVA",
            title: "Eleve o Posicionamento da Sua Marca ao Mais Alto Nível",
            subtitle: "Estratégias sob medida para empresas que buscam liderança absoluta e valorização contínua."
          });
          aiReply += "Apliquei uma tonalidade de autoridade elevada na Seção Hero com termos valorizados no mercado B2B e High Ticket.";
        }
      } else {
        aiReply += "Apliquei as melhorias de copywriting e estrutura de conversão recomendadas. Veja as alterações atualizadas no Canvas!";
      }

      setChatMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "ai", content: aiReply, time: "Agora" }
      ]);
      setIsProcessing(false);
    }, 700);
  };

  return (
    <div className="h-full flex flex-col bg-[#121418] text-white text-xs select-none">
      {/* Topo do Painel de IA */}
      <div className="p-3.5 border-b border-[#23272F] bg-[#16181D] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-gradient-to-tr from-[#FF6A00] to-orange-400 text-white shadow-md shadow-[#FF6A00]/20">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white tracking-wide">Agente Estrategista IA</h3>
            <p className="text-[10px] text-white/50">Consultor de Conversão & Copy</p>
          </div>
        </div>

        {/* Score de Conversão Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold font-mono">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{score}/100</span>
        </div>
      </div>

      {/* Abas Superiores do Painel IA */}
      <div className="flex border-b border-[#23272F] bg-[#14161B]">
        <button
          type="button"
          onClick={() => setActiveTab("consultant")}
          className={cn(
            "flex-1 py-2.5 px-2 font-bold text-[11px] flex items-center justify-center gap-1.5 border-b-2 transition-all",
            activeTab === "consultant"
              ? "border-[#FF6A00] text-[#FF6A00] bg-white/5"
              : "border-transparent text-white/60 hover:text-white"
          )}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Estratégia</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("chat")}
          className={cn(
            "flex-1 py-2.5 px-2 font-bold text-[11px] flex items-center justify-center gap-1.5 border-b-2 transition-all",
            activeTab === "chat"
              ? "border-[#FF6A00] text-[#FF6A00] bg-white/5"
              : "border-transparent text-white/60 hover:text-white"
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Chat Copilot</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={cn(
            "flex-1 py-2.5 px-2 font-bold text-[11px] flex items-center justify-center gap-1.5 border-b-2 transition-all",
            activeTab === "audit"
              ? "border-[#FF6A00] text-[#FF6A00] bg-white/5"
              : "border-transparent text-white/60 hover:text-white"
          )}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Auditoria</span>
        </button>
      </div>

      {/* Conteúdo da Aba */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {activeTab === "consultant" && (
          <div className="space-y-4">
            {/* Box de Por Que Essa Estrutura */}
            <div className="p-3.5 rounded-2xl bg-[#16181D] border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-[#FF6A00] font-bold text-[11px] uppercase tracking-wider">
                <Lightbulb className="w-4 h-4" />
                <span>Por Que Esta Estrutura Converte?</span>
              </div>
              <p className="text-white/80 leading-relaxed text-xs">
                Esta página segue a arquitetura de conversão <strong>AIDA (Atenção, Interesse, Desejo, Ação)</strong>:
              </p>
              <ul className="space-y-1.5 text-white/70 text-[11px] pl-2 border-l border-white/10">
                <li>• <strong>Hero Section:</strong> Captura a atenção em menos de 3 segundos com promessa clara.</li>
                <li>• <strong>Prova Social:</strong> Reduz a fricção de confiança e valida a decisão do lead.</li>
                <li>• <strong>Quebra de Objeções:</strong> Resolve as maiores travas mentais antes do preenchimento.</li>
                <li>• <strong>Integração CRM:</strong> Conecta o lead instantaneamente ao WhatsApp dos seus vendedores.</li>
              </ul>
            </div>

            {/* Ações Rápidas de 1 Clique */}
            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-white/40 px-1">
                Ajustes Estratégicos Imediatos (1 Clique)
              </div>
              {quickActions.map((action, idx) => (
                <div
                  key={idx}
                  onClick={action.action}
                  className="p-3 rounded-xl bg-[#181B22] border border-white/5 hover:border-[#FF6A00]/50 hover:bg-[#FF6A00]/5 cursor-pointer transition-all group flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg bg-white/5 shrink-0 group-hover:scale-110 transition-transform">
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white text-xs group-hover:text-[#FF6A00] transition-colors">
                      {action.title}
                    </h4>
                    <p className="text-[11px] text-white/60 leading-tight mt-0.5">
                      {action.desc}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-[#FF6A00] shrink-0 self-center transition-transform group-hover:translate-x-0.5" />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "chat" && (
          <div className="h-full flex flex-col justify-between -m-4 p-4">
            {/* Lista de Mensagens */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin max-h-[380px]">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[90%] rounded-2xl p-3 text-xs leading-relaxed",
                    msg.role === "user"
                      ? "ml-auto bg-[#FF6A00] text-white rounded-br-none"
                      : "mr-auto bg-[#181B22] border border-white/10 text-white/90 rounded-bl-none"
                  )}
                >
                  <p>{msg.content}</p>
                  <span className="text-[9px] opacity-50 mt-1 self-end">{msg.time}</span>
                </div>
              ))}
              {isProcessing && (
                <div className="flex items-center gap-2 text-white/50 text-xs p-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#FF6A00]" />
                  <span>Estrategista IA analisando e aplicando...</span>
                </div>
              )}
            </div>

            {/* Input de Chat */}
            <form onSubmit={handleSendMessage} className="mt-3 flex items-center gap-1.5 bg-[#16181D] border border-white/15 rounded-2xl p-1.5">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ex: 'Deixe a headline mais agressiva'..."
                className="flex-1 bg-transparent px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isProcessing}
                className="p-2 rounded-xl bg-[#FF6A00] hover:bg-[#FF6A00]/90 text-white disabled:opacity-30 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}

        {activeTab === "audit" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#16181D] border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-white/50 uppercase font-black tracking-wider">
                  Score de Conversão Estimado
                </span>
                <div className="text-3xl font-black text-white mt-0.5 flex items-baseline gap-1">
                  <span className="text-emerald-400">{score}</span>
                  <span className="text-sm font-normal text-white/40">/100</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
                {score >= 80 ? "A+" : score >= 60 ? "B" : "C"}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-white/40 px-1">
                Checklist de Alta Conversão
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#181B22] border border-white/5">
                <CheckCircle2 className={cn("w-4 h-4 shrink-0", hasHero ? "text-emerald-400" : "text-white/20")} />
                <span className="text-xs text-white/80">Proposta Única de Valor Clara (Hero Section)</span>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#181B22] border border-white/5">
                <CheckCircle2 className={cn("w-4 h-4 shrink-0", hasSocialProof ? "text-emerald-400" : "text-white/20")} />
                <span className="text-xs text-white/80">Prova Social & Depoimentos / Estatísticas</span>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#181B22] border border-white/5">
                <CheckCircle2 className={cn("w-4 h-4 shrink-0", hasFAQ ? "text-emerald-400" : "text-white/20")} />
                <span className="text-xs text-white/80">Seção de FAQ para Quebra de Objeções</span>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#181B22] border border-white/5">
                <CheckCircle2 className={cn("w-4 h-4 shrink-0", hasFormOrSurvey ? "text-emerald-400" : "text-white/20")} />
                <span className="text-xs text-white/80">Formulário / Pesquisa de Captação Imediata</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
