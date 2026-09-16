// =========================================================================
// GOOGLE DRIVE + GOOGLE SHEETS DATABASE CLIENT SERVICE (SALEAD MOTOR)
// =========================================================================

export interface DriveConfig {
  webappUrl: string;
  autoSync: boolean;
  folderName: string;
  connected?: boolean;
  folderId?: string;
  lastSyncTimestamp?: number;
  syncStatus?: 'synced' | 'syncing' | 'error' | 'offline';
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
  folder?: string;
}

const STORAGE_KEY = 'app_drive_config';
const DB_LOCAL_STORAGE_KEY = 'salead_database_root';

export const getDriveConfig = (): DriveConfig => {
  if (typeof window === "undefined") {
    return { webappUrl: '', autoSync: true, folderName: 'SALEAD/AppDatabase_Data', syncStatus: 'offline', connected: false };
  }
  try {
    // Detecta parâmetro de sincronização direta na URL para emparelhamento instantâneo em celulares e outros PCs
    const urlParams = new URLSearchParams(window.location.search);
    const driveParam = urlParams.get('drive_url') || urlParams.get('sync_drive');
    if (driveParam) {
      const cleanParam = cleanWebAppUrl(decodeURIComponent(driveParam));
      if (cleanParam) {
        const autoSyncedConfig: DriveConfig = {
          webappUrl: cleanParam,
          autoSync: true,
          folderName: 'SALEAD/AppDatabase_Data',
          syncStatus: 'synced',
          lastSyncTimestamp: Date.now(),
          connected: true
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(autoSyncedConfig));
        return autoSyncedConfig;
      }
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return { webappUrl: '', autoSync: true, folderName: 'SALEAD/AppDatabase_Data', syncStatus: 'offline', connected: false };
    }
    const parsed = JSON.parse(saved);
    const isConn = !!(parsed.webappUrl && parsed.webappUrl.trim().length > 0);
    return {
      ...parsed,
      connected: isConn,
      syncStatus: isConn ? (parsed.syncStatus === 'error' ? 'error' : 'synced') : 'offline'
    };
  } catch {
    return { webappUrl: '', autoSync: true, folderName: 'SALEAD/AppDatabase_Data', syncStatus: 'offline', connected: false };
  }
};

export const saveDriveConfig = (config: Partial<DriveConfig>): DriveConfig => {
  const current = getDriveConfig();
  const updated = { ...current, ...config };
  updated.connected = !!(updated.webappUrl && updated.webappUrl.trim().length > 0);
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('salead_drive_config_updated', { detail: updated }));
    
    // Persiste também no servidor para que todos os membros da equipe e navegadores recebam automaticamente
    fetch('/api/system/drive-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    }).catch(() => {});
  }
  return updated;
};

export const initializeSharedDriveConfig = async (): Promise<DriveConfig> => {
  if (typeof window === "undefined") return getDriveConfig();
  try {
    const res = await fetch('/api/system/drive-config');
    if (res.ok) {
      const serverConfig = await res.json();
      if (serverConfig && serverConfig.webappUrl) {
        const local = getDriveConfig();
        if (!local.webappUrl || (serverConfig.lastSyncTimestamp && serverConfig.lastSyncTimestamp > (local.lastSyncTimestamp || 0))) {
          const merged = { ...local, ...serverConfig, connected: true };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          window.dispatchEvent(new CustomEvent('salead_drive_config_updated', { detail: merged }));
          return merged;
        }
      }
    }
  } catch {}
  return getDriveConfig();
};

export const cleanWebAppUrl = (rawUrl: string): string => {
  if (!rawUrl) return '';
  let url = rawUrl.trim().replace(/^["']|["']$/g, '');

  // Se o usuário colou apenas o ID de implantação do Apps Script (ex: AKfycb...)
  if (url.startsWith('AKfy')) {
    url = `https://script.google.com/macros/s/${url}/exec`;
  }

  // Se o link for do Google Apps Script
  if (url.includes('script.google.com/macros/s/')) {
    if (url.endsWith('/dev')) {
      url = url.replace(/\/dev$/, '/exec');
    } else if (!url.endsWith('/exec')) {
      url = url.replace(/\/+$/, '') + '/exec';
    }
  }

  return url;
};

export const getLocalDatabaseRoot = <T>(): T | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DB_LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveLocalDatabaseRoot = <T>(data: T): void => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DB_LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (err: any) {
    console.warn("Aviso ao persistir salead_database_root no localStorage:", err);
    // Recuperação inteligente em caso de QuotaExceededError
    try {
      localStorage.removeItem(LOCAL_CHECKPOINTS_STORAGE_KEY);
      localStorage.setItem(DB_LOCAL_STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }
};

// =========================================================================
// HELPER CENTRAL DE REQUISIÇÃO VIA PROXY (SEM PROBLEMAS DE CORS / IFRAME)
// =========================================================================
const executeDriveRequest = async (payload: {
  targetUrl: string;
  action: string;
  data?: any;
  fileName?: string;
  base64Data?: string;
  folderCategory?: string;
  mimeType?: string;
}): Promise<any> => {
  const cleanUrl = cleanWebAppUrl(payload.targetUrl);
  if (!cleanUrl) throw new Error("URL do Google Apps Script não configurada.");

  // Se o usuário colou a URL de edição do Google Apps Script em vez do Web App
  if (cleanUrl.includes('script.google.com/d/') || cleanUrl.includes('/edit')) {
    throw new Error("Você inseriu a URL de edição do projeto (script.google.com/d/...). Clique no botão azul 'Implantar' > 'Nova implantação' > tipo 'App da Web' e copie a URL gerada (terminada em /exec).");
  }

  let proxyRes: Response | null = null;
  let data: any = null;

  try {
    proxyRes = await fetch('/api/drive-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, targetUrl: cleanUrl })
    });
    data = await proxyRes.json().catch(() => null);
  } catch {
    // Tenta conexão direta de forma transparente sem poluir os logs
  }

  // Se o servidor proxy não existe no ambiente (HTTP 404 no Vercel ou hospedagem estática), faz tentativa direta no Google Apps Script
  if ((!proxyRes || proxyRes.status === 404) && typeof window !== "undefined") {
    try {
      if (payload.action === "ping" || payload.action === "get" || payload.action === "list_files" || payload.action === "get_file") {
        const directUrl = new URL(cleanUrl);
        directUrl.searchParams.set("action", payload.action);
        if (payload.fileName) directUrl.searchParams.set("fileName", payload.fileName);
        directUrl.searchParams.set("t", Date.now().toString());

        const directRes = await fetch(directUrl.toString(), {
          method: "GET",
          headers: { "Accept": "application/json, text/plain, */*" }
        });
        const directData = await directRes.json();
        return directData;
      } else {
        const directRes = await fetch(cleanUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        });
        const directData = await directRes.json();
        return directData;
      }
    } catch (directErr: any) {
      throw new Error(`Conexão com o Google Apps Script indisponível. Verifique a URL configurada e as permissões do script. (${directErr.message || 'Offline'})`);
    }
  }

  if (data && data.status === 'error') {
    throw new Error(data.message || "Erro retornado pelo Google Apps Script.");
  }

  if (!proxyRes || !proxyRes.ok) {
    const errorMsg = data?.message || `Erro de conexão com o proxy (HTTP ${proxyRes ? proxyRes.status : 'Offline'})`;
    throw new Error(errorMsg);
  }

  if (!data) {
    throw new Error("Resposta vazia recebida do servidor.");
  }

  if (data.status === 'error') {
    throw new Error(data.message || "Erro desconhecido retornado pelo Google Apps Script.");
  }

  return data;
};

// PING / TESTE DE CONEXÃO
export const testDriveConnection = async (rawUrl: string): Promise<DriveTestResult> => {
  const cleanUrl = cleanWebAppUrl(rawUrl);
  if (!cleanUrl) {
    return { success: false, message: "Insira a URL do Web App do Google Apps Script." };
  }

  try {
    const res = await executeDriveRequest({ targetUrl: cleanUrl, action: 'ping' });

    if (res.status === 'success') {
      saveDriveConfig({
        webappUrl: cleanUrl,
        syncStatus: 'synced',
        lastSyncTimestamp: Date.now(),
        spreadsheetUrl: res.spreadsheetUrl,
        spreadsheetName: res.spreadsheetName,
        spreadsheetId: res.spreadsheetId,
        lastSyncMessage: res.message
      });
      return {
        success: true,
        message: res.message || "Conexão com Google Drive e Planilha estabelecida com sucesso!",
        spreadsheetUrl: res.spreadsheetUrl,
        spreadsheetName: res.spreadsheetName,
        folder: res.folder
      };
    } else {
      return { success: false, message: res.message || "Falha na resposta do script." };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || `Não foi possível conectar ao Google Apps Script. Verifique se a implantação está como 'Qualquer pessoa' (Anyone) e com método 'App da Web'.`
    };
  }
};

// PUSH (Enviar / Salvar banco de dados)
export async function pushToGoogleDrive<T>(dataOrUrl: string | T, optionalData?: T): Promise<any> {
  let targetUrl: string;
  let data: T;

  if (typeof dataOrUrl === 'string' && optionalData !== undefined) {
    targetUrl = dataOrUrl;
    data = optionalData;
  } else {
    targetUrl = getDriveConfig().webappUrl;
    data = dataOrUrl as T;
  }

  const cleanUrl = cleanWebAppUrl(targetUrl);
  if (!cleanUrl) {
    saveLocalDatabaseRoot(data);
    return null;
  }

  saveLocalDatabaseRoot(data);

  try {
    const res = await executeDriveRequest({ targetUrl: cleanUrl, action: 'save', data });

    if (res.status === 'error') throw new Error(res.message);

    saveDriveConfig({
      lastSyncTimestamp: Date.now(),
      syncStatus: 'synced',
      spreadsheetUrl: res.spreadsheetUrl || getDriveConfig().spreadsheetUrl,
      spreadsheetName: res.spreadsheetName || getDriveConfig().spreadsheetName,
      lastSyncMessage: res.message
    });

    return res;
  } catch (err: any) {
    saveDriveConfig({ syncStatus: 'error', lastSyncMessage: err.message });
    throw err;
  }
}

// PULL (Buscar dados atualizados no Google Drive)
export async function fetchFromGoogleDrive<T>(optionalUrl?: string): Promise<T | null> {
  const targetUrl = optionalUrl || getDriveConfig().webappUrl;
  const cleanUrl = cleanWebAppUrl(targetUrl);
  if (!cleanUrl) return null;

  try {
    const res = await executeDriveRequest({ targetUrl: cleanUrl, action: 'get' });

    if (res.status === 'empty') return null;
    if (res.status === 'error') throw new Error(res.message);

    // Salva localmente como cache offline
    saveLocalDatabaseRoot(res);
    saveDriveConfig({ lastSyncTimestamp: Date.now(), syncStatus: 'synced' });

    return res as T;
  } catch {
    saveDriveConfig({ syncStatus: 'offline' });
    return null;
  }
}

// FORÇAR LEITURA COMPLETA DAS ABAS DO GOOGLE SHEETS
export const forceReadSpreadsheetFromDrive = async <T>(url: string): Promise<T | null> => {
  const cleanUrl = cleanWebAppUrl(url);
  if (!cleanUrl) return null;

  try {
    // 1. Tenta acionar a ação FORCE_READ_SHEETS
    const res = await executeDriveRequest({ targetUrl: cleanUrl, action: 'FORCE_READ_SHEETS' });
    let db = (res && (res.data || res.content)) ? (res.data || res.content) : res;

    // Se o script retornou ou se precisamos tentar o get padrão
    if (!db || typeof db !== 'object' || (!Array.isArray(db.leads) && !Array.isArray(db.landingPages))) {
      db = await fetchFromGoogleDrive<T>(cleanUrl);
    } else {
      saveLocalDatabaseRoot(db);
      saveDriveConfig({ lastSyncTimestamp: Date.now(), syncStatus: 'synced' });
    }

    return db as T;
  } catch {
    // Fallback gracioso para fetchFromGoogleDrive
    return fetchFromGoogleDrive<T>(cleanUrl);
  }
};

// CRIAR CHECKPOINT (PONTO DE RESTAURAÇÃO)
export const createCheckpoint = async <T>(url: string, data: T): Promise<string> => {
  const cleanUrl = cleanWebAppUrl(url);
  if (!cleanUrl) throw new Error("URL do Google Apps Script não configurada.");

  const res = await executeDriveRequest({ targetUrl: cleanUrl, action: 'create_checkpoint', data });

  if (res.status === 'error') throw new Error(res.message);
  return res.fileName;
};

// LISTAR CHECKPOINTS
export const listCheckpoints = async (url: string): Promise<DriveFileInfo[]> => {
  const cleanUrl = cleanWebAppUrl(url);
  if (!cleanUrl) return [];

  const res = await executeDriveRequest({ targetUrl: cleanUrl, action: 'list_files' });

  if (res.status === 'error') throw new Error(res.message);
  return res.files || [];
};

// RESTAURAR CHECKPOINT
export const restoreCheckpoint = async <T>(url: string, fileName: string): Promise<T> => {
  const cleanUrl = cleanWebAppUrl(url);
  if (!cleanUrl) throw new Error("URL do Google Apps Script não configurada.");

  const res = await executeDriveRequest({ targetUrl: cleanUrl, action: 'set_as_root', fileName });

  if (res.status === 'error') throw new Error(res.message);
  
  if (res.content) {
    saveLocalDatabaseRoot(res.content);
  }
  return res.content as T;
};

// CHECKPOINTS LOCAIS / NUVEM UNIFICADOS
export const formatCheckpointName = (d: Date = new Date()): string => {
  const pad = (n: number) => (n < 10 ? '0' + n : n);
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `Checkpoint-${day}-${month}-${year}-${hours}:${minutes}`;
};

export interface SystemCheckpoint {
  id: string;
  name: string;
  timestamp: string;
  leadsCount: number;
  data: any;
  driveFileName?: string;
}

const LOCAL_CHECKPOINTS_STORAGE_KEY = 'salead_system_checkpoints_history';

export const getStoredSystemCheckpoints = (): SystemCheckpoint[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_CHECKPOINTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveSystemCheckpoint = (checkpoint: SystemCheckpoint): void => {
  if (typeof window === "undefined") return;
  try {
    const current = getStoredSystemCheckpoints();
    const next = [checkpoint, ...current.filter(c => c.id !== checkpoint.id)].slice(0, 15);
    localStorage.setItem(LOCAL_CHECKPOINTS_STORAGE_KEY, JSON.stringify(next));
  } catch (err) {
    console.warn("Falha ao salvar histórico de checkpoints, reduzindo histórico:", err);
    try {
      const reduced = [checkpoint];
      localStorage.setItem(LOCAL_CHECKPOINTS_STORAGE_KEY, JSON.stringify(reduced));
    } catch {}
  }
};

export const deleteSystemCheckpoint = (id: string): void => {
  if (typeof window === "undefined") return;
  try {
    const current = getStoredSystemCheckpoints();
    const next = current.filter(c => c.id !== id);
    localStorage.setItem(LOCAL_CHECKPOINTS_STORAGE_KEY, JSON.stringify(next));
  } catch {}
};

// UPLOAD DE MÍDIA / IMAGEM (BASE64)
export const uploadMediaToDrive = async (
  url: string,
  base64Data: string,
  fileName: string,
  category: string = "Geral",
  mimeType: string = "image/jpeg"
): Promise<{ fileId: string; url: string }> => {
  const cleanUrl = cleanWebAppUrl(url);
  if (!cleanUrl) throw new Error("URL do Google Apps Script não configurada.");

  const res = await executeDriveRequest({
    targetUrl: cleanUrl,
    action: 'UPLOAD_MEDIA',
    base64Data,
    fileName,
    folderCategory: category,
    mimeType
  });

  if (res.status === 'error') throw new Error(res.message);
  return { fileId: res.fileId, url: res.url };
};

// =========================================================================
// HELPER PARA EXPORTAÇÃO E DOWNLOAD DIRETO DA PLANILHA (XLSX, CSV, ETC)
// =========================================================================

export const getSpreadsheetExportUrl = (config?: DriveConfig, format: 'xlsx' | 'pdf' | 'csv' = 'xlsx'): string | null => {
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
  const exportUrl = getSpreadsheetExportUrl(config, 'xlsx');
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

export const downloadJsonBackup = (data: any, fileNamePrefix = "salead_crm_backup"): void => {
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
  if (!config.webappUrl) return null;
  const cleanUrl = cleanWebAppUrl(config.webappUrl);
  if (!cleanUrl) return null;

  try {
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'SUBMIT_LP_LEAD',
        lead: {
          ...leadData,
          isTest: leadData.isTest || false
        },
        isTest: leadData.isTest || false,
        timestamp: new Date().toISOString()
      }),
      redirect: 'follow'
    }).then(r => r.json());
    return res;
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
  if (!config.webappUrl) return null;
  const cleanUrl = cleanWebAppUrl(config.webappUrl);
  if (!cleanUrl) return null;

  try {
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'SUBMIT_SURVEY_RESPONSE',
        surveyResponse: surveyData,
        timestamp: new Date().toISOString()
      }),
      redirect: 'follow'
    }).then(r => r.json());
    return res;
  } catch (err) {
    console.warn("Aviso ao enviar resposta de pesquisa para Google Drive:", err);
    return null;
  }
};

export const clearLpTestDataInDrive = async (lpId: string, lpTitle?: string): Promise<any> => {
  let config = getDriveConfig();
  if (!config.webappUrl) {
    config = await initializeSharedDriveConfig();
  }
  if (!config.webappUrl) return null;
  const cleanUrl = cleanWebAppUrl(config.webappUrl);
  if (!cleanUrl) return null;

  try {
    const res = await executeDriveRequest({
      targetUrl: cleanUrl,
      action: 'CLEAR_LP_TEST_DATA',
      landingPageId: lpId,
      landingPageTitle: lpTitle || '',
      timestamp: new Date().toISOString()
    });
    return res;
  } catch (err) {
    console.warn("Aviso ao limpar dados de teste da LP nas planilhas do Google Drive:", err);
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
  const cleanUrl = cleanWebAppUrl(config.webappUrl);

  // 1. Atualiza cache local offline do root
  const localDb = getLocalDatabaseRoot<any>();
  if (localDb && Array.isArray(localDb.landingPages)) {
    const idSet = new Set(idArray);
    localDb.landingPages = localDb.landingPages.filter((p: any) => {
      if (!p) return false;
      if (p.id && idSet.has(p.id)) return false;
      if (slug && p.slug && p.slug.toLowerCase() === slug.toLowerCase()) return false;
      if (title && (p.title || p.name) && (p.title || p.name).toLowerCase() === title.toLowerCase()) return false;
      return true;
    });
    saveLocalDatabaseRoot(localDb);
  }

  if (!cleanUrl) return null;

  try {
    const res = await executeDriveRequest({
      targetUrl: cleanUrl,
      action: 'DELETE_LANDING_PAGE',
      ids: idArray,
      slug: slug || '',
      landingPageTitle: title || '',
      timestamp: new Date().toISOString()
    });
    return res;
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
  const cleanUrl = cleanWebAppUrl(config.webappUrl);

  // 1. Atualiza cache local offline do root
  const localDb = getLocalDatabaseRoot<any>();
  if (localDb && Array.isArray(localDb.leads)) {
    const idSet = new Set(idArray);
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPhone = (whatsapp || '').replace(/\D/g, '');
    localDb.leads = localDb.leads.filter((l: any) => {
      if (!l) return false;
      if (l.id && idSet.has(l.id)) return false;
      if (cleanEmail && l.email && l.email.trim().toLowerCase() === cleanEmail) return false;
      if (cleanPhone && cleanPhone.length >= 8 && l.whatsapp && l.whatsapp.replace(/\D/g, '') === cleanPhone) return false;
      return true;
    });
    saveLocalDatabaseRoot(localDb);
  }

  if (!cleanUrl) return null;

  try {
    const res = await executeDriveRequest({
      targetUrl: cleanUrl,
      action: 'DELETE_LEAD',
      ids: idArray,
      email: email || '',
      whatsapp: whatsapp || '',
      timestamp: new Date().toISOString()
    });
    return res;
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
  const cleanUrl = cleanWebAppUrl(config.webappUrl);

  const localDb = getLocalDatabaseRoot<any>();
  if (localDb && Array.isArray(localDb.products)) {
    localDb.products = localDb.products.filter((p: any) => p && p.id !== id);
    saveLocalDatabaseRoot(localDb);
  }

  if (!cleanUrl) return null;

  try {
    return await executeDriveRequest({
      targetUrl: cleanUrl,
      action: 'DELETE_PRODUCT',
      productId: id,
      timestamp: new Date().toISOString()
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
  const cleanUrl = cleanWebAppUrl(config.webappUrl);

  const localDb = getLocalDatabaseRoot<any>();
  if (localDb && Array.isArray(localDb.tasks)) {
    localDb.tasks = localDb.tasks.filter((t: any) => t && t.id !== id);
    saveLocalDatabaseRoot(localDb);
  }

  if (!cleanUrl) return null;

  try {
    return await executeDriveRequest({
      targetUrl: cleanUrl,
      action: 'DELETE_TASK',
      taskId: id,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Aviso ao deletar tarefa do Google Drive:", err);
    return null;
  }
};

export const deleteSurveyFromDrive = async (id: string, name?: string): Promise<any> => {
  let config = getDriveConfig();
  if (!config.webappUrl) {
    config = await initializeSharedDriveConfig();
  }
  const cleanUrl = cleanWebAppUrl(config.webappUrl);

  const localDb = getLocalDatabaseRoot<any>();
  if (localDb && Array.isArray(localDb.surveys)) {
    localDb.surveys = localDb.surveys.filter((s: any) => s && s.id !== id && (!name || (s.name && s.name.toLowerCase() !== name.toLowerCase())));
    saveLocalDatabaseRoot(localDb);
  }

  if (!cleanUrl) return null;

  try {
    return await executeDriveRequest({
      targetUrl: cleanUrl,
      action: 'DELETE_SURVEY',
      surveyId: id,
      surveyName: name || '',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Aviso ao deletar pesquisa do Google Drive:", err);
    return null;
  }
};

export const cleanDatabaseKeepOneInDrive = async (keepId: string): Promise<any> => {
  let config = getDriveConfig();
  if (!config.webappUrl) {
    config = await initializeSharedDriveConfig();
  }
  const cleanUrl = cleanWebAppUrl(config.webappUrl);
  if (!cleanUrl) return null;

  try {
    return await executeDriveRequest({
      targetUrl: cleanUrl,
      action: 'CLEAN_DATABASE_KEEP_ONE',
      keepId,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Aviso ao limpar banco no Google Drive:", err);
    return null;
  }
};


