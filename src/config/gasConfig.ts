// =========================================================================
// CONFIGURAÇÃO GLOBAL DO MOTOR GOOGLE APPS SCRIPT + SHEETS + DRIVE
// Padrão Supabase/Firebase Zero-LocalStorage para funcionamento entre abas
// e dispositivos (anônimo, outros navegadores, links públicos de LP/Pesquisa).
// =========================================================================

export interface GlobalGasConfig {
  WEBAPP_URL: string;
  API_TOKEN: string;
  SPREADSHEET_URL?: string;
  SPREADSHEET_ID?: string;
  SPREADSHEET_NAME?: string;
}

export const GLOBAL_GAS_CONFIG: GlobalGasConfig = {
  WEBAPP_URL:
    "https://script.google.com/macros/s/AKfycbwTqa9pc_cLvtZfraT7jMFz6KZZtLQ5NxLfsjetvu8H6RzkndhkdoZuHkR_BAxopSX8/exec",
  API_TOKEN: "",
  SPREADSHEET_URL:
    "https://docs.google.com/spreadsheets/d/1BsOiK5dC7acweEnFEauh8aDXgKI9vIt4C9OVSw7jMu4/edit",
  SPREADSHEET_ID: "1BsOiK5dC7acweEnFEauh8aDXgKI9vIt4C9OVSw7jMu4",
  SPREADSHEET_NAME: "APP_DATABASE_SHEETS",
};

export function normalizeGasUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  let url = rawUrl.trim().replace(/^["']|["']$/g, "");
  if (!url) return "";

  if (url.startsWith("AKfy")) {
    url = `https://script.google.com/macros/s/${url}/exec`;
  }

  // Remove prefixo /u/0/, /u/1/ que quebra chamadas anônimas no Apps Script
  url = url.replace(
    /https:\/\/script\.google\.com\/macros\/u\/\d+\/s\//i,
    "https://script.google.com/macros/s/"
  );

  if (url.includes("script.google.com/macros/s/")) {
    if (url.endsWith("/dev")) {
      url = url.replace(/\/dev$/, "/exec");
    } else if (!url.endsWith("/exec") && !url.includes("/exec?")) {
      url = url.replace(/\/+$/, "") + "/exec";
    }
  }

  return url;
}

export function getGlobalGasConfig(): GlobalGasConfig {
  return { ...GLOBAL_GAS_CONFIG };
}

export function setGlobalGasConfig(partial: Partial<GlobalGasConfig>): GlobalGasConfig {
  if (partial.WEBAPP_URL !== undefined) {
    const clean = normalizeGasUrl(partial.WEBAPP_URL);
    if (clean) GLOBAL_GAS_CONFIG.WEBAPP_URL = clean;
    else if (partial.WEBAPP_URL === "") GLOBAL_GAS_CONFIG.WEBAPP_URL = "";
  }
  if (partial.API_TOKEN !== undefined) {
    GLOBAL_GAS_CONFIG.API_TOKEN = String(partial.API_TOKEN || "").trim();
  }
  if (partial.SPREADSHEET_URL !== undefined) {
    GLOBAL_GAS_CONFIG.SPREADSHEET_URL = partial.SPREADSHEET_URL;
  }
  if (partial.SPREADSHEET_ID !== undefined) {
    GLOBAL_GAS_CONFIG.SPREADSHEET_ID = partial.SPREADSHEET_ID;
  }
  if (partial.SPREADSHEET_NAME !== undefined) {
    GLOBAL_GAS_CONFIG.SPREADSHEET_NAME = partial.SPREADSHEET_NAME;
  }
  return getGlobalGasConfig();
}
