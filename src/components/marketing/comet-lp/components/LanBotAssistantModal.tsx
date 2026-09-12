import React, { useState } from "react";
import { Sparkles, Bot, Zap, Send, X, RefreshCw, Palette, MessageSquare, ShieldCheck, HelpCircle, CheckCircle2 } from "lucide-react";
import { LandingPage } from "../types/landingPage";
import { toast } from "sonner";

interface LanBotAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  page: LandingPage;
  onUpdatePage: (updatedPage: LandingPage) => void;
}

export const LanBotAssistantModal: React.FC<LanBotAssistantModalProps> = ({
  isOpen,
  onClose,
  page,
  onUpdatePage,
}) => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const quickPrompts = [
    { label: "🎨 Tema Dark + Verde Esmeralda", text: "Mude o tema da página para dark e a cor de destaque para verde esmeralda." },
    { label: "🚀 Headline Mais Agressiva", text: "Reescreva a headline e a subheadline para ficar mais forte, persuasiva e com alto impacto de conversão." },
    { label: "📱 Foco em WhatsApp", text: "Ajuste o botão de CTA e a chamada para focar em agendamento direto pelo WhatsApp." },
    { label: "🎥 Hero de Vídeo (VSL)", text: "Mude o modelo do Hero para split_video com destaque para apresentação em vídeo." },
    { label: "💬 Depoimentos de Alto Valor", text: "Reescreva os depoimentos para parecerem de clientes reais do meu nicho com resultados comprovados." },
    { label: "🛡️ Garantia & Qualificação", text: "Atualize a garantia para 30 dias e ajuste o Quiz para qualificar leads de alta renda." },
  ];

  const handleSendPrompt = async (customText?: string) => {
    const textToSend = customText || prompt;
    if (!textToSend.trim()) {
      toast.error("Por favor, digite a instrução para o Robô LAN.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/comet-lp/refine-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page,
          prompt: textToSend,
        }),
      });

      const data = await response.json();

      if (data.success && data.page) {
        onUpdatePage(data.page);
        toast.success(data.message || "Página atualizada pelo Robô LAN com sucesso!");
        setPrompt("");
        onClose();
      } else {
        toast.error(data.error || "Não foi possível aplicar a alteração pelo LAN.");
      }
    } catch (err) {
      console.error("Erro ao comunicar com Robô LAN:", err);
      toast.error("Ocorreu um erro ao processar seu pedido no LAN.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-zinc-950 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Glowing Top Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-orange-500 via-purple-500 to-cyan-500 animate-pulse" />

        {/* Header */}
        <div className="p-5 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-orange-600 p-0.5 shadow-lg shadow-purple-500/20">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <Bot className="w-5 h-5 text-purple-400 animate-bounce" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-tight">LANAI • Landing Page AI</h3>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Online
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Peça qualquer ajuste, mudança de cores, novas seções ou reescrita de copy por prompt ao LANAI.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Quick Action Chips */}
          <div>
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Atalhos Rápidos (Sugestões do LANAI):</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickPrompts.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setPrompt(item.text);
                    handleSendPrompt(item.text);
                  }}
                  className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 hover:bg-purple-950/20 text-left transition-all group cursor-pointer disabled:opacity-50"
                >
                  <span className="text-xs font-bold text-zinc-200 group-hover:text-purple-300 transition-colors">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Prompt Box */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
              <span>Instrução Personalizada para o LANAI:</span>
            </label>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              placeholder="Ex: 'LANAI, altere a cor do tema para azul, reescreva os depoimentos para o nicho de clínica de estética e coloque um botão de WhatsApp flutuante'..."
              className="w-full p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500/80 transition-colors resize-none disabled:opacity-50"
            />
          </div>

          {loading && (
            <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 text-center space-y-2 animate-pulse">
              <RefreshCw className="w-6 h-6 text-purple-400 animate-spin mx-auto" />
              <p className="text-xs font-bold text-purple-200">LANAI reestruturando e ajustando a sua Landing Page...</p>
              <p className="text-[11px] text-purple-400/80">Otimizando hierarquia visual, copy de conversão e elementos de apoio.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-900/90 border-t border-zinc-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-xs font-bold text-zinc-300 cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={loading || !prompt.trim()}
            onClick={() => handleSendPrompt()}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-orange-600 hover:from-purple-500 hover:to-orange-500 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-purple-500/25 cursor-pointer disabled:opacity-50 transition-all"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Aplicando com LANAI...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Enviar para o LANAI</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
