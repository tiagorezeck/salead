import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { applyThematicImagesToPage } from "../utils/imageResolver";
import { generateAdaptiveLandingPage } from "../utils/adaptiveGenerator";
import { createClient } from "@supabase/supabase-js";
import { PRESET_TEMPLATES } from "../data/templates";

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
      if (cfg && cfg.webappUrl) return cfg.webappUrl;
    }
  } catch {}
  try {
    const rootConfigPath = path.join(process.cwd(), "drive_config.json");
    if (fs.existsSync(rootConfigPath)) {
      const raw = fs.readFileSync(rootConfigPath, "utf-8");
      const cfg = JSON.parse(raw);
      if (cfg && cfg.webappUrl) return cfg.webappUrl;
    }
  } catch {}
  return process.env.GOOGLE_DRIVE_WEBAPP_URL || "";
}

const LP_DATA_FILE = path.join(process.cwd(), "data", "landing_pages.json");
const SURVEYS_DATA_FILE = path.join(process.cwd(), "data", "surveys.json");
const RESPONSES_DATA_FILE = path.join(process.cwd(), "data", "survey_responses.json");
const LEADS_DATA_FILE = path.join(process.cwd(), "data", "leads_submissions.json");

function ensureDataDir() {
  const dir = path.dirname(LP_DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readStoredLeads(): any[] {
  try {
    ensureDataDir();
    if (fs.existsSync(LEADS_DATA_FILE)) {
      const raw = fs.readFileSync(LEADS_DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Failed to read stored leads submissions:", e);
  }
  return [];
}

function writeStoredLeads(leads: any[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(LEADS_DATA_FILE, JSON.stringify(leads, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write stored leads submissions:", e);
  }
}

function readStoredLandingPages(): any[] {
  try {
    ensureDataDir();
    if (fs.existsSync(LP_DATA_FILE)) {
      const raw = fs.readFileSync(LP_DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Failed to read stored landing pages:", e);
  }
  return [];
}

function writeStoredLandingPages(pages: any[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(LP_DATA_FILE, JSON.stringify(pages, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write stored landing pages:", e);
  }
}

function readStoredSurveys(): any[] {
  try {
    ensureDataDir();
    if (fs.existsSync(SURVEYS_DATA_FILE)) {
      const raw = fs.readFileSync(SURVEYS_DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Failed to read stored surveys:", e);
  }
  return [];
}

function writeStoredSurveys(surveys: any[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(SURVEYS_DATA_FILE, JSON.stringify(surveys, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write stored surveys:", e);
  }
}

function readStoredSurveyResponses(): any[] {
  try {
    ensureDataDir();
    if (fs.existsSync(RESPONSES_DATA_FILE)) {
      const raw = fs.readFileSync(RESPONSES_DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Failed to read stored survey responses:", e);
  }
  return [];
}

function writeStoredSurveyResponses(resps: any[]) {
  try {
    ensureDataDir();
    fs.writeFileSync(RESPONSES_DATA_FILE, JSON.stringify(resps, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write stored survey responses:", e);
  }
}

// In-memory preview pages store for cross-device & cross-tab real-time sync
const previewPagesStore = new Map<string, any>();
let lastSavedPreviewPage: any = null;

async function getPageFromSupabase(tokenOrId: string) {
  try {
    if (isUUID(tokenOrId)) {
      const { data, error } = await supabase.from("landing_pages").select("*").eq("id", tokenOrId).maybeSingle();
      if (data && !error) {
        return {
          id: data.id,
          name: data.name,
          title: data.name,
          template: data.template,
          status: data.status,
          ...(typeof data.config === "object" ? data.config : {}),
          surveyId: data.config?.surveyId || data.survey_id || undefined,
          externalUrl: data.config?.externalUrl || data.external_url || undefined,
        };
      }
    }

    // Busca por slug, client_id ou name
    const { data: byQuery } = await supabase
      .from("landing_pages")
      .select("*")
      .or(`config->>slug.eq.${tokenOrId},config->>client_id.eq.${tokenOrId},name.eq.${tokenOrId}`)
      .limit(1);

    if (byQuery && byQuery.length > 0) {
      const row = byQuery[0];
      return {
        id: row.id,
        name: row.name,
        title: row.name,
        template: row.template,
        status: row.status,
        ...(typeof row.config === "object" ? row.config : {}),
        surveyId: row.config?.surveyId || row.survey_id || undefined,
        externalUrl: row.config?.externalUrl || row.external_url || undefined,
      };
    }

    // Fallback: lista recente para correspondência flexível
    const { data: allLps } = await supabase.from("landing_pages").select("*").limit(50);
    if (allLps && allLps.length > 0) {
      const lower = tokenOrId.toLowerCase();
      const found = allLps.find(
        (p) =>
          p.id === tokenOrId ||
          p.config?.slug === tokenOrId ||
          p.config?.client_id === tokenOrId ||
          (p.config?.slug && p.config.slug.toLowerCase() === lower) ||
          (p.name && p.name.toLowerCase() === lower) ||
          p.name?.toLowerCase().includes(lower)
      );
      if (found) {
        return {
          id: found.id,
          name: found.name,
          title: found.name,
          template: found.template,
          status: found.status,
          ...(typeof found.config === "object" ? found.config : {}),
          surveyId: found.config?.surveyId || found.survey_id || undefined,
          externalUrl: found.config?.externalUrl || found.external_url || undefined,
        };
      }
    }
  } catch (e) {
    console.error("Error fetching page from Supabase in cometRoutes:", e);
  }
  return null;
}

// Unified resolver: busca no armazenamento persistente do disco, memória, Supabase e presets
export async function findLandingPageAnywhere(tokenOrId: string): Promise<any | null> {
  if (!tokenOrId) return null;
  const normId = tokenOrId.toLowerCase().trim();

  // 1. Memória (preview store)
  let page = previewPagesStore.get(tokenOrId) ||
    Array.from(previewPagesStore.values()).find(
      (p) =>
        p.id === tokenOrId ||
        p.slug === tokenOrId ||
        p.previewToken === tokenOrId ||
        (p.name && p.name.toLowerCase() === normId) ||
        (p.title && p.title.toLowerCase() === normId)
    );
  if (page) return page;

  // 2. Disco persistente do servidor
  const diskPages = readStoredLandingPages();
  const fromDisk = diskPages.find(
    (p) =>
      p.id === tokenOrId ||
      p.slug === tokenOrId ||
      p.previewToken === tokenOrId ||
      (p.name && p.name.toLowerCase() === normId) ||
      (p.title && p.title.toLowerCase() === normId) ||
      (p.config && (p.config.slug === tokenOrId || p.config.client_id === tokenOrId))
  );
  if (fromDisk) {
    previewPagesStore.set(fromDisk.id, fromDisk);
    return fromDisk;
  }

  // 3. Supabase com service role key (bypassa qualquer restrição)
  const fromSb = await getPageFromSupabase(tokenOrId);
  if (fromSb) {
    previewPagesStore.set(fromSb.id, fromSb);
    return fromSb;
  }

  // 4. Presets pré-configurados
  const fromPreset = PRESET_TEMPLATES.find(
    (p) =>
      p.id === tokenOrId ||
      p.slug === tokenOrId ||
      (p.title && p.title.toLowerCase() === normId)
  );
  if (fromPreset) return fromPreset;

  return null;
}

function normalizePhoneServer(raw?: string): string {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }
  if (digits.length === 8 || digits.length === 9) {
    digits = "24" + digits;
  }
  if (digits.length < 10) return raw.trim();
  const ddd = digits.slice(0, 2);
  const body = digits.slice(2, 11);
  if (body.length === 9) {
    return `+55 (${ddd}) ${body.slice(0, 5)}-${body.slice(5, 9)}`;
  } else if (body.length === 8) {
    return `+55 (${ddd}) ${body.slice(0, 4)}-${body.slice(4, 8)}`;
  }
  return raw.trim();
}

async function saveLeadToSupabase(leadData: {
  pageId: string;
  pageTitle: string;
  name: string;
  whatsapp: string;
  email: string;
  quizAnswers: any;
  utms: any;
  source?: string;
}) {
  try {
    const { pageId, pageTitle, name, whatsapp, email, quizAnswers, utms, source } = leadData;
    const cleanName = (name || "Lead Capturado").trim();
    const cleanWhatsapp = normalizePhoneServer(whatsapp);
    const cleanEmail = (email || "").trim().toLowerCase();
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
      tags: [effectiveSource, utms?.utm_campaign || "inbound", "comet-lp"].filter(Boolean),
      metadata: {
        capturedVia: "COMET Public Landing Page Engine (Express)",
        pageId,
        pageTitle,
        source: effectiveSource,
        utms: utms || {},
        answers: quizAnswers || {},
        extra: {},
        capturedAt: new Date().toISOString(),
      },
    };

    const { error } = await supabase.from("leads").insert([leadRecord]);
    if (error) {
      console.error("Error inserting lead into Supabase in Express:", error);
    } else {
      console.log(`Lead ${cleanName} saved to Supabase successfully via Express.`);
    }

    // Atualiza contagem de leads na Landing Page persistente (disco, memória e Supabase)
    try {
      const diskList = readStoredLandingPages();
      let foundLP: any = null;
      const updatedDisk = diskList.map((p) => {
        if (
          p.id === pageId ||
          p.slug === pageId ||
          p.name === pageTitle ||
          p.title === pageTitle ||
          (pageTitle && p.name && p.name.toLowerCase() === pageTitle.toLowerCase())
        ) {
          foundLP = p;
          const newLeads = Number(p.leads || p.leads_count || 0) + 1;
          const visits = Number(p.visits) || 1;
          const conv = Math.round((newLeads / visits) * 100);
          return {
            ...p,
            leads: newLeads,
            leads_count: newLeads,
            conv,
            updated_at: new Date().toISOString(),
          };
        }
        return p;
      });

      if (foundLP) {
        writeStoredLandingPages(updatedDisk);
        const updatedLP = updatedDisk.find((p) => p.id === foundLP.id);
        if (updatedLP) {
          previewPagesStore.set(updatedLP.id, updatedLP);
          if (updatedLP.slug) previewPagesStore.set(updatedLP.slug, updatedLP);
        }
      }

      // Supabase update
      if (pageId && isUUID(pageId)) {
        const { data: lpData } = await supabase.from("landing_pages").select("leads_count").eq("id", pageId).maybeSingle();
        const currentCount = Number(lpData?.leads_count) || 0;
        await supabase.from("landing_pages").update({ leads_count: currentCount + 1 }).eq("id", pageId);
      } else if (pageTitle) {
        const { data: lpData } = await supabase.from("landing_pages").select("id, leads_count").eq("name", pageTitle).maybeSingle();
        if (lpData) {
          const currentCount = Number(lpData?.leads_count) || 0;
          await supabase.from("landing_pages").update({ leads_count: currentCount + 1 }).eq("id", lpData.id);
        }
      }
    } catch (e) {
      console.warn("Failed to update landing page lead count:", e);
    }
  } catch (err) {
    console.error("Failed to run saveLeadToSupabase:", err);
  }
}

export const cometLpRouter = Router();




// In-memory submissions store for preview & testing
interface LeadSubmission {
  id: string;
  pageId: string;
  pageTitle: string;
  name: string;
  whatsapp: string;
  email: string;
  quizAnswers: Record<string, string>;
  utms: Record<string, string>;
  submittedAt: string;
  webhookStatus: "success" | "skipped" | "failed";
  webhookResponse?: string;
}

const leadSubmissions: LeadSubmission[] = readStoredLeads();

// Gemini Client initialization
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check
cometLpRouter.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Save / Sync preview page endpoint
cometLpRouter.post("/api/pages/preview", async (req, res) => {
  try {
    const page = req.body;
    if (!page || !page.id) {
      return res.status(400).json({ error: "Invalid page payload" });
    }

    // 1. Store in memory preview store
    previewPagesStore.set(page.id, page);
    if (page.previewToken) {
      previewPagesStore.set(page.previewToken, page);
    }
    if (page.slug) {
      previewPagesStore.set(page.slug, page);
    }
    lastSavedPreviewPage = page;

    // 2. Store on server disk
    try {
      const diskList = readStoredLandingPages();
      const updatedDisk = [page, ...diskList.filter((p) => p.id !== page.id && p.slug !== page.slug)];
      writeStoredLandingPages(updatedDisk);
    } catch (diskErr) {
      console.warn("Notice: server disk write failed in preview sync:", diskErr);
    }

    // 3. Salva no banco de dados Supabase ignorando RLS usando chave de serviço
    try {
      const { id, name, template, status, visits, leads, leads_count, created_at, updated_at, conv, ...config } = page;
      
      const payload: Record<string, any> = {
        name: name || page.title || "Nova Landing Page",
        template: template || "Modern",
        status: status || "Ativa",
        visits: visits !== undefined ? Number(visits) : 0,
        leads_count: (leads_count ?? leads) !== undefined ? Number(leads_count ?? leads) : 0,
        config: {
          ...(config || {}),
          client_id: id || (config && config.id) || (config && config.client_id),
          slug: page.slug || (config && config.slug) || (page.title || name ? (page.title || name).toLowerCase().replace(/[^a-z0-9]+/g, "-") : undefined),
          surveyId: page.surveyId || (config && config.surveyId),
          externalUrl: page.externalUrl || (config && config.externalUrl)
        }
      };

      if (id && isUUID(id)) {
        payload.id = id;
        await supabase.from("landing_pages").upsert([payload]);
      } else {
        const pageName = name || page.title || "Nova Landing Page";
        const { data: existing } = await supabase
          .from("landing_pages")
          .select("id")
          .eq("name", pageName)
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          await supabase.from("landing_pages").update(payload).eq("id", existing.id);
        } else {
          await supabase.from("landing_pages").insert([payload]);
        }
      }
    } catch (dbErr) {
      console.warn("Express server database save skipped or failed:", dbErr);
    }

    return res.json({ success: true, id: page.id, previewToken: page.previewToken });
  } catch (err: any) {
    console.error("Error saving preview page:", err);
    return res.status(500).json({ error: "Failed to save preview page" });
  }
});

// Retrieve preview page by Query string (id, pageId, token, slug)
cometLpRouter.get("/api/pages/preview", async (req, res) => {
  const tokenOrId = (req.query.id || req.query.pageId || req.query.token || req.query.slug) as string;
  if (!tokenOrId) {
    if (lastSavedPreviewPage) {
      return res.json({ success: true, page: lastSavedPreviewPage });
    }
    return res.status(400).json({ error: "Missing tokenOrId query parameter" });
  }

  const page = (await findLandingPageAnywhere(tokenOrId)) || lastSavedPreviewPage;

  if (page) {
    return res.json({ success: true, page });
  }

  return res.status(404).json({ error: "Preview page not found" });
});

// Retrieve preview page by ID or Token
cometLpRouter.get("/api/pages/preview/:tokenOrId", async (req, res) => {
  const { tokenOrId } = req.params;
  if (!tokenOrId) {
    return res.status(400).json({ error: "Missing tokenOrId" });
  }

  const page = (await findLandingPageAnywhere(tokenOrId)) || lastSavedPreviewPage;

  if (page) {
    return res.json({ success: true, page });
  }

  return res.status(404).json({ error: "Preview page not found" });
});

// Public dedicated LP resolution endpoint
cometLpRouter.get("/api/public/lp/:tokenOrId", async (req, res) => {
  const { tokenOrId } = req.params;
  if (!tokenOrId) {
    return res.status(400).json({ error: "Missing tokenOrId" });
  }

  const page = await findLandingPageAnywhere(tokenOrId);
  if (page) {
    return res.json({ success: true, page, landingPage: page });
  }

  return res.status(404).json({ error: "Landing page not found" });
});

// Função auxiliar robusta para incrementar visitas em memória, disco e Supabase de forma sincronizada
async function incrementLPVisits(id: string, body: any): Promise<{ success: boolean; visits: number }> {
  let updatedVisits = 1;
  const bodyLpId = body?.lpId || body?.id || body?.slug;

  // 1. Resolve a página de todas as formas (id, uuid no body, ou slug)
  let page = await findLandingPageAnywhere(id);
  if (!page && bodyLpId) {
    page = await findLandingPageAnywhere(bodyLpId);
  }
  if (!page && body?.slug) {
    page = await findLandingPageAnywhere(body.slug);
  }

  if (page) {
    const currentVisits = Number(page.visits || page.viewsCount || page.views_count) || 0;
    updatedVisits = currentVisits + 1;
    page.visits = updatedVisits;
    page.viewsCount = updatedVisits;
    page.views_count = updatedVisits;
    const leads = Number(page.leads || page.leads_count) || 0;
    page.conv = Math.round((leads / updatedVisits) * 100);
    
    previewPagesStore.set(page.id, page);
    if (page.slug) previewPagesStore.set(page.slug, page);
  }

  // 2. Atualiza no arquivo de disco do servidor
  try {
    const diskList = readStoredLandingPages();
    const matchIndex = diskList.findIndex(p => p.id === id || p.slug === id || (page && (p.id === page.id || p.slug === page.slug)));
    if (matchIndex !== -1) {
      const target = diskList[matchIndex];
      const v = (Number(target.visits || target.viewsCount || target.views_count) || 0) + 1;
      updatedVisits = v;
      const leads = Number(target.leads || target.leads_count) || 0;
      diskList[matchIndex] = {
        ...target,
        visits: v,
        viewsCount: v,
        views_count: v,
        conv: Math.round((leads / v) * 100),
        updated_at: new Date().toISOString()
      };
      writeStoredLandingPages(diskList);
    } else if (page) {
      writeStoredLandingPages([page, ...diskList]);
    }
  } catch (diskErr) {
    console.warn("Express disk visit increment notice:", diskErr);
  }

  // 3. Sincroniza e atualiza no Supabase de forma segura e garantida usando service_role
  try {
    const resolvedUuid = page?.id || (isUUID(id) ? id : (isUUID(bodyLpId) ? bodyLpId : null));
    if (resolvedUuid) {
      const { data: dbData } = await supabase.from("landing_pages").select("visits, config").eq("id", resolvedUuid).maybeSingle();
      const currentV = dbData ? (Number(dbData.visits) || 0) : 0;
      const finalV = Math.max(currentV + 1, updatedVisits);
      
      const updatePayload: Record<string, any> = { visits: finalV };
      if (dbData?.config && typeof dbData.config === "object") {
        updatePayload.config = {
          ...dbData.config,
          visits: finalV,
          viewsCount: finalV,
          views_count: finalV
        };
      }
      await supabase.from("landing_pages").update(updatePayload).eq("id", resolvedUuid);
    } else {
      const searchName = page?.name || page?.title || id;
      if (searchName) {
        const { data: dbData } = await supabase.from("landing_pages").select("id, visits, config").eq("name", searchName).maybeSingle();
        if (dbData?.id) {
          const currentV = Number(dbData.visits) || 0;
          const finalV = Math.max(currentV + 1, updatedVisits);
          const updatePayload: Record<string, any> = { visits: finalV };
          if (dbData.config && typeof dbData.config === "object") {
            updatePayload.config = {
              ...dbData.config,
              visits: finalV,
              viewsCount: finalV,
              views_count: finalV
            };
          }
          await supabase.from("landing_pages").update(updatePayload).eq("id", dbData.id);
        }
      }
    }
  } catch (sbErr) {
    console.warn("Supabase visit increment notice:", sbErr);
  }

  return { success: true, visits: updatedVisits };
}

// Endpoint oficial para contabilizar visualizações/visitas de Landing Pages
cometLpRouter.post("/api/landing-pages/:id/visit", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "ID ausente" });
    const result = await incrementLPVisits(id, req.body);
    return res.json(result);
  } catch (err: any) {
    console.error("Error incrementing visits:", err);
    return res.status(500).json({ error: err?.message || "Internal error" });
  }
});

// Alias para POST /api/landing-pages/visit com lpId no body
cometLpRouter.post("/api/landing-pages/visit", async (req, res) => {
  try {
    const targetId = req.body?.lpId || req.body?.id || req.body?.slug;
    if (!targetId) return res.status(400).json({ error: "lpId ou id ausente no body" });
    const result = await incrementLPVisits(targetId, req.body);
    return res.json(result);
  } catch (err: any) {
    console.error("Error incrementing visits alias:", err);
    return res.status(500).json({ error: err?.message || "Internal error" });
  }
});

// Delete preview page from memory
cometLpRouter.delete("/api/pages/preview/:tokenOrId", (req, res) => {
  const { tokenOrId } = req.params;
  if (tokenOrId) {
    previewPagesStore.delete(tokenOrId);
    if (lastSavedPreviewPage?.id === tokenOrId || lastSavedPreviewPage?.previewToken === tokenOrId) {
      lastSavedPreviewPage = null;
    }
  }
  return res.json({ success: true });
});

// Get leads submissions (disco local persistente + cache + Google Drive sincronizado)
cometLpRouter.get("/api/leads", async (req, res) => {
  try {
    const pageId = req.query.pageId as string;
    let list = readStoredLeads();

    // Se estiver vazio no arquivo, mas tiver em memória
    if (list.length === 0 && leadSubmissions.length > 0) {
      list = [...leadSubmissions];
      writeStoredLeads(list);
    }

    // Busca leads do Google Drive se configurado
    const driveUrl = getSystemDriveUrl();
    if (driveUrl && driveUrl.startsWith("http")) {
      try {
        const driveRes = await fetch(driveUrl + (driveUrl.includes("?") ? "&" : "?") + "action=get", {
          redirect: "follow",
          headers: { "Content-Type": "application/json" }
        });
        if (driveRes.ok) {
          const driveData = await driveRes.json();
          const rawDLeads = Array.isArray(driveData.leads) 
            ? driveData.leads 
            : (Array.isArray(driveData.data?.leads) ? driveData.data.leads : []);
          const rawDLpLeads = Array.isArray(driveData.leads_landing_pages) 
            ? driveData.leads_landing_pages 
            : (Array.isArray(driveData.data?.leads_landing_pages) ? driveData.data.leads_landing_pages : []);
          
          const driveMapped = [...rawDLeads, ...rawDLpLeads].map((dl: any) => {
            const name = dl.name || dl.Nome || dl["Nome"] || "Lead Capturado";
            const email = dl.email || dl.Email || dl["Email"] || "";
            const whatsapp = dl.whatsapp || dl.WhatsApp || dl["WhatsApp"] || "";
            const pageTitle = dl.landingPageTitle || dl["Landing Page (Título)"] || dl.landingPage || dl.pageTitle || "Campanha: venda...";
            const pageId = dl.landingPageId || dl["ID Landing Page"] || dl.pageId || "b8995c0f-7f94-4767-b683-93a2116c71f3";
            const source = dl.source || dl.Origem || "instagram";

            return {
              id: dl.id || dl["ID Lead"] || dl["ID"] || `drive_${Math.random().toString(36).substring(2, 7)}`,
              pageId,
              pageTitle,
              name,
              company: dl.company || dl.Empresa || dl["Empresa"] || `${name} (LP: ${pageTitle})`,
              email,
              whatsapp,
              source,
              stage: dl.stage || dl["Fase / Etapa"] || "Leads",
              temperature: dl.temperature || dl.Temperatura || "Quente",
              score: Number(dl.score || dl.Score) || 85,
              tags: Array.isArray(dl.tags) ? dl.tags : (typeof dl.Tags === "string" ? dl.Tags.split(",").map((t: string) => t.trim()) : ["LP", "Campanha", "instagram"]),
              submittedAt: dl.createdAt || dl.created_at || dl["Data Cadastro"] || dl["Data / Hora"] || new Date().toISOString(),
              webhookStatus: "skipped" as const,
              quizAnswers: dl.quizAnswers || {},
              utms: dl.utms || { utm_source: source }
            };
          });

          // Mescla sem duplicar
          const seen = new Set<string>();
          list.forEach(l => {
            if (l.id) seen.add(String(l.id));
            if (l.email) seen.add(l.email.toLowerCase().trim());
            if (l.whatsapp) seen.add(l.whatsapp.replace(/\D/g, ""));
          });

          let addedNew = false;
          for (const dLead of driveMapped) {
            const cleanE = dLead.email ? dLead.email.toLowerCase().trim() : "";
            const cleanW = dLead.whatsapp ? dLead.whatsapp.replace(/\D/g, "") : "";
            if (!seen.has(String(dLead.id)) && (!cleanE || !seen.has(cleanE)) && (!cleanW || !seen.has(cleanW))) {
              list.push(dLead as any);
              addedNew = true;
              if (dLead.id) seen.add(String(dLead.id));
              if (cleanE) seen.add(cleanE);
              if (cleanW) seen.add(cleanW);
            }
          }

          if (addedNew) {
            writeStoredLeads(list);
          }
        }
      } catch (dErr) {
        // Silently continue with disk data
      }
    }

    if (pageId) {
      return res.json({ leads: list.filter((l) => l.pageId === pageId) });
    }
    return res.json({ leads: list });
  } catch (err: any) {
    return res.json({ leads: leadSubmissions });
  }
});

// Update lead submission (e.g. stage change, notes, owner)
cometLpRouter.patch("/api/leads/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const index = leadSubmissions.findIndex((l) => l.id === id);
    if (index !== -1) {
      leadSubmissions[index] = {
        ...leadSubmissions[index],
        ...updates,
        stage: updates.stage !== undefined ? updates.stage : (leadSubmissions[index] as any).stage,
      };
      writeStoredLeads(leadSubmissions);
    }
    // Also try to update in Supabase if valid id
    if (isUUID(id)) {
      try {
        await supabase.from("leads").update(updates).eq("id", id);
      } catch (err) {
        console.warn("Supabase lead update fallback in Express:", err);
      }
    }
    return res.json({ success: true, lead: index !== -1 ? leadSubmissions[index] : null });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

cometLpRouter.put("/api/leads/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const index = leadSubmissions.findIndex((l) => l.id === id);
    if (index !== -1) {
      leadSubmissions[index] = { ...leadSubmissions[index], ...updates };
      writeStoredLeads(leadSubmissions);
    }
    if (isUUID(id)) {
      try {
        await supabase.from("leads").update(updates).eq("id", id);
      } catch (err) {
        console.warn("Supabase lead put fallback in Express:", err);
      }
    }
    return res.json({ success: true, lead: index !== -1 ? leadSubmissions[index] : null });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Delete lead submission
cometLpRouter.delete("/api/leads/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const index = leadSubmissions.findIndex((l) => l.id === id);
    if (index !== -1) {
      leadSubmissions.splice(index, 1);
      writeStoredLeads(leadSubmissions);
    }
    if (isUUID(id)) {
      try {
        await supabase.from("leads").delete().eq("id", id);
      } catch (err) {
        console.warn("Supabase lead delete fallback in Express:", err);
      }
    }
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// Submit Lead endpoint with Webhook forwarding
cometLpRouter.post("/api/webhook/submit-lead", async (req, res) => {
  try {
    const { pageId, pageTitle, name, whatsapp, email, quizAnswers, utms, webhookUrl } = req.body;

    const lead: LeadSubmission = {
      id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      pageId: pageId || "unknown",
      pageTitle: pageTitle || "Landing Page",
      name: name || "",
      whatsapp: whatsapp || "",
      email: email || "",
      quizAnswers: quizAnswers || {},
      utms: utms || {},
      submittedAt: new Date().toISOString(),
      webhookStatus: "skipped",
    };

    const targetWebhook = webhookUrl || process.env.VITE_SYSTEM_WEBHOOK_URL;

    if (targetWebhook && targetWebhook.trim().length > 0) {
      try {
        const payload = {
          event: "lead_converted",
          timestamp: lead.submittedAt,
          lead: {
            name: lead.name,
            whatsapp: lead.whatsapp,
            email: lead.email,
            quiz_diagnosis: lead.quizAnswers,
          },
          tracking: {
            page_id: lead.pageId,
            page_title: lead.pageTitle,
            ...lead.utms,
          },
        };

        const response = await fetch(targetWebhook, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "People-CRO-Builder/1.0",
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          lead.webhookStatus = "success";
          lead.webhookResponse = `Status ${response.status} OK`;
        } else {
          lead.webhookStatus = "failed";
          lead.webhookResponse = `HTTP Error ${response.status}: ${response.statusText}`;
        }
      } catch (err: any) {
        console.error("Webhook forwarding error:", err);
        lead.webhookStatus = "failed";
        lead.webhookResponse = err?.message || "Webhook delivery failed";
      }
    }

    // Persist permanently in the database bypassing RLS
    try {
      await saveLeadToSupabase({
        pageId: lead.pageId,
        pageTitle: lead.pageTitle,
        name: lead.name,
        whatsapp: lead.whatsapp,
        email: lead.email,
        quizAnswers: lead.quizAnswers,
        utms: lead.utms,
      });
    } catch (saveErr) {
      console.error("Error in automatic Supabase background save:", saveErr);
    }

    leadSubmissions.unshift(lead);
    // Keep max 200 leads in memory
    if (leadSubmissions.length > 200) {
      leadSubmissions.pop();
    }
    writeStoredLeads(leadSubmissions);

    return res.json({
      success: true,
      leadId: lead.id,
      webhookStatus: lead.webhookStatus,
      message: "Lead registrado com sucesso!",
    });
  } catch (error: any) {
    console.error("Error saving lead:", error);
    return res.status(500).json({ error: error.message || "Failed to process lead" });
  }
});

// Alias POST endpoint for /api/submit-lead
cometLpRouter.post("/api/submit-lead", async (req, res) => {
  // Forward directly to submit lead logic
  try {
    const { pageId, pageTitle, name, whatsapp, email, quizAnswers, utms, webhookUrl, source } = req.body || {};

    const lead: LeadSubmission = {
      id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      pageId: pageId || "unknown",
      pageTitle: pageTitle || "Landing Page",
      name: name || "",
      whatsapp: whatsapp || "",
      email: email || "",
      quizAnswers: quizAnswers || {},
      utms: utms || {},
      submittedAt: new Date().toISOString(),
      webhookStatus: "skipped",
    };

    const targetWebhook = webhookUrl || process.env.VITE_SYSTEM_WEBHOOK_URL;

    if (targetWebhook && targetWebhook.trim().length > 0) {
      try {
        const payload = {
          event: "lead_converted",
          timestamp: lead.submittedAt,
          lead: {
            name: lead.name,
            whatsapp: lead.whatsapp,
            email: lead.email,
            quiz_diagnosis: lead.quizAnswers,
          },
          tracking: {
            page_id: lead.pageId,
            page_title: lead.pageTitle,
            source: source || utms?.utm_source || "direct",
            ...(utms || {}),
          },
        };

        const response = await fetch(targetWebhook, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "People-CRO-Builder/1.0",
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          lead.webhookStatus = "success";
          lead.webhookResponse = `Status ${response.status} OK`;
        } else {
          lead.webhookStatus = "failed";
          lead.webhookResponse = `HTTP Error ${response.status}: ${response.statusText}`;
        }
      } catch (err: any) {
        console.error("Webhook forwarding error:", err);
        lead.webhookStatus = "failed";
        lead.webhookResponse = err?.message || "Webhook delivery failed";
      }
    }

    // Persist permanently in the database bypassing RLS
    try {
      await saveLeadToSupabase({
        pageId: lead.pageId,
        pageTitle: lead.pageTitle,
        name: lead.name,
        whatsapp: lead.whatsapp,
        email: lead.email,
        quizAnswers: lead.quizAnswers,
        utms: lead.utms,
        source: source,
      });
    } catch (saveErr) {
      console.error("Error in automatic Supabase background save:", saveErr);
    }

    // Auto Drive sync if configured
    const driveUrl = getSystemDriveUrl();
    if (driveUrl && driveUrl.startsWith("http")) {
      try {
        await fetch(driveUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "SUBMIT_LP_LEAD",
            lead: {
              id: lead.id,
              name: lead.name,
              company: `${lead.name} (LP: ${lead.pageTitle || lead.pageId || "Landing Page"})`,
              email: lead.email,
              whatsapp: lead.whatsapp,
              pageId: lead.pageId,
              pageTitle: lead.pageTitle,
              landingPageId: lead.pageId,
              landingPageTitle: lead.pageTitle,
              quizAnswers: lead.quizAnswers || {},
              utms: lead.utms || {},
              source: source || lead.utms?.utm_source || "Landing Page",
              submittedAt: lead.submittedAt
            }
          }),
          redirect: "follow"
        });
      } catch (dErr) {
        console.warn("Drive sync error in Express submit-lead:", dErr);
      }
    }

    leadSubmissions.unshift(lead);
    if (leadSubmissions.length > 200) {
      leadSubmissions.pop();
    }
    writeStoredLeads(leadSubmissions);

    return res.json({
      success: true,
      leadId: lead.id,
      webhookStatus: lead.webhookStatus,
      lead,
      message: "Lead capturado e processado com sucesso!",
    });
  } catch (error: any) {
    console.error("Error in /api/submit-lead:", error);
    return res.status(500).json({ error: error.message || "Failed to process lead" });
  }
});

// Helper to wait
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout de ${ms}ms em ${label}`)), ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Candidate models in fallback order: flash-lite provides sub-3s response, followed by 3.8 and 3.7
const CANDIDATE_MODELS = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-3.7-flash"];

// Multi-model call with timeout per model to guarantee fast response
async function callGeminiWithWaterfall(
  ai: GoogleGenAI,
  generateParams: {
    contents: string;
    systemInstruction?: string;
    responseSchema?: any;
  }
) {
  let lastError: any = null;

  for (const modelName of CANDIDATE_MODELS) {
    try {
      console.log(`[Gemini API] Solicitando modelo "${modelName}" com timeout...`);

      const callPromise = ai.models.generateContent({
        model: modelName,
        contents: generateParams.contents,
        config: {
          systemInstruction: generateParams.systemInstruction,
          responseMimeType: "application/json",
          responseSchema: generateParams.responseSchema,
        },
      });

      const response = await withTimeout(callPromise, 8000, modelName);

      if (response && response.text) {
        const trimmed = response.text.trim();
        try {
          const parsed = JSON.parse(trimmed);
          console.log(`[Gemini API] Sucesso com modelo "${modelName}"`);
          return { data: parsed, modelUsed: modelName };
        } catch (jsonErr) {
          const extracted = trimmed.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
          const parsed = JSON.parse(extracted);
          console.log(`[Gemini API] Sucesso no parse markdown com modelo "${modelName}"`);
          return { data: parsed, modelUsed: modelName };
        }
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini API] Modelo ${modelName} indisponível ou expirou:`, err?.message || err);
      // Avança imediatamente para o próximo modelo sem travar a requisição
    }
  }

  throw lastError || new Error("Todos os modelos Gemini estão temporariamente indisponíveis.");
}

// AI Landing Page Generation Endpoint
cometLpRouter.post("/api/ai/generate-landing-page", async (req, res) => {
  try {
    const { prompt, niche, cityOrRegion, targetAudience, offerDetails, accentColor, theme, heroModel } = req.body;

    const ai = getGeminiClient();

    const systemInstruction = `Você é o LAN, um Diretor de Arte Digital e Engenheiro de CRO (Conversion Rate Optimization) de Nível Mundial.
Seu objetivo é gerar o blueprint JSON completo de uma Landing Page ultra personalizada e estrategicamente calibrada para o nicho, público e produto fornecido.

DIRETRIZ DE NÃO REPETIÇÃO & ESCOLHA AUTÔNOMA DO MELHOR MODELO (CRÍTICO):
Você NUNCA deve gerar todas as landing pages iguais. Você deve agir como um Diretor de Arte e definir autonomamente a melhor estética visual:

1. DEFINIÇÃO DO TEMA ('theme'):
- 'light' (Clean White Pro / Sofisticação Clara): Escolha 'light' para Clínicas Médicas, Estética, Dermatologia, Odontologia, Longevidade, Psicologia, Arquitetura, Imobiliárias de Luxo ou Negócios onde o fundo claro transmite assepsia, alta confiança e requinte.
- 'dark' (Cyber Dark CRO): Escolha 'dark' para Tecnologia, Automação, Bots de WhatsApp, Plataformas SaaS, Tráfego Pago, Lançamentos e Produtos Digitais.
- 'midnight' (Preto Profundo / Luxo / Executivo): Escolha 'midnight' para Mentorias High-Ticket (R$ 5k a R$ 50k), Masterminds, Consultorias B2B Corporativas e Advocacia de Alto Padrão.
- 'hybrid' (Contraste Alternado): Escolha 'hybrid' para Treinamentos, Imersões e Cursos com blocos temáticos claros e escuros.

2. DEFINIÇÃO DO MODELO DE HERO ('hero.model'):
- 'split_image': Perfeito para produtos com fotos, clínicas, serviços locais ou mockups laterais.
- 'split_video': Ideal para lançamentos com VSL, infoprodutos, cursos e mentorias em vídeo.
- 'centered_showcase': Excelente para SaaS, IA, plataformas digitais e dashboards modernos.
- 'split_lead_form': Indicado para captura direta de leads em nichos com decisão rápida (ex: imobiliário, orçamento expresso, vagas de eventos).
- 'b2b_metrics': Excelente para Consultorias B2B, Finanças, Logística e Gestão onde números e autoridade são vitais.
- 'editorial_ebook': Ideal para materiais ricos, e-books, metodologias literárias e formações com autor.
- 'minimal_glow': Para marcas minimalistas, startups modernas e produtos de tecnologia refinada.
- 'urgency_counter': Perfeito para imersões com poucas vagas, contagem regressiva ativa e compras por impulso.
- 'white_pro': Específico para alto padrão médico e estético com cards de prova social flutuantes.
- 'fullscreen_slideshow': Para eventos, turismo e experiências visuais imersivas.

3. DEFINIÇÃO DA PALETA CROMÁTICA ('accentColor'):
- 'rose' / 'teal': Perfeito para Estética, Beleza, Cosméticos e Dermatologia.
- 'emerald': Saúde, Medicina, Finanças, Dinheiro, Investimentos e Longevidade.
- 'cyan' / 'purple': SaaS, Inteligência Artificial, Bots, Tecnologia e Inovação.
- 'amber' / 'orange': Mentorias, Liderança, Alta Conversão, Energia Solar, Alimentos e Negócios.
- 'blue' / 'indigo': B2B, Jurídico, Advocacia, Institucional e Consultoria Empresarial.
- 'gray': Minimalismo tipográfico editorial.

4. SEQUÊNCIA DAS SEÇÕES ('sectionOrder'):
- Varie a ordem conforme a consciência do lead (ex: coloque 'quiz' mais acima para qualificação imediata, ou 'bentoGrid' antes quando o método precisa ser explicado primeiro).

Regras de Copy e Estrutura:
1. Adapte fortemente a copy para a cidade/região ('${cityOrRegion || "Brasil"}') e nicho ('${niche || "Geral"}').
2. Crie badges de urgência e escassez regional autênticos.
3. Headline ultra impactante, sem clichês genéricos. Foque na dor profunda e no benefício de alto valor.
4. Subtítulo que destrói as principais objeções.
5. Crie um Quiz de Qualificação de 3 perguntas interativas que qualifique o lead e gere curiosidade.
6. Crie uma estrutura Bento Grid de 3 a 5 blocos apresentando o método / benefícios com ícones do Lucide (como Zap, ShieldCheck, Target, TrendingUp, Sparkles, Award, Users, CheckCircle, BarChart3, Rocket).
7. Crie 3 depoimentos ultra realistas com nomes brasileiros, cidades, métricas de resultado e avatar de fotos reais de alta qualidade.
8. Configure formulário com garantia (7, 15 ou 30 dias) e botão CTA gigante de ação imediata.
9. Retorne APENAS o JSON no formato solicitado.`;

    const userPromptText = `Gere uma Landing Page de alta conversão completa com DIREÇÃO DE ARTE personalizada para o seguinte briefing:
- Briefing / Ideia: ${prompt || "Programa de aceleração de resultados e mentoria premium"}
- Nicho de Mercado: ${niche || "Empreendedorismo / Serviços de Alto Valor"}
- Cidade / Região: ${cityOrRegion || "Nacional / São Paulo"}
- Público-Alvo: ${targetAudience || "Empresários, profissionais liberais e tomadores de decisão"}
- Oferta / Diferenciais: ${offerDetails || "Acesso imediato com garantia incondicional e suporte individualizado"}
- Preferência de Tema (ou auto): ${theme || "auto (LAN decide se será claro, escuro, midnight ou hybrid)"}
- Preferência de Modelo de Hero (ou auto): ${heroModel || "auto (LAN decide o melhor dos 10 modelos)"}
- Preferência de Cor (ou auto): ${accentColor || "auto (LAN decide a melhor cor psicológica)"}`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        niche: { type: Type.STRING },
        cityOrRegion: { type: Type.STRING },
        targetAudience: { type: Type.STRING },
        theme: {
          type: Type.STRING,
          enum: ["light", "dark", "midnight", "hybrid"],
        },
        accentColor: {
          type: Type.STRING,
          enum: ["orange", "amber", "purple", "emerald", "cyan", "rose", "blue", "indigo", "teal", "gray"],
        },
        sectionOrder: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        hero: {
          type: Type.OBJECT,
          properties: {
            model: {
              type: Type.STRING,
              enum: [
                "split_image",
                "split_video",
                "centered_showcase",
                "split_lead_form",
                "b2b_metrics",
                "editorial_ebook",
                "minimal_glow",
                "urgency_counter",
                "white_pro",
                "fullscreen_slideshow",
              ],
            },
            badgeText: { type: Type.STRING },
            headline: { type: Type.STRING },
            subheadline: { type: Type.STRING },
            mediaType: { type: Type.STRING, enum: ["video", "image"] },
            videoUrl: { type: Type.STRING },
            videoThumbnail: { type: Type.STRING },
            imageUrl: { type: Type.STRING },
            ctaText: { type: Type.STRING },
            ctaSubtext: { type: Type.STRING },
            countdownMinutes: { type: Type.NUMBER },
            ratingText: { type: Type.STRING },
            ratingScore: { type: Type.STRING },
          },
          required: ["badgeText", "headline", "subheadline", "ctaText", "ctaSubtext"],
        },
        socialProof: {
          type: Type.OBJECT,
          properties: {
            marqueeTitle: { type: Type.STRING },
            metrics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  value: { type: Type.STRING },
                  label: { type: Type.STRING },
                  sublabel: { type: Type.STRING },
                  iconName: { type: Type.STRING },
                },
                required: ["value", "label"],
              },
            },
            marqueeLogos: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["metrics", "marqueeLogos"],
        },
        quiz: {
          type: Type.OBJECT,
          properties: {
            badge: { type: Type.STRING },
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  question: { type: Type.STRING },
                  description: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        label: { type: Type.STRING },
                        iconName: { type: Type.STRING },
                        badge: { type: Type.STRING },
                      },
                      required: ["id", "label"],
                    },
                  },
                },
                required: ["id", "question", "options"],
              },
            },
            resultTitle: { type: Type.STRING },
            resultDescription: { type: Type.STRING },
          },
          required: ["badge", "title", "subtitle", "questions"],
        },
        bentoGrid: {
          type: Type.OBJECT,
          properties: {
            badge: { type: Type.STRING },
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  size: {
                    type: Type.STRING,
                    enum: ["large", "tall", "wide", "standard"],
                  },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  tag: { type: Type.STRING },
                  iconName: { type: Type.STRING },
                  metric: { type: Type.STRING },
                  imageUrl: { type: Type.STRING },
                },
                required: ["id", "title", "description", "iconName"],
              },
            },
          },
          required: ["badge", "title", "subtitle", "items"],
        },
        testimonials: {
          type: Type.OBJECT,
          properties: {
            badge: { type: Type.STRING },
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  role: { type: Type.STRING },
                  companyOrCity: { type: Type.STRING },
                  avatarUrl: { type: Type.STRING },
                  rating: { type: Type.NUMBER },
                  content: { type: Type.STRING },
                  resultHighlight: { type: Type.STRING },
                  verified: { type: Type.BOOLEAN },
                },
                required: ["name", "role", "content", "resultHighlight"],
              },
            },
          },
          required: ["badge", "title", "subtitle", "items"],
        },
        formSection: {
          type: Type.OBJECT,
          properties: {
            badge: { type: Type.STRING },
            title: { type: Type.STRING },
            subtitle: { type: Type.STRING },
            ctaButtonText: { type: Type.STRING },
            guaranteeDays: { type: Type.NUMBER },
            guaranteeText: { type: Type.STRING },
            securityBadges: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            offerPrice: { type: Type.STRING },
            originalPrice: { type: Type.STRING },
            installmentsText: { type: Type.STRING },
          },
          required: ["badge", "title", "subtitle", "ctaButtonText", "guaranteeText"],
        },
        faq: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              answer: { type: Type.STRING },
            },
            required: ["question", "answer"],
          },
        },
      },
      required: [
        "title",
        "niche",
        "cityOrRegion",
        "hero",
        "socialProof",
        "quiz",
        "bentoGrid",
        "testimonials",
        "formSection",
      ],
    };

    if (ai) {
      try {
        const result = await withTimeout(
          callGeminiWithWaterfall(ai, {
            contents: userPromptText,
            systemInstruction,
            responseSchema,
          }),
          12000,
          "Waterfall Total"
        );

        const enhancedData = applyThematicImagesToPage(result.data);

        return res.json({
          success: true,
          data: enhancedData,
          source: "gemini",
          modelUsed: result.modelUsed,
        });
      } catch (geminiErr: any) {
        console.warn(
          "Gemini waterfall failed or was unavailable, activating adaptive CRO engine:",
          geminiErr?.message
        );
        // Fallback to high-converting adaptive engine if all models unavailable
        const adaptivePage = generateAdaptiveLandingPage({
          prompt,
          niche,
          cityOrRegion,
          targetAudience,
          offerDetails,
          accentColor,
          theme,
          heroModel,
        });

        return res.json({
          success: true,
          data: adaptivePage,
          source: "adaptive_cro_engine",
          notice: "Página gerada pelo Motor Adaptativo de CRO devido a alta demanda temporária na nuvem.",
        });
      }
    } else {
      // Direct adaptive engine when no key
      const adaptivePage = generateAdaptiveLandingPage({
        prompt,
        niche,
        cityOrRegion,
        targetAudience,
        offerDetails,
        accentColor,
        theme,
        heroModel,
      });

      return res.json({
        success: true,
        data: adaptivePage,
        source: "adaptive_cro_engine",
      });
    }
  } catch (error: any) {
    console.error("Critical Landing page generation error:", error);
    // Even on error, provide graceful fallback
    const fallback = generateAdaptiveLandingPage(req.body || {});
    return res.json({
      success: true,
      data: fallback,
      source: "emergency_fallback",
    });
  }
});

// Endpoint do Robô LAN para refinamento/edição da LP por Prompt
cometLpRouter.post("/api/comet-lp/refine-page", async (req, res) => {
  try {
    const { page, prompt } = req.body;
    if (!page || !prompt) {
      return res.status(400).json({ error: "Missing page or prompt" });
    }

    const ai = getGeminiClient();

    const systemInstruction = `Você é o LAN, o Agente de IA e Diretor de Arte de CRO de Nível Mundial.
Seu objetivo é alterar a Landing Page fornecida no JSON com base na instrução exata fornecida pelo usuário.

Instrução do Usuário: "${prompt}"

Instruções de edição:
1. Modifique os campos do JSON que correspondem à solicitação (ex: se pediu para alterar a headline/título, mude 'title', 'headline', 'hero.headline'; se pediu para alterar o subtítulo, mude 'subheadline', 'hero.subheadline'; se pediu para alterar a cor, mude 'accentColor' ou 'theme'; se pediu para mudar o botão, mude 'hero.ctaText' e 'formSection.ctaButtonText').
2. Se pediu para adicionar ou reescrever depoimentos, FAQs ou perguntas no quiz, atualize esses objetos.
3. Se pediu para alterar imagens ou vídeos, atualize 'hero.imageUrl', 'hero.mediaType' e as imagens das seções.
4. Mantenha os outros campos intactos e garanta copy altamente persuasiva.
5. Retorne o JSON atualizado completo da Landing Page.`;

    if (ai) {
      try {
        const result = await callGeminiWithWaterfall(ai, {
          contents: `Landing Page Atual JSON: ${JSON.stringify(page)}\n\nInstrução de Alteração do Usuário: ${prompt}`,
          systemInstruction,
        });

        if (result && result.data) {
          const updatedPage = applyThematicImagesToPage({ ...page, ...result.data });
          return res.json({
            success: true,
            page: updatedPage,
            message: "Landing Page atualizada com sucesso pelo Robô LAN!"
          });
        }
      } catch (err: any) {
        console.warn("LAN refine page waterfall notice:", err?.message);
      }
    }

    // Heuristic Fallback
    const updated = JSON.parse(JSON.stringify(page || {}));
    const lowerPrompt = prompt.toLowerCase();
    updated.hero = updated.hero || {};
    updated.sections = Array.isArray(updated.sections) ? updated.sections : [];

    // Helper to extract text inside quotes or after keywords
    const extractText = (keywords: string[]) => {
      const q = prompt.match(/["'“]([^"'”]+)["'”]/);
      if (q && q[1]) return q[1].trim();
      for (const kw of keywords) {
        const idx = lowerPrompt.indexOf(kw);
        if (idx !== -1) {
          let text = prompt.substring(idx + kw.length).trim().replace(/^[:=para\s]+/i, "").trim();
          if (text.includes(".")) text = text.split(".")[0].trim();
          if (text) return text;
        }
      }
      return "";
    };

    // Headline / Título
    if (lowerPrompt.includes("headline") || lowerPrompt.includes("título") || lowerPrompt.includes("titulo")) {
      const newHeadline = extractText(["mude a headline para", "mude o título para", "título:", "headline:", "headline", "título", "titulo"]);
      if (newHeadline) {
        updated.name = newHeadline;
        updated.title = newHeadline;
        updated.headline = newHeadline;
        updated.hero.headline = newHeadline;
        updated.sections = updated.sections.map((s: any) => s.type === "hero" ? { ...s, title: newHeadline, headline: newHeadline } : s);
      }
    }

    // Subheadline / Subtítulo
    if (lowerPrompt.includes("subtítulo") || lowerPrompt.includes("subtitulo") || lowerPrompt.includes("subheadline")) {
      const newSub = extractText(["mude o subtítulo para", "subtítulo:", "subheadline:", "subtítulo", "subtitulo", "subheadline"]);
      if (newSub) {
        updated.subheadline = newSub;
        updated.hero.subheadline = newSub;
        updated.sections = updated.sections.map((s: any) => s.type === "hero" ? { ...s, subtitle: newSub, subheadline: newSub } : s);
      }
    }

    // Botão / CTA
    if (lowerPrompt.includes("botão") || lowerPrompt.includes("botao") || lowerPrompt.includes("cta")) {
      const newCta = extractText(["mude o botão para", "botão:", "cta:", "botão", "botao", "cta"]);
      if (newCta) {
        updated.ctaText = newCta;
        updated.hero.ctaText = newCta;
        if (updated.formSection) updated.formSection.ctaButtonText = newCta;
        updated.sections = updated.sections.map((s: any) => s.type === "hero" ? { ...s, ctaPrimary: newCta } : s);
      }
    }

    // Theme & Colors
    if (lowerPrompt.includes("dark") || lowerPrompt.includes("escuro")) updated.theme = "dark";
    if (lowerPrompt.includes("light") || lowerPrompt.includes("claro")) updated.theme = "light";
    if (lowerPrompt.includes("midnight") || lowerPrompt.includes("preto")) updated.theme = "midnight";
    if (lowerPrompt.includes("hybrid") || lowerPrompt.includes("híbrido")) updated.theme = "hybrid";

    if (lowerPrompt.includes("verde") || lowerPrompt.includes("emerald") || lowerPrompt.includes("esmeralda")) updated.accentColor = "emerald";
    if (lowerPrompt.includes("azul") || lowerPrompt.includes("blue")) updated.accentColor = "blue";
    if (lowerPrompt.includes("roxo") || lowerPrompt.includes("purple") || lowerPrompt.includes("púrpura")) updated.accentColor = "purple";
    if (lowerPrompt.includes("laranja") || lowerPrompt.includes("orange")) updated.accentColor = "orange";
    if (lowerPrompt.includes("ciano") || lowerPrompt.includes("cyan")) updated.accentColor = "cyan";

    if (lowerPrompt.includes("vídeo") || lowerPrompt.includes("video")) updated.hero.model = "split_video";
    if (lowerPrompt.includes("formulário") || lowerPrompt.includes("captura")) updated.hero.model = "split_lead_form";
    if (lowerPrompt.includes("contador") || lowerPrompt.includes("urgência") || lowerPrompt.includes("escassez")) updated.hero.model = "urgency_counter";

    return res.json({
      success: true,
      page: updated,
      message: "Alterações aplicadas com sucesso pelo Robô LAN!"
    });
  } catch (err: any) {
    console.error("LAN refine page error:", err);
    return res.status(500).json({ error: "Erro ao processar solicitação do Robô LAN" });
  }
});

// AI Copy Refinement / Assistant Endpoint
cometLpRouter.post("/api/ai/refine-copy", async (req, res) => {
  try {
    const { action, currentText, context, tone, cityOrRegion, customInstruction } = req.body;

    const ai = getGeminiClient();

    const prompt = `Você é um copywriter de elite de Conversion Rate Optimization (CRO).
Ação solicitada: ${action || "Melhorar copy"}
Texto atual: "${currentText || ""}"
Contexto: ${context || "Landing Page de Alta Conversão"}
Tom desejado: ${tone || "Agressivo, persuasivo e focado em benefícios"}
Região/Cidade: ${cityOrRegion || "Brasil"}
Instrução adicional: ${customInstruction || "Torne mais direto, atraente e com gatilhos de urgência."}

Retorne um JSON com:
- "result": O novo texto melhorado.
- "alternatives": Uma lista com 3 alternativas adicionais de alta conversão.
- "reasoning": Breve explicação de por que converte mais (1 frase).`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        result: { type: Type.STRING },
        alternatives: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        reasoning: { type: Type.STRING },
      },
      required: ["result", "alternatives"],
    };

    if (ai) {
      try {
        const result = await callGeminiWithWaterfall(ai, {
          contents: prompt,
          responseSchema,
        });
        return res.json({ success: true, ...result.data });
      } catch (err: any) {
        console.warn("AI refine waterfall failed, using heuristic copy enhancer:", err?.message);
      }
    }

    // Heuristic Copy Enhancer Fallback
    const cleanText = (currentText || "").trim();
    const cityText = cityOrRegion ? ` em ${cityOrRegion}` : "";
    const improved = cleanText
      ? `⚡ [Aceleração Comprovada] ${cleanText}${cityText} com Garantia Total de Resultados`
      : `Transforme seus Resultados com Nossa Estrutura de Alta Conversão${cityText}`;

    return res.json({
      success: true,
      result: improved,
      alternatives: [
        `Como Multiplicar seus Resultados${cityText} em Menos de 14 Dias`,
        `O Método Definitivo para Escalar Vendas com Previsibilidade${cityText}`,
        `Últimas Vagas Abertas: Acesso Exclusivo à Metodologia de Alta Conversão`,
      ],
      reasoning: "Adiciona gatilho de escassez, especificidade geográfica e foco no benefício primário.",
    });
  } catch (err: any) {
    console.error("AI refine error:", err);
    return res.json({
      success: true,
      result: req.body?.currentText || "Transforme seus Resultados Agora",
      alternatives: [
        "Acelere seu Crescimento com o Método Comprovado",
        "A Solução Definitiva para o seu Negócio",
      ],
      reasoning: "Estrutura simplificada de alta conversão.",
    });
  }
});

// ============================================================================
// PERSISTENT LANDING PAGES REST API (SERVER-SIDE DATABASE + FILE BACKED)
// ============================================================================

// GET all landing pages
cometLpRouter.get("/api/landing-pages", async (_req, res) => {
  try {
    let pages = readStoredLandingPages();

    // Se estiver vazio no arquivo local do servidor, busca no Supabase
    if (pages.length === 0) {
      try {
        const { data, error } = await supabase.from("landing_pages").select("*").order("created_at", { ascending: false });
        if (!error && data && data.length > 0) {
          pages = data.map((row) => ({
            id: row.id,
            name: row.name,
            title: row.name,
            template: row.template,
            status: row.status,
            visits: Number(row.visits) || 0,
            leads: Number(row.leads_count) || 0,
            created_at: row.created_at,
            updated_at: row.updated_at,
            ...(typeof row.config === "object" ? row.config : {}),
            surveyId: row.config?.surveyId || row.survey_id || undefined,
            externalUrl: row.config?.externalUrl || row.external_url || undefined,
          }));
          writeStoredLandingPages(pages);
        }
      } catch (err) {
        console.warn("Could not query Supabase for initial landing pages:", err);
      }
    }

    res.json({ success: true, landingPages: pages });
  } catch (err: any) {
    console.error("Error fetching landing pages:", err);
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// GET single landing page
cometLpRouter.get("/api/landing-pages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Missing landing page id" });
    }

    const found = await findLandingPageAnywhere(id);
    if (found) {
      return res.json({ success: true, landingPage: found, page: found });
    }

    res.status(404).json({ error: "Landing page not found" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// POST create landing page
cometLpRouter.post("/api/landing-pages", async (req, res) => {
  try {
    const body = req.body || {};
    const fallbackId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

    const pageId = body.id && typeof body.id === "string" && body.id.trim() ? body.id : fallbackId;
    const newPage = {
      ...body,
      id: pageId,
      name: body.name || body.title || "Nova Landing Page",
      title: body.title || body.name || "Nova Landing Page",
      template: body.template || "COMET",
      status: body.status || "Ativa",
      visits: Number(body.visits) || 0,
      leads: Number(body.leads ?? body.leads_count) || 0,
      conv: Number(body.conv) || 0,
      type: body.type || "COMET CRO",
      created_at: body.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Salva no arquivo do servidor
    const current = readStoredLandingPages();
    const updatedList = [newPage, ...current.filter((p) => p.id !== newPage.id && p.slug !== newPage.slug)];
    writeStoredLandingPages(updatedList);

    // 2. Cache no preview store
    previewPagesStore.set(newPage.id, newPage);
    if (newPage.slug) previewPagesStore.set(newPage.slug, newPage);
    if (newPage.previewToken) previewPagesStore.set(newPage.previewToken, newPage);

    // 3. Tenta salvar no Supabase de forma resiliente
    try {
      const dbPayload = {
        name: newPage.name,
        template: newPage.template,
        status: newPage.status,
        visits: newPage.visits,
        leads_count: newPage.leads,
        config: newPage,
      };
      if (isUUID(newPage.id)) {
        (dbPayload as any).id = newPage.id;
      }
      await supabase.from("landing_pages").insert([dbPayload]);
    } catch (sbErr) {
      console.info("Supabase sync notice (LP saved in server DB):", sbErr);
    }

    res.json({ success: true, landingPage: newPage });
  } catch (err: any) {
    console.error("Error creating landing page:", err);
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// PUT update landing page
cometLpRouter.put("/api/landing-pages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const current = readStoredLandingPages();
    const existing = current.find((p) => p.id === id || p.slug === id);

    const updatedPage = {
      ...(existing || {}),
      ...body,
      id: existing?.id || id,
      updated_at: new Date().toISOString(),
    };

    const updatedList = current.map((p) => (p.id === updatedPage.id ? updatedPage : p));
    if (!current.some((p) => p.id === updatedPage.id)) {
      updatedList.unshift(updatedPage);
    }
    writeStoredLandingPages(updatedList);

    // Cache no preview store
    previewPagesStore.set(updatedPage.id, updatedPage);
    if (updatedPage.slug) previewPagesStore.set(updatedPage.slug, updatedPage);
    if (updatedPage.previewToken) previewPagesStore.set(updatedPage.previewToken, updatedPage);

    // Tenta Supabase
    try {
      const dbPayload = {
        name: updatedPage.name || updatedPage.title,
        template: updatedPage.template,
        status: updatedPage.status,
        visits: Number(updatedPage.visits) || 0,
        leads_count: Number(updatedPage.leads ?? updatedPage.leads_count) || 0,
        config: updatedPage,
      };
      if (isUUID(updatedPage.id)) {
        await supabase.from("landing_pages").update(dbPayload).eq("id", updatedPage.id);
      } else if (updatedPage.name) {
        await supabase.from("landing_pages").update(dbPayload).eq("name", updatedPage.name);
      }
    } catch (sbErr) {
      console.info("Supabase update notice (LP updated in server DB):", sbErr);
    }

    res.json({ success: true, landingPage: updatedPage });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// DELETE single landing page
cometLpRouter.delete("/api/landing-pages/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const current = readStoredLandingPages();
    const filtered = current.filter((p) => p.id !== id && p.slug !== id);
    writeStoredLandingPages(filtered);

    previewPagesStore.delete(id);

    try {
      if (isUUID(id)) {
        await supabase.from("landing_pages").delete().eq("id", id);
      }
    } catch {}

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// POST bulk delete landing pages
cometLpRouter.post("/api/landing-pages/bulk-delete", async (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.json({ success: true, count: 0 });
    }

    const idSet = new Set(ids);
    const current = readStoredLandingPages();
    const filtered = current.filter((p) => !idSet.has(p.id) && !idSet.has(p.slug));
    writeStoredLandingPages(filtered);

    ids.forEach((i) => previewPagesStore.delete(i));

    try {
      const uuidIds = ids.filter((i) => isUUID(i));
      if (uuidIds.length > 0) {
        await supabase.from("landing_pages").delete().in("id", uuidIds);
      }
    } catch {}

    res.json({ success: true, count: ids.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// POST clean database keeping one
cometLpRouter.post("/api/landing-pages/clean-keep-one", async (req, res) => {
  try {
    const { keepId } = req.body || {};
    const current = readStoredLandingPages();
    let kept = current.find((p) => p.id === keepId || p.slug === keepId);
    if (!kept && current.length > 0) kept = current[0];

    if (kept) {
      writeStoredLandingPages([kept]);
    } else {
      writeStoredLandingPages([]);
    }

    res.json({ success: true, kept });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// ============================================================================
// TRACKING ENDPOINTS (VISITS & CONVERSIONS ATÔMICOS)
// ============================================================================

// POST increment LP visit
cometLpRouter.post("/api/landing-pages/:id/visit", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Missing landing page id" });

    const current = readStoredLandingPages();
    let updatedLP: any = null;

    const updatedList = current.map((p) => {
      if (
        p.id === id ||
        p.slug === id ||
        (p.config && (p.config.slug === id || p.config.client_id === id)) ||
        (p.name && p.name.toLowerCase() === id.toLowerCase()) ||
        (p.title && p.title.toLowerCase() === id.toLowerCase())
      ) {
        const newVisits = (Number(p.visits) || 0) + 1;
        const leads = Number(p.leads || p.leads_count) || 0;
        const conv = Math.round((leads / newVisits) * 100);
        updatedLP = {
          ...p,
          visits: newVisits,
          conv,
          updated_at: new Date().toISOString(),
        };
        return updatedLP;
      }
      return p;
    });

    if (updatedLP) {
      writeStoredLandingPages(updatedList);
      previewPagesStore.set(updatedLP.id, updatedLP);
      if (updatedLP.slug) previewPagesStore.set(updatedLP.slug, updatedLP);

      // Sincroniza Supabase
      try {
        if (isUUID(updatedLP.id)) {
          await supabase.rpc("increment_lp_visits", { lp_id: updatedLP.id });
        } else if (updatedLP.name) {
          const { data: lpData } = await supabase.from("landing_pages").select("id, visits").eq("name", updatedLP.name).maybeSingle();
          if (lpData) {
            const currentVisits = Number(lpData.visits) || 0;
            await supabase.from("landing_pages").update({ visits: currentVisits + 1 }).eq("id", lpData.id);
          }
        }
      } catch (sbErr) {
        console.info("Notice: Supabase visit increment sync:", sbErr);
      }

      return res.json({ success: true, visits: updatedLP.visits, conv: updatedLP.conv, landingPage: updatedLP });
    }

    // Fallback: se não achou no disco, tenta Supabase
    if (isUUID(id)) {
      try {
        await supabase.rpc("increment_lp_visits", { lp_id: id });
        return res.json({ success: true, id });
      } catch {}
    }

    res.json({ success: true, tracked: true });
  } catch (err: any) {
    console.error("Error incrementing LP visit:", err);
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// POST increment LP conversion
cometLpRouter.post("/api/landing-pages/:id/conversion", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Missing landing page id" });

    const current = readStoredLandingPages();
    let updatedLP: any = null;

    const updatedList = current.map((p) => {
      if (
        p.id === id ||
        p.slug === id ||
        (p.config && (p.config.slug === id || p.config.client_id === id)) ||
        (p.name && p.name.toLowerCase() === id.toLowerCase()) ||
        (p.title && p.title.toLowerCase() === id.toLowerCase())
      ) {
        const newLeads = (Number(p.leads || p.leads_count) || 0) + 1;
        const visits = Number(p.visits) || 1;
        const conv = Math.round((newLeads / visits) * 100);
        updatedLP = {
          ...p,
          leads: newLeads,
          leads_count: newLeads,
          conv,
          updated_at: new Date().toISOString(),
        };
        return updatedLP;
      }
      return p;
    });

    if (updatedLP) {
      writeStoredLandingPages(updatedList);
      previewPagesStore.set(updatedLP.id, updatedLP);
      if (updatedLP.slug) previewPagesStore.set(updatedLP.slug, updatedLP);

      try {
        if (isUUID(updatedLP.id)) {
          const { data: lpData } = await supabase.from("landing_pages").select("leads_count").eq("id", updatedLP.id).maybeSingle();
          const currentCount = Number(lpData?.leads_count) || 0;
          await supabase.from("landing_pages").update({ leads_count: currentCount + 1 }).eq("id", updatedLP.id);
        }
      } catch (sbErr) {
        console.info("Notice: Supabase conversion sync:", sbErr);
      }

      return res.json({ success: true, leads: updatedLP.leads, conv: updatedLP.conv, landingPage: updatedLP });
    }

    res.json({ success: true, tracked: true });
  } catch (err: any) {
    console.error("Error incrementing LP conversion:", err);
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// ============================================================================
// SURVEYS & DIAGNOSTICS REST API (SERVER PERSISTENCE + SUPABASE SYNC)
// ============================================================================

// GET all surveys
cometLpRouter.get("/api/surveys", async (_req, res) => {
  try {
    const diskSurveys = readStoredSurveys();
    let dbSurveys: any[] = [];
    try {
      const { data, error } = await supabase.from("surveys").select("*").order("created_at", { ascending: false });
      if (!error && data) dbSurveys = data;
    } catch {}

    const map = new Map<string, any>();
    for (const s of diskSurveys) {
      if (s.id) map.set(s.id, s);
    }
    for (const s of dbSurveys) {
      if (s.id) {
        const prev = map.get(s.id);
        map.set(s.id, { ...(prev || {}), ...s });
      }
    }

    res.json({ success: true, surveys: Array.from(map.values()) });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// GET single survey by ID
cometLpRouter.get("/api/surveys/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Missing survey ID" });

    // 1. Disco
    const diskSurveys = readStoredSurveys();
    const foundDisk = diskSurveys.find((s) => s.id === id || s.slug === id || (s.name && s.name.toLowerCase() === id.toLowerCase()));
    if (foundDisk) {
      return res.json({ success: true, survey: foundDisk });
    }

    // 2. Supabase
    try {
      const { data, error } = await supabase.from("surveys").select("*").eq("id", id).maybeSingle();
      if (!error && data) {
        return res.json({ success: true, survey: data });
      }
    } catch {}

    res.status(404).json({ error: "Survey not found" });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});

// POST submit survey response
cometLpRouter.post("/api/surveys/responses", async (req, res) => {
  try {
    const body = req.body || {};
    const { surveyId, leadForm, answers, duration, extraPayload, tracking } = body;

    const responseId = `resp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const responseRecord = {
      id: responseId,
      surveyId,
      survey_id: surveyId,
      leadId: leadForm?.id || extraPayload?.leadId || null,
      landingPageId: extraPayload?.landingPageId || extraPayload?.pageId || null,
      answers: answers || {},
      completedAt: nowIso,
      created_at: nowIso,
      durationSeconds: Number(duration) || 0,
      leadName: leadForm?.name || extraPayload?.leadName || "Participante",
      leadWhatsapp: leadForm?.whatsapp || extraPayload?.leadWhatsapp || "",
      leadEmail: leadForm?.email || extraPayload?.leadEmail || "",
      tracking: tracking || {},
    };

    // 1. Salva em disco
    const currentResponses = readStoredSurveyResponses();
    writeStoredSurveyResponses([responseRecord, ...currentResponses.slice(0, 500)]);

    // 2. Salva Lead completo no Supabase e atualiza CRM
    if (leadForm?.name || leadForm?.whatsapp || leadForm?.email) {
      await saveLeadToSupabase({
        pageId: responseRecord.landingPageId || "survey",
        pageTitle: extraPayload?.pageTitle || extraPayload?.landingPage || "Pesquisa de Qualificação",
        name: leadForm.name || "Lead Participante",
        whatsapp: leadForm.whatsapp || "",
        email: leadForm.email || "",
        quizAnswers: answers || {},
        utms: tracking?.utm || {},
        source: tracking?.source || "Pesquisa Interativa",
      });
    }

    // 3. Tenta salvar na tabela survey_responses no Supabase
    try {
      await supabase.from("survey_responses").insert([{
        id: isUUID(responseId) ? responseId : undefined,
        survey_id: surveyId,
        lead_id: isUUID(responseRecord.leadId) ? responseRecord.leadId : null,
        landing_page_id: isUUID(responseRecord.landingPageId) ? responseRecord.landingPageId : null,
        answers: answers || {},
        duration_seconds: Number(duration) || 0,
      }]);
    } catch (sbErr) {
      console.info("Supabase survey response sync notice:", sbErr);
    }

    // 3b. Sincroniza resposta da pesquisa diretamente com o Google Drive / Sheets
    const driveUrl = getSystemDriveUrl();
    if (driveUrl && driveUrl.startsWith("http")) {
      try {
        await fetch(driveUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "SUBMIT_SURVEY_RESPONSE",
            surveyResponse: {
              surveyId,
              surveyName: extraPayload?.pageTitle || "Pesquisa de Qualificação",
              leadName: leadForm?.name || extraPayload?.leadName || "Participante",
              leadWhatsapp: leadForm?.whatsapp || extraPayload?.leadWhatsapp || "",
              leadEmail: leadForm?.email || extraPayload?.leadEmail || "",
              answers: answers || {},
              timestamp: new Date().toISOString()
            }
          }),
          redirect: "follow"
        });
      } catch (dErr) {
        console.warn("Survey response Drive sync notice:", dErr);
      }
    }

    // 4. Se havia uma Landing Page vinculada, incrementa suas conversões
    if (responseRecord.landingPageId) {
      try {
        const diskLps = readStoredLandingPages();
        const updatedLps = diskLps.map((p) => {
          if (p.id === responseRecord.landingPageId || p.slug === responseRecord.landingPageId) {
            const newLeads = (Number(p.leads || p.leads_count) || 0) + 1;
            const visits = Number(p.visits) || 1;
            return {
              ...p,
              leads: newLeads,
              leads_count: newLeads,
              conv: Math.round((newLeads / visits) * 100),
              updated_at: new Date().toISOString(),
            };
          }
          return p;
        });
        writeStoredLandingPages(updatedLps);
      } catch {}
    }

    res.json({ success: true, responseId, response: responseRecord });
  } catch (err: any) {
    console.error("Error submitting survey response:", err);
    res.status(500).json({ error: err?.message || "Internal server error" });
  }
});


