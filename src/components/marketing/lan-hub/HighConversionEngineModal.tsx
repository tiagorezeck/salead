// src/components/marketing/lan-hub/HighConversionEngineModal.tsx

import React, { useState } from "react";
import {
  Sparkles,
  Wand2,
  X,
  Code2,
  Eye,
  Copy,
  Download,
  Check,
  Zap,
  CheckCircle2,
  Flame,
  LayoutGrid,
  HeartPulse,
  HelpCircle,
  Play,
  Layers,
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  generateHighConversionLP,
  detectArchetype,
  getDefaultQuizQuestions,
  type LPArchetype,
  type LPGenerationParams,
  type QualifierQuestion
} from "@/modules/landing-pages/services/high-conversion-engine";

interface HighConversionEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveToSystem?: (lpData: any) => void;
  defaultBrand?: string;
  defaultNiche?: string;
}

const ARCHETYPES: {
  id: LPArchetype;
  name: string;
  tag: string;
  desc: string;
  icon: any;
  color: string;
  bestFor: string;
}[] = [
  {
    id: "DIRECT_RESPONSE_VSL",
    name: "Direct Response & VSL",
    tag: "Tráfego Direto & Infoprodutos",
    desc: "Dark mode elegante, radial glow, headline com gradiente, vídeo central com bordas neon, marquee contínuo e FAQ em accordion.",
    icon: Flame,
    color: "#FF6A00",
    bestFor: "Cursos, mentorias, lançamentos, produtos digitais e ofertas diretas."
  },
  {
    id: "INTERACTIVE_QUIZ",
    name: "Interactive Quiz / Qualifier",
    tag: "Alto Ticket & Qualificação B2B",
    desc: "Interface moderna estilo dashboard/app, Choice Cards interativos com Alpine.js, barra de progresso e formulário bloqueado até a resposta.",
    icon: Zap,
    color: "#00F0FF",
    bestFor: "Consultorias, B2B, serviços de alto valor e pesquisa de maturidade."
  },
  {
    id: "SAAS_BENTO_BOX",
    name: "SaaS & Tech Bento-Box",
    tag: "Softwares & Plataformas Tech",
    desc: "Grid Bento Box assimétrico (1x1, 2x2, 2x1) com ícones Lucide, split 50/50 na Hero com card glassmorphism e tabela comparativa.",
    icon: LayoutGrid,
    color: "#3B82F6",
    bestFor: "SaaS, plataformas digitais, aplicativos e ferramentas de produtividade."
  },
  {
    id: "EDITORIAL_SERVICE",
    name: "Editorial & Humanized Service",
    tag: "Serviços Locais & Clínicas",
    desc: "Estilo clean/warm sofisticado, foto humana em alta resolução com card em overlay, grade de serviços, avaliações com estrelas e agendamento.",
    icon: HeartPulse,
    color: "#059669",
    bestFor: "Clínicas, estética, advogados, imobiliárias, médicos e consultorias."
  }
];

export function HighConversionEngineModal({
  isOpen,
  onClose,
  onSaveToSystem,
  defaultBrand = "COMET Digital",
  defaultNiche = "Consultoria Empresarial"
}: HighConversionEngineModalProps) {
  const [selectedArchetype, setSelectedArchetype] = useState<LPArchetype>("DIRECT_RESPONSE_VSL");
  const [brandName, setBrandName] = useState(defaultBrand);
  const [niche, setNiche] = useState(defaultNiche);
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("{{SYSTEM_WEBHOOK_URL}}");
  const [campaignId, setCampaignId] = useState("{{CAMPAIGN_ID}}");
  const [videoUrl, setVideoUrl] = useState("https://www.youtube.com/embed/dQw4w9WgXcQ");
  
  // Rastreamento
  const [facebookPixelId, setFacebookPixelId] = useState("");
  const [googleTagId, setGoogleTagId] = useState("");

  // Visualização e Geração
  const [activeTab, setActiveTab] = useState<"config" | "preview" | "code">("config");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string>("");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const params: LPGenerationParams = {
        archetype: selectedArchetype,
        brandName: brandName || "Minha Empresa",
        niche: niche || "Serviços",
        headline: headline || undefined,
        subheadline: subheadline || undefined,
        ctaText: ctaText || undefined,
        systemWebhookUrl: webhookUrl,
        campaignId: campaignId,
        videoUrl: videoUrl,
        facebookPixelId: facebookPixelId || undefined,
        googleTagId: googleTagId || undefined,
        questions: getDefaultQuizQuestions(niche)
      };

      // Chamada para o microsserviço isolado no backend
      const res = await fetch("/api/generate-high-conversion-lp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params)
      });

      const data = await res.json();
      if (data.success && data.html) {
        setGeneratedHtml(data.html);
        setActiveTab("preview");
        toast.success("Código HTML Compilado com Sucesso!", {
          description: `Arquétipo ${selectedArchetype} gerado com Tailwind, Alpine.js e Lucide.`
        });
      } else {
        // Fallback local do engine no frontend
        const localCode = generateHighConversionLP(params);
        setGeneratedHtml(localCode);
        setActiveTab("preview");
        toast.success("Código HTML de Alta Conversão Gerado!");
      }
    } catch (err: any) {
      console.warn("Gerando com engine local:", err);
      const localCode = generateHighConversionLP({
        archetype: selectedArchetype,
        brandName,
        niche,
        headline,
        subheadline,
        ctaText,
        systemWebhookUrl: webhookUrl,
        campaignId,
        videoUrl,
        facebookPixelId,
        googleTagId
      });
      setGeneratedHtml(localCode);
      setActiveTab("preview");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = () => {
    if (!generatedHtml) return;
    navigator.clipboard.writeText(generatedHtml);
    setCopied(true);
    toast.success("Código HTML copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    if (!generatedHtml) return;
    const blob = new Blob([generatedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `landing-page-${selectedArchetype.toLowerCase().replace(/_/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Download do arquivo HTML iniciado!");
  };

  const handleSaveAndOpen = () => {
    if (!generatedHtml) {
      handleGenerate();
      return;
    }

    if (onSaveToSystem) {
      onSaveToSystem({
        name: `${brandName} - ${selectedArchetype.replace(/_/g, " ")}`,
        type: selectedArchetype === "INTERACTIVE_QUIZ" ? "Quiz" : "Voucher",
        template: "Modular",
        status: "Ativa",
        rawHtml: generatedHtml,
        compiledHtml: generatedHtml,
        config: {
          rawHtml: generatedHtml,
          archetype: selectedArchetype,
          systemWebhookUrl: webhookUrl,
          campaignId
        }
      });
      toast.success("Landing Page integrada ao sistema!");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-in fade-in">
      <div className="bg-[#0B0D13] border border-border/80 rounded-3xl w-full max-w-6xl shadow-2xl flex flex-col h-[92vh] overflow-hidden text-slate-100">
        
        {/* HEADER */}
        <div className="p-5 md:px-7 border-b border-border/60 bg-[#10131B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#FF6A00]/15 text-[#FF6A00] border border-[#FF6A00]/30 grid place-items-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6A00] bg-[#FF6A00]/10 px-2 py-0.5 rounded-full">
                  MÓDULO ISOLADO
                </span>
                <h2 className="text-base md:text-lg font-bold text-white">
                  Engine de Design e Frontend de Alta Conversão
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Geração de código HTML/Tailwind completo com CDN (Tailwind, Lucide, Alpine.js) e Choice Cards.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs de Navegação */}
            {generatedHtml && (
              <div className="bg-black/50 border border-border/60 p-1 rounded-xl flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("config")}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                    activeTab === "config" ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"
                  )}
                >
                  Configuração
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                    activeTab === "preview" ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"
                  )}
                >
                  <Eye className="w-3.5 h-3.5" /> Preview Ao Vivo
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("code")}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                    activeTab === "code" ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"
                  )}
                >
                  <Code2 className="w-3.5 h-3.5" /> Código HTML
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === "config" && (
            <div className="p-6 overflow-y-auto space-y-8 flex-1">
              
              {/* 1. SELEÇÃO DE ARQUÉTIPO VISUAL OBRIGATÓRIA */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold uppercase tracking-widest text-[#FF6A00] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    1. Selecione o Arquétipo Visual & Fluxo de Conversão
                  </label>
                  <span className="text-[11px] text-slate-400">Estrutura anti-padrão genérico</span>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {ARCHETYPES.map((arch) => {
                    const Icon = arch.icon;
                    const isSelected = selectedArchetype === arch.id;
                    return (
                      <button
                        key={arch.id}
                        type="button"
                        onClick={() => setSelectedArchetype(arch.id)}
                        className={cn(
                          "p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between group cursor-pointer relative overflow-hidden",
                          isSelected
                            ? "bg-[#161B26] border-[#FF6A00] ring-2 ring-[#FF6A00]/30 shadow-xl"
                            : "bg-[#11141D] border-border/70 hover:border-slate-500 hover:bg-[#141822]"
                        )}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 text-[#FF6A00]">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                            style={{ background: `${arch.color}15`, color: arch.color }}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            {arch.tag}
                          </span>
                          <h3 className="font-bold text-sm text-white">{arch.name}</h3>
                          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                            {arch.desc}
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-slate-300 font-medium">
                          Ideal para: {arch.bestFor}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. PARÂMETROS DA OFERTA E CAMPANHA */}
              <div className="space-y-4 pt-4 border-t border-border/60">
                <label className="text-xs font-extrabold uppercase tracking-widest text-[#FF6A00] flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5" />
                  2. Parâmetros de Conteúdo & Identidade
                </label>

                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Nome da Empresa / Marca</label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="Ex: COMET Tech"
                      className="w-full bg-[#161B26] border border-border/80 focus:border-[#FF6A00] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Nicho / Segmento</label>
                    <input
                      type="text"
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      placeholder="Ex: SaaS B2B, Clínica de Estética"
                      className="w-full bg-[#161B26] border border-border/80 focus:border-[#FF6A00] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Texto do CTA Principal</label>
                    <input
                      type="text"
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                      placeholder="Ex: QUERO MEU ACESSO IMEDIATO"
                      className="w-full bg-[#161B26] border border-border/80 focus:border-[#FF6A00] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Headline Personalizada (Opcional)</label>
                    <input
                      type="text"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="Deixe em branco para o motor gerar a melhor promessa persuasiva"
                      className="w-full bg-[#161B26] border border-border/80 focus:border-[#FF6A00] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Subheadline (Opcional)</label>
                    <input
                      type="text"
                      value={subheadline}
                      onChange={(e) => setSubheadline(e.target.value)}
                      placeholder="Descrição complementar da proposta única de valor"
                      className="w-full bg-[#161B26] border border-border/80 focus:border-[#FF6A00] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                {selectedArchetype === "DIRECT_RESPONSE_VSL" && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">URL do Vídeo VSL (Embed YouTube/Vimeo)</label>
                    <input
                      type="text"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/embed/..."
                      className="w-full bg-[#161B26] border border-border/80 focus:border-[#FF6A00] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                    />
                  </div>
                )}
              </div>

              {/* 3. INTEGRAÇÃO DE WEBHOOK, CAMPAIGN ID & RASTREAMENTO */}
              <div className="space-y-4 pt-4 border-t border-border/60">
                <label className="text-xs font-extrabold uppercase tracking-widest text-[#FF6A00] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  3. Integração de Webhook, Pixels e Captura de Leads
                </label>

                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Endpoint / Webhook URL</label>
                    <input
                      type="text"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="{{SYSTEM_WEBHOOK_URL}}"
                      className="w-full bg-[#161B26] border border-border/80 focus:border-[#FF6A00] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Campaign ID</label>
                    <input
                      type="text"
                      value={campaignId}
                      onChange={(e) => setCampaignId(e.target.value)}
                      placeholder="{{CAMPAIGN_ID}}"
                      className="w-full bg-[#161B26] border border-border/80 focus:border-[#FF6A00] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Meta Pixel ID (Opcional)</label>
                    <input
                      type="text"
                      value={facebookPixelId}
                      onChange={(e) => setFacebookPixelId(e.target.value)}
                      placeholder="Ex: 123456789012345"
                      className="w-full bg-[#161B26] border border-border/80 focus:border-[#FF6A00] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-300">Google Tag ID / GTM (Opcional)</label>
                    <input
                      type="text"
                      value={googleTagId}
                      onChange={(e) => setGoogleTagId(e.target.value)}
                      placeholder="Ex: G-XXXXXXXXXX"
                      className="w-full bg-[#161B26] border border-border/80 focus:border-[#FF6A00] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB DE PREVIEW EM TEMPO REAL (SANDBOX IFRAME) */}
          {activeTab === "preview" && (
            <div className="flex-1 w-full h-full bg-black relative">
              <iframe
                srcDoc={generatedHtml}
                title="Preview do Código Compilado"
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              />
            </div>
          )}

          {/* TAB DE CÓDIGO HTML PURO */}
          {activeTab === "code" && (
            <div className="flex-1 p-6 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-slate-400 font-mono">
                  Código HTML Completo Compilado • Pronto para Servidor ou Exportação
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? "Copiado!" : "Copiar HTML"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadFile}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar index.html</span>
                  </button>
                </div>
              </div>
              <textarea
                readOnly
                value={generatedHtml}
                className="flex-1 w-full bg-[#08090C] border border-border/80 rounded-2xl p-4 text-xs font-mono text-emerald-400/90 outline-none resize-none selection:bg-emerald-500/30"
              />
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 md:px-7 border-t border-border/60 bg-[#10131B] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> CDNs Injetadas
            </span>
            <span>•</span>
            <span>Tailwind</span>
            <span>•</span>
            <span>Lucide Icons</span>
            <span>•</span>
            <span>Alpine.js</span>
            <span>•</span>
            <span>Choice Cards</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white"
            >
              Fechar
            </button>

            {generatedHtml && (
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-4 py-2.5 rounded-xl border border-border/80 hover:bg-white/10 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copiar HTML</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-orange-500 text-white font-bold text-xs shadow-lg inline-flex items-center gap-2 hover:scale-105 transition-all cursor-pointer disabled:opacity-50"
            >
              <Wand2 className="w-4 h-4" />
              <span>{isGenerating ? "Compilando HTML..." : "Gerar Landing Page de Alta Conversão"}</span>
            </button>

            {generatedHtml && onSaveToSystem && (
              <button
                type="button"
                onClick={handleSaveAndOpen}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg inline-flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>Salvar & Publicar no Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
