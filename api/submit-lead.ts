import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { GLOBAL_GAS_CONFIG, normalizeGasUrl } from "../src/config/gasConfig";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://zhyihwtgsctlpzspgsop.supabase.co";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoeWlod3Rnc2N0bHB6c3Bnc29wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5ODE1OTksImV4cCI6MjA5OTU1NzU5OX0.Eg8KGBN8HmyQ0vnpZLhhjrFBrvW0YnIqzKLwiKL6_Gk";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function isUUID(str?: string): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

function getSystemDriveUrl(): string {
  try {
    const configPath = "/tmp/drive_config.json";
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, "utf-8");
      const cfg = JSON.parse(raw);
      if (cfg && cfg.webappUrl) return normalizeGasUrl(cfg.webappUrl);
    }
  } catch {}
  try {
    const rootConfigPath = path.join(process.cwd(), "drive_config.json");
    if (fs.existsSync(rootConfigPath)) {
      const raw = fs.readFileSync(rootConfigPath, "utf-8");
      const cfg = JSON.parse(raw);
      if (cfg && cfg.webappUrl) return normalizeGasUrl(cfg.webappUrl);
    }
  } catch {}
  return normalizeGasUrl(
    process.env.GAS_WEBAPP_URL ||
      process.env.VITE_GAS_WEBAPP_URL ||
      process.env.GOOGLE_DRIVE_WEBAPP_URL ||
      GLOBAL_GAS_CONFIG.WEBAPP_URL ||
      ""
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configura CORS total para requisições de LPs em qualquer origem
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const {
      pageId,
      pageTitle,
      name,
      whatsapp,
      email,
      quizAnswers,
      utms,
      webhookUrl,
      source,
      metadata,
      isTest,
    } = req.body || {};

    const cleanName = (name || "Lead Capturado").trim();
    const cleanWhatsapp = (whatsapp || "").trim();
    const cleanEmail = (email || "").trim();
    const isTestFlag = Boolean(isTest || metadata?.isTest);
    const leadId = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const effectiveSource = source || utms?.utm_source || utms?.src || "direct";

    const leadRecord = {
      name: cleanName,
      email: cleanEmail,
      whatsapp: cleanWhatsapp,
      company: `${cleanName} (LP: ${pageTitle || pageId || "Landing Page"})`,
      source: `LP: ${pageTitle || pageId} [${effectiveSource}]`,
      stage: "Leads",
      classification: "Lead",
      temperature: "Quente",
      isTest: isTestFlag,
      tags: [effectiveSource, utms?.utm_campaign || "inbound", "comet-lp"].filter(Boolean),
      metadata: {
        capturedVia: "COMET Public Landing Page Engine",
        pageId,
        pageTitle,
        source: effectiveSource,
        isTest: isTestFlag,
        utms: utms || {},
        answers: quizAnswers || {},
        extra: metadata || {},
        capturedAt: new Date().toISOString(),
      },
    };

    // 1. Tenta salvar diretamente no Supabase (com timeout curto para não travar a resposta)
    let dbSuccess = false;
    try {
      const supabaseOp = (async () => {
        const { error: dbError } = await supabase.from("leads").insert([leadRecord]);
        if (!dbError) {
          dbSuccess = true;
          if (pageId && isUUID(pageId)) {
            try {
              const { data: lpData } = await supabase.from("landing_pages").select("leads_count").eq("id", pageId).maybeSingle();
              const currentCount = lpData?.leads_count || 0;
              await supabase.from("landing_pages").update({ leads_count: currentCount + 1 }).eq("id", pageId);
            } catch {}
          }
        }
      })();
      await Promise.race([
        supabaseOp,
        new Promise((resolve) => setTimeout(resolve, 2500)),
      ]);
    } catch (e) {
      console.warn("Supabase direct insert notice:", e);
    }

    // 2. Sincroniza automaticamente com a planilha do Google Drive / Apps Script do sistema
    const driveUrl = getSystemDriveUrl();
    let driveSynced = false;
    if (driveUrl && driveUrl.startsWith("http")) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const gasRes = await fetch(driveUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "SUBMIT_LP_LEAD",
            isTest: isTestFlag,
            lead: {
              id: leadId,
              name: cleanName,
              company: leadRecord.company,
              email: cleanEmail,
              whatsapp: cleanWhatsapp,
              pageId: pageId || "",
              pageTitle: pageTitle || "Landing Page",
              landingPageId: pageId || "",
              landingPageTitle: pageTitle || "Landing Page",
              quizAnswers: quizAnswers || {},
              utms: utms || {},
              source: effectiveSource,
              isTest: isTestFlag,
              submittedAt: new Date().toISOString()
            }
          }),
          redirect: "follow",
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (gasRes.ok) {
          driveSynced = true;
        }
      } catch (dErr) {
        console.warn("Auto Drive sync notice:", dErr);
      }
    }

    // 3. Dispara webhook externo se configurado na LP
    const targetWebhook = webhookUrl || process.env.VITE_SYSTEM_WEBHOOK_URL;
    let webhookStatus = "skipped";
    if (targetWebhook && targetWebhook.trim().length > 0) {
      try {
        const webhookPayload = {
          event: "lead_converted",
          timestamp: new Date().toISOString(),
          lead: {
            id: leadId,
            name: cleanName,
            whatsapp: cleanWhatsapp,
            email: cleanEmail,
            quiz_diagnosis: quizAnswers || {},
          },
          tracking: {
            page_id: pageId,
            page_title: pageTitle,
            source: effectiveSource,
            ...(utms || {}),
          },
        };

        const whRes = await fetch(targetWebhook, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Comet-CRO-Lead-Collector/1.0",
          },
          body: JSON.stringify(webhookPayload),
        });
        webhookStatus = whRes.ok ? "success" : `failed_${whRes.status}`;
      } catch (whErr: any) {
        webhookStatus = `error_${whErr?.message || "network"}`;
      }
    }

    return res.status(200).json({
      success: true,
      leadId,
      dbSynced: dbSuccess,
      webhookStatus,
      lead: leadRecord,
      message: "Lead capturado e processado com sucesso!",
    });
  } catch (err: any) {
    console.error("Erro no processamento do lead:", err);
    return res.status(500).json({
      error: "Falha ao processar lead",
      details: err?.message || String(err),
    });
  }
}
