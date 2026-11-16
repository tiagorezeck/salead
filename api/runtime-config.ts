import type { VercelRequest, VercelResponse } from "@vercel/node";
import fs from "fs";
import path from "path";
import { GLOBAL_GAS_CONFIG, normalizeGasUrl } from "../src/config/gasConfig";

const DRIVE_CONFIG_PATHS = [
  path.join("/tmp", "drive_config.json"),
  path.join("/tmp", "server-config.json"),
  path.join(process.cwd(), "drive_config.json"),
  path.join(process.cwd(), "server-config.json"),
];

function readDiskConfig(): Record<string, any> {
  for (const filePath of DRIVE_CONFIG_PATHS) {
    try {
      if (fs.existsSync(filePath)) {
        const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        if (parsed && (parsed.webappUrl || parsed.WEBAPP_URL || parsed.gasUrl)) {
          return parsed;
        }
      }
    } catch {}
  }
  return {};
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const diskCfg = readDiskConfig();
  const envUrl = process.env.GAS_WEBAPP_URL || process.env.VITE_GAS_WEBAPP_URL || "";
  const envToken = process.env.DRIVE_API_SECRET || process.env.GAS_API_TOKEN || "";

  const webappUrl = normalizeGasUrl(
    envUrl ||
      diskCfg.webappUrl ||
      diskCfg.WEBAPP_URL ||
      diskCfg.gasUrl ||
      GLOBAL_GAS_CONFIG.WEBAPP_URL
  );
  const apiToken = String(
    envToken || diskCfg.apiToken || diskCfg.API_TOKEN || GLOBAL_GAS_CONFIG.API_TOKEN || ""
  ).trim();

  return res.status(200).json({
    success: true,
    webappUrl,
    apiToken,
    hasToken: Boolean(apiToken),
    autoSync: diskCfg.autoSync !== false,
    folderName: diskCfg.folderName || "SALEAD/AppDatabase_Data",
    spreadsheetUrl: diskCfg.spreadsheetUrl || GLOBAL_GAS_CONFIG.SPREADSHEET_URL || "",
    spreadsheetId: diskCfg.spreadsheetId || GLOBAL_GAS_CONFIG.SPREADSHEET_ID || "",
    spreadsheetName: diskCfg.spreadsheetName || GLOBAL_GAS_CONFIG.SPREADSHEET_NAME || "APP_DATABASE_SHEETS",
    lastSyncTimestamp: diskCfg.lastSyncTimestamp || Date.now(),
    connected: Boolean(webappUrl),
    source: envUrl ? "env" : diskCfg.webappUrl ? "server-config" : "global-fallback",
  });
}
