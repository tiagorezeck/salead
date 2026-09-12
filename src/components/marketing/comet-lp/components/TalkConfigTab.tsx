import React from "react";
import {
  MessageCircle,
  PhoneCall,
  Send,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Copy,
  Info,
  Camera,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { TalkWhatsAppConfig, DEFAULT_TALK_CONFIG } from "../types/landingPage";

interface TalkConfigTabProps {
  talkConfig?: TalkWhatsAppConfig;
  niche?: string;
  city?: string;
  onUpdateTalkConfig: (updater: (prev: TalkWhatsAppConfig) => TalkWhatsAppConfig) => void;
  onOpenImagePicker?: (target: {
    type: "hero" | "bento" | "testimonial" | "avatar";
    currentUrl: string;
    itemId?: string;
    title: string;
  }) => void;
}

const MESSAGE_TEMPLATES = [
  {
    id: "general",
    title: "Dúvida Geral & Informações",
    text: "Olá! Vi a sua página e gostaria de tirar algumas dúvidas e receber mais informações.",
  },
  {
    id: "niche",
    title: "Personalizado com Nicho e Cidade",
    text: "Olá! Gostaria de saber mais sobre os serviços de {nicho} em {cidade}.",
  },
  {
    id: "booking",
    title: "Agendamento / Sessão",
    text: "Olá! Quero verificar os horários disponíveis para agendamento esta semana.",
  },
  {
    id: "offer",
    title: "Garantir Vaga / Oferta Especial",
    text: "Olá! Quero aproveitar a condição especial e garantir a minha vaga agora!",
  },
];

export const TalkConfigTab: React.FC<TalkConfigTabProps> = ({
  talkConfig = DEFAULT_TALK_CONFIG,
  niche = "Negócio",
  city = "Brasil",
  onUpdateTalkConfig,
  onOpenImagePicker,
}) => {
  const currentConfig: TalkWhatsAppConfig = {
    ...DEFAULT_TALK_CONFIG,
    ...talkConfig,
  };

  const cleanPhone = (currentConfig.phoneNumber || "").replace(/\D/g, "");
  const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

  let resolvedPreviewMessage = currentConfig.defaultMessage || "";
  if (niche) resolvedPreviewMessage = resolvedPreviewMessage.replace(/\{nicho\}/gi, niche);
  if (city) resolvedPreviewMessage = resolvedPreviewMessage.replace(/\{cidade\}/gi, city);

  const testWhatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(resolvedPreviewMessage)}`;

  return (
    <div className="space-y-6 text-zinc-100">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/80 via-zinc-900 to-zinc-950 border border-emerald-500/40 space-y-2.5 shadow-lg shadow-emerald-950/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">TALK • Integração WhatsApp</h3>
              <p className="text-[11px] text-emerald-300 font-medium">Redirecionamento automático e mensagens prontas</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onUpdateTalkConfig((prev) => ({
                ...prev,
                enabled: !prev.enabled,
              }))
            }
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              currentConfig.enabled
                ? "bg-emerald-600 text-white shadow"
                : "bg-zinc-800 text-zinc-400 border border-zinc-700"
            }`}
          >
            <span>{currentConfig.enabled ? "Ativo" : "Desativado"}</span>
          </button>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          Configure o número do WhatsApp geral e a mensagem pré-formatada que os visitantes enviarão ao clicar nos botões ou no balão flutuante.
        </p>
      </div>

      {/* Main WhatsApp Phone & Action */}
      <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-zinc-200 flex items-center gap-1.5">
            <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
            <span>Número de WhatsApp do Atendimento (com DDD)</span>
          </label>
          <div className="relative">
            <input
              type="tel"
              value={currentConfig.phoneNumber || ""}
              onChange={(e) => {
                const val = e.target.value;
                onUpdateTalkConfig((prev) => ({
                  ...prev,
                  phoneNumber: val,
                }));
              }}
              placeholder="Ex: 5511999999999 ou (11) 99999-9999"
              className="w-full pl-3 pr-24 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
              +{cleanPhone || "55..."}
            </span>
          </div>
          <span className="text-[10px] text-zinc-400 block">
            Insira o código do país (55) + DDD + número (ex: 5511998765432).
          </span>
        </div>

        {/* Global CTA Override Switch */}
        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/90 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Aplicar WhatsApp em todos os botões CTA</span>
            </span>
            <span className="text-[10px] text-zinc-400 block">
              Redireciona os botões principais da página direto para o seu WhatsApp com a mensagem pronta.
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              onUpdateTalkConfig((prev) => ({
                ...prev,
                applyToAllCtaButtons: !prev.applyToAllCtaButtons,
              }))
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              currentConfig.applyToAllCtaButtons
                ? "bg-emerald-600 text-white shadow"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
            }`}
          >
            {currentConfig.applyToAllCtaButtons ? "Ativado" : "Desativado"}
          </button>
        </div>
      </div>

      {/* Default Message & Fast Templates */}
      <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mensagem Pré-Definida (Template TALK)</span>
            </label>
            <div className="flex items-center gap-1 text-[10px] text-zinc-400">
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 font-mono text-purple-300">{"{nicho}"}</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 font-mono text-purple-300">{"{cidade}"}</span>
            </div>
          </div>

          <textarea
            rows={3}
            value={currentConfig.defaultMessage || ""}
            onChange={(e) => {
              const val = e.target.value;
              onUpdateTalkConfig((prev) => ({
                ...prev,
                defaultMessage: val,
              }));
            }}
            placeholder="Ex: Olá! Gostaria de saber mais sobre os serviços de {nicho} em {cidade}..."
            className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 font-medium leading-relaxed"
          />
        </div>

        {/* Fast Template Suggestions */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-zinc-400 block">Modelos de Mensagem Rápida:</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MESSAGE_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() =>
                  onUpdateTalkConfig((prev) => ({
                    ...prev,
                    defaultMessage: tmpl.text,
                  }))
                }
                className="p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800/80 border border-zinc-800 hover:border-emerald-500/50 text-left transition-all cursor-pointer group"
              >
                <div className="text-[11px] font-bold text-white group-hover:text-emerald-300 flex items-center gap-1">
                  <span>{tmpl.title}</span>
                </div>
                <p className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5 leading-snug">
                  {tmpl.text}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Widget Configurations (Atendente / Balão de Saudação) */}
      <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Widget Flutuante de WhatsApp (Canto da Tela)</span>
            </span>
            <span className="text-[10px] text-zinc-400 block mt-0.5">
              Exibe um botão flutuante com balão de saudação na página
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              onUpdateTalkConfig((prev) => ({
                ...prev,
                floatingWidgetEnabled: !(prev.floatingWidgetEnabled ?? true),
              }))
            }
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              currentConfig.floatingWidgetEnabled !== false
                ? "bg-emerald-600 text-white"
                : "bg-zinc-950 text-zinc-400 border border-zinc-800"
            }`}
          >
            {currentConfig.floatingWidgetEnabled !== false ? "Ativo" : "Oculto"}
          </button>
        </div>

        {currentConfig.floatingWidgetEnabled !== false && (
          <div className="space-y-3 pt-2 border-t border-zinc-800/80 text-xs">
            {/* Position */}
            <div className="space-y-1.5">
              <label className="block text-zinc-300 font-bold">Posição do Botão Flutuante</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateTalkConfig((prev) => ({
                      ...prev,
                      floatingWidgetPosition: "bottom-right",
                    }))
                  }
                  className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    (currentConfig.floatingWidgetPosition || "bottom-right") === "bottom-right"
                      ? "bg-emerald-950/60 border-emerald-500 text-white"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  Canto Direito (Padrão)
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateTalkConfig((prev) => ({
                      ...prev,
                      floatingWidgetPosition: "bottom-left",
                    }))
                  }
                  className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                    currentConfig.floatingWidgetPosition === "bottom-left"
                      ? "bg-emerald-950/60 border-emerald-500 text-white"
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  Canto Esquerdo
                </button>
              </div>
            </div>

            {/* Greeting Message */}
            <div className="space-y-1.5">
              <label className="block text-zinc-300 font-bold">Texto de Saudação do Balão</label>
              <input
                type="text"
                value={currentConfig.floatingWidgetGreeting || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateTalkConfig((prev) => ({
                    ...prev,
                    floatingWidgetGreeting: val,
                  }));
                }}
                placeholder="Ex: Olá! Tem alguma dúvida? Clique aqui para conversar comigo no WhatsApp."
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            {/* Status Badge */}
            <div className="space-y-1.5">
              <label className="block text-zinc-300 font-bold">Badge de Status</label>
              <input
                type="text"
                value={currentConfig.floatingWidgetBadgeText || "Online Agora"}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateTalkConfig((prev) => ({
                    ...prev,
                    floatingWidgetBadgeText: val,
                  }));
                }}
                placeholder="Ex: Online Agora, Atendimento Rápido"
                className="w-full px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            {/* Avatar Photo */}
            <div className="space-y-1.5">
              <label className="block text-zinc-300 font-bold">Foto do Atendente / Avatar</label>
              <div className="flex items-center gap-3">
                <img
                  src={
                    currentConfig.floatingWidgetAvatarUrl ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                  }
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500/50"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={() =>
                    onOpenImagePicker?.({
                      type: "avatar",
                      currentUrl: currentConfig.floatingWidgetAvatarUrl || "",
                      title: "Trocar Foto do Atendente WhatsApp",
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 text-emerald-400 hover:text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Trocar Foto</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Live WhatsApp Link Test & Preview Card */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-emerald-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Link Gerado em Tempo Real</span>
          </span>
          <span className="text-[10px] text-emerald-400 font-mono font-semibold">wa.me</span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs space-y-1.5">
          <div className="text-zinc-400 text-[10px] font-mono truncate">{testWhatsappUrl}</div>
          <div className="text-emerald-300 font-medium text-[11px] bg-zinc-950 p-2 rounded-lg border border-zinc-800">
            "{resolvedPreviewMessage}"
          </div>
        </div>

        <a
          href={testWhatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition-all cursor-pointer"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Testar Abertura do WhatsApp Agora</span>
        </a>
      </div>
    </div>
  );
};
