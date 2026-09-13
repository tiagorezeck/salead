// =========================================================================
// GOOGLE DRIVE + GOOGLE SHEETS DATABASE CLIENT SERVICE (SALEAD MOTOR)
// =========================================================================

export interface DriveConfig {
  webappUrl: string;
  autoSync: boolean;
  folderName: string;
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
    return { webappUrl: '', autoSync: true, folderName: 'SALEAD/AppDatabase_Data', syncStatus: 'offline' };
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
          lastSyncTimestamp: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(autoSyncedConfig));
        return autoSyncedConfig;
      }
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { webappUrl: '', autoSync: true, folderName: 'SALEAD/AppDatabase_Data', syncStatus: 'offline' };
  } catch {
    return { webappUrl: '', autoSync: true, folderName: 'SALEAD/AppDatabase_Data', syncStatus: 'offline' };
  }
};

export const saveDriveConfig = (config: Partial<DriveConfig>): DriveConfig => {
  const current = getDriveConfig();
  const updated = { ...current, ...config };
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
          const merged = { ...local, ...serverConfig };
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
  if (url.endsWith('/dev')) url = url.replace(/\/dev$/, '/exec');
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
  } catch (err) {
    console.warn("Aviso ao persistir salead_database_root:", err);
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

  // Tenta primeiro via /api/drive-proxy do backend (Node.js segue redirecionamentos 302 do Google sem bloqueio de CORS)
  try {
    const proxyRes = await fetch('/api/drive-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, targetUrl: cleanUrl })
    });

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      return data;
    } else {
      const errData = await proxyRes.json().catch(() => null);
      if (errData && errData.message) {
        throw new Error(errData.message);
      }
    }
  } catch (proxyErr: any) {
    // Se o erro for do proxy explicando login ou permissão, propaga diretamente
    if (proxyErr.message && (proxyErr.message.includes("login") || proxyErr.message.includes("Qualquer pessoa") || proxyErr.message.includes("HTML"))) {
      throw proxyErr;
    }
    console.warn("Proxy backend indisponível, tentando fetch direto:", proxyErr.message);
  }

  // Fallback: Tentativa direta pelo navegador caso backend não esteja respondendo
  if (payload.action === 'ping' || payload.action === 'get' || payload.action === 'list_files') {
    const directRes = await fetch(`${cleanUrl}?action=${payload.action}&t=${Date.now()}`, {
      method: 'GET',
      redirect: 'follow'
    });
    if (!directRes.ok) throw new Error(`HTTP ${directRes.status}`);
    return await directRes.json();
  } else {
    const directRes = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    if (!directRes.ok) throw new Error(`HTTP ${directRes.status}`);
    return await directRes.json();
  }
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
export const pushToGoogleDrive = async <T>(url: string, data: T): Promise<any> => {
  const cleanUrl = cleanWebAppUrl(url);
  if (!cleanUrl) return null;

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
};

// PULL (Buscar dados atualizados no Google Drive)
export const fetchFromGoogleDrive = async <T>(url: string): Promise<T | null> => {
  const cleanUrl = cleanWebAppUrl(url);
  if (!cleanUrl) return null;

  try {
    const res = await executeDriveRequest({ targetUrl: cleanUrl, action: 'get' });

    if (res.status === 'empty') return null;
    if (res.status === 'error') throw new Error(res.message);

    // Salva localmente como cache offline
    saveLocalDatabaseRoot(res);
    saveDriveConfig({ lastSyncTimestamp: Date.now(), syncStatus: 'synced' });

    return res as T;
  } catch (err: any) {
    console.warn("Falha no pull do Google Drive, mantendo cache local:", err.message);
    saveDriveConfig({ syncStatus: 'offline' });
    return null;
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
}): Promise<any> => {
  const config = getDriveConfig();
  if (!config.webappUrl) return null;
  const cleanUrl = cleanWebAppUrl(config.webappUrl);
  if (!cleanUrl) return null;

  try {
    const res = await fetch(cleanUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'SUBMIT_LP_LEAD',
        lead: leadData,
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
  const config = getDriveConfig();
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
