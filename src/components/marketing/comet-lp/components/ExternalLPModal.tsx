import React, { useState } from "react";
import { X, Globe, Link as LinkIcon, ClipboardList, Check, ArrowRight, ShieldCheck, Sparkles, Loader2, Image as ImageIcon, ExternalLink, Code2, Copy } from "lucide-react";
import { toast } from "sonner";

interface ExternalLPModalProps {
  isOpen: boolean;
  onClose: () => void;
  surveys: any[];
  onSaveExternalLP: (data: { name: string; externalUrl: string; surveyId?: string; bannerUrl?: string; description?: string }) => void;
}

export const ExternalLPModal: React.FC<ExternalLPModalProps> = ({
  isOpen,
  onClose,
  surveys,
  onSaveExternalLP,
}) => {
  const [name, setName] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [surveyId, setSurveyId] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState<{
    title?: string;
    description?: string;
    favicon?: string;
    image?: string;
    domain?: string;
  } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  if (!isOpen) return null;

  const handleInspectUrl = async (urlToInspect: string) => {
    const clean = urlToInspect.trim();
    if (!clean || !clean.startsWith("http")) return;

    setIsScraping(true);
    try {
      const res = await fetch("/api/scrape-lp-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: clean }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setScrapedData(data);
          if (!name.trim() && data.title) {
            setName(data.title);
          }
          toast.success("Dados da Landing Page externa detectados com sucesso!");
        }
      }
    } catch (err) {
      console.warn("Failed to scrape LP metadata:", err);
    } finally {
      setIsScraping(false);
    }
  };

  const handleUrlBlur = () => {
    if (externalUrl && !scrapedData) {
      handleInspectUrl(externalUrl);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe um nome para identificar a Landing Page.");
      return;
    }
    if (!externalUrl.trim() || !externalUrl.startsWith("http")) {
      toast.error("Informe uma URL válida iniciando com http:// ou https://");
      return;
    }

    onSaveExternalLP({
      name: name.trim(),
      externalUrl: externalUrl.trim(),
      surveyId: surveyId || undefined,
      bannerUrl: scrapedData?.image,
      description: scrapedData?.description,
    });
    onClose();
  };

  const systemWebhook = typeof window !== "undefined" 
    ? `${window.location.origin}/api/submit-lead` 
    : "https://seu-dominio.com/api/submit-lead";

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(systemWebhook);
    setCopiedWebhook(true);
    toast.success("URL do Webhook de Captura copiada!");
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-2xl text-card-foreground max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shadow-inner">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Motor de Agregação de LP Externa</h2>
              <p className="text-xs text-muted-foreground">Conecte páginas de WordPress, Elementor, Webflow ou URL própria</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-border hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">URL Externa da Landing Page</label>
            <div className="relative">
              <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="url"
                required
                value={externalUrl}
                onChange={(e) => {
                  setExternalUrl(e.target.value);
                  setScrapedData(null);
                }}
                onBlur={handleUrlBlur}
                placeholder="https://meusite.com.br/pagina-de-captura"
                className="w-full bg-background border border-border focus:border-blue-500 rounded-xl pl-10 pr-24 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors shadow-sm"
              />
              <button
                type="button"
                onClick={() => handleInspectUrl(externalUrl)}
                disabled={isScraping || !externalUrl.startsWith("http")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
              >
                {isScraping ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                <span>{isScraping ? "Lendo..." : "Detectar"}</span>
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              O motor inspeciona a URL externa e extrai títulos, favicons e metadados automaticamente.
            </p>
          </div>

          {/* Card de Pré-visualização dos Metadados Extraídos */}
          {scrapedData && (
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2 text-[10px] font-bold text-blue-500 uppercase tracking-wider">
                <Globe className="h-3 w-3" /> Metadados Detectados
              </div>
              <div className="flex items-start gap-3">
                {scrapedData.favicon && (
                  <img
                    src={scrapedData.favicon}
                    alt="Favicon"
                    className="w-7 h-7 rounded-lg border border-border bg-background p-0.5 object-contain shrink-0 mt-0.5"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="text-xs font-bold text-foreground truncate">{scrapedData.title || scrapedData.domain}</div>
                  {scrapedData.description && (
                    <div className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                      {scrapedData.description}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Nome da Campanha / Identificador</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Landing Page de Lançamento (WordPress / Webflow)"
              className="w-full bg-background border border-border focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none transition-colors shadow-sm"
            />
          </div>

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5 text-emerald-600" /> Atribuir Pesquisa do Sistema (Opcional)
              </label>
              {surveyId && (
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Pesquisa Vinculada
                </span>
              )}
            </div>
            <select
              value={surveyId}
              onChange={(e) => setSurveyId(e.target.value)}
              className="w-full bg-background border border-border focus:border-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none cursor-pointer transition-colors shadow-sm"
            >
              <option value="">Nenhuma pesquisa atribuída (Redirecionamento Puro / Smart Link)</option>
              {surveys.map((s) => (
                <option key={s.id} value={s.id}>
                  📋 {s.name} ({s.questions?.length || 0} perguntas)
                </option>
              ))}
            </select>
          </div>

          {/* Seção de Webhook para WordPress / Elementor / Webflow */}
          <div className="p-3.5 rounded-2xl bg-blue-500/5 border border-blue-500/15 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Code2 className="h-3.5 w-3.5" /> Webhook Universal de Captura
              </span>
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 flex items-center gap-1 cursor-pointer"
              >
                {copiedWebhook ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>{copiedWebhook ? "Copiado!" : "Copiar Webhook"}</span>
              </button>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground bg-background/80 px-2.5 py-1.5 rounded-lg border border-border truncate">
              {systemWebhook}
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Envie formulários externos (Elementor, Webflow, Kiwify, etc.) diretamente para este endpoint. O sistema registrará o lead e sincronizará no CRM em tempo real.
            </p>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-blue-500/20"
            >
              <span>Conectar e Gerar Smart Link</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

