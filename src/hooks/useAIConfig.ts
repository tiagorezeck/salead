// src/hooks/useAIConfig.ts

import { useState, useCallback, useEffect } from 'react';
import { 
  AIConfig, 
  DEFAULT_AI_CONFIG, 
  SYSTEM_GOOGLE_KEY, 
  SYSTEM_OPENROUTER_KEY, 
  AIProvider,
  AIModel
} from '../types/ai';
import { cloudStore } from '@/services/cloudStorageService';

function normalizeAIConfig(raw: any): AIConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_AI_CONFIG;
  try {
    const parsed = {
      ...raw,
      googleKey: raw.googleKey || raw.google_key,
      openRouterKey: raw.openRouterKey || raw.openrouter_key,
      modelId: raw.modelId || raw.model_id,
      modelName: raw.modelName || raw.model_name,
      activeProvider: raw.activeProvider || raw.provider || DEFAULT_AI_CONFIG.activeProvider,
    };

    const hasOutdatedGoogle = !parsed.customModels?.google || 
      parsed.customModels.google.some((m: any) => m.id?.includes("gemini-1.5") || m.id?.includes("gemini-2.0"));

    const googleModels = hasOutdatedGoogle 
      ? DEFAULT_AI_CONFIG.customModels.google 
      : parsed.customModels.google;

    const hasOutdatedOpenRouter = !parsed.customModels?.openrouter ||
      parsed.customModels.openrouter.some((m: any) => m.id?.includes("gemini-flash-1.5"));

    const openrouterModels = hasOutdatedOpenRouter
      ? DEFAULT_AI_CONFIG.customModels.openrouter
      : parsed.customModels.openrouter;

    const customPaidModels = parsed.customModels?.custom_paid || DEFAULT_AI_CONFIG.customModels.custom_paid;

    const merged: AIConfig = { 
      ...DEFAULT_AI_CONFIG, 
      ...parsed,
      googleKey: parsed.googleKey?.trim() ? parsed.googleKey.trim() : SYSTEM_GOOGLE_KEY,
      openRouterKey: parsed.openRouterKey?.trim() ? parsed.openRouterKey.trim() : SYSTEM_OPENROUTER_KEY,
      customPaidKey: parsed.customPaidKey?.trim() || '',
      customEndpoint: parsed.customEndpoint || 'https://api.openai.com/v1',
      customModels: {
        google: googleModels,
        openrouter: openrouterModels,
        custom_paid: customPaidModels
      }
    };

    if (merged.activeProvider === "google") {
      if (merged.modelId?.includes("gemini-1.5") || merged.modelId?.includes("gemini-2.0") || !merged.modelId) {
        merged.modelId = "gemini-3.8-flash";
        merged.modelName = "Gemini 3.8 Flash (Padrão Oficial - Recomendado)";
      }
    } else if (merged.activeProvider === "openrouter" && merged.modelId?.includes("gemini-flash-1.5")) {
      merged.modelId = "google/gemini-2.5-flash";
      merged.modelName = "Gemini 2.5 Flash (Google via OpenRouter)";
    }

    const currentModels = merged.customModels[merged.activeProvider] || [];
    const exists = currentModels.some(m => m.id === merged.modelId);
    
    if (!exists && currentModels.length > 0) {
      merged.modelId = currentModels[0].id;
      merged.modelName = currentModels[0].name;
    }

    return merged;
  } catch {
    return DEFAULT_AI_CONFIG;
  }
}

function persistAIConfigToCloud(newConfig: AIConfig) {
  cloudStore.mutate((draft) => {
    draft.aiConfig = {
      ...(draft.aiConfig || {}),
      ...newConfig,
      openrouter_key: newConfig.openRouterKey,
      google_key: newConfig.googleKey,
      model_id: newConfig.modelId,
      model_name: newConfig.modelName,
      provider: newConfig.activeProvider,
    };
  }, { immediate: true });
}

export function useAIConfig() {
  const [aiConfig, setAIConfigState] = useState<AIConfig>(() => {
    if (typeof window === 'undefined') return DEFAULT_AI_CONFIG;
    return normalizeAIConfig(cloudStore.getState().aiConfig);
  });

  useEffect(() => {
    const unsubscribe = cloudStore.subscribe(() => {
      const cloudCfg = cloudStore.getState().aiConfig;
      if (cloudCfg && typeof cloudCfg === 'object') {
        setAIConfigState(normalizeAIConfig(cloudCfg));
      }
    });
    return unsubscribe;
  }, []);

  const setAIConfig = useCallback(async (config: Partial<AIConfig>) => {
    setAIConfigState(prev => {
      const updatedGoogleKey = config.googleKey !== undefined 
        ? (config.googleKey.trim() || SYSTEM_GOOGLE_KEY) 
        : prev.googleKey;

      const updatedOpenRouterKey = config.openRouterKey !== undefined 
        ? (config.openRouterKey.trim() || SYSTEM_OPENROUTER_KEY) 
        : prev.openRouterKey;

      const updatedCustomPaidKey = config.customPaidKey !== undefined 
        ? config.customPaidKey.trim() 
        : prev.customPaidKey;

      const updatedCustomEndpoint = config.customEndpoint !== undefined 
        ? config.customEndpoint.trim() 
        : prev.customEndpoint;

      const newConfig: AIConfig = { 
        ...prev, 
        ...config,
        googleKey: updatedGoogleKey,
        openRouterKey: updatedOpenRouterKey,
        customPaidKey: updatedCustomPaidKey,
        customEndpoint: updatedCustomEndpoint
      };

      persistAIConfigToCloud(newConfig);
      return newConfig;
    });
  }, []);

  const addCustomModel = useCallback((provider: AIProvider, model: AIModel) => {
    setAIConfigState(prev => {
      const currentList = prev.customModels[provider] || [];
      const updatedList = [...currentList.filter(m => m.id !== model.id), { ...model, isCustom: true }];
      
      const newConfig: AIConfig = {
        ...prev,
        activeProvider: provider,
        modelId: model.id,
        modelName: model.name,
        customModels: {
          ...prev.customModels,
          [provider]: updatedList
        }
      };

      persistAIConfigToCloud(newConfig);
      return newConfig;
    });
  }, []);

  const removeCustomModel = useCallback((provider: AIProvider, modelId: string) => {
    setAIConfigState(prev => {
      const currentList = prev.customModels[provider] || [];
      const updatedList = currentList.filter(m => m.id !== modelId);
      
      let nextModelId = prev.modelId;
      let nextModelName = prev.modelName;

      if (prev.modelId === modelId && updatedList.length > 0) {
        nextModelId = updatedList[0].id;
        nextModelName = updatedList[0].name;
      }

      const newConfig: AIConfig = {
        ...prev,
        modelId: nextModelId,
        modelName: nextModelName,
        customModels: {
          ...prev.customModels,
          [provider]: updatedList
        }
      };

      persistAIConfigToCloud(newConfig);
      return newConfig;
    });
  }, []);

  const getActiveKey = (): string => {
    if (aiConfig.activeProvider === 'google') {
      return aiConfig.googleKey?.trim() || SYSTEM_GOOGLE_KEY;
    } else if (aiConfig.activeProvider === 'openrouter') {
      return aiConfig.openRouterKey?.trim() || SYSTEM_OPENROUTER_KEY;
    } else {
      return aiConfig.customPaidKey?.trim() || '';
    }
  };

  const isConfigured = (): boolean => {
    const key = getActiveKey();
    return !!key && key.trim().length > 5;
  };

  const resetToDefaults = useCallback(() => {
    setAIConfigState(DEFAULT_AI_CONFIG);
    persistAIConfigToCloud(DEFAULT_AI_CONFIG);
  }, []);

  return { 
    aiConfig, 
    setAIConfig, 
    getActiveKey, 
    isConfigured, 
    addCustomModel, 
    removeCustomModel,
    resetToDefaults 
  };
}
