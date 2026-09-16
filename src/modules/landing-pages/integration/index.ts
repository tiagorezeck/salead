// src/modules/landing-pages/integration/index.ts

import { localStorageProvider, type StorageProvider } from "../providers/storage-provider";
import { createLocalAnalytics, type AnalyticsProvider } from "../providers/analytics-provider";
import { getLocalDatabaseRoot, saveLocalDatabaseRoot, pushToGoogleDrive } from "@/services/googleDriveDatabaseService";

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

// Direct CRM integration default via Local Storage + Google Drive + Express Server
const defaultCrm: CrmAdapter = {
  onLeadCaptured: async (payload: LeadPayload) => {
    try {
      const data = payload.data || {};
      const leadName = String(data["Nome"] || data["Qual é o seu nome?"] || data["name"] || "Lead sem nome");
      const leadEmail = String(data["E-mail"] || data["Seu melhor e-mail"] || data["email"] || "");
      const leadPhone = String(data["WhatsApp"] || data["WhatsApp para contato"] || data["whatsapp"] || data["phone"] || "");

      const leadId = `lead-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const leadPayload = {
        id: leadId,
        name: leadName,
        email: leadEmail,
        whatsapp: leadPhone,
        company: `${leadName} (LP: ${payload.slug})`,
        source: `LP: ${payload.slug} (${payload.source || "Landing Page"})`,
        landing_page: payload.lpId,
        stage: 'Leads',
        classification: 'Lead',
        temperature: 'Morno',
        tags: [payload.source, payload.utm?.utm_campaign || 'inbound'].filter(Boolean),
        createdAt: new Date(payload.ts || Date.now()).toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          capturedVia: 'Landing Page Modular',
          slug: payload.slug,
          source: payload.source,
          utm: payload.utm,
          formData: payload.data,
          referrer: payload.referrer,
          capturedAt: new Date(payload.ts || Date.now()).toISOString(),
        }
      };

      // 1. Salva no LocalStorage do CRM
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem("comet_local_leads") || "[]";
          const list = JSON.parse(raw);
          list.unshift(leadPayload);
          localStorage.setItem("comet_local_leads", JSON.stringify(list));
        } catch {}
      }

      // 2. Salva no Snapshot do Google Drive
      try {
        const root = getLocalDatabaseRoot();
        if (!Array.isArray(root.leads)) root.leads = [];
        root.leads.unshift(leadPayload);
        saveLocalDatabaseRoot(root);
        pushToGoogleDrive(root).catch(() => {});
      } catch {}

      // 3. Envia para o servidor backend Express
      try {
        fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(leadPayload)
        }).catch(() => {});
      } catch {}
    } catch (err) {
      console.error("Erro ao salvar lead capturado no CRM:", err);
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
