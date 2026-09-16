// src/types/ai.ts

export type AIProvider = 'openrouter' | 'google' | 'custom_paid';

export interface AIModel {
  id: string;
  name: string;
  provider?: AIProvider;
  description?: string;
  isPaid?: boolean;
  pricing?: string;
  isCustom?: boolean;
}

export interface AIConfig {
  activeProvider: AIProvider;
  openRouterKey: string;
  googleKey: string;
  customPaidKey: string;
  customEndpoint?: string;
  modelId: string;
  modelName: string;
  customModels: Record<AIProvider, AIModel[]>;
}

// Chave padrão OpenRouter
export const SYSTEM_OPENROUTER_KEY = "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";

// Chave padrão Gemini (lê de process.env se disponível ou fallback)
export const SYSTEM_GOOGLE_KEY = typeof process !== 'undefined' && process.env?.GEMINI_API_KEY 
  ? process.env.GEMINI_API_KEY 
  : "";

export const DEFAULT_AI_CONFIG: AIConfig = {
  activeProvider: 'google',
  openRouterKey: SYSTEM_OPENROUTER_KEY,
  googleKey: SYSTEM_GOOGLE_KEY,
  customPaidKey: '',
  customEndpoint: 'https://api.openai.com/v1',
  modelId: 'gemini-3.8-flash',
  modelName: 'Gemini 3.8 Flash (Padrão Oficial - Recomendado)',
  customModels: {
    google: [
      { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash (Padrão Oficial - Recomendado)", description: "Modelo oficial mais recente e veloz para geração de copy, headlines e páginas de alta conversão" },
      { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash (Raciocínio Híbrido)", description: "Geração avançada com capacidade de raciocínio dinâmico e precisão para funis complexos" },
      { id: "gemini-flash-latest", name: "Gemini Flash Latest (Sempre Atualizado)", description: "Alias oficial do Google que aponta automaticamente para a versão mais recente do Flash" },
      { id: "gemini-3.1-flash-lite", name: "Gemini 3.1 Flash Lite (Ultra Rápido)", description: "Velocidade extrema e menor latência para respostas instantâneas" },
      { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview (Máxima Inteligência)", description: "Raciocínio profundo para arquiteturas persuasivas, VSLs e ofertas ricas" },
    ],
    openrouter: [
      { id: "openai/gpt-4o-mini", name: "GPT-4o Mini (Recomendado OpenRouter)", description: "Ótimo custo-benefício e respostas precisas" },
      { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash (Google via OpenRouter)", description: "Gemini 2.5 Flash através do gateway OpenRouter" },
      { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro (Google via OpenRouter)", description: "Gemini 2.5 Pro de alto raciocínio via OpenRouter" },
      { id: "deepseek/deepseek-chat", name: "DeepSeek V3", description: "Capacidade analítica avançada e alta precisão técnica" },
      { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", description: "Open source de ponta para copywriting persuasivo" },
    ],
    custom_paid: [
      { id: "gpt-4o", name: "OpenAI GPT-4o (Direto / Pago)", isPaid: true, description: "Modelo flagship multimodal da OpenAI de máxima inteligência" },
      { id: "gpt-4o-mini", name: "OpenAI GPT-4o Mini (Direto / Pago)", isPaid: true, description: "Ultra-rápido e econômico para edições frequentes" },
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet (Anthropic Direto / Pago)", isPaid: true, description: "Excelente para copywriting persuasivo e storytelling" },
      { id: "deepseek-chat", name: "DeepSeek V3 (API Direta / Paga)", isPaid: true, description: "Geração ultra-econômica com altíssima precisão" },
      { id: "deepseek-reasoner", name: "DeepSeek R1 (API Direta / Paga)", isPaid: true, description: "Raciocínio profundo para arquiteturas de persuasão" },
    ]
  }
};
