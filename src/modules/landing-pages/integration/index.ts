// src/modules/landing-pages/integration/index.ts

import { localStorageProvider, type StorageProvider } from "../providers/storage-provider";
import { createLocalAnalytics, type AnalyticsProvider } from "../providers/analytics-provider";
import { supabase } from "@/integrations/supabase/client";

export interface LPUser {
  id: string;
  email?: string;
  name?: string;
  role?: string;
}

export interface AuthAdapter {
  getCurrentUser(): LPUser | null;
  isAuthenticated(): boolean;
}

export interface LeadPayload {
  lpId: string;
  slug: string;
  source: string;
  utm: Record<string, string>;
  data: Record<string, unknown>;
  referrer?: string;
  ts: number;
}

export interface CrmAdapter {
  onLeadCaptured(payload: LeadPayload): Promise<void> | void;
}

export interface LPModuleAdapters {
  storage: StorageProvider;
  analytics: AnalyticsProvider;
  auth: AuthAdapter;
  crm: CrmAdapter;
  publicOrigin?: string;
}

const defaultAuth: AuthAdapter = {
  getCurrentUser: () => null,
  isAuthenticated: () => false,
};

// Supabase Direct CRM integration default
const defaultCrm: CrmAdapter = {
  onLeadCaptured: async (payload: LeadPayload) => {
    try {
      const data = payload.data || {};
      const leadName = String(data["Nome"] || data["Qual é o seu nome?"] || data["name"] || "Lead sem nome");
      const leadEmail = String(data["E-mail"] || data["Seu melhor e-mail"] || data["email"] || "");
      const leadPhone = String(data["WhatsApp"] || data["WhatsApp para contato"] || data["whatsapp"] || data["phone"] || "");

      // Busca pipelines para associar ao funil padrão de prospecção
      const { data: pipelines } = await supabase.from('pipelines').select('id, name');
      const defaultPipeline = pipelines?.find(p => p.name?.toUpperCase().includes('PROSPECÇÃO')) || pipelines?.[0];

      const leadPayload = {
        name: leadName,
        email: leadEmail,
        whatsapp: leadPhone,
        company: `${leadName} (LP: ${payload.slug})`,
        source: `LP: ${payload.slug} (${payload.source})`,
        landing_page: payload.lpId,
        pipeline_id: defaultPipeline?.id || null,
        stage: 'Leads',
        classification: 'Lead',
        temperature: 'Morno',
        tags: [payload.source, payload.utm?.utm_campaign || 'inbound'].filter(Boolean),
        metadata: {
          capturedVia: 'Landing Page Modular',
          slug: payload.slug,
          source: payload.source,
          utm: payload.utm,
          formData: payload.data,
          referrer: payload.referrer,
          capturedAt: new Date(payload.ts).toISOString(),
        }
      };

      await supabase.from('leads').insert([leadPayload]);
    } catch (err) {
      console.error("Erro ao salvar lead capturado no CRM via Supabase:", err);
    }
  },
};

let container: LPModuleAdapters | null = null;

export function configureLPModule(a: Partial<LPModuleAdapters> = {}) {
  const storage = a.storage ?? localStorageProvider;
  container = {
    storage,
    analytics: a.analytics ?? createLocalAnalytics(storage),
    auth: a.auth ?? defaultAuth,
    crm: a.crm ?? defaultCrm,
    publicOrigin: a.publicOrigin,
  };
  return container;
}

export function getLPModule(): LPModuleAdapters {
  if (!container) configureLPModule({});
  return container!;
}
