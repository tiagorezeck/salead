// =========================================================================
// GOOGLE DRIVE + GOOGLE SHEETS DATABASE CLIENT SERVICE (ZERO-LOCALSTORAGE)
// Transporte puro com Google Apps Script (Code.gs v3.0) via /api/drive-proxy
// ou chamada direta, sem armazenamento de dados de negócio em localStorage.
// =========================================================================

import {
  getGlobalGasConfig,
  normalizeGasUrl,
  setGlobalGasConfig,
} from "@/config/gasConfig";

export interface DriveConfig {
  webappUrl: string;
  apiToken?: string;
  autoSync: boolean;
  folderName: string;
  connected?: boolean;
  folderId?: string;
  lastSyncTimestamp?: number;
  syncStatus?: "synced" | "syncing" | "error" | "offline";
  spreadsheetUrl?: string;
  spreadsheetName?: string;
  spreadsheetId?: string;
  lastSyncMessage?: string;
}

export interface DriveFileInfo {
  id: string;
  name: string;
  isRoot: boolean;
  size: number;
  lastUpdated: number;
  url?: string;
}

export interface DriveTestResult {
  success: boolean;
  message: string;
  spreadsheetUrl?: string;
  spreadsheetName?: string;
  spreadsheetId?: string;
  folder?: string;
}

export interface SystemCheckpoint {
  id: string;
  name: string;
  timestamp: string;
  leadsCount: number;
  data: any;
  driveFileName?: string;
}

// Estado em memória RAM (Zero-LocalStorage)
let inMemoryDriveConfig: DriveConfig | null = null;
let inMemoryDatabaseRoot: any = null;
let inMemoryCheckpoints: SystemCheckpoint[] = [];

const GET_ACTIONS = new Set([
  "ping",
  "test",
  "get",
  "GET_DATABASE",
  "LOAD_DATABASE",
  "GET_PUBLIC_LP",
  "GET_LP_BY_SLUG",
  "GET_PUBLIC_SURVEY",
  "RECORD_LP_VISIT",
  "INCREMENT_LP_VISIT",
  "lp_visit",
  "list_files",
  "get_file",
]);

export const cleanWebAppUrl = (rawUrl: string): string => {
  return normalizeGasUrl(rawUrl);
};

export const getDriveConfig = (): DriveConfig => {
  const globalCfg = getGlobalGasConfig();
  const baseUrl = normalizeGasUrl(globalCfg.WEBAPP_URL);

  if (typeof window !== "undefined") {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const driveParam = urlParams.get("drive_url") || urlParams.get("sync_drive");
      if (driveParam) {
        const cleanParam = cleanWebAppUrl(decodeURIComponent(driveParam));
        if (cleanParam) {
          setGlobalGasConfig({ WEBAPP_URL: cleanParam });
          inMemoryDriveConfig = {
            ...(inMemoryDriveConfig || {}),
            webappUrl: cleanParam,
            apiToken: inMemoryDriveConfig?.apiToken || globalCfg.API_TOKEN,
            autoSync: true,
            folderName: "SALEAD/AppDatabase_Data",
            syncStatus: "synced",
            lastSyncTimestamp: Date.now(),
            connected: true,
            spreadsheetUrl:
              inMemoryDriveConfig?.spreadsheetUrl || globalCfg.SPREADSHEET_URL,
            spreadsheetId:
              inMemoryDriveConfig?.spreadsheetId || globalCfg.SPREADSHEET_ID,
            spreadsheetName:
              inMemoryDriveConfig?.spreadsheetName || globalCfg.SPREADSHEET_NAME,
          };
          return { ...inMemoryDriveConfig };
        }
      }
    } catch {}
  }

  if (!inMemoryDriveConfig) {
    inMemoryDriveConfig = {
      webappUrl: baseUrl,
      apiToken: globalCfg.API_TOKEN || "",
      autoSync: true,
      folderName: "SALEAD/AppDatabase_Data",
      connected: !!baseUrl,
      syncStatus: baseUrl ? "synced" : "offline",
      spreadsheetUrl: globalCfg.SPREADSHEET_URL,
      spreadsheetId: globalCfg.SPREADSHEET_ID,
      spreadsheetName: globalCfg.SPREADSHEET_NAME,
    };
  }

  return { ...inMemoryDriveConfig };
};

export const saveDriveConfig = (
  config: Partial<DriveConfig>,
  persistServer = true
): DriveConfig => {
  const current = getDriveConfig();
  const nextUrl =
    config.webappUrl !== undefined
      ? cleanWebAppUrl(config.webappUrl)
      : current.webappUrl;

  const updated: DriveConfig = {
    ...current,
    ...config,
    webappUrl: nextUrl,
    connected: !!(nextUrl && nextUrl.trim().length > 0),
  };

  setGlobalGasConfig({
    WEBAPP_URL: updated.webappUrl,
    ...(config.apiToken !== undefined ? { API_TOKEN: config.apiToken } : {}),
    ...(config.spreadsheetUrl !== undefined
      ? { SPREADSHEET_URL: config.spreadsheetUrl }
      : {}),
    ...(config.spreadsheetId !== undefined
      ? { SPREADSHEET_ID: config.spreadsheetId }
      : {}),
    ...(config.spreadsheetName !== undefined
      ? { SPREADSHEET_NAME: config.spreadsheetName }
      : {}),
  });

  const changed = JSON.stringify(current) !== JSON.stringify(updated);
  inMemoryDriveConfig = updated;

  if (typeof window !== "undefined" && changed) {
    window.dispatchEvent(
      new CustomEvent("salead_drive_config_updated", { detail: updated })
    );

    if (persistServer && config.webappUrl !== undefined) {
      fetch("/api/server-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webappUrl: updated.webappUrl,
          apiToken: updated.apiToken,
          autoSync: updated.autoSync,
          folderName: updated.folderName,
          spreadsheetUrl: updated.spreadsheetUrl,
          spreadsheetId: updated.spreadsheetId,
          spreadsheetName: updated.spreadsheetName,
        }),
      }).catch(() => {});

      fetch("/api/system/drive-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      }).catch(() => {});
    }
  }

  return { ...updated };
};

export const initializeSharedDriveConfig = async (): Promise<DriveConfig> => {
  if (typeof window === "undefined") return getDriveConfig();

  const tryEndpoints = ["/api/runtime-config", "/api/system/drive-config"];
  for (const endpoint of tryEndpoints) {
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) continue;
      const serverConfig = await res.json();
      if (serverConfig && serverConfig.webappUrl) {
        const clean = cleanWebAppUrl(serverConfig.webappUrl);
        if (clean) {
          return saveDriveConfig(
            {
              webappUrl: clean,
              ...(serverConfig.apiToken
                ? { apiToken: serverConfig.apiToken }
                : {}),
              autoSync: serverConfig.autoSync !== false,
              folderName:
                serverConfig.folderName || "SALEAD/AppDatabase_Data",
              spreadsheetUrl:
                serverConfig.spreadsheetUrl || getDriveConfig().spreadsheetUrl,
              spreadsheetId:
                serverConfig.spreadsheetId || getDriveConfig().spreadsheetId,
              spreadsheetName:
                serverConfig.spreadsheetName || getDriveConfig().spreadsheetName,
              connected: true,
            },
            false
          );
        }
      }
    } catch {}
  }

  return getDriveConfig();
};

export const getLocalDatabaseRoot = <T>(): T | null => {
  return (inMemoryDatabaseRoot as T) || null;
};

export const saveLocalDatabaseRoot = <T>(data: T): void => {
  inMemoryDatabaseRoot = data;
};

// =========================================================================
// HELPER CENTRAL DE REQUISIÇÃO VIA PROXY (SEM CORS / ZERO-LOCALSTORAGE)
// =========================================================================
export const executeDriveRequest = async (
  payload: any,
  retryCount = 0
): Promise<any> => {
  const maxRetries = 4;
  const cfg = getDriveConfig();
  const cleanUrl = cleanWebAppUrl(payload.targetUrl || cfg.webappUrl || "");

  if (
    cleanUrl &&
    (cleanUrl.includes("script.google.com/d/") || cleanUrl.includes("/edit"))
  ) {
    throw new Error(
      "Você inseriu a URL de edição do projeto (script.google.com/d/...). Clique em 'Implantar' > 'Gerenciar implantações' / 'Nova implantação' > tipo 'App da Web' e copie a URL terminada em /exec."
    );
  }

  const effectiveToken = payload.apiToken ?? cfg.apiToken ?? "";

  let proxyRes: Response | null = null;
  let data: any = null;

  try {
    proxyRes = await fetch("/api/drive-proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(effectiveToken
          ? {
              Authorization: `Bearer ${effectiveToken}`,
              "x-api-token": effectiveToken,
            }
          : {}),
      },
      body: JSON.stringify({
        ...payload,
        ...(cleanUrl ? { targetUrl: cleanUrl } : {}),
        ...(effectiveToken ? { apiToken: effectiveToken } : {}),
      }),
    });
    data = await proxyRes.json().catch(() => null);
  } catch {}

  // Retry automático para LockService ocupado (HTTP 429 ou status busy)
  if (
    (data?.status === "busy" ||
      data?.message?.includes("ocupado") ||
      proxyRes?.status === 429) &&
    retryCount < maxRetries
  ) {
    await new Promise((resolve) =>
      setTimeout(resolve, 1800 * (retryCount + 1))
    );
    return executeDriveRequest(payload, retryCount + 1);
  }

  if (data && data.status === "busy") {
    const busyErr: any = new Error(
      data.message ||
        "O Google Apps Script está temporariamente ocupado. Nova tentativa agendada."
    );
    busyErr.isBusy = true;
    throw busyErr;
  }

  // Fallback direto apenas se /api/drive-proxy não existir (404) e houver URL válida
  if ((!proxyRes || proxyRes.status === 404) && cleanUrl && typeof window !== "undefined") {
    try {
      const action = String(payload.action || "").trim();
      if (GET_ACTIONS.has(action)) {
        const directUrl = new URL(cleanUrl);
        directUrl.searchParams.set("action", action);
        if (payload.fileName) directUrl.searchParams.set("fileName", payload.fileName);
        if (payload.id) directUrl.searchParams.set("id", String(payload.id));
        if (payload.lpId) directUrl.searchParams.set("lpId", String(payload.lpId));
        if (payload.slug) directUrl.searchParams.set("slug", String(payload.slug));
        if (payload.title) directUrl.searchParams.set("title", String(payload.title));
        if (payload.surveyId) directUrl.searchParams.set("surveyId", String(payload.surveyId));
        if (payload.nocache) directUrl.searchParams.set("nocache", String(payload.nocache));
        if (payload.source) directUrl.searchParams.set("source", String(payload.source));
        if (payload.spreadsheetId) directUrl.searchParams.set("spreadsheetId", String(payload.spreadsheetId));
        if (effectiveToken) directUrl.searchParams.set("token", effectiveToken);
        directUrl.searchParams.set("t", Date.now().toString());

        const directRes = await fetch(directUrl.toString(), {
          method: "GET",
          headers: {
            Accept: "application/json, text/plain, */*",
          },
        });
        return await directRes.json();
      } else {
        const directRes = await fetch(cleanUrl, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
          body: JSON.stringify({ ...payload, token: effectiveToken }),
        });
        return await directRes.json();
      }
    } catch (directErr: any) {
      throw new Error(
        `Conexão com o Google Apps Script indisponível. Verifique a URL e as permissões do Web App. (${
          directErr.message || "Offline"
        })`
      );
    }
  }

  if (data && data.status === "error") {
    throw new Error(data.message || "Erro retornado pelo Google Apps Script.");
  }

  if (data && data.status === "unauthorized") {
    throw new Error(
      data.message || "Acesso não autorizado: Token de segurança inválido."
    );
  }

  if (!proxyRes || !proxyRes.ok) {
    const errorMsg =
      data?.message ||
      `Erro de conexão com o proxy (HTTP ${proxyRes ? proxyRes.status : "Offline"})`;
    throw new Error(errorMsg);
  }

  if (!data) {
    throw new Error("Resposta vazia recebida do servidor.");
  }

  return data;
};

// PING / TESTE DE CONEXÃO
export const testDriveConnection = async (
  rawUrl?: string,
  token?: string
): Promise<DriveTestResult> => {
  const cleanUrl = cleanWebAppUrl(rawUrl || getDriveConfig().webappUrl);
  if (!cleanUrl) {
    return {
      success: false,
      message: "Insira a URL do Web App do Google Apps Script.",
    };
  }

  try {
    const res = await executeDriveRequest({
      targetUrl: cleanUrl,
      action: "ping",
      apiToken: token,
    });

    if (res.status === "success" || res.success) {
      saveDriveConfig({
        webappUrl: cleanUrl,
        apiToken: token !== undefined ? token : getDriveConfig().apiToken,
        syncStatus: "synced",
        lastSyncTimestamp: Date.now(),
        spreadsheetUrl: res.spreadsheetUrl || getDriveConfig().spreadsheetUrl,
        spreadsheetName: res.spreadsheetName || getDriveConfig().spreadsheetName,
        spreadsheetId: res.spreadsheetId || getDriveConfig().spreadsheetId,
        lastSyncMessage: res.message,
      });
      return {
        success: true,
        message:
          res.message ||
          "Conexão com Google Drive e Planilha estabelecida com sucesso!",
        spreadsheetUrl: res.spreadsheetUrl,
        spreadsheetName: res.spreadsheetName,
        spreadsheetId: res.spreadsheetId,
        folder: res.folder,
      };
    }

    return {
      success: false,
      message: res.message || "Falha na resposta do script.",
    };
  } catch (err: any) {
    return {
      success: false,
      message:
        err.message ||
        "Não foi possível conectar ao Google Apps Script. Verifique se a implantação está como 'Qualquer pessoa' (Anyone) e tipo 'App da Web'.",
    };
  }
};

export const setScriptSecuritySecret = async (
  secret: string,
  customUrl?: string
): Promise<{ success: boolean; message: string }> => {
  const cleanUrl = cleanWebAppUrl(customUrl || getDriveConfig().webappUrl);
  if (!cleanUrl) throw new Error("URL do Google Apps Script não configurada.");

  const res = await executeDriveRequest({
    targetUrl: cleanUrl,
    action: "SET_API_SECRET",
    data: { newSecret: secret },
    apiToken: getDriveConfig().apiToken,
  });

  if (res.status === "success" || res.success) {
    saveDriveConfig({ apiToken: secret });
    return {
      success: true,
      message: res.message || "Chave de segurança atualizada com sucesso!",
    };
  }
  throw new Error(res.message || "Erro ao configurar chave de segurança.");
};

// PUSH (Enviar / Salvar banco de dados completo na nuvem)
export async function pushToGoogleDrive<T>(
  dataOrUrl: string | T,
  optionalData?: T
): Promise<any> {
  let targetUrl: string;
  let data: T;

  if (typeof dataOrUrl === "string" && optionalData !== undefined) {
    targetUrl = dataOrUrl;
    data = optionalData;
  } else {
    targetUrl = getDriveConfig().webappUrl;
    data = dataOrUrl as T;
  }

  const cleanUrl = cleanWebAppUrl(targetUrl || getGlobalGasConfig().WEBAPP_URL);
  saveLocalDatabaseRoot(data);

  if (!cleanUrl) return null;

  try {
    const res = await executeDriveRequest({
      targetUrl: cleanUrl,
      action: "save",
      data,
    });

    if (res.status === "error") throw new Error(res.message);

    saveDriveConfig(
      {
        lastSyncTimestamp: Date.now(),
        syncStatus: "synced",
        spreadsheetUrl: res.spreadsheetUrl || getDriveConfig().spreadsheetUrl,
        spreadsheetName: res.spreadsheetName || getDriveConfig().spreadsheetName,
        spreadsheetId: res.spreadsheetId || getDriveConfig().spreadsheetId,
        lastSyncMessage: res.message,
      },
      false
    );

    return res;
  } catch (err: any) {
    saveDriveConfig(
      {
        syncStatus: err?.isBusy ? "syncing" : "error",
        lastSyncMessage: err.message,
      },
      false
    );
    throw err;
  }
}

// PULL (Leitura rápida via CacheService chunked + database_root.json)
export async function fetchFromGoogleDrive<T>(
  optionalUrl?: string,
  nocache = false
): Promise<T | null> {
  const targetUrl =
    optionalUrl || getDriveConfig().webappUrl || getGlobalGasConfig().WEBAPP_URL;
  const cleanUrl = cleanWebAppUrl(targetUrl);
  if (!cleanUrl) return null;

  try {
    const res = await executeDriveRequest({
      targetUrl: cleanUrl,
      action: "get",
      ...(nocache ? { nocache: "1" } : {}),
    });

    if (res?.status === "empty") return null;
    if (res?.status === "error") throw new Error(res.message);

    const payload = res?.data && typeof res.data === "object" && !Array.isArray(res.leads)
      ? res.data
      : res;

    saveLocalDatabaseRoot(payload);
    saveDriveConfig(
      { lastSyncTimestamp: Date.now(), syncStatus: "synced" },
      false
    );

    return payload as T;
  } catch {
    saveDriveConfig({ syncStatus: "offline" }, false);
    return null;
  }
}

// LEITURA DIRETA DE LANDING PAGE PÚBLICA DIRETO DO GOOGLE SHEETS / DRIVE (Zero-LocalStorage)
export const fetchPublicLpFromDrive = async (
  idOrSlug: string,
  options: { directSheets?: boolean } = { directSheets: true }
): Promise<any | null> => {
  if (!idOrSlug) return null;
  const cleanUrl = cleanWebAppUrl(
    getDriveConfig().webappUrl || getGlobalGasConfig().WEBAPP_URL
  );
  if (!cleanUrl) return null;

  const normalizeFetchedLp = (raw: any) => {
    if (!raw || typeof raw !== "object") return raw;
    let parsedConfig: any = {};
    const jsonRaw = raw["Config JSON"] || raw.configJson || raw.config;
    if (typeof jsonRaw === "object" && jsonRaw !== null) {
      parsedConfig = jsonRaw;
    } else if (typeof jsonRaw === "string") {
      try { parsedConfig = JSON.parse(jsonRaw); } catch {}
    }
    const merged = { ...parsedConfig, ...raw };
    const model =
      merged.hero?.model ||
      merged.heroModel ||
      merged.hero_model ||
      parsedConfig.hero?.model ||
      parsedConfig.heroModel ||
      "split_image";
    return {
      ...merged,
      heroModel: model,
      hero: merged.hero ? { ...merged.hero, model } : { model },
    };
  };

  try {
    const res = await executeDriveRequest({
      targetUrl: cleanUrl,
      action: "GET_PUBLIC_LP",
      id: idOrSlug,
      slug: idOrSlug,
      lpId: idOrSlug,
      ...(options.directSheets !== false ? { source: "sheets", nocache: "1" } : {}),
    });
    const lpData = res?.landingPage || res?.lp || res?.page;
    if (res && (res.status === "success" || res.success) && lpData) {
      return normalizeFetchedLp(lpData);
    }
  } catch {}

  // Fallback: leitura completa direto das abas do Google Sheets e JSON mestre
  const targetLow = decodeURIComponent(idOrSlug).trim().toLowerCase();
  const findInDb = (db: any) => {
    const list = Array.isArray(db?.landingPages)
      ? db.landingPages
      : Array.isArray(db?.landing_pages)
      ? db.landing_pages
      : [];
    const found = list.find(
      (p: any) =>
        p &&
        (String(p.id || "").toLowerCase() === targetLow ||
          String(p.originalId || "").toLowerCase() === targetLow ||
          String(p.previewToken || "").toLowerCase() === targetLow ||
          String(p.slug || "").toLowerCase() === targetLow)
    );
    return found ? normalizeFetchedLp(found) : null;
  };

  try {
    const forcedDb: any = await forceReadSpreadsheetFromDrive(cleanUrl);
    const fromSheet = findInDb(forcedDb);
    if (fromSheet) return fromSheet;
  } catch {}

  try {
    const db: any = await fetchFromGoogleDrive(cleanUrl, true);
    return findInDb(db);
  } catch {
    return null;
  }
};

// LEITURA DIRETA DE PESQUISA PÚBLICA (Zero-LocalStorage)
export const fetchPublicSurveyFromDrive = async (
  idOrSlug: string
): Promise<any | null> => {
  if (!idOrSlug) return null;
  const cleanUrl = cleanWebAppUrl(
    getDriveConfig().webappUrl || getGlobalGasConfig().WEBAPP_URL
  );
  if (!cleanUrl) return null;

  try {
    const res = await executeDriveRequest({
      targetUrl: cleanUrl,
      action: "GET_PUBLIC_SURVEY",
      id: idOrSlug,
      surveyId: idOrSlug,
    });
    if (res && (res.status === "success" || res.success) && res.survey) {
      return res.survey;
    }
  } catch {}

  try {
    const db: any = await fetchFromGoogleDrive(cleanUrl, true);
    const list = Array.isArray(db?.surveys) ? db.surveys : [];
    const targetLow = idOrSlug.trim().toLowerCase();
    return (
      list.find(
        (s: any) =>
          s &&
          (String(s.id || "").toLowerCase() === targetLow ||
            String(s.slug || "").toLowerCase() === targetLow)
      ) || null
    );
  } catch {
    return null;
  }
};

// FORÇAR LEITURA COMPLETA DAS ABAS DO GOOGLE SHEETS
export const forceReadSpreadsheetFromDrive = async <T>(
  url?: string
): Promise<T | null> => {
  const cleanUrl = cleanWebAppUrl(
    url || getDriveConfig().webappUrl || getGlobalGasConfig().WEBAPP_URL
  );
  if (!cleanUrl) return null;

  try {
    const res = await executeDriveRequest({
      targetUrl: cleanUrl,
      action: "FORCE_READ_SHEETS",
    });
    let db =
      res && (res.data || res.content) ? res.data || res.content : res;

    if (
      !db ||
      typeof db !== "object" ||
      (!Array.isArray(db.leads) && !Array.isArray(db.landingPages))
    ) {
      db = await fetchFromGoogleDrive<T>(cleanUrl, true);
    }

    if (db && typeof db === "object") {
      saveLocalDatabaseRoot(db);
      saveDriveConfig(
        { lastSyncTimestamp: Date.now(), syncStatus: "synced" },
        false
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("salead_drive_synced", { detail: db }));
      }
    }

    return db as T;
  } catch {
    const fallbackDb = await fetchFromGoogleDrive<T>(cleanUrl);
    if (fallbackDb && typeof fallbackDb === "object") {
      saveLocalDatabaseRoot(fallbackDb);
      saveDriveConfig(
        { lastSyncTimestamp: Date.now(), syncStatus: "synced" },
        false
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("salead_drive_synced", { detail: fallbackDb })
        );
      }
    }
    return fallbackDb;
  }
};

let syncIntervalId: any = null;
let isSyncingNow = false;

export const triggerInstantCloudSync = async (
  forceReadSheets = false
): Promise<any> => {
  if (typeof window === "undefined" || isSyncingNow) return null;
  const cfg = getDriveConfig();
  const url = cfg.webappUrl || getGlobalGasConfig().WEBAPP_URL;
  if (!url) return null;

  try {
    isSyncingNow = true;
    const data = forceReadSheets
      ? await forceReadSpreadsheetFromDrive(url)
      : await fetchFromGoogleDrive(url);
    if (data && typeof data === "object") {
      window.dispatchEvent(new CustomEvent("salead_drive_synced", { detail: data }));
      window.dispatchEvent(new CustomEvent("lp_visit_incremented"));
    }
    return data;
  } catch (err) {
    console.warn("Auto-sync background error:", err);
    return null;
  } finally {
    isSyncingNow = false;
  }
};

export const startRealtimeCloudSyncEngine = () => {
  if (typeof window === "undefined" || syncIntervalId) return;

  initializeSharedDriveConfig()
    .then((cfg) => {
      if (cfg && cfg.webappUrl) {
        triggerInstantCloudSync(false).catch(() => {});
      }
    })
    .catch(() => {});

  syncIntervalId = setInterval(() => {
    const cfg = getDriveConfig();
    if (
      cfg.webappUrl &&
      cfg.autoSync !== false &&
      (typeof document === "undefined" || document.visibilityState === "visible")
    ) {
      triggerInstantCloudSync(false).catch(() => {});
    }
  }, 15000);
};

// REGISTRAR VISITA DE LANDING PAGE NO DRIVE E SHEETS (TEMPO REAL)
export const recordLpVisitToDrive = async (params: {
  lpId?: string;
  id?: string;
  slug?: string;
  pageTitle?: string;
  title?: string;
}): Promise<{ success: boolean; visits?: number; conv?: number }> => {
  const config = getDriveConfig();
  const cleanUrl = cleanWebAppUrl(
    config.webappUrl || getGlobalGasConfig().WEBAPP_URL
  );
  if (!cleanUrl) return { success: false };

  try {
    const res = await executeDriveRequest({
      targetUrl: cleanUrl,
      action: "RECORD_LP_VISIT",
      id: params.lpId || params.id,
      lpId: params.lpId || params.id,
      slug: params.slug,
      title: params.pageTitle || params.title,
      data: {
        lpId: params.lpId || params.id,
        slug: params.slug,
        title: params.pageTitle || params.title,
      },
    });

    if (res && (res.status === "success" || res.success)) {
      return { success: true, visits: res.visits, conv: res.conv };
    }
  } catch {}

  return { success: false };
};

// CRIAR / LISTAR / RESTAURAR CHECKPOINTS (100% Nuvem + RAM)
export const createCheckpoint = async <T>(
  url: string,
  data: T
): Promise<string> => {
  const cleanUrl = cleanWebAppUrl(
    url || getDriveConfig().webappUrl || getGlobalGasConfig().WEBAPP_URL
  );
  if (!cleanUrl) throw new Error("URL do Google Apps Script não configurada.");

  const res = await executeDriveRequest({
    targetUrl: cleanUrl,
    action: "create_checkpoint",
    data,
  });

  if (res.status === "error") throw new Error(res.message);
  return res.fileName;
};

export const listCheckpoints = async (
  url?: string
): Promise<DriveFileInfo[]> => {
  const cleanUrl = cleanWebAppUrl(
    url || getDriveConfig().webappUrl || getGlobalGasConfig().WEBAPP_URL
  );
  if (!cleanUrl) return [];

  const res = await executeDriveRequest({
    targetUrl: cleanUrl,
    action: "list_files",
  });

  if (res.status === "error") throw new Error(res.message);
  return res.files || [];
};

export const restoreCheckpoint = async <T>(
  url: string,
  fileName: string
): Promise<T> => {
  const cleanUrl = cleanWebAppUrl(
    url || getDriveConfig().webappUrl || getGlobalGasConfig().WEBAPP_URL
  );
  if (!cleanUrl) throw new Error("URL do Google Apps Script não configurada.");

  const res = await executeDriveRequest({
    targetUrl: cleanUrl,
    action: "set_as_root",
    fileName,
  });

  if (res.status === "error") throw new Error(res.message);

  if (res.content) {
    saveLocalDatabaseRoot(res.content);
  }
  return res.content as T;
};

export const formatCheckpointName = (d: Date = new Date()): string => {
  const pad = (n: number) => (n < 10 ? "0" + n : n);
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `Checkpoint-${day}-${month}-${year}-${hours}:${minutes}`;
};

export const getStoredSystemCheckpoints = (): SystemCheckpoint[] => {
  return [...inMemoryCheckpoints];
};

export const saveSystemCheckpoint = (checkpoint: SystemCheckpoint): void => {
  inMemoryCheckpoints = [
    checkpoint,
    ...inMemoryCheckpoints.filter((c) => c.id !== checkpoint.id),
  ].slice(0, 15);
};

export const deleteSystemCheckpoint = (id: string): void => {
  inMemoryCheckpoints = inMemoryCheckpoints.filter((c) => c.id !== id);
};

// UPLOAD DE MÍDIA / IMAGEM (BASE64)
export const uploadMediaToDrive = async (
  url: string,
  base64Data: string,
  fileName: string,
  category: string = "Geral",
  mimeType: string = "image/jpeg"
): Promise<{ fileId: string; url: string }> => {
  const cleanUrl = cleanWebAppUrl(
    url || getDriveConfig().webappUrl || getGlobalGasConfig().WEBAPP_URL
  );
  if (!cleanUrl) throw new Error("URL do Google Apps Script não configurada.");

  const res = await executeDriveRequest({
    targetUrl: cleanUrl,
    action: "UPLOAD_MEDIA",
    base64Data,
    fileName,
    folderCategory: category,
    mimeType,
  });

  if (res.status === "error") throw new Error(res.message);
  return { fileId: res.fileId, url: res.url };
};

export const getSpreadsheetExportUrl = (
  config?: DriveConfig,
  format: "xlsx" | "pdf" | "csv" = "xlsx"
): string | null => {
  const currentConfig = config || getDriveConfig();
  if (currentConfig.spreadsheetId) {
    return `https://docs.google.com/spreadsheets/d/${currentConfig.spreadsheetId}/export?format=${format}`;
  }
  if (currentConfig.spreadsheetUrl) {
    const match = currentConfig.spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=${format}`;
    }
    return currentConfig.spreadsheetUrl.replace(/\/edit.*$/, `/export?format=${format}`);
  }
  return null;
};

export const downloadSpreadsheetAsXlsx = (config?: DriveConfig): boolean => {
  const exportUrl = getSpreadsheetExportUrl(config, "xlsx");
  if (!exportUrl) return false;

  const a = document.createElement("a");
  a.href = exportUrl;
  a.target = "_blank";
  a.rel = "noreferrer noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  return true;
};

export const downloadJsonBackup = (
  data: any,
  fileNamePrefix = "salead_crm_backup"
): void => {
  if (typeof window === "undefined") return;
  const dateStr = new Date().toISOString().slice(0, 10);
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileNamePrefix}_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// =========================================================================
// DISPARADORES ESPECÍFICOS PARA LANDING PAGES & RESPOSTAS DE PESQUISAS (GAS)
// =========================================================================

export const submitLpLeadToDrive = async (leadData: {
  landingPageId?: string;
  landingPageTitle?: string;
  name: string;
  email?: string;
  whatsapp?: string;
  company?: string;
  source?: string;
  utm?: any;
  answers?: any;
  customFields?: any;
  isTest?: boolean;
}): Promise<any> => {
  let config = getDriveConfig();
  if (!config.webappUrl) {
    config = await initializeSharedDriveConfig();
  }
  const cleanUrl = cleanWebAppUrl(
    config.webappUrl || getGlobalGasConfig().WEBAPP_URL
  );
  if (!cleanUrl) return null;

  try {
    return await executeDriveRequest({
      targetUrl: cleanUrl,
      action: "SUBMIT_LP_LEAD",
      lead: {
        ...leadData,
        isTest: leadData.isTest || false,
      },
      data: {
        lead: {
          ...leadData,
          isTest: leadData.isTest || false,
        },
        isTest: leadData.isTest || false,
        timestamp: new Date().toISOString(),
      },
      isTest: leadData.isTest || false,
    });
  } catch (err) {
    console.warn("Aviso ao enviar lead para Google Drive:", err);
    return null;
  }
};

export const submitSurveyResponseToDrive = async (surveyData: {
  surveyId: string;
  surveyName: string;
  leadName?: string;
  leadWhatsapp?: string;
  leadEmail?: string;
  leadCompany?: string;
  score?: number;
  temperature?: string;
  answers: Record<string, any>;
  questions?: Array<{ id: string; question: string }>;
}): Promise<any> => {
  let config = getDriveConfig();
  if (!config.webappUrl) {
    config = await initializeSharedDriveConfig();
  }
  const cleanUrl = cleanWebAppUrl(
    config.webappUrl || getGlobalGasConfig().WEBAPP_URL
  );
  if (!cleanUrl) return null;

  try {
    return await executeDriveRequest({
      targetUrl: cleanUrl,
      action: "SUBMIT_SURVEY_RESPONSE",
      surveyResponse: surveyData,
      data: {
        surveyResponse: surveyData,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.warn("Aviso ao enviar resposta de pesquisa para Google Drive:", err);
    return null;
  }
};

export const clearLpTestDataInDrive = async (
  lpId: string,
  lpTitle?: string
): Promise<any> => {
  let config = getDriveConfig();
  if (!config.webappUrl) {
    config = await initializeSharedDriveConfig();
  }
  const cleanUrl = cleanWebAppUrl(
    config.webappUrl || getGlobalGasConfig().WEBAPP_URL
  );
  if (!cleanUrl) return null;

  try {
    return await executeDriveRequest({
      targetUrl: cleanUrl,
      action: "CLEAR_LP_TEST_DATA",
      landingPageId: lpId,
      landingPageTitle: lpTitle || "",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Aviso ao limpar dados de teste da LP no Google Drive:", err);
    return null;
  }
};

// =========================================================================
// DELEÇÕES DIRETAS NO GOOGLE DRIVE E GOOGLE SHEETS
// =========================================================================

export const deleteLandingPageFromDrive = async (
  ids: string | string[],
  slug?: string,
  title?: string
): Promise<any> => {
  let config = getDriveConfig();
  if (!config.webappUrl) {
    config = await initializeSharedDriveConfig();
  }
  const idArray = Array.isArray(ids) ? ids : [ids];
  const cleanUrl = cleanWebAppUrl(
    config.webappUrl || getGlobalGasConfig().WEBAPP_URL
  );

  if (inMemoryDatabaseRoot && Array.isArray(inMemoryDatabaseRoot.landingPages)) {
    const idSet = new Set(idArray);
    inMemoryDatabaseRoot.landingPages = inMemoryDatabaseRoot.landingPages.filter(
      (p: any) => {
        if (!p) return false;
        if (p.id && idSet.has(p.id)) return false;
        if (slug && p.slug && p.slug.toLowerCase() === slug.toLowerCase())
          return false;
        if (
          title &&
          (p.title || p.name) &&
          (p.title || p.name).toLowerCase() === title.toLowerCase()
        )
          return false;
        return true;
      }
    );
  }

  if (!cleanUrl) return null;

  try {
    return await executeDriveRequest({
      targetUrl: cleanUrl,
      action: "DELETE_LANDING_PAGE",
      ids: idArray,
      slug: slug || "",
      landingPageTitle: title || "",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Aviso ao deletar Landing Page do Google Drive/Sheets:", err);
    return null;
  }
};

export const deleteLeadFromDrive = async (
  ids: string | string[],
  email?: string,
  whatsapp?: string
): Promise<any> => {
  let config = getDriveConfig();
  if (!config.webappUrl) {
    config = await initializeSharedDriveConfig();
  }
  const idArray = Array.isArray(ids) ? ids : [ids];
  const cleanUrl = cleanWebAppUrl(
    config.webappUrl || getGlobalGasConfig().WEBAPP_URL
  );

  if (inMemoryDatabaseRoot && Array.isArray(inMemoryDatabaseRoot.leads)) {
    const idSet = new Set(idArray);
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPhone = (whatsapp || "").replace(/\D/g, "");
    inMemoryDatabaseRoot.leads = inMemoryDatabaseRoot.leads.filter((l: any) => {
      if (!l) return false;
      if (l.id && idSet.has(l.id)) return false;
      if (cleanEmail && l.email && l.email.trim().toLowerCase() === cleanEmail)
        return false;
      if (
        cleanPhone &&
        cleanPhone.length >= 8 &&
        l.whatsapp &&
        l.whatsapp.replace(/\D/g, "") === cleanPhone
      )
        return false;
      return true;
    });
  }

  if (!cleanUrl) return null;

  try {
    return await executeDriveRequest({
      targetUrl: cleanUrl,
      action: "DELETE_LEAD",
      ids: idArray,
      email: email || "",
      whatsapp: whatsapp || "",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Aviso ao deletar lead do Google Drive/Sheets:", err);
    return null;
  }
};

export const deleteProductFromDrive = async (id: string): Promise<any> => {
  let config = getDriveConfig();
  if (!config.webappUrl) {
    config = await initializeSharedDriveConfig();
  }
  const cleanUrl = cleanWebAppUrl(
    config.webappUrl || getGlobalGasConfig().WEBAPP_URL
  );

  if (inMemoryDatabaseRoot && Array.isArray(inMemoryDatabaseRoot.products)) {
    inMemoryDatabaseRoot.products = inMemoryDatabaseRoot.products.filter(
      (p: any) => p && p.id !== id
    );
  }

  if (!cleanUrl) return null;

  try {
    return await executeDriveRequest({
      targetUrl: cleanUrl,
      action: "DELETE_PRODUCT",
      productId: id,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Aviso ao deletar produto do Google Drive:", err);
    return null;
  }
};

export const deleteTaskFromDrive = async (id: string): Promise<any> => {
  let config = getDriveConfig();
  if (!config.webappUrl) {
    config = await initializeSharedDriveConfig();
  }
  const cleanUrl = cleanWebAppUrl(
    config.webappUrl || getGlobalGasConfig().WEBAPP_URL
  );

  if (inMemoryDatabaseRoot && Array.isArray(inMemoryDatabaseRoot.tasks)) {
    inMemoryDatabaseRoot.tasks = inMemoryDatabaseRoot.tasks.filter(
      (t: any) => t && t.id !== id
    );
  }

  if (!cleanUrl) return null;

  try {
    return await executeDriveRequest({
      targetUrl: cleanUrl,
      action: "DELETE_TASK",
      taskId: id,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Aviso ao deletar tarefa do Google Drive:", err);
    return null;
  }
};

export const deleteSurveyFromDrive = async (
  id: string,
  name?: string
): Promise<any> => {
  let config = getDriveConfig();
  if (!config.webappUrl) {
    config = await initializeSharedDriveConfig();
  }
  const cleanUrl = cleanWebAppUrl(
    config.webappUrl || getGlobalGasConfig().WEBAPP_URL
  );

  if (inMemoryDatabaseRoot && Array.isArray(inMemoryDatabaseRoot.surveys)) {
    inMemoryDatabaseRoot.surveys = inMemoryDatabaseRoot.surveys.filter(
      (s: any) =>
        s &&
        s.id !== id &&
        (!name || (s.name && s.name.toLowerCase() !== name.toLowerCase()))
    );
  }

  if (!cleanUrl) return null;

  try {
    return await executeDriveRequest({
      targetUrl: cleanUrl,
      action: "DELETE_SURVEY",
      surveyId: id,
      surveyName: name || "",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Aviso ao deletar pesquisa do Google Drive:", err);
    return null;
  }
};

export const cleanDatabaseKeepOneInDrive = async (
  keepId: string
): Promise<any> => {
  let config = getDriveConfig();
  if (!config.webappUrl) {
    config = await initializeSharedDriveConfig();
  }
  const cleanUrl = cleanWebAppUrl(
    config.webappUrl || getGlobalGasConfig().WEBAPP_URL
  );
  if (!cleanUrl) return null;

  try {
    return await executeDriveRequest({
      targetUrl: cleanUrl,
      action: "CLEAN_DATABASE_KEEP_ONE",
      keepId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Aviso ao limpar banco no Google Drive:", err);
    return null;
  }
};
