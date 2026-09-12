// src/components/automation/lan-ai-card.tsx

import React from "react";
import { Bot, Sparkles, CheckCircle2, Zap, Brain, CreditCard } from "lucide-react";
import { useAIConfig } from "@/hooks/useAIConfig";
import { cn } from "@/lib/utils";

interface LANAICardProps {
  onOpenSettings: () => void;
  className?: string;
}

export function LANAICard({ onOpenSettings, className }: LANAICardProps) {
  const { aiConfig, isConfigured } = useAIConfig();
  const active = isConfigured();

  const getProviderDisplay = () => {
    switch (aiConfig.activeProvider) {
      case "google":
        return { name: "Google Gemini", icon: Brain, color: "text-[#059669]" };
      case "openrouter":
        return { name: "OpenRouter", icon: Bot, color: "text-[#059669]" };
      case "custom_paid":
        return { name: "API Paga / Custom", icon: CreditCard, color: "text-[#059669]" };
      default:
        return { name: "OpenRouter", icon: Bot, color: "text-[#059669]" };
    }
  };

  const provider = getProviderDisplay();
  const ProviderIcon = provider.icon;

  return (
    <div
      id="lan-ai-overview-card"
      className={cn(
        "bg-white dark:bg-[#12141A] border border-[#E5E7EB] dark:border-[#23272F] rounded-[2rem] p-6 sm:p-8 shadow-sm transition-all relative overflow-hidden",
        className
      )}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#D1FAE5] dark:bg-[#059669]/20 flex items-center justify-center text-[#059669] shrink-0 shadow-sm">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#111827] dark:text-white">
              LAN - Agente de Landing Page IA
            </h2>
            <p className="text-xs sm:text-sm font-medium text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">
              Automação Inteligente de Design, Copy e Alta Conversão
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={cn(
            "px-3.5 py-1.5 rounded-full font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm select-none",
            active
              ? "bg-[#D1FAE5] text-[#059669] dark:bg-[#059669]/20 dark:text-[#34D399]"
              : "bg-[#FEF3C7] text-[#D97706] dark:bg-[#D97706]/20 dark:text-[#FBBF24]"
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{active ? "LAN ATIVO" : "PENDENTE DE CHAVE"}</span>
        </div>
      </div>

      {/* Tiles de Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Provedor Ativo */}
        <div className="bg-[#F8FAFC] dark:bg-[#181B22] border border-[#E2E8F0] dark:border-[#23272F] rounded-2xl p-4 sm:p-5 flex flex-col justify-center">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] mb-1.5">
            PROVEDOR ATIVO
          </span>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-[#D1FAE5] dark:bg-[#059669]/20 flex items-center justify-center text-[#059669]">
              <ProviderIcon className="w-4 h-4" />
            </div>
            <span className="text-base sm:text-lg font-black text-[#111827] dark:text-white">
              {provider.name}
            </span>
          </div>
        </div>

        {/* Modelo em Uso */}
        <div className="bg-[#F8FAFC] dark:bg-[#181B22] border border-[#E2E8F0] dark:border-[#23272F] rounded-2xl p-4 sm:p-5 flex flex-col justify-center">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] mb-1.5">
            MODELO EM USO
          </span>
          <div className="text-base sm:text-lg font-black text-[#059669] dark:text-[#34D399] truncate">
            {aiConfig.modelName || aiConfig.modelId}
          </div>
        </div>
      </div>

      {/* Box: O que o LAN faz por você */}
      <div className="bg-[#ECFDF5]/60 dark:bg-[#059669]/10 border border-[#A7F3D0] dark:border-[#059669]/30 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-black uppercase tracking-wider text-[#047857] dark:text-[#34D399] mb-3">
          <Sparkles className="w-4 h-4" />
          <span>O QUE O LAN FAZ POR VOCÊ?</span>
        </div>
        <ul className="space-y-2 text-xs sm:text-sm text-[#374151] dark:text-[#D1D5DB] leading-relaxed">
          <li className="flex items-start gap-2">
            <span className="text-[#059669] font-bold">•</span>
            <span>Cria Landing Pages completas de alta conversão do zero com estrutura profissional.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#059669] font-bold">•</span>
            <span>Modifica layouts, temas de cores, tipografia, seções e remove elementos sob comando.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#059669] font-bold">•</span>
            <span>Adiciona e ajusta VSL de vídeo, formulários de captura, carrosséis e prova social.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#059669] font-bold">•</span>
            <span>Aceita imagens e links de referência para reproduzir e adaptar designs com precisão.</span>
          </li>
        </ul>
      </div>

      {/* CTA Button */}
      <button
        type="button"
        onClick={onOpenSettings}
        className="w-full py-4 px-6 rounded-2xl bg-[#059669] hover:bg-[#047857] active:scale-[0.99] text-white font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-lg shadow-[#059669]/25 transition-all cursor-pointer"
      >
        <Bot className="w-5 h-5" />
        <span>CONFIGURAR MODELOS & CHAVES DO LAN</span>
      </button>
    </div>
  );
}
