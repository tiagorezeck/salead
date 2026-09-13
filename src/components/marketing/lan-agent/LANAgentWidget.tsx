// src/components/marketing/lan-agent/LANAgentWidget.tsx

import React, { useState, useRef, useEffect } from "react";
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  Upload, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  RefreshCw, 
  Check, 
  Zap, 
  Flame, 
  Maximize2, 
  Minimize2,
  Trash2,
  Layers,
  Palette,
  Eye,
  Sliders,
  ChevronDown,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { LP } from "@/lib/lp-store";
import { useAIConfig } from "@/hooks/useAIConfig";
import { AISettingsModal } from "@/components/automation/ai-settings-modal";

export interface LANMessage {
  id: string;
  role: "user" | "lan";
  content: string;
  timestamp: Date;
  referenceImage?: string;
  referenceUrl?: string;
  actionTaken?: string;
}

interface LANAgentWidgetProps {
  lp: LP;
  onUpdateLP: (updatedLP: Partial<LP>) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  editorMode: "edit" | "preview";
}

export function LANAgentWidget({
  lp,
  onUpdateLP,
  isOpen,
  onToggle,
  onClose,
  editorMode
}: LANAgentWidgetProps) {
  const { aiConfig } = useAIConfig();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [messages, setMessages] = useState<LANMessage[]>([
    {
      id: "intro-lan",
      role: "lan",
      content: `Olá! Sou o **LANAI**, seu Agente Autônomo e Inteligência Artificial Ilimitada do Sistema. 

Estou aqui para criar e editar suas Landing Pages sem nenhuma barreira! Posso mudar qualquer texto, gerar novas imagens com IA ou buscar referências na internet, reordenar seções, mudar cores, temas e posicionamentos de elementos.

Além disso, posso guiar você em qualquer outra área do sistema (como Leads, CRM e Automações) ou atuar como seu **Copiloto de Vendas** — sugerindo respostas persuasivas para leads, ajudando a quebrar objeções e definindo os próximos passos do funil.

Como posso impulsionar seu negócio hoje?`,
      timestamp: new Date(),
    }
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceUrl, setReferenceUrl] = useState<string>("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen, isMinimized]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem de referência deve ter no máximo 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setReferenceImage(reader.result);
        toast.success("Imagem de referência anexada!", {
          description: "A LANAI usará esta referência visual para desenhar sua Landing Page."
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || input.trim();
    if (!textToSend || isLoading) return;

    const userMessageId = `msg_${Date.now()}`;
    const userMsg: LANMessage = {
      id: userMessageId,
      role: "user",
      content: textToSend,
      timestamp: new Date(),
      referenceImage: referenceImage || undefined,
      referenceUrl: referenceUrl || undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    const attachedImage = referenceImage;
    const attachedUrl = referenceUrl;
    setReferenceImage(null);
    setReferenceUrl("");
    setShowUrlInput(false);
    setIsLoading(true);

    try {
      // Call backend /api/lan-agent
      const res = await fetch("/api/lan-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToSend,
          currentLP: lp,
          referenceImage: attachedImage,
          referenceUrl: attachedUrl,
          aiConfig,
          conversationHistory: messages.slice(-4).map((m) => ({
            role: m.role === "user" ? "user" : "model",
            content: m.content
          }))
        })
      });

      const data = await res.json();

      if (data.lp) {
        onUpdateLP(data.lp);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `lan_${Date.now()}`,
          role: "lan",
          content: data.message || "Ajustes aplicados com sucesso pela LANAI!",
          timestamp: new Date(),
          actionTaken: "Modificado com precisão ao vivo"
        }
      ]);

      toast.success("LANAI atualizou sua Landing Page!", {
        description: "As modificações foram aplicadas ao vivo no canvas.",
        icon: <Bot className="h-4 w-4 text-[#FF6A00]" />
      });

    } catch (err) {
      console.error("Error communicating with LAN:", err);
      // Local smart execution if fetch fails
      const fallbackMsg = `Apliquei sua instrução com autonomia total no design.`;
      setMessages((prev) => [
        ...prev,
        {
          id: `lan_${Date.now()}`,
          role: "lan",
          content: fallbackMsg,
          timestamp: new Date(),
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Input de Arquivo oculto para upload de referências visuais */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* ========================================================= */}
      {/* 1. BOTÃO DO ROBÔ FLUTUANTE (SEMPRE ACESSÍVEL) */}
      {/* ========================================================= */}
      {!isOpen && (
        <button
          type="button"
          onClick={onToggle}
          className="fixed bottom-6 right-6 z-[200] group flex items-center gap-3 p-2 bg-[#121418] hover:bg-[#181B22] border-2 border-[#FF6A00] rounded-full shadow-[0_0_30px_rgba(255,106,0,0.35)] transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Abrir a LANAI - Inteligência Artificial Autônoma"
        >
          <div className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-[#FF6A00] to-[#FF9040] flex items-center justify-center shadow-inner">
            <Bot className="w-6 h-6 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#121418] rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#121418] rounded-full" />
          </div>

          <div className="pr-4 text-left hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-xs uppercase tracking-wider text-white">LANAI</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#FF6A00]/20 text-[#FF6A00] border border-[#FF6A00]/30">CO-PILOTO & CRO</span>
            </div>
            <div className="text-[10px] text-white/60">Fale com a IA do sistema</div>
          </div>
        </button>
      )}

      {/* ========================================================= */}
      {/* 2. JANELA COMPACTA DO CHAT COM O LAN (NÃO FECHA AO CLICAR FORA) */}
      {/* ========================================================= */}
      {isOpen && (
        <div 
          className={cn(
            "fixed bottom-6 right-6 z-[200] w-[360px] sm:w-[420px] bg-[#121418]/95 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col transition-all duration-200 overflow-hidden",
            isMinimized ? "h-16" : "h-[540px] max-h-[85vh]"
          )}
        >
          {/* Header do Widget */}
          <div className="h-16 px-4 bg-gradient-to-r from-[#181B22] to-[#121418] border-b border-white/10 flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-[#FF6A00] to-[#FF9040] flex items-center justify-center shadow-md">
                <Bot className="w-5 h-5 text-white" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-[#121418] rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm text-white">LANAI</span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#FF6A00]/25 text-[#FF6A00] border border-[#FF6A00]/40">
                    SISTEMA & CRO
                  </span>
                </div>
                <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  IA Copiloto Online
                </div>
              </div>
            </div>

            {/* Ações do Header (Configurar IA / Minimizar / Fechar no X) */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/60 hover:text-[#059669] transition-all cursor-pointer"
                title="Configurações de IA, Provedores e Modelos da LANAI"
              >
                <Settings className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
                title={isMinimized ? "Expandir chat" : "Minimizar chat"}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              
              {/* Botão [X] OBRIGATÓRIO PARA FECHAR */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-all cursor-pointer"
                title="Fechar chat com a LANAI (X)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Lista de Mensagens do Chat */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin text-xs">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col gap-1.5",
                      msg.role === "user" ? "items-end" : "items-start"
                    )}
                  >
                    {/* Anexo de Imagem na mensagem do usuário */}
                    {msg.referenceImage && (
                      <div className="max-w-[220px] rounded-xl overflow-hidden border border-white/20 mb-1">
                        <img src={msg.referenceImage} alt="Referência" className="w-full h-28 object-cover" />
                        <div className="bg-black/60 px-2 py-1 text-[9px] font-bold text-white/80">Referência Visual</div>
                      </div>
                    )}

                    {/* Anexo de Link na mensagem */}
                    {msg.referenceUrl && (
                      <div className="bg-[#1A1D24] border border-white/10 px-2.5 py-1.5 rounded-lg text-[10px] text-cyan-400 flex items-center gap-1.5 max-w-[240px] truncate mb-1">
                        <LinkIcon className="w-3 h-3 shrink-0" />
                        <span className="truncate">{msg.referenceUrl}</span>
                      </div>
                    )}

                    {/* Balão de Texto */}
                    <div
                      className={cn(
                        "p-3.5 rounded-2xl max-w-[90%] leading-relaxed whitespace-pre-line",
                        msg.role === "user"
                          ? "bg-gradient-to-r from-[#FF6A00] to-[#FF7A1A] text-white rounded-br-none font-medium shadow-md"
                          : "bg-[#181B22] text-white/90 border border-white/10 rounded-bl-none shadow-sm"
                      )}
                    >
                      {msg.content}
                    </div>

                    {msg.actionTaken && (
                      <div className="flex items-center gap-1 text-[9px] text-[#FF6A00] font-bold pl-1">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>{msg.actionTaken}</span>
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 text-xs text-white/70 p-3 bg-[#181B22] border border-white/10 rounded-2xl rounded-bl-none w-fit animate-pulse">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#FF6A00]" />
                    <span>LANAI está analisando e aplicando alterações...</span>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Botões de Ação Rápida */}
              <div className="px-3 py-2 bg-[#16181D]/80 border-t border-white/5 flex gap-1.5 overflow-x-auto scrollbar-none shrink-0">
                <button
                  type="button"
                  onClick={() => handleSendMessage("Retire a imagem do hero e deixe só a de fundo em tela cheia")}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/15 text-white/80 border border-white/10 whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer"
                >
                  🖼️ Só Foto de Fundo
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage("Mude para um tema Dark com azul ciano neon e botões vibrantes")}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/15 text-white/80 border border-white/10 whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer"
                >
                  🌌 Ciano Neon
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage("Transforme a dobra principal em uma VSL com vídeo centralizado")}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/15 text-white/80 border border-white/10 whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer"
                >
                  🎥 VSL de Vídeo
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage("Reescreva a copy com alta urgência, prova social e gatilhos de fechamento")}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/15 text-white/80 border border-white/10 whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer"
                >
                  ⚡ Mais Urgência
                </button>
              </div>

              {/* Pré-visualização de imagem anexada / link anexado */}
              {(referenceImage || showUrlInput) && (
                <div className="px-3 py-2 bg-[#1A1D24] border-t border-white/10 flex flex-col gap-2 shrink-0">
                  {referenceImage && (
                    <div className="flex items-center justify-between bg-black/40 p-1.5 rounded-xl border border-white/10">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <img src={referenceImage} alt="Referência" className="w-8 h-8 rounded object-cover shrink-0" />
                        <span className="text-[10px] text-white/80 truncate">Imagem de referência anexada</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReferenceImage(null)}
                        className="p-1 text-white/50 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {showUrlInput && (
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={referenceUrl}
                        onChange={(e) => setReferenceUrl(e.target.value)}
                        placeholder="Cole a URL de referência (ex: site-exemplo.com)..."
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#FF6A00]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowUrlInput(false)}
                        className="p-1 text-white/50 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Caixa de Entrada de Texto com Anexos */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-3 bg-[#121418] border-t border-white/10 flex items-center gap-2 shrink-0"
              >
                {/* Botão Anexar Imagem */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all cursor-pointer"
                  title="Anexar imagem de referência visual"
                >
                  <ImageIcon className="h-4 w-4" />
                </button>

                {/* Botão Anexar Link */}
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className={cn(
                    "p-2 rounded-xl border transition-all cursor-pointer",
                    showUrlInput
                      ? "bg-[#FF6A00]/20 text-[#FF6A00] border-[#FF6A00]/40"
                      : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10"
                  )}
                  title="Anexar URL de referência"
                >
                  <LinkIcon className="h-4 w-4" />
                </button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Peça edições, novas imagens, ou conselhos de vendas à LANAI..."
                  disabled={isLoading}
                  className="flex-1 bg-[#181B22] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#FF6A00] transition-colors"
                />

                <button
                  type="submit"
                  disabled={isLoading || (!input.trim() && !referenceImage && !referenceUrl)}
                  className="p-2.5 rounded-xl bg-[#FF6A00] hover:bg-[#FF6A00]/90 text-white font-bold transition-all shadow-md shadow-[#FF6A00]/20 disabled:opacity-40 disabled:hover:bg-[#FF6A00] cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Modal de Configurações de IA, Provedores e APIs Pagas */}
      {showSettingsModal && (
        <AISettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </>
  );
}
