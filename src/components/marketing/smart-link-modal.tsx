"use client";

import React, { useState, useMemo } from "react";
import { X, Copy, Check, QrCode, Link as LinkIcon, Share2, Globe, Target, Sparkles, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { SMART_LINK_SOURCES, generateSmartUrl } from "@/lib/link-generator";
import { cn } from "@/lib/utils";

interface SmartLinkModalProps {
  lpId: string;
  lpName: string;
  isExternal?: boolean;
  externalUrl?: string;
  surveyId?: string | null;
  onClose: () => void;
}

export function SmartLinkModal({ lpId, lpName, isExternal, externalUrl, surveyId, onClose }: SmartLinkModalProps) {
  const [linkType, setLinkType] = useState<"traffic" | "action">("traffic");
  const [form, setForm] = useState({
    source: SMART_LINK_SOURCES[0], // "Instagram"
    campaign: "",
    content: "",
    term: "",
  });
  
  const [copied, setCheckCopied] = useState(false);

  const baseUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/lp/${lpId}`;
  }, [lpId]);

  const generatedUrl = useMemo(() => {
    try {
      const url = new URL(baseUrl);
      
      if (linkType === "action") {
        url.searchParams.set("acao", "cadastro");
        url.searchParams.set("pesquisa", "true");
      }

      if (form.source) {
        url.searchParams.set("src", form.source.toLowerCase().replace(/\s+/g, "_"));
        url.searchParams.set("source", form.source);
        url.searchParams.set("utm_source", form.source);
      }
      
      if (form.campaign.trim()) {
        url.searchParams.set("cmp", form.campaign.trim().toLowerCase().replace(/\s+/g, "_"));
        url.searchParams.set("utm_campaign", form.campaign.trim());
      }
      
      if (form.content.trim()) {
        url.searchParams.set("utm_content", form.content.trim());
      }

      if (form.term.trim()) {
        url.searchParams.set("utm_term", form.term.trim());
      }

      return url.toString();
    } catch {
      return baseUrl;
    }
  }, [baseUrl, linkType, form]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedUrl);
    setCheckCopied(true);
    toast.success("Link copiado para a área de transferência!");
    setTimeout(() => setCheckCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden text-card-foreground">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <LinkIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold text-foreground">Gerador de Links Rastreados (UTMs)</h2>
                {isExternal && (
                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    LP Externa
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate max-w-md">
                Página: <span className="text-foreground font-semibold">{lpName}</span>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="h-8 w-8 rounded-full border border-border hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Seleção do Tipo de Link (Divulgação vs Botão de Cadastro) */}
        <div className="px-6 pt-5 pb-2 bg-muted/10 border-b border-border">
          <label className="text-[11px] font-bold text-foreground uppercase tracking-wider block mb-2">
            Finalidade do Link:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setLinkType("traffic")}
              className={cn(
                "p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3",
                linkType === "traffic"
                  ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary/30"
                  : "bg-background border-border hover:border-primary/40 text-muted-foreground"
              )}
            >
              <div className={cn("p-2 rounded-xl shrink-0", linkType === "traffic" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                <Globe className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>1. Link de Divulgação (Tráfego)</span>
                  {linkType === "traffic" && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Para <strong>Anúncios (Meta Ads/Google), Bio do Instagram, Stories e WhatsApp</strong>. Contabiliza a visualização com a origem e direciona para a página.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setLinkType("action")}
              className={cn(
                "p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3",
                linkType === "action"
                  ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary/30"
                  : "bg-background border-border hover:border-primary/40 text-muted-foreground"
              )}
            >
              <div className={cn("p-2 rounded-xl shrink-0", linkType === "action" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                <Target className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>2. Link do Botão CTA (Cadastro/Pesquisa)</span>
                  {linkType === "action" && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Para colar no <strong>botão principal do WordPress / Elementor</strong>. Leva o visitante direto para a tela de cadastro e pesquisa no sistema.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Formulário de Parâmetros e Visualização do Link */}
        <div className="p-6 grid md:grid-cols-12 gap-6 items-start">
          
          {/* Lado Esquerdo: Inputs de Origem e Campanha */}
          <div className="md:col-span-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Origem do Tráfego (Source)</span>
                <span className="text-[10px] text-primary font-semibold">Obrigatório</span>
              </label>
              <select 
                value={form.source}
                onChange={e => setForm({...form, source: e.target.value})}
                className="w-full bg-background border border-border focus:border-primary rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none transition-colors cursor-pointer shadow-sm"
              >
                {SMART_LINK_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <p className="text-[10px] text-muted-foreground">
                Define a origem exata (ex: Instagram, Facebook, Google Ads) que será atribuída ao Lead no CRM.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Nome da Campanha (Campaign)</label>
              <input 
                placeholder="Ex: lancamento_março, black_friday"
                value={form.campaign}
                onChange={e => setForm({...form, campaign: e.target.value})}
                className="w-full bg-background border border-border focus:border-primary rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Identificador do Criativo / Anúncio (Opcional)</label>
              <input 
                placeholder="Ex: video_01_depoimentos, banner_feed"
                value={form.content}
                onChange={e => setForm({...form, content: e.target.value})}
                className="w-full bg-background border border-border focus:border-primary rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors shadow-sm"
              />
            </div>
          </div>

          {/* Lado Direito: Preview do Link e QR Code */}
          <div className="md:col-span-6 flex flex-col items-center bg-muted/20 border border-border rounded-2xl p-5 space-y-4">
            
            <div className="w-full flex items-center justify-between">
              <span className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Link Pronto para Uso
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                {form.source}
              </span>
            </div>

            {/* Container do Link com Botão de Cópia */}
            <div className="w-full space-y-2">
              <div className="p-3 bg-background border border-border rounded-xl flex items-center gap-2 shadow-sm">
                <span className="flex-1 text-[11px] font-mono truncate text-foreground select-all">
                  {generatedUrl}
                </span>
                <button 
                  onClick={copyToClipboard} 
                  className={cn(
                    "px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shrink-0",
                    copied ? "bg-emerald-600 text-white" : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  )}
                  title="Copiar Link"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? "Copiado!" : "Copiar"}</span>
                </button>
              </div>

              <div className="p-2.5 bg-muted/40 rounded-xl text-[10px] text-muted-foreground space-y-1">
                <div className="flex items-center gap-1 text-foreground font-semibold">
                  <span>Como usar este link:</span>
                </div>
                {linkType === "traffic" ? (
                  <p>
                    Copie este link e use-o no <strong>anúncio do {form.source}</strong> ou na sua bio. Ao clicarem, a visualização será computada no sistema com a tag <strong>[{form.source}]</strong> antes de abrir a página externa.
                  </p>
                ) : (
                  <p>
                    Cole este link diretamente no <strong>botão de ação (CTA)</strong> do seu WordPress/Elementor. Quando o visitante clicar no botão, ele abrirá o cadastro e pesquisa do sistema já vinculado à origem <strong>[{form.source}]</strong>.
                  </p>
                )}
              </div>
            </div>

            {/* QR Code */}
            <div className="flex items-center gap-4 pt-2">
              <div className="p-2.5 bg-white rounded-2xl shadow-md border border-zinc-200">
                <QRCodeSVG value={generatedUrl} size={90} />
              </div>
              <div className="text-[10px] text-muted-foreground space-y-1 max-w-[170px]">
                <span className="font-bold text-foreground block">QR Code Rastreado</span>
                <p>Escaneie com a câmera do celular para testar a experiência do lead.</p>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/30 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>Sincronização em tempo real com o CRM e Métricas de Conversão</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            Concluir
          </button>
        </div>

      </div>
    </div>
  );
}