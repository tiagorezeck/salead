// src/components/marketing/lan-hub/LANStudioHub.tsx

import React, { useState, useRef } from "react";
import {
  Bot,
  Sparkles,
  Wand2,
  Send,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Layers,
  ArrowRight,
  Sliders,
  CheckCircle2,
  Settings,
  Flame,
  ChevronDown,
  RefreshCw,
  X,
  FileText,
  Palette,
  Eye,
  Loader2,
  Plus,
  Target,
  MapPin,
  Zap,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAIConfig } from "@/hooks/useAIConfig";
import { AISettingsModal } from "@/components/automation/ai-settings-modal";
import { HighConversionEngineModal } from "@/components/marketing/lan-hub/HighConversionEngineModal";
import { type Section, type LPTheme, DEFAULT_THEME, blankSections, createHighConversionPeopleSections, uid } from "@/lib/lp-store";

interface LANStudioHubProps {
  companyName?: string;
  companySector?: string;
  companyPurpose?: string;
  funnelTypes: string[];
  onOpenEditorWithLP: (lpData: any) => void;
  onOpenBlankCanvas: () => void;
  onOpenSettingsModal: () => void;
}

interface Message {
  id: string;
  role: "lan" | "user";
  text: string;
  timestamp: Date;
}

const QUICK_PRESETS = [
  {
    title: "Mentoria High Ticket / B2B",
    niche: "Mentoria & Vendas B2B",
    city: "São Paulo",
    pain: "leads desqualificados e vendas estagnadas",
    offer: "Diagnóstico Estratégico de Escala",
    prompt: "Crie uma Landing Page de altíssimo padrão visual (People Dark/Hybrid) para Mentoria High Ticket B2B, com VSL no hero, números comprovados de ROI, Quiz de Qualificação em 3 etapas, Bento Grid de metodologia e formulário com WhatsApp."
  },
  {
    title: "Estética & Saúde Avançada",
    niche: "Harmonização & Estética",
    city: "Curitiba",
    pain: "agenda inconsistente e pacientes sem poder aquisitivo",
    offer: "Condição VIP + Protocolo Exclusivo",
    prompt: "Gere uma Landing Page de alta conversão para Clínica de Estética e Harmonização com VSL hero, antes/depois, prova social com notas 4.9 estrelas, quiz de autoavaliação e captura para WhatsApp."
  },
  {
    title: "VSL Direct Response / Infoproduto",
    niche: "Educação & Negócios Digitais",
    city: "Brasil",
    pain: "tentar vender sem método validado de tráfego",
    offer: "Acesso Imediato com Garantia de 15 Dias",
    prompt: "Landing Page no padrão VSL Direct Response com vídeo centralizado, contador de alunos, Bento Box com os 4 pilares do método, depoimentos em vídeo e formulário de inscrição rápida."
  },
  {
    title: "SaaS & Plataforma de Software",
    niche: "Software de Gestão Comercial",
    city: "Nacional",
    pain: "perda de tempo com planilhas e processos manuais",
    offer: "Teste Grátis de 14 Dias sem Cartão",
    prompt: "Landing Page para Software SaaS com design Dark sofisticado, Bento Grid 2x2 com recursos, métricas de eficiência (+312%), logos de empresas clientes e agendamento de demonstração."
  }
];

export function LANStudioHub({
  companyName = "Minha Empresa",
  companySector = "Negócios",
  companyPurpose = "Crescimento Comercial",
  funnelTypes = ["Voucher", "Consultoria", "Demonstração", "Captura", "Webinar"],
  onOpenEditorWithLP,
  onOpenBlankCanvas,
  onOpenSettingsModal
}: LANStudioHubProps) {
  const { aiConfig, isConfigured } = useAIConfig();
  const [showSettings, setShowSettings] = useState(false);
  const [showEngineModal, setShowEngineModal] = useState(false);
  
  // Contextos Regionais e Nicho
  const [targetCity, setTargetCity] = useState("São Paulo");
  const [targetNiche, setTargetNiche] = useState(companySector || "Negócios & Vendas");
  const [targetPain, setTargetPain] = useState("falta de previsibilidade e leads frios");
  const [targetOffer, setTargetOffer] = useState("Diagnóstico Comercial Gratuito");

  const [prompt, setPrompt] = useState("");
  const [funnelType, setFunnelType] = useState(funnelTypes[0] || "Voucher");
  const [referenceUrl, setReferenceUrl] = useState("");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "lan",
      text: `Olá! Sou o **LANAI**, seu Engenheiro de UI/UX e CRO de Elite.
Eu crio Landing Pages de altíssimo padrão visual (Padrão People, V0, Dark/Hybrid) com arquitetura de 7 seções de alta conversão: Hero com VSL, Prova Social, Quiz de Qualificação, Bento Grid do Método, Depoimentos, Garantia e Captura com Webhook.
Informe os dados da sua campanha abaixo ou descreva seu objetivo livremente!`,
      timestamp: new Date()
    }
  ]);

  const handleApplyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    setTargetNiche(preset.niche);
    setTargetCity(preset.city);
    setTargetPain(preset.pain);
    setTargetOffer(preset.offer);
    setPrompt(preset.prompt);
    toast.info(`Arquétipo Carregado: ${preset.title}`);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setReferenceImage(base64);
      toast.success("Referência Visual Anexada", {
        description: "A LANAI usará esta imagem para se inspirar no layout e cores!"
      });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async (customPrompt?: string) => {
    const activePrompt = customPrompt || prompt;
    if (!activePrompt.trim()) {
      toast.error("Por favor, descreva o que você deseja criar.");
      return;
    }

    // Adiciona a mensagem do usuário no chat
    const userMsgId = `user_${Date.now()}`;
    const newMessages: Message[] = [
      ...messages,
      {
        id: userMsgId,
        role: "user",
        text: activePrompt,
        timestamp: new Date()
      }
    ];
    setMessages(newMessages);
    setIsGenerating(true);
    setGenerationStep("Estruturando proposta única e psicologia de conversão...");

    try {
      setGenerationStep("Estruturando arquitetura de 7 seções, VSL Hero e Bento Grid...");

      const response = await fetch("/api/lan-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `[PADRÃO PEOPLE CRO HIGH CONVERSION]
Cidade / Região Alvo: ${targetCity}
Nicho / Segmento: ${targetNiche}
Dor Principal Local: ${targetPain}
Oferta / Urgência: ${targetOffer}
Tipo de Funil: ${funnelType}
Empresa: ${companyName}
Instruções Adicionais: ${activePrompt}
${referenceUrl ? `URL de Referência: ${referenceUrl}` : ""}`,
          referenceImage: referenceImage,
          referenceUrl: referenceUrl,
          aiConfig: aiConfig,
          conversationHistory: newMessages.map(m => ({
            role: m.role === "user" ? "user" : "model",
            content: m.text
          }))
        })
      });

      const data = await response.json();

      if (data.success && data.lp) {
        setGenerationStep("Página gerada com sucesso! Abrindo no Editor Visual...");
        toast.success("Landing Page Criada com Sucesso!", {
          description: `Gerada no Padrão People de Alta Conversão.`
        });

        const fullLP = {
          ...data.lp,
          id: `lp_${uid()}`,
          name: data.lp.name || `${targetNiche} · ${targetCity}`,
          type: funnelType,
          status: "Ativa",
          visits: 0,
          leads: 0,
          conv: 0,
          theme: data.lp.theme || {
            ...DEFAULT_THEME,
            primary: "#FF6A00",
            bg: "#090A0F",
            surface: "#12141C",
            text: "#F8FAFC",
            muted: "#94A3B8",
            radius: 16,
            font: "sora"
          },
          sections: data.lp.sections && data.lp.sections.length > 0 
            ? data.lp.sections 
            : createHighConversionPeopleSections({
                brand: companyName,
                niche: targetNiche,
                city: targetCity,
                painPoint: targetPain,
                offer: targetOffer
              })
        };

        // Redireciona para o editor visual
        setTimeout(() => {
          onOpenEditorWithLP(fullLP);
        }, 500);
      } else {
        throw new Error("Não foi possível gerar a página automaticamente.");
      }
    } catch (err: any) {
      console.warn("Usando gerador de alta conversão local:", err);
      toast.info("Criando Landing Page no Padrão People...");

      const fallbackLP = {
        id: `lp_${uid()}`,
        name: `${targetNiche} · ${targetCity}`,
        type: funnelType,
        status: "Ativa",
        visits: 0,
        leads: 0,
        conv: 0,
        theme: {
          ...DEFAULT_THEME,
          primary: "#FF6A00",
          bg: "#090A0F",
          surface: "#12141C",
          text: "#F8FAFC",
          muted: "#94A3B8",
          radius: 16,
          font: "sora"
        },
        sections: createHighConversionPeopleSections({
          brand: companyName,
          niche: targetNiche,
          city: targetCity,
          painPoint: targetPain,
          offer: targetOffer
        }),
        updatedAt: Date.now()
      };
      onOpenEditorWithLP(fallbackLP);
    } finally {
      setIsGenerating(false);
      setGenerationStep("");
    }
  };

  const getProviderBadge = () => {
    switch (aiConfig.activeProvider) {
      case "google": return "Google Gemini";
      case "openrouter": return "OpenRouter";
      case "custom_paid": return "API Paga / OpenAI";
      default: return "OpenRouter";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER PRINCIPAL DO LAN STUDIO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black tracking-widest text-[#FF6A00] uppercase bg-[#FF6A00]/10 border border-[#FF6A00]/30 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> ENGINE DE ALTA CONVERSÃO
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              Provedor: <strong className="text-foreground">{getProviderBadge()}</strong>
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-1 text-foreground">
            Gerador de Landing Pages <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6A00] via-orange-400 to-amber-300">Padrão People</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
            Arquitetura de alta conversão (Dark/Hybrid, Glassmorphism, VSL Hero, Bento Grid, Quiz e Captura com Webhook). Crie páginas de altíssimo ticket e edite tudo com drag-and-drop.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowEngineModal(true)}
            className="px-4 py-2.5 rounded-xl bg-[#FF6A00]/15 border border-[#FF6A00]/40 hover:bg-[#FF6A00]/25 text-[#FF6A00] font-bold text-xs inline-flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            title="Abrir o Engine de Design e Frontend de Alta Conversão"
          >
            <Sparkles className="w-4 h-4 text-[#FF6A00]" />
            <span>Engine de Código HTML</span>
          </button>

          <button
            type="button"
            onClick={onOpenBlankCanvas}
            className="px-4 py-2.5 rounded-xl border border-border bg-card/60 hover:bg-card text-foreground font-bold text-xs inline-flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <Layers className="w-4 h-4 text-primary" />
            <span>Canvas em Branco</span>
          </button>

          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="px-4 py-2.5 rounded-xl bg-card border border-border hover:border-primary/40 text-foreground font-bold text-xs inline-flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            title="Configurar LLMs, Modelos e Chaves da LANAI"
          >
            <Settings className="w-4 h-4 text-[#FF6A00]" />
            <span>Modelos & Chaves</span>
          </button>
        </div>
      </div>

      {/* ÁREA CENTRAL DE CONVERSA & CRIAÇÃO COM O LAN */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        
        {/* LADO ESQUERDO: TERMINAL DE BRIEFING E COMANDOS DO LAN */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-card/90 border border-border/80 rounded-3xl p-6 shadow-xl backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF6A00]/10 rounded-full blur-3xl pointer-events-none" />

            {/* Cabeçalho do Chat */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#FF6A00] to-orange-700 flex items-center justify-center text-white shadow-md shadow-[#FF6A00]/20">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-1.5">
                    LANAI — Engenheiro CRO & UI/UX
                    <span className="h-2 w-2 rounded-full bg-[#FF6A00] animate-pulse" />
                  </h3>
                  <p className="text-[11px] text-muted-foreground">Especialista em Tráfego Direto, VSL e Padrão People</p>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground font-mono bg-background/60 border border-border/40 px-2.5 py-1 rounded-xl">
                {aiConfig.modelName || aiConfig.modelId}
              </div>
            </div>

            {/* CAMPOS DE CONTEXTUALIZAÇÃO REGIONAL & NICHO */}
            <div className="grid sm:grid-cols-2 gap-3 mb-4 p-3.5 rounded-2xl bg-background/60 border border-border/60">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground/80 flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-[#FF6A00]" />
                  Nicho / Segmento
                </label>
                <input
                  type="text"
                  value={targetNiche}
                  onChange={(e) => setTargetNiche(e.target.value)}
                  placeholder="Ex: Mentoria B2B, Clínica Odontológica"
                  className="w-full bg-card border border-border rounded-xl px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-[#FF6A00]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground/80 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#FF6A00]" />
                  Cidade / Região Alvo
                </label>
                <input
                  type="text"
                  value={targetCity}
                  onChange={(e) => setTargetCity(e.target.value)}
                  placeholder="Ex: São Paulo, Curitiba, Brasil"
                  className="w-full bg-card border border-border rounded-xl px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-[#FF6A00]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground/80 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-[#FF6A00]" />
                  Dor Principal do Público
                </label>
                <input
                  type="text"
                  value={targetPain}
                  onChange={(e) => setTargetPain(e.target.value)}
                  placeholder="Ex: Leads desqualificados, agenda vazia"
                  className="w-full bg-card border border-border rounded-xl px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-[#FF6A00]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground/80 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FF6A00]" />
                  Oferta / Urgência
                </label>
                <input
                  type="text"
                  value={targetOffer}
                  onChange={(e) => setTargetOffer(e.target.value)}
                  placeholder="Ex: Diagnóstico Grátis, 30% OFF nesta semana"
                  className="w-full bg-card border border-border rounded-xl px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-[#FF6A00]"
                />
              </div>
            </div>

            {/* Input Principal de Criação */}
            <div className="space-y-3">
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                  placeholder="Instruções adicionais (opcional): Ex: Adicione VSL em destaque, use paleta dark luxuoso com detalhes em esmeralda, 4 depoimentos reais em vídeo..."
                  className="w-full bg-background/80 border border-border/80 hover:border-primary/40 focus:border-[#FF6A00] rounded-2xl px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-[#FF6A00]/20 min-h-[85px] resize-none transition-all"
                />
              </div>

              {/* Anexos de Referência Visual ou Link */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Upload de Imagem de Referência */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer",
                      referenceImage
                        ? "bg-[#FF6A00]/20 border-[#FF6A00] text-orange-400"
                        : "bg-background/60 border-border/70 hover:border-primary/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>{referenceImage ? "Imagem Anexada" : "Anexar Referência Visual"}</span>
                    {referenceImage && (
                      <X
                        className="w-3 h-3 hover:text-red-400 ml-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReferenceImage(null);
                        }}
                      />
                    )}
                  </button>

                  {/* Link / URL de Referência */}
                  <button
                    type="button"
                    onClick={() => {
                      const url = window.prompt("Cole a URL do site ou página de referência:", referenceUrl);
                      if (url !== null) setReferenceUrl(url);
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer",
                      referenceUrl
                        ? "bg-[#FF6A00]/20 border-[#FF6A00] text-orange-400"
                        : "bg-background/60 border-border/70 hover:border-primary/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>{referenceUrl ? "URL Anexada" : "Inspirar em URL"}</span>
                    {referenceUrl && (
                      <X
                        className="w-3 h-3 hover:text-red-400 ml-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReferenceUrl("");
                        }}
                      />
                    )}
                  </button>

                  {/* Seletor de Tipo de Funil */}
                  <select
                    value={funnelType}
                    onChange={(e) => setFunnelType(e.target.value)}
                    className="bg-background/60 border border-border/70 rounded-xl px-3 py-1.5 text-xs font-semibold text-foreground outline-none cursor-pointer"
                  >
                    {funnelTypes.map((t) => (
                      <option key={t} value={t}>
                        Funil: {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Botão de Envio / Gerar com LAN */}
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => handleGenerate()}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#FF6A00] via-orange-500 to-amber-500 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-[#FF6A00]/30 inline-flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{generationStep || "CRIANDO COM O LAN..."}</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>GERAR LANDING PAGE (PADRÃO PEOPLE)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* SUGESTÕES RÁPIDAS DE ARQUÉTIPOS HIGH TICKET */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>Arquétipos Prontos de Alta Conversão (1 Clique):</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {QUICK_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="text-left text-xs p-3.5 rounded-2xl bg-card/60 hover:bg-card border border-border hover:border-[#FF6A00]/50 text-foreground transition-all duration-200 group flex items-start gap-2.5 shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#FF6A00] shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="font-bold text-foreground flex items-center gap-1.5">
                      {preset.title}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                      {preset.prompt}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* LADO DIREITO: VANTAGENS DO NOVO SISTEMA CANVA & COPILOT LAN */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-gradient-to-br from-card to-card/50 border border-border rounded-3xl p-6 shadow-card space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#FF6A00]/10 border border-[#FF6A00]/30 flex items-center justify-center text-[#FF6A00]">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-foreground">Arquitetura de Alta Conversão</h3>
                <p className="text-[11px] text-muted-foreground">Padrão People · 7 Seções Estratégicas</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-[#FF6A00]/20 text-[#FF6A00] font-black text-[11px] flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Hero Section Impactante com VSL</h4>
                  <p className="text-muted-foreground mt-0.5">
                    Badge de escassez regional, headline de choque, vídeo flutuante com borda neon e CTA pulsante.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/20 text-primary font-black text-[11px] flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Quiz de Qualificação Interativo</h4>
                  <p className="text-muted-foreground mt-0.5">
                    Filtra leads com Choice Cards dinâmicos e armazena as respostas para o fechamento.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-500/20 text-blue-400 font-black text-[11px] flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Bento Grid do Método & Prova Social</h4>
                  <p className="text-muted-foreground mt-0.5">
                    Layout moderno com micro-copy persuasiva, números auditáveis e depoimentos em vídeo.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-[11px] flex items-center justify-center shrink-0">
                  4
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Captura & Envio via Webhook</h4>
                  <p className="text-muted-foreground mt-0.5">
                    Disparo automático de dados, respostas do quiz e parâmetros de UTM direto para o endpoint configurado.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/60">
              <button
                type="button"
                onClick={onOpenBlankCanvas}
                className="w-full py-3 rounded-2xl bg-card hover:bg-muted/80 border border-border text-foreground font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Layers className="w-4 h-4 text-primary" />
                <span>Começar do Zero no Canvas Livre</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Configurações de IA */}
      {showSettings && (
        <AISettingsModal onClose={() => setShowSettings(false)} />
      )}

      {/* Modal do Engine de Design e Frontend de Alta Conversão */}
      {showEngineModal && (
        <HighConversionEngineModal
          isOpen={showEngineModal}
          onClose={() => setShowEngineModal(false)}
          defaultBrand={companyName}
          defaultNiche={companySector}
          onSaveToSystem={(newLp) => {
            onOpenEditorWithLP(newLp);
            setShowEngineModal(false);
          }}
        />
      )}
    </div>
  );
}
