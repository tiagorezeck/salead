import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  X,
  Download,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  QrCode,
  Globe,
} from "lucide-react";
import type { AgendaEvent, AgendaEventStatus } from "@/types/agenda";
import { buildPublicAgendaPath } from "@/lib/agenda-engine";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  evento: AgendaEvent | null;
  onUpdatePublicConfig: (idEvento: string, patch: Partial<AgendaEvent>) => Promise<any>;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  evento,
  onUpdatePublicConfig,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://salead-app.vercel.app";
  const publicPath = evento ? buildPublicAgendaPath(evento.slug) : "/agendar";
  const fullUrl = `${origin}${publicPath}`;

  useEffect(() => {
    if (!isOpen || !evento) return;
    QRCode.toDataURL(fullUrl, {
      width: 320,
      margin: 2,
      color: { dark: "#111827", light: "#FFFFFF" },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(""));
  }, [isOpen, evento, fullUrl]);

  if (!isOpen || !evento) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success("Link público copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `qr-agenda-${evento.slug}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("QR Code baixado em PNG!");
  };

  const waShareUrl = `https://wa.me/?text=${encodeURIComponent(
    `Olá! Escolha o melhor dia e horário para ${evento.nome} no link abaixo:\n${fullUrl}`
  )}`;

  const isPublicOpen =
    evento.status === "PUBLICADO" && evento.agenda_publica_ativa !== false;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden my-6">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4 bg-muted/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl border border-primary/20 bg-primary/10 text-primary grid place-items-center shrink-0">
              <QrCode className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Link Público & QR Code
              </div>
              <h3 className="text-base font-bold text-foreground truncate">
                {evento.nome}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* QR Code Visual */}
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/20 p-5">
            {qrDataUrl ? (
              <div className="rounded-xl bg-white p-3 border border-border shadow-xs">
                <img
                  src={qrDataUrl}
                  alt={`QR Code para ${evento.nome}`}
                  className="h-44 w-44 object-contain"
                />
              </div>
            ) : (
              <div className="h-44 w-44 rounded-xl border border-border bg-muted grid place-items-center text-xs text-muted-foreground">
                Gerando QR Code...
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={!qrDataUrl}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" /> Baixar PNG
              </button>
              <a
                href={publicPath}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Abrir Página Pública
              </a>
              <a
                href={waShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
              >
                <MessageCircle className="h-3.5 w-3.5" /> Enviar no WhatsApp
              </a>
            </div>
          </div>

          {/* Copyable Link */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              URL Direta do Evento (compatível com LPs e Campanhas)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={fullUrl}
                className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-mono text-foreground"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-muted cursor-pointer shrink-0"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>

          {/* Quick Public Status Control */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-foreground">
                  Disponibilidade Pública
                </span>
              </div>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border",
                  isPublicOpen
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                )}
              >
                {isPublicOpen ? "Aberta" : evento.status === "ENCERRADO" ? "Encerrada" : "Fechada"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: "PUBLICADO", label: "Publicada" },
                  { id: "PAUSADO", label: "Agenda Fechada" },
                  { id: "ENCERRADO", label: "Encerrada" },
                ] as Array<{ id: AgendaEventStatus; label: string }>
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    onUpdatePublicConfig(evento.id_evento, {
                      status: opt.id,
                      agenda_publica_ativa: opt.id === "PUBLICADO",
                      motivo_indisponivel:
                        opt.id === "ENCERRADO"
                          ? "ENCERRADO"
                          : opt.id === "PAUSADO"
                          ? "AGENDA_FECHADA"
                          : undefined,
                    })
                  }
                  className={cn(
                    "rounded-lg border px-2 py-2 text-[11px] font-semibold transition-colors cursor-pointer",
                    evento.status === opt.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <label className="flex items-center justify-between pt-1 text-xs cursor-pointer">
              <span className="text-muted-foreground">
                Permitir Lista de Espera quando lotado ou fechado
              </span>
              <input
                type="checkbox"
                checked={evento.permitir_lista_espera !== false}
                onChange={(e) =>
                  onUpdatePublicConfig(evento.id_evento, {
                    permitir_lista_espera: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-border"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
