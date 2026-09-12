import React, { useState } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { TalkWhatsAppConfig } from "../types/landingPage";

interface FloatingTalkWhatsAppWidgetProps {
  talkConfig?: TalkWhatsAppConfig;
  niche?: string;
  city?: string;
  isEditorPreview?: boolean;
}

export const FloatingTalkWhatsAppWidget: React.FC<FloatingTalkWhatsAppWidgetProps> = ({
  talkConfig,
  niche,
  city,
  isEditorPreview = false,
}) => {
  const [isOpenGreeting, setIsOpenGreeting] = useState(true);

  if (!talkConfig || talkConfig.enabled === false || !talkConfig.phoneNumber) {
    return null;
  }

  const cleanPhone = talkConfig.phoneNumber.replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
  
  // Replace variables in default message
  let resolvedMessage = talkConfig.defaultMessage || "Olá! Gostaria de mais informações.";
  if (niche) resolvedMessage = resolvedMessage.replace(/\{nicho\}/gi, niche);
  if (city) resolvedMessage = resolvedMessage.replace(/\{cidade\}/gi, city);

  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(resolvedMessage)}`;
  const positionClass = talkConfig.floatingWidgetPosition === "bottom-left" ? "left-5" : "right-5";

  const handleOpenWhatsApp = (e: React.MouseEvent) => {
    if (isEditorPreview) {
      e.preventDefault();
      return;
    }
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={`fixed bottom-6 ${positionClass} z-40 flex flex-col items-end gap-2.5 pointer-events-auto select-none`}
    >
      {/* Greeting Bubble Card */}
      {isOpenGreeting && (
        <div className="relative max-w-xs sm:max-w-sm rounded-2xl bg-zinc-950/95 border border-emerald-500/40 shadow-[0_12px_35px_rgba(0,0,0,0.8)] p-3.5 backdrop-blur-xl text-white text-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpenGreeting(false);
            }}
            className="absolute top-2 right-2 p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Fechar Mensagem"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-start gap-2.5 pr-4">
            {talkConfig.floatingWidgetAvatarUrl ? (
              <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0 border border-emerald-500/60">
                <img
                  src={talkConfig.floatingWidgetAvatarUrl}
                  alt="Atendente"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-zinc-950 animate-pulse" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-white text-[11px]">
                <span>Atendimento WhatsApp</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-400 text-[9px] font-mono">
                  {talkConfig.floatingWidgetBadgeText || "Online Agora"}
                </span>
              </div>
              <p className="text-zinc-300 text-[11px] leading-relaxed">
                {talkConfig.floatingWidgetGreeting || "Olá! Tem alguma dúvida? Clique aqui para conversar comigo no WhatsApp."}
              </p>
            </div>
          </div>

          <a
            href={isEditorPreview ? undefined : whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOpenWhatsApp}
            className="mt-2.5 w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-950/60 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Iniciar Conversa Rápida</span>
          </a>
        </div>
      )}

      {/* Main Floating WhatsApp Pulse Button */}
      <a
        href={isEditorPreview ? undefined : whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleOpenWhatsApp}
        className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_8px_30px_rgba(16,185,129,0.5)] transition-all hover:scale-110 cursor-pointer"
        title="Falar no WhatsApp"
      >
        {/* Pulse Waves */}
        <span className="absolute -inset-1.5 rounded-full bg-emerald-500/40 animate-ping -z-10" />
        
        {/* SVG WhatsApp Logo */}
        <svg
          className="w-7 h-7 fill-white group-hover:scale-105 transition-transform"
          viewBox="0 0 24 24"
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>

        {/* Small Active Green Dot */}
        <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-zinc-950" />
      </a>
    </div>
  );
};
