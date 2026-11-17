// =========================================================================
// CLOUD STORAGE SERVICE (ARQUITETURA ESTILO SUPABASE / FIREBASE VIA APPS SCRIPT)
// Fonte única da verdade em RAM sincronizada em tempo real com Google Sheets
// e database_root.json no Google Drive (0% localStorage para dados de negócio).
// =========================================================================

import {
  DEFAULT_PIPELINES,
  DEFAULT_PLAYBOOKS,
  DEFAULT_ROLE_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_VISIBILITY,
  type LandingPage,
  type Survey,
  type SurveyResponse,
} from "@/data/mock";
import { DEFAULT_LEAD_ROUTING_CONFIG, type LeadRoutingConfig } from "@/lib/lead-rules";
import { SURVEY_PRESETS } from "@/lib/survey-templates";
import {
  getDriveConfig,
  initializeSharedDriveConfig,
  fetchFromGoogleDrive,
  forceReadSpreadsheetFromDrive,
  pushToGoogleDrive,
  saveLandingPageToDrive,
  fetchPublicLpFromDrive,
  fetchPublicSurveyFromDrive,
  saveLocalDatabaseRoot,
  saveDriveConfig,
} from "@/services/googleDriveDatabaseService";
import { getGlobalGasConfig } from "@/config/gasConfig";

function getLpTimestampMs(lp: any): number {
  if (!lp || typeof lp !== "object") return 0;
  const t1 = lp.updatedAt ? new Date(lp.updatedAt).getTime() : 0;
  const t2 = lp.updated_at ? new Date(lp.updated_at).getTime() : 0;
  const t3 = !t1 && !t2 && (lp.createdAt || lp.created_at)
    ? new Date(lp.createdAt || lp.created_at).getTime()
    : 0;
  return Math.max(Number.isNaN(t1) ? 0 : t1, Number.isNaN(t2) ? 0 : t2, Number.isNaN(t3) ? 0 : t3);
}

function isCorruptedLeadAsLp(lp: any): boolean {
  if (!lp || typeof lp !== "object") return true;
  const st = String(lp.status || "").trim().toLowerCase();
  return st === "novo lead" && !lp.hero && !lp.externalUrl && !lp["Config JSON"] && !lp.config;
}

export interface CloudDatabase {
  leads: any[];
  leads_landing_pages: any[];
  landingPages: LandingPage[];
  surveys: Survey[];
  surveyResponses: SurveyResponse[];
  tasks: any[];
  products: any[];
  pipelines: any[];
  historico_pipeline: any[];
  playbooks: any[];
  objections: any[];
  automations: any[];
  handoffRules: any[];
  stageWorkflows: Record<string, any> | any[];
  marketingInvestments: any[];
  users: any[];
  company: any;
  aiConfig: any;
  visibility: any;
  slaThresholds: { alerta: number; critico: number; vencido: number };
  leadRoutingConfig: LeadRoutingConfig;
  rolePermissions: Record<string, string[]>;
  roleModulePermissions: Record<string, string[]>;
  userModulePermissions: Record<string, { enabled: boolean; modules: string[] }>;
  workingDays: number[];
  holidays: string[];
  funnelTypes: string[];
  deletedLpIds: string[];
  activePreviewPage: any | null;
  lpAnalytics: Record<string, any>;
  automationLogs: any[];
  brandIdentity: any | null;
  revision: number;
  ultimoBackup?: string;
  versao?: string;
}

export interface CloudSyncStatus {
  bootstrapping: boolean;
  loadedFromCloud: boolean;
  syncing: boolean;
  pendingWrite: boolean;
  dirtyRevision: number;
  lastSyncTimestamp: number | null;
  lastPushTimestamp: number | null;
  lastError: string | null;
  connected: boolean;
  webappUrl: string;
  spreadsheetUrl?: string;
  spreadsheetName?: string;
}

const DEFAULT_SURVEYS_LIST: Survey[] = SURVEY_PRESETS.map((p) => ({
  id: p.id,
  name: p.name,
  type: p.id.includes("min") || p.id.includes("qualificacao") ? "individual" : "mass",
  purpose: p.id.includes("min") || p.id.includes("qualificacao") ? "min" : "common",
  status: "active",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  questions: p.questions ? JSON.parse(JSON.stringify(p.questions)) : [],
  settings: {
    headline: p.name,
    description: p.description,
    buttonText: "Iniciar Diagnóstico",
    thankYouMessage: "Obrigado por responder nosso diagnóstico!",
    accentColor: p.accentColor || "#FF6B00",
  },
  reward: {
    title: "Diagnóstico Completo",
    type: "whatsapp",
    value: "",
  },
  template: "Modern",
  completions: 0,
  visits: 0,
  created_at: new Date().toISOString(),
}));

const LEGACY_BUSINESS_STORAGE_KEYS = [
  "salead_database_root",
  "salead_system_checkpoints_history",
  "salead_registered_users",
  "salead_initial_checkpoint_created",
  "app_drive_config",
  "active_preview_page",
  "comet_deleted_lp_ids",
  "comet_lp_seed_initialized",
  "comet_working_days",
  "comet_holidays",
  "comet_funnel_types",
  "comet_role_permissions",
  "comet_role_stage_permissions",
  "comet_role_module_permissions",
  "comet_user_module_permissions",
  "comet_visibility_settings",
  "comet_sla_thresholds",
  "comet_ai_config",
  "comet_ai_settings",
  "comet_company_settings",
  "comet_lead_routing_config",
  "comet_inbound_leads_queue",
  "comet_automation_logs",
  "comet_google_calendar_token",
  "people_cro_leads_v1",
  "people_cro_landing_pages_v1",
  "app:lps:v1",
  "salead_brand_identity",
];

const LEGACY_BUSINESS_PREFIXES = [
  "comet_local_",
  "comet_crm_",
  "comet_lp_",
  "lp_analytics_",
  "salead_lp_",
];

const PRESERVED_SESSION_UI_KEYS = new Set([
  "comet_theme",
  "sidebar_pinned",
  "comet_local_session",
  "comet_user_email",
]);

let legacyPurged = false;

export function purgeLegacyBusinessLocalStorage(): void {
  if (typeof window === "undefined" || legacyPurged) return;
  legacyPurged = true;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || PRESERVED_SESSION_UI_KEYS.has(key)) continue;

      if (
        LEGACY_BUSINESS_STORAGE_KEYS.includes(key) ||
        LEGACY_BUSINESS_PREFIXES.some((prefix) => key.startsWith(prefix))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => {
      try {
        window.localStorage.removeItem(key);
      } catch {}
    });
  } catch {}
}

function createInitialCloudDatabase(): CloudDatabase {
  return {
    leads: [],
    leads_landing_pages: [],
    landingPages: [],
    surveys: [...DEFAULT_SURVEYS_LIST],
    surveyResponses: [],
    tasks: [],
    products: [],
    pipelines: JSON.parse(JSON.stringify(DEFAULT_PIPELINES)),
    historico_pipeline: [],
    playbooks: JSON.parse(JSON.stringify(DEFAULT_PLAYBOOKS)),
    objections: [],
    automations: [],
    handoffRules: [],
    stageWorkflows: {},
    marketingInvestments: [],
    users: [],
    company: {
      id: "00000000-0000-0000-0000-000000000000",
      name: "Minha Empresa",
    },
    aiConfig: null,
    visibility: JSON.parse(JSON.stringify(DEFAULT_VISIBILITY)),
    slaThresholds: { alerta: 24, critico: 48, vencido: 72 },
    leadRoutingConfig: { ...DEFAULT_LEAD_ROUTING_CONFIG },
    rolePermissions: { ...DEFAULT_ROLE_PERMISSIONS },
    roleModulePermissions: { ...DEFAULT_ROLE_MODULES },
    userModulePermissions: {},
    workingDays: [1, 2, 3, 4, 5],
    holidays: [],
    funnelTypes: ["Voucher", "Ebook", "Webinar", "Diagnóstico"],
    deletedLpIds: [],
    activePreviewPage: null,
    lpAnalytics: {},
    automationLogs: [],
    brandIdentity: null,
    revision: 0,
    versao: "3.0-CloudEngine",
  };
}

function mergeLandingPageLists(
  remoteList: any[],
  currentList: any[],
  deletedSet: Set<string>
): LandingPage[] {
  const isDeleted = (lp: any) => {
    if (!lp || isCorruptedLeadAsLp(lp)) return true;
    if (lp.id && deletedSet.has(String(lp.id))) return true;
    if (lp.slug && deletedSet.has(String(lp.slug))) return true;
    return false;
  };

  const currentMap = new Map<string, any>();
  for (const item of currentList || []) {
    if (!item || isDeleted(item)) continue;
    const key = item.id || item.slug;
    if (key) currentMap.set(String(key), item);
  }

  const out: LandingPage[] = [];
  const seen = new Set<string>();

  for (const rawRemote of remoteList || []) {
    if (!rawRemote || isDeleted(rawRemote)) continue;
    let parsedConfig: any = {};
    const configSource = rawRemote["Config JSON"] || rawRemote.configJson || rawRemote.config;
    if (typeof configSource === "object" && configSource !== null) {
      parsedConfig = configSource;
    } else if (typeof configSource === "string") {
      try {
        parsedConfig = JSON.parse(configSource);
      } catch {}
    }

    const remoteId =
      rawRemote.id || parsedConfig.id || parsedConfig.client_id || rawRemote.slug;
    const key = String(remoteId || rawRemote.slug || "");
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const existing = currentMap.get(key) || (rawRemote.slug ? currentMap.get(String(rawRemote.slug)) : null);

    const existingTime = getLpTimestampMs(existing);
    const remoteTime = Math.max(getLpTimestampMs(rawRemote), getLpTimestampMs(parsedConfig));

    const preferExisting = Boolean(existing && existingTime > remoteTime);

    const remoteHeroModel =
      rawRemote.heroModel ||
      rawRemote.hero?.model ||
      parsedConfig.heroModel ||
      parsedConfig.hero?.model ||
      rawRemote.hero_model;

    const existingHeroModel =
      existing?.heroModel || existing?.hero?.model || existing?.hero_model;

    const chosenHeroModel = preferExisting
      ? (existingHeroModel || remoteHeroModel || "split_image")
      : (remoteHeroModel || existingHeroModel || "split_image");

    const mergedHero =
      rawRemote.hero || parsedConfig.hero || existing?.hero
        ? {
            ...(preferExisting ? parsedConfig.hero || {} : existing?.hero || {}),
            ...(preferExisting ? rawRemote.hero || {} : parsedConfig.hero || {}),
            ...(preferExisting ? existing?.hero || {} : rawRemote.hero || {}),
            model: chosenHeroModel,
          }
        : undefined;

    const primary = preferExisting ? existing : { ...parsedConfig, ...rawRemote };
    const secondary = preferExisting ? { ...parsedConfig, ...rawRemote } : (existing || {});

    out.push({
      ...secondary,
      ...primary,
      id: remoteId,
      heroModel: chosenHeroModel,
      hero: mergedHero,
      quiz: primary.quiz || secondary.quiz,
      bentoGrid: primary.bentoGrid || secondary.bentoGrid,
      testimonials: primary.testimonials || secondary.testimonials,
      formSection: primary.formSection || secondary.formSection,
      photoGrid: primary.photoGrid || secondary.photoGrid,
      visibility: primary.visibility || secondary.visibility,
      sectionOrder: primary.sectionOrder || secondary.sectionOrder,
      customElementStyles: primary.customElementStyles || secondary.customElementStyles,
      floatingImages: primary.floatingImages || secondary.floatingImages,
      faq: primary.faq || secondary.faq,
      visits: Math.max(Number(rawRemote.visits || 0), Number(existing?.visits || 0)),
      leads: Math.max(Number(rawRemote.leads || 0), Number(existing?.leads || 0)),
    });
  }

  return out;
}

class CloudStorageService {
  private db: CloudDatabase = createInitialCloudDatabase();
  private status: CloudSyncStatus = {
    bootstrapping: false,
    loadedFromCloud: false,
    syncing: false,
    pendingWrite: false,
    dirtyRevision: 0,
    lastSyncTimestamp: null,
    lastPushTimestamp: null,
    lastError: null,
    connected: false,
    webappUrl: getGlobalGasConfig().WEBAPP_URL,
    spreadsheetUrl: getGlobalGasConfig().SPREADSHEET_URL,
    spreadsheetName: getGlobalGasConfig().SPREADSHEET_NAME,
  };

  private listeners = new Set<() => void>();
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private pushTimer: ReturnType<typeof setTimeout> | null = null;
  private lpSaveTimer: ReturnType<typeof setTimeout> | null = null;
  private bootstrapPromise: Promise<CloudDatabase> | null = null;
  private publicLpInflight = new Map<string, Promise<LandingPage | null>>();
  private isPushing = false;
  private isPulling = false;
  private realtimeStarted = false;
  private bcChannel: BroadcastChannel | null = null;

  getState(): CloudDatabase {
    return this.db;
  }

  getStatus(): CloudSyncStatus {
    return { ...this.status };
  }

  getSnapshot(): { db: CloudDatabase; status: CloudSyncStatus } {
    return { db: this.db, status: { ...this.status } };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(broadcast = false): void {
    saveLocalDatabaseRoot(this.db);
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch {}
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("salead_database_root_updated"));
      if (broadcast && this.bcChannel) {
        try {
          this.bcChannel.postMessage({
            type: "CLOUD_INVALIDATE",
            revision: this.db.revision,
            timestamp: Date.now(),
          });
        } catch {}
      }
    }
  }

  private hydrateFromRemote(raw: any): void {
    if (!raw || typeof raw !== "object") return;
    const payload = raw.data && typeof raw.data === "object" && !Array.isArray(raw.leads)
      ? raw.data
      : raw;

    const deletedSet = new Set<string>(
      Array.isArray(payload.deletedLpIds)
        ? payload.deletedLpIds.map(String)
        : this.db.deletedLpIds.map(String)
    );

    const remoteLps = Array.isArray(payload.landingPages)
      ? payload.landingPages
      : Array.isArray(payload.landing_pages)
      ? payload.landing_pages
      : [];

    const remoteSurveys = Array.isArray(payload.surveys) ? payload.surveys : null;
    const mergedSurveysMap = new Map<string, Survey>();
    for (const s of DEFAULT_SURVEYS_LIST) {
      mergedSurveysMap.set(s.id, {
        ...s,
        questions: s.questions ? JSON.parse(JSON.stringify(s.questions)) : [],
      });
    }
    if (remoteSurveys) {
      for (const s of remoteSurveys) {
        if (s && s.id) {
          const prev = mergedSurveysMap.get(s.id);
          mergedSurveysMap.set(s.id, {
            ...(prev || {}),
            ...s,
            questions:
              Array.isArray(s.questions) && s.questions.length > 0
                ? s.questions
                : prev?.questions || [],
          });
        }
      }
    }

    this.db = {
      ...this.db,
      leads: Array.isArray(payload.leads) ? payload.leads : this.db.leads,
      leads_landing_pages: Array.isArray(payload.leads_landing_pages)
        ? payload.leads_landing_pages
        : this.db.leads_landing_pages,
      landingPages:
        remoteLps.length > 0
          ? mergeLandingPageLists(remoteLps, this.db.landingPages, deletedSet)
          : Array.isArray(payload.landingPages)
          ? []
          : this.db.landingPages,
      surveys: remoteSurveys ? Array.from(mergedSurveysMap.values()) : this.db.surveys,
      surveyResponses: Array.isArray(payload.surveyResponses)
        ? payload.surveyResponses
        : Array.isArray(payload.survey_responses)
        ? payload.survey_responses
        : this.db.surveyResponses,
      tasks: Array.isArray(payload.tasks) ? payload.tasks : this.db.tasks,
      products: Array.isArray(payload.products) ? payload.products : this.db.products,
      pipelines:
        Array.isArray(payload.pipelines) && payload.pipelines.length > 0
          ? payload.pipelines
          : this.db.pipelines,
      historico_pipeline: Array.isArray(payload.historico_pipeline)
        ? payload.historico_pipeline
        : Array.isArray(payload.pipelineHistory)
        ? payload.pipelineHistory
        : this.db.historico_pipeline,
      playbooks:
        Array.isArray(payload.playbooks) && payload.playbooks.length > 0
          ? payload.playbooks
          : this.db.playbooks,
      objections: Array.isArray(payload.objections)
        ? payload.objections
        : this.db.objections,
      automations: Array.isArray(payload.automations)
        ? payload.automations
        : this.db.automations,
      handoffRules: Array.isArray(payload.handoffRules)
        ? payload.handoffRules
        : Array.isArray(payload.handoff_rules)
        ? payload.handoff_rules
        : this.db.handoffRules,
      stageWorkflows:
        payload.stageWorkflows || payload.stage_workflows || this.db.stageWorkflows,
      marketingInvestments: Array.isArray(payload.marketingInvestments)
        ? payload.marketingInvestments
        : Array.isArray(payload.marketing_investments)
        ? payload.marketing_investments
        : this.db.marketingInvestments,
      users: Array.isArray(payload.users) ? payload.users : this.db.users,
      company: payload.company || this.db.company,
      aiConfig: payload.aiConfig || payload.ai_config || this.db.aiConfig,
      visibility: payload.visibility || this.db.visibility,
      slaThresholds: payload.slaThresholds || this.db.slaThresholds,
      leadRoutingConfig: payload.leadRoutingConfig || this.db.leadRoutingConfig,
      rolePermissions: payload.rolePermissions || this.db.rolePermissions,
      roleModulePermissions:
        payload.roleModulePermissions || this.db.roleModulePermissions,
      userModulePermissions:
        payload.userModulePermissions || this.db.userModulePermissions,
      workingDays: Array.isArray(payload.workingDays)
        ? payload.workingDays
        : this.db.workingDays,
      holidays: Array.isArray(payload.holidays) ? payload.holidays : this.db.holidays,
      funnelTypes:
        Array.isArray(payload.funnelTypes) && payload.funnelTypes.length > 0
          ? payload.funnelTypes
          : this.db.funnelTypes,
      deletedLpIds: Array.from(deletedSet),
      lpAnalytics: payload.lpAnalytics || this.db.lpAnalytics,
      automationLogs: Array.isArray(payload.automationLogs)
        ? payload.automationLogs
        : this.db.automationLogs,
      brandIdentity: payload.brandIdentity || this.db.brandIdentity,
      revision: Number(payload.revision) || this.db.revision,
      ultimoBackup: payload.ultimoBackup || this.db.ultimoBackup,
      versao: payload.versao || "3.0-CloudEngine",
    };

    saveLocalDatabaseRoot(this.db);
  }

  async bootstrap(): Promise<CloudDatabase> {
    if (this.bootstrapPromise) return this.bootstrapPromise;

    this.bootstrapPromise = (async () => {
      purgeLegacyBusinessLocalStorage();
      this.status.bootstrapping = true;
      this.status.lastError = null;
      this.emit(false);

      try {
        const cfg = await initializeSharedDriveConfig();
        const url = cfg.webappUrl || getGlobalGasConfig().WEBAPP_URL;
        this.status.webappUrl = url;
        this.status.connected = !!url;
        this.status.spreadsheetUrl = cfg.spreadsheetUrl;
        this.status.spreadsheetName = cfg.spreadsheetName;

        if (url) {
          let remote = await fetchFromGoogleDrive<any>(url);
          if (!remote) {
            remote = await forceReadSpreadsheetFromDrive<any>(url);
          }
          if (remote && typeof remote === "object") {
            this.hydrateFromRemote(remote);
            this.status.loadedFromCloud = true;
            this.status.lastSyncTimestamp = Date.now();
          }
        }
      } catch (err: any) {
        this.status.lastError =
          err?.message || "Falha ao carregar base de dados na nuvem.";
      } finally {
        this.status.bootstrapping = false;
        this.emit(false);
      }

      return this.db;
    })();

    try {
      return await this.bootstrapPromise;
    } finally {
      this.bootstrapPromise = null;
    }
  }

  async pullNow(forceReadSheets = false): Promise<CloudDatabase | null> {
    if (typeof window === "undefined") return this.db;
    if (this.isPulling || this.isPushing || this.status.pendingWrite) {
      return null;
    }
    if (
      !forceReadSheets &&
      this.status.lastPushTimestamp &&
      Date.now() - this.status.lastPushTimestamp < 3000
    ) {
      return null;
    }

    const cfg = getDriveConfig();
    const url = cfg.webappUrl || getGlobalGasConfig().WEBAPP_URL;
    if (!url) return null;

    try {
      this.isPulling = true;
      this.status.syncing = true;

      const remote = forceReadSheets
        ? await forceReadSpreadsheetFromDrive<any>(url)
        : await fetchFromGoogleDrive<any>(url);

      if (remote && typeof remote === "object") {
        // Re-check dirty flag before overwriting RAM
        if (!this.status.pendingWrite && !this.isPushing) {
          this.hydrateFromRemote(remote);
          this.status.loadedFromCloud = true;
          this.status.lastSyncTimestamp = Date.now();
          this.status.lastError = null;
          this.emit(false);
        }
      }
      return this.db;
    } catch (err: any) {
      this.status.lastError = err?.message || "Erro ao sincronizar com a nuvem.";
      return null;
    } finally {
      this.isPulling = false;
      this.status.syncing = false;
      this.emit(false);
    }
  }

  private activePushPromise: Promise<boolean> | null = null;

  async pushNow(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    if (this.isPushing && this.activePushPromise) {
      await this.activePushPromise.catch(() => false);
      if (!this.status.pendingWrite) return true;
    }

    const cfg = getDriveConfig();
    const url = cfg.webappUrl || getGlobalGasConfig().WEBAPP_URL;
    if (!url) {
      this.status.pendingWrite = false;
      return false;
    }

    const capturedDirtyRevision = this.status.dirtyRevision;
    const run = (async () => {
      try {
        this.isPushing = true;
        this.status.syncing = true;
        this.status.lastError = null;

        const payload = {
          ...this.db,
          revision: (Number(this.db.revision) || 0) + 1,
          ultimoBackup: new Date().toISOString(),
          versao: "3.1-SheetsFirst",
        };
        this.db.revision = payload.revision;
        this.db.ultimoBackup = payload.ultimoBackup;

        await pushToGoogleDrive(url, payload);

        this.status.lastPushTimestamp = Date.now();
        this.status.lastSyncTimestamp = Date.now();
        this.status.loadedFromCloud = true;
        this.status.connected = true;

        if (this.status.dirtyRevision === capturedDirtyRevision) {
          this.status.pendingWrite = false;
        } else {
          this.scheduleSync(200);
        }

        saveDriveConfig(
          {
            syncStatus: "synced",
            lastSyncTimestamp: Date.now(),
          },
          false
        );

        this.emit(true);
        return true;
      } catch (err: any) {
        this.status.pendingWrite = true;
        this.status.lastError =
          err?.message || "Falha ao gravar alterações no Google Drive/Sheets.";
        saveDriveConfig(
          {
            syncStatus: err?.isBusy ? "syncing" : "error",
            lastSyncMessage: this.status.lastError || undefined,
          },
          false
        );
        if (err?.isBusy) {
          this.scheduleSync(1500);
        }
        this.emit(false);
        return false;
      } finally {
        this.isPushing = false;
        this.status.syncing = false;
        this.activePushPromise = null;
        this.emit(false);
      }
    })();

    this.activePushPromise = run;
    return run;
  }

  scheduleSync(delayMs = 180): void {
    if (typeof window === "undefined") return;
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => {
      this.pushTimer = null;
      this.pushNow().catch(() => {});
    }, delayMs);
  }

  mutate(
    updater: (draft: CloudDatabase) => void | Partial<CloudDatabase>,
    options: { immediate?: boolean; skipPush?: boolean } = {}
  ): CloudDatabase {
    const draft: CloudDatabase = { ...this.db };
    const result = updater(draft);
    this.db = result && typeof result === "object" ? { ...draft, ...result } : draft;

    this.status.dirtyRevision += 1;
    if (!options.skipPush) {
      this.status.pendingWrite = true;
    }

    this.emit(true);

    if (!options.skipPush) {
      if (options.immediate) {
        if (this.pushTimer) {
          clearTimeout(this.pushTimer);
          this.pushTimer = null;
        }
        this.pushNow().catch(() => {});
      } else {
        this.scheduleSync(160);
      }
    }

    return this.db;
  }

  async mutateAndSync(
    updater: (draft: CloudDatabase) => void | Partial<CloudDatabase>
  ): Promise<{ db: CloudDatabase; synced: boolean; error?: string | null }> {
    const draft: CloudDatabase = { ...this.db };
    const result = updater(draft);
    this.db = result && typeof result === "object" ? { ...draft, ...result } : draft;

    this.status.dirtyRevision += 1;
    this.status.pendingWrite = true;
    if (this.pushTimer) {
      clearTimeout(this.pushTimer);
      this.pushTimer = null;
    }

    this.emit(true);
    const synced = await this.pushNow();
    return {
      db: this.db,
      synced,
      error: this.status.lastError,
    };
  }

  startRealtimeEngine(): void {
    if (typeof window === "undefined" || this.realtimeStarted) return;
    this.realtimeStarted = true;

    try {
      this.bcChannel = new BroadcastChannel("comet_realtime_sync");
      this.bcChannel.onmessage = (ev) => {
        if (ev?.data?.type === "CLOUD_INVALIDATE" && !this.status.pendingWrite) {
          this.pullNow(false).catch(() => {});
        } else {
          this.emit(false);
        }
      };
    } catch {}

    this.bootstrap().catch(() => {});

    this.pollInterval = setInterval(() => {
      if (
        typeof document === "undefined" ||
        document.visibilityState === "visible"
      ) {
        this.pullNow(false).catch(() => {});
      }
    }, 12000);

    window.addEventListener("focus", () => {
      this.pullNow(false).catch(() => {});
    });

    window.addEventListener("online", () => {
      if (this.status.pendingWrite) {
        this.pushNow().catch(() => {});
      } else {
        this.pullNow(false).catch(() => {});
      }
    });

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          this.pullNow(false).catch(() => {});
        }
      });
    }

    window.addEventListener("salead_drive_config_updated", () => {
      const cfg = getDriveConfig();
      this.status.webappUrl = cfg.webappUrl;
      this.status.connected = !!cfg.webappUrl;
      this.status.spreadsheetUrl = cfg.spreadsheetUrl;
      this.status.spreadsheetName = cfg.spreadsheetName;
      this.pullNow(false).catch(() => {});
    });
  }

  /**
   * Salva 1 única Landing Page de forma ultrarrápida (RAM + /api/pages/preview + SAVE_LANDING_PAGE no Sheets)
   * sem disparar reescrita completa das 8 abas da planilha a cada clique/digitação.
   */
  async saveLandingPageOnly(
    rawLp: any,
    options: { immediate?: boolean } = {}
  ): Promise<{ page: LandingPage; synced: boolean }> {
    const heroModel =
      rawLp?.hero?.model || rawLp?.heroModel || rawLp?.hero_model || "split_image";
    const nowIso = new Date().toISOString();
    const normalized: LandingPage = {
      ...rawLp,
      heroModel,
      hero: rawLp?.hero ? { ...rawLp.hero, model: heroModel } : { model: heroModel },
      updatedAt: nowIso,
      updated_at: nowIso,
    };

    // 1. Atualiza RAM imediatamente
    const list = Array.isArray(this.db.landingPages) ? this.db.landingPages : [];
    const exists = list.some(
      (p: any) =>
        p &&
        (p.id === normalized.id ||
          (normalized.slug && p.slug === normalized.slug))
    );
    this.db = {
      ...this.db,
      landingPages: exists
        ? list.map((p: any) =>
            p &&
            (p.id === normalized.id ||
              (normalized.slug && p.slug === normalized.slug))
              ? normalized
              : p
          )
        : [normalized, ...list],
      activePreviewPage: normalized,
    };

    this.status.dirtyRevision += 1;
    this.status.pendingWrite = true;
    const capturedDirty = this.status.dirtyRevision;
    this.emit(true);

    // 2. Persiste instantaneamente no cache de preview do servidor (sub-10ms para /preview e /lp/:id)
    if (typeof window !== "undefined") {
      fetch("/api/pages/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalized),
      }).catch(() => {});
    }

    const executeSingleSave = async (): Promise<boolean> => {
      try {
        await initializeSharedDriveConfig().catch(() => {});
        this.status.syncing = true;
        this.emit(false);

        const driveRes = await saveLandingPageToDrive(normalized);
        if (driveRes.supported) {
          this.status.lastPushTimestamp = Date.now();
          this.status.lastSyncTimestamp = Date.now();
          this.status.loadedFromCloud = true;
          this.status.connected = true;
          this.status.lastError = null;
          if (this.status.dirtyRevision === capturedDirty) {
            this.status.pendingWrite = false;
          }
          this.emit(true);
          return true;
        }

        // Fallback caso o Code.gs do usuário ainda seja antigo (< v3.2):
        const pushed = await this.pushNow();
        return pushed;
      } catch (err: any) {
        this.status.lastError = err?.message || "Erro ao salvar Landing Page na nuvem.";
        return false;
      } finally {
        this.status.syncing = false;
        this.emit(false);
      }
    };

    if (options.immediate) {
      if (this.lpSaveTimer) {
        clearTimeout(this.lpSaveTimer);
        this.lpSaveTimer = null;
      }
      const synced = await executeSingleSave();
      return { page: normalized, synced };
    }

    if (this.lpSaveTimer) clearTimeout(this.lpSaveTimer);
    this.lpSaveTimer = setTimeout(() => {
      this.lpSaveTimer = null;
      executeSingleSave().catch(() => {});
    }, 350);

    return { page: normalized, synced: false };
  }

  async fetchPublicLP(
    idOrSlug: string,
    options: { preferSheets?: boolean } = {}
  ): Promise<LandingPage | null> {
    if (!idOrSlug) return null;
    const cleanTarget = decodeURIComponent(idOrSlug).trim().toLowerCase();

    const findInList = (list: any[]) =>
      list.find(
        (p) =>
          p &&
          !isCorruptedLeadAsLp(p) &&
          (String(p.id || "").toLowerCase() === cleanTarget ||
            String(p.originalId || "").toLowerCase() === cleanTarget ||
            String(p.previewToken || "").toLowerCase() === cleanTarget ||
            String(p.slug || "").toLowerCase() === cleanTarget)
      ) || null;

    const fromPreviewRam =
      this.db.activePreviewPage && findInList([this.db.activePreviewPage])
        ? this.db.activePreviewPage
        : null;
    const fromRam = fromPreviewRam || findInList(this.db.landingPages);

    // Se houver escrita local pendente neste navegador, prioriza RAM imediata
    if (fromRam && this.status.pendingWrite) {
      return fromRam;
    }

    if (fromRam && this.status.loadedFromCloud && !options.preferSheets) {
      return fromRam;
    }

    // Deduplicação de requisições simultâneas para a mesma LP (evita 2-4 chamadas paralelas!)
    const inflightKey = `${cleanTarget}:${options.preferSheets ? "s" : "c"}`;
    const existingPromise = this.publicLpInflight.get(inflightKey);
    if (existingPromise) return existingPromise;

    const run = (async (): Promise<LandingPage | null> => {
      await initializeSharedDriveConfig().catch(() => {});
      const cloudLp = await fetchPublicLpFromDrive(idOrSlug, {
        directSheets: options.preferSheets === true,
      });

      if (cloudLp) {
        const ramTime = getLpTimestampMs(fromRam);
        const cloudTime = getLpTimestampMs(cloudLp);

        if (!fromRam || !this.status.loadedFromCloud || cloudTime >= ramTime) {
          this.db.landingPages = [
            cloudLp,
            ...this.db.landingPages.filter((p) => p.id !== cloudLp.id),
          ];
          this.emit(false);
          return cloudLp;
        }
        return fromRam;
      }

      if (fromRam) return fromRam;

      // Fallback API local /api/public/lp/:id
      try {
        const res = await fetch(`/api/public/lp/${encodeURIComponent(idOrSlug)}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          const found = json?.landingPage || json?.page || json;
          if (found && (found.id || found.title || found.hero)) {
            return found;
          }
        }
      } catch {}

      return null;
    })().finally(() => {
      this.publicLpInflight.delete(inflightKey);
    });

    this.publicLpInflight.set(inflightKey, run);
    return run;
  }

  async fetchPublicSurvey(idOrSlug: string): Promise<Survey | null> {
    if (!idOrSlug) return null;
    const cleanTarget = decodeURIComponent(idOrSlug).trim().toLowerCase();

    const fromRam = this.db.surveys.find(
      (s) => s && String(s.id || "").toLowerCase() === cleanTarget
    );
    if (fromRam) return fromRam;

    await initializeSharedDriveConfig().catch(() => {});
    const cloudSurvey = await fetchPublicSurveyFromDrive(idOrSlug);
    if (cloudSurvey) {
      this.db.surveys = [
        cloudSurvey,
        ...this.db.surveys.filter((s) => s.id !== cloudSurvey.id),
      ];
      this.emit(false);
      return cloudSurvey;
    }

    try {
      const res = await fetch(`/api/surveys/${encodeURIComponent(idOrSlug)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.id) return json;
      }
    } catch {}

    return null;
  }
}

export const cloudStore = new CloudStorageService();
