import type { VercelRequest, VercelResponse } from "@vercel/node";
import fs from "fs";
import path from "path";
import { GLOBAL_GAS_CONFIG, normalizeGasUrl } from "../src/config/gasConfig";

const TMP_SERVER_CONFIG = path.join("/tmp", "server-config.json");
const TMP_DRIVE_CONFIG = path.join("/tmp", "drive_config.json");
const ROOT_DRIVE_CONFIG = path.join(process.cwd(), "drive_config.json");

function readConfig(): Record<string, any> {
  for (const p of [TMP_DRIVE_CONFIG, TMP_SERVER_CONFIG, ROOT_DRIVE_CONFIG]) {
    try {
      if (fs.existsSync(p)) {
        const parsed = JSON.parse(fs.readFileSync(p, "utf-8"));
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch {}
  }
  return {
    webappUrl: GLOBAL_GAS_CONFIG.WEBAPP_URL,
    apiToken: GLOBAL_GAS_CONFIG.API_TOKEN,
    autoSync: true,
    folderName: "SALEAD/AppDatabase_Data",
    spreadsheetUrl: GLOBAL_GAS_CONFIG.SPREADSHEET_URL,
    spreadsheetId: GLOBAL_GAS_CONFIG.SPREADSHEET_ID,
    spreadsheetName: GLOBAL_GAS_CONFIG.SPREADSHEET_NAME,
    connected: Boolean(GLOBAL_GAS_CONFIG.WEBAPP_URL),
  };
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-token");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const current = readConfig();
      const rawUrl =
        body.webappUrl !== undefined
          ? body.webappUrl
          : body.WEBAPP_URL !== undefined
            ? body.WEBAPP_URL
            : current.webappUrl;
      const cleanUrl = normalizeGasUrl(rawUrl);

      const nextConfig = {
        ...current,
        ...body,
        webappUrl: cleanUrl,
        apiToken:
          body.apiToken !== undefined
            ? String(body.apiToken || "").trim()
            : body.API_TOKEN !== undefined
              ? String(body.API_TOKEN || "").trim()
              : current.apiToken || "",
        connected: Boolean(cleanUrl),
        lastSyncTimestamp: body.lastSyncTimestamp || Date.now(),
      };

      fs.writeFileSync(TMP_SERVER_CONFIG, JSON.stringify(nextConfig, null, 2), "utf-8");
      fs.writeFileSync(TMP_DRIVE_CONFIG, JSON.stringify(nextConfig, null, 2), "utf-8");

      return res.status(200).json({ success: true, config: nextConfig });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(200).json(readConfig());
}
