import type { VercelRequest, VercelResponse } from "@vercel/node";
import fs from "fs";
import path from "path";

const DRIVE_CONFIG_FILE = path.join("/tmp", "drive_config.json");

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    try {
      const config = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      fs.writeFileSync(DRIVE_CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
      return res.status(200).json({ success: true, config });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // GET
  try {
    if (fs.existsSync(DRIVE_CONFIG_FILE)) {
      const raw = fs.readFileSync(DRIVE_CONFIG_FILE, "utf-8");
      return res.status(200).json(JSON.parse(raw));
    }
  } catch (err) {
    console.error("Error reading drive_config.json on Vercel:", err);
  }

  return res.status(200).json({ webappUrl: "", autoSync: true, folderName: "SALEAD_Database_Data" });
}
