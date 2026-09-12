// src/components/automation/ai-settings-modal.tsx

import React, { useState } from "react";
import { 
  X, 
  Key, 
  Bot, 
  Eye, 
  EyeOff, 
  Brain, 
  ExternalLink, 
  CheckCircle2, 
  Sparkles, 
  Plus, 
  Trash2, 
  CreditCard,
  Zap,
  Check,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { useAIConfig } from "@/hooks/useAIConfig";
import { AIProvider, AIModel, SYSTEM_OPENROUTER_KEY, SYSTEM_GOOGLE_KEY } from "@/types/ai";
import { testAIConnection } from "@/utils/ai";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AISettingsModalProps {
  onClose: () => void;
}

export function AISettingsModal({ onClose }: AISettingsModalProps) {
  const { 
    aiConfig, 
    setAIConfig, 
    addCustomModel, 
    removeCustomModel 
  } = useAIConfig();

  const [activeProvider, setActiveProvider] = useState<AIProvider>(aiConfig.activeProvider || "openrouter");
  const [googleKey, setGoogleKey] = useState(aiConfig.googleKey || "");
  const [openRouterKey, setOpenRouterKey] = useState(aiConfig.openRouterKey || SYSTEM_OPENROUTER_KEY);
  const [customPaidKey, setCustomPaidKey] = useState(aiConfig.customPaidKey || "");
  const [customEndpoint, setCustomEndpoint] = useState(aiConfig.customEndpoint || "https://api.openai.com/v1");
  const [selectedModelId, setSelectedModelId] = useState(aiConfig.modelId || "openai/gpt-4o-mini");

  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form para Cadastrar Novo Modelo
  const [showNewModelForm, setShowNewModelForm] = useState(false);
  const [newModelName, setNewModelName] = useState("");
  const [newModelId, setNewModelId] = useState("");
  const [newModelDesc, setNewModelDesc] = useState("");
  const [newModelIsPaid, setNewModelIsPaid] = useState(activeProvider === "custom_paid");

  // Determine current key for the selected provider
  const getCurrentKey = () => {
    if (activeProvider === "google") return googleKey;
    if (activeProvider === "openrouter") return openRouterKey;
    return customPaidKey;
  };

  const isCurrentKeyConfigured = () => {
    const key = getCurrentKey();
    return !!key && key.trim().length > 5;
  };

  const isSystemKey = () => {
    if (activeProvider === "openrouter") {
      return openRouterKey.trim() === SYSTEM_OPENROUTER_KEY;
    }
    if (activeProvider === "google") {
      return !googleKey || googleKey.trim() === SYSTEM_GOOGLE_KEY;
    }
    return false;
  };

  // Trocar Provedor Ativo
  const handleSelectProvider = async (provider: AIProvider) => {
    setActiveProvider(provider);
    setTestResult(null);

    const availableModels = aiConfig.customModels[provider] || [];
    let nextModelId = selectedModelId;
    let nextModelName = aiConfig.modelName;

    const existsInNewProvider = availableModels.some(m => m.id === selectedModelId);
    if (!existsInNewProvider && availableModels.length > 0) {
      nextModelId = availableModels[0].id;
      nextModelName = availableModels[0].name;
      setSelectedModelId(nextModelId);
    }

    await setAIConfig({
      activeProvider: provider,
      modelId: nextModelId,
      modelName: nextModelName
    });

    toast.success(`Provedor alterado para ${getProviderTitle(provider)}!`);
  };

  // Salvar Chave do Provedor Atual
  const handleSaveCurrentKey = async () => {
    const updates: any = {
      activeProvider
    };

    if (activeProvider === "google") {
      updates.googleKey = googleKey.trim();
    } else if (activeProvider === "openrouter") {
      updates.openRouterKey = openRouterKey.trim();
    } else {
      updates.customPaidKey = customPaidKey.trim();
      updates.customEndpoint = customEndpoint.trim();
    }

    await setAIConfig(updates);
    toast.success(`Chave ${getProviderTitle(activeProvider)} salva com sucesso!`);
  };

  // Salvar Seleção de Modelo
  const handleSelectModel = async (model: AIModel) => {
    setSelectedModelId(model.id);
    await setAIConfig({
      activeProvider,
      modelId: model.id,
      modelName: model.name
    });
    toast.success(`Modelo "${model.name}" ativado!`);
  };

  // Cadastrar Novo Modelo
  const handleCreateNewModel = () => {
    if (!newModelName.trim() || !newModelId.trim()) {
      toast.error("Preencha o nome e o ID técnico do modelo.");
      return;
    }

    const newModel: AIModel = {
      id: newModelId.trim(),
      name: newModelName.trim(),
      description: newModelDesc.trim() || undefined,
      isPaid: newModelIsPaid,
      provider: activeProvider,
      isCustom: true
    };

    addCustomModel(activeProvider, newModel);
    setSelectedModelId(newModel.id);
    setShowNewModelForm(false);
    setNewModelName("");
    setNewModelId("");
    setNewModelDesc("");
    toast.success(`Modelo "${newModel.name}" cadastrado e ativado!`);
  };

  // Testar Conexão
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const key = getCurrentKey();
      if (!key) {
        setTestResult({ success: false, message: "Insira uma chave válida antes de testar." });
        return;
      }
      const res = await testAIConnection(activeProvider, key, selectedModelId, customEndpoint);
      setTestResult({ success: res.success, message: res.message });
      if (res.success) {
        toast.success(`Conexão OK! Latência: ${res.latencyMs}ms`);
      } else {
        toast.error(`Falha: ${res.message}`);
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "Erro ao testar." });
    } finally {
      setIsTesting(false);
    }
  };

  const getProviderTitle = (p: AIProvider) => {
    if (p === "google") return "Google Gemini";
    if (p === "openrouter") return "OpenRouter";
    return "APIs Pagas & Personalizadas";
  };

  const currentModels = aiConfig.customModels[activeProvider] || [];
  const isConnected = isCurrentKeyConfigured();

  return (
    <div
      id="ai-settings-modal-overlay"
      className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-3 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="ai-settings-modal-container"
        className="bg-white dark:bg-[#12141A] border border-[#E5E7EB] dark:border-[#23272F] rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[#111827] dark:text-white"
      >
        {/* ========================================================= */}
        {/* 1. HEADER DO MODAL */}
        {/* ========================================================= */}
        <div className="p-6 sm:p-7 border-b border-[#E5E7EB] dark:border-[#23272F] flex items-center justify-between bg-white dark:bg-[#12141A]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#D1FAE5] dark:bg-[#059669]/20 flex items-center justify-center text-[#059669] shrink-0 shadow-sm">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#111827] dark:text-white">
                Configurações de IA do LAN
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={cn(
                    "text-xs font-black uppercase tracking-wider flex items-center gap-1.5",
                    isConnected ? "text-[#059669] dark:text-[#34D399]" : "text-[#D97706] dark:text-[#FBBF24]"
                  )}
                >
                  <span className={cn("w-2 h-2 rounded-full", isConnected ? "bg-[#059669] animate-pulse" : "bg-[#D97706]")} />
                  {isConnected ? "IA ATIVA & CONECTADA" : "CONFIGURAÇÃO PENDENTE"}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 hover:bg-[#F3F4F6] dark:hover:bg-[#1E222B] rounded-full text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white transition-colors cursor-pointer"
            title="Fechar Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ========================================================= */}
        {/* 2. CORPO DO MODAL COM SCROLL */}
        {/* ========================================================= */}
        <div className="p-6 sm:p-8 space-y-7 overflow-y-auto scrollbar-thin flex-1">
          
          {/* SEÇÃO 1: ESCOLHA O PROVEDOR ATIVO */}
          <section className="space-y-3">
            <label className="text-[11px] font-black uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block">
              ESCOLHA O PROVEDOR ATIVO
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Opção Google Gemini */}
              <button
                type="button"
                onClick={() => handleSelectProvider("google")}
                className={cn(
                  "flex flex-col items-start justify-between p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative",
                  activeProvider === "google"
                    ? "border-[#059669] bg-[#ECFDF5]/50 dark:bg-[#059669]/10 shadow-sm"
                    : "border-[#E5E7EB] dark:border-[#23272F] bg-white dark:bg-[#181B22] hover:border-[#059669]/40"
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] dark:bg-[#23272F] flex items-center justify-center text-[#059669] mb-2">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-black text-sm text-[#111827] dark:text-white">Google Gemini</div>
                  <div className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">Flash 3.8, 3.7 & Pro</div>
                </div>
                {activeProvider === "google" && (
                  <Check className="w-4 h-4 text-[#059669] absolute top-4 right-4" />
                )}
              </button>

              {/* Opção OpenRouter */}
              <button
                type="button"
                onClick={() => handleSelectProvider("openrouter")}
                className={cn(
                  "flex flex-col items-start justify-between p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative",
                  activeProvider === "openrouter"
                    ? "border-[#059669] bg-[#ECFDF5]/50 dark:bg-[#059669]/10 shadow-sm"
                    : "border-[#E5E7EB] dark:border-[#23272F] bg-white dark:bg-[#181B22] hover:border-[#059669]/40"
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] dark:bg-[#23272F] flex items-center justify-center text-[#059669] mb-2">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-black text-sm text-[#111827] dark:text-white">OpenRouter</div>
                  <div className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">Multi-modelos</div>
                </div>
                {activeProvider === "openrouter" && (
                  <Check className="w-4 h-4 text-[#059669] absolute top-4 right-4" />
                )}
              </button>

              {/* Opção APIs Pagas / Customizadas */}
              <button
                type="button"
                onClick={() => handleSelectProvider("custom_paid")}
                className={cn(
                  "flex flex-col items-start justify-between p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative",
                  activeProvider === "custom_paid"
                    ? "border-[#059669] bg-[#ECFDF5]/50 dark:bg-[#059669]/10 shadow-sm"
                    : "border-[#E5E7EB] dark:border-[#23272F] bg-white dark:bg-[#181B22] hover:border-[#059669]/40"
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] dark:bg-[#23272F] flex items-center justify-center text-[#059669] mb-2">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-black text-sm text-[#111827] dark:text-white">APIs Pagas</div>
                  <div className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">OpenAI / Claude / R1</div>
                </div>
                {activeProvider === "custom_paid" && (
                  <Check className="w-4 h-4 text-[#059669] absolute top-4 right-4" />
                )}
              </button>
            </div>
          </section>

          {/* SEÇÃO 2: API KEY (DO PROVEDOR SELECIONADO) */}
          <section className="space-y-3">
            <label className="text-[11px] font-black uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF] block">
              API KEY ({activeProvider.toUpperCase()})
            </label>

            <div className="bg-[#F8FAFC] dark:bg-[#181B22] border border-[#E2E8F0] dark:border-[#23272F] rounded-[2rem] p-5 sm:p-6 space-y-4">
              
              {/* Header do Card da Chave */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[#111827] dark:text-white">
                    {activeProvider === "google" && "GOOGLE GEMINI API KEY"}
                    {activeProvider === "openrouter" && "OPENROUTER API KEY"}
                    {activeProvider === "custom_paid" && "CHAVE DA API PAGA / PERSONALIZADA"}
                  </span>

                  {/* Badge Status Chave */}
                  {isSystemKey() ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#E2E8F0] dark:bg-[#2D333F] text-[#475569] dark:text-[#94A3B8] flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-[#059669]" />
                      NATIVO DO SISTEMA
                    </span>
                  ) : isConnected ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#D1FAE5] text-[#059669] dark:bg-[#059669]/20 dark:text-[#34D399] flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      CHAVE CONFIGURADA
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FEF3C7] text-[#D97706] dark:bg-[#D97706]/20 dark:text-[#FBBF24] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      AGUARDANDO CHAVE
                    </span>
                  )}
                </div>

                {/* Link Obter Chave */}
                <a
                  href={
                    activeProvider === "google"
                      ? "https://aistudio.google.com/app/apikey"
                      : activeProvider === "openrouter"
                      ? "https://openrouter.ai/keys"
                      : "https://platform.openai.com/api-keys"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-black text-[#059669] hover:underline uppercase tracking-wider flex items-center gap-1"
                >
                  OBTER CHAVE <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Se for Provedor Pago Personalizado, permitir Endpoint URL */}
              {activeProvider === "custom_paid" && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#6B7280] dark:text-[#9CA3AF] uppercase">
                    Base URL / Endpoint da API (Padrão OpenAI Compatible)
                  </label>
                  <input
                    type="text"
                    value={customEndpoint}
                    onChange={(e) => setCustomEndpoint(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                    className="w-full bg-white dark:bg-[#12141A] border border-[#CBD5E1] dark:border-[#23272F] rounded-xl px-3.5 py-2 text-xs font-mono text-[#111827] dark:text-white outline-none focus:border-[#059669]"
                  />
                </div>
              )}

              {/* Linha do Input de API Key + Botão Salvar */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <div className="relative w-full flex-1">
                  <input
                    type={showKey ? "text" : "password"}
                    value={
                      activeProvider === "google"
                        ? googleKey
                        : activeProvider === "openrouter"
                        ? openRouterKey
                        : customPaidKey
                    }
                    onChange={(e) => {
                      if (activeProvider === "google") setGoogleKey(e.target.value);
                      else if (activeProvider === "openrouter") setOpenRouterKey(e.target.value);
                      else setCustomPaidKey(e.target.value);
                    }}
                    placeholder={
                      isSystemKey()
                        ? "••••••••••••••••••••••••••••••••••••••••••••••••"
                        : "Cole sua chave da API aqui..."
                    }
                    className="w-full bg-white dark:bg-[#12141A] border border-[#CBD5E1] dark:border-[#23272F] rounded-xl px-4 py-3 text-xs font-mono text-[#111827] dark:text-white outline-none focus:border-[#059669] pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleSaveCurrentKey}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] dark:bg-white dark:text-[#0F172A] text-white font-black text-xs uppercase tracking-wider transition-all shrink-0 cursor-pointer"
                >
                  SALVAR
                </button>
              </div>

              {/* Texto de Apoio */}
              <p className="text-[11px] text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
                💡{" "}
                {activeProvider === "openrouter"
                  ? "Esta chave é fornecida nativamente pelo sistema em cinza. Se quiser usar sua própria chave, basta colar no campo acima e clicar em Salvar."
                  : activeProvider === "google"
                  ? "Cole sua chave do Google Gemini Studio. Modelos Gemini 3.8 Flash, 3.7 Flash e Flash Latest são suportados nativamente."
                  : "Insira sua chave para utilizar chamadas diretas às APIs pagas da OpenAI, Anthropic, DeepSeek ou endpoints personalizados."}
              </p>

              {/* Botão Testar Conexão */}
              <div className="pt-2 border-t border-[#E2E8F0] dark:border-[#23272F] flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-4 py-2 rounded-xl bg-[#F3F4F6] dark:bg-[#23272F] hover:bg-[#E5E7EB] dark:hover:bg-[#2D333F] text-xs font-bold text-[#111827] dark:text-white flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5 text-[#059669]" />
                  <span>{isTesting ? "Testando..." : "Testar Conexão da API"}</span>
                </button>

                {testResult && (
                  <span
                    className={cn(
                      "text-xs font-bold",
                      testResult.success ? "text-[#059669]" : "text-rose-500"
                    )}
                  >
                    {testResult.message}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* SEÇÃO 3: SELEÇÃO E CADASTRO DE MODELOS */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
                SELECIONE O MODELO
              </label>

              <button
                type="button"
                onClick={() => setShowNewModelForm(!showNewModelForm)}
                className="px-3.5 py-1.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-black text-xs uppercase tracking-wider flex items-center gap-1 shadow-md shadow-[#4F46E5]/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>NOVO MODELO</span>
              </button>
            </div>

            {/* Form de Cadastro de Novo Modelo */}
            {showNewModelForm && (
              <div className="bg-[#F8FAFC] dark:bg-[#181B22] border-2 border-[#4F46E5]/40 rounded-2xl p-5 space-y-3.5 animate-in slide-in-from-top-2">
                <div className="text-xs font-black uppercase tracking-wider text-[#4F46E5] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Cadastrar Modelo ({getProviderTitle(activeProvider)})</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#6B7280] dark:text-[#9CA3AF] uppercase">
                      Nome de Exibição
                    </span>
                    <input
                      type="text"
                      value={newModelName}
                      onChange={(e) => setNewModelName(e.target.value)}
                      placeholder="Ex: GPT-4o Oficial"
                      className="w-full bg-white dark:bg-[#12141A] border border-[#CBD5E1] dark:border-[#23272F] rounded-xl px-3 py-2 text-xs font-bold text-[#111827] dark:text-white outline-none focus:border-[#4F46E5]"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#6B7280] dark:text-[#9CA3AF] uppercase">
                      Model ID Técnico
                    </span>
                    <input
                      type="text"
                      value={newModelId}
                      onChange={(e) => setNewModelId(e.target.value)}
                      placeholder="Ex: gpt-4o ou claude-3-5-sonnet"
                      className="w-full bg-white dark:bg-[#12141A] border border-[#CBD5E1] dark:border-[#23272F] rounded-xl px-3 py-2 text-xs font-mono text-[#111827] dark:text-white outline-none focus:border-[#4F46E5]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#6B7280] dark:text-[#9CA3AF] uppercase">
                    Descrição / Notas (Opcional)
                  </span>
                  <input
                    type="text"
                    value={newModelDesc}
                    onChange={(e) => setNewModelDesc(e.target.value)}
                    placeholder="Ex: Alta inteligência para copywriting persuasivo"
                    className="w-full bg-white dark:bg-[#12141A] border border-[#CBD5E1] dark:border-[#23272F] rounded-xl px-3 py-2 text-xs text-[#111827] dark:text-white outline-none focus:border-[#4F46E5]"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#4B5563] dark:text-[#9CA3AF] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newModelIsPaid}
                      onChange={(e) => setNewModelIsPaid(e.target.checked)}
                      className="rounded text-[#4F46E5]"
                    />
                    <span>Modelo Pago / Cobrado por Token</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowNewModelForm(false)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#6B7280] hover:bg-[#E5E7EB] dark:hover:bg-[#23272F]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateNewModel}
                      className="px-4 py-2 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs uppercase tracking-wider shadow"
                    >
                      Salvar Modelo
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de Modelos do Provedor Atual */}
            <div className="space-y-2.5">
              {currentModels.map((m) => {
                const isSelected = selectedModelId === m.id;

                return (
                  <div
                    key={m.id}
                    onClick={() => handleSelectModel(m)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer relative group",
                      isSelected
                        ? "border-[#059669] bg-[#ECFDF5]/50 dark:bg-[#059669]/10 shadow-sm"
                        : "border-[#E5E7EB] dark:border-[#23272F] bg-white dark:bg-[#181B22] hover:border-[#059669]/40"
                    )}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Indicador de Seleção */}
                      <div
                        className={cn(
                          "w-2.5 h-2.5 rounded-full shrink-0",
                          isSelected ? "bg-[#059669]" : "bg-[#CBD5E1] dark:bg-[#374151]"
                        )}
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-[#111827] dark:text-white truncate">
                            {m.name}
                          </span>
                          {m.isPaid && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              PAGO
                            </span>
                          )}
                          {m.isCustom && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 border border-purple-500/20">
                              CUSTOM
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-[#6B7280] dark:text-[#9CA3AF] truncate mt-0.5">
                          {m.id}
                        </div>
                        {m.description && (
                          <div className="text-[11px] text-[#9CA3AF] dark:text-[#64748B] truncate mt-0.5">
                            {m.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {/* Ícone de Checkmark quando Selecionado */}
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-[#059669] text-white flex items-center justify-center shadow-sm">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}

                      {/* Botão de Excluir se for Customizado */}
                      {m.isCustom && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCustomModel(activeProvider, m.id);
                            toast.success(`Modelo "${m.name}" removido.`);
                          }}
                          className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remover Modelo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </div>

        {/* ========================================================= */}
        {/* 3. FOOTER DO MODAL */}
        {/* ========================================================= */}
        <div className="p-5 sm:p-6 border-t border-[#E5E7EB] dark:border-[#23272F] bg-[#F8FAFC] dark:bg-[#12141A] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-12 py-3.5 rounded-2xl bg-[#0F172A] hover:bg-[#1E293B] text-white dark:bg-white dark:text-[#0F172A] font-black text-xs uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            CONCLUÍDO
          </button>
        </div>

      </div>
    </div>
  );
}
