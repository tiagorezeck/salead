import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GLOBAL_GAS_CONFIG, normalizeGasUrl } from "../../src/config/gasConfig";

const previewMemoryCache = new Map<string, any>();

function getGasEndpoint(req: VercelRequest): string {
  const fromQuery =
    (typeof req.query?.gasUrl === "string" && req.query.gasUrl) || "";
  return normalizeGasUrl(
    process.env.GAS_WEBAPP_URL ||
      process.env.VITE_GAS_WEBAPP_URL ||
      fromQuery ||
      GLOBAL_GAS_CONFIG.WEBAPP_URL ||
      ""
  );
}

function normalizeLp(raw: any) {
  if (!raw || typeof raw !== "object") return raw;
  const heroModel =
    raw.hero?.model || raw.heroModel || raw.hero_model || "split_image";
  const ts = raw.updatedAt || raw.updated_at || new Date().toISOString();
  return {
    ...raw,
    heroModel,
    hero_model: heroModel,
    hero: raw.hero ? { ...raw.hero, model: heroModel } : { model: heroModel },
    updatedAt: ts,
    updated_at: ts,
  };
}

function getTsMs(p: any): number {
  if (!p) return 0;
  const a = p.updatedAt ? new Date(p.updatedAt).getTime() : 0;
  const b = p.updated_at ? new Date(p.updated_at).getTime() : 0;
  return Math.max(Number.isNaN(a) ? 0 : a, Number.isNaN(b) ? 0 : b);
}

function pickBestCandidate(memHit: any, norm: any) {
  if (!memHit) return norm;
  if (!norm) return memHit;
  const memTs = getTsMs(memHit);
  const normTs = getTsMs(norm);
  if (memTs > normTs) return memHit;
  if (normTs > memTs) return norm;
  const memModel = memHit.hero?.model || memHit.heroModel || "split_image";
  const normModel = norm.hero?.model || norm.heroModel || "split_image";
  if (memModel !== "split_image" && normModel === "split_image") return memHit;
  return norm;
}

function findLpInList(list: any[], queryId: string): any | null {
  if (!Array.isArray(list) || !queryId) return null;
  const qLow = queryId.toLowerCase();
  return (
    list.find(
      (p: any) =>
        p &&
        (String(p.id || "").toLowerCase() === qLow ||
          String(p.slug || "").toLowerCase() === qLow ||
          String(p.previewToken || "").toLowerCase() === qLow)
    ) || null
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST,PUT,DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const queryId = String(
    req.query.token ||
      req.query.pageId ||
      req.query.tokenOrId ||
      req.query.id ||
      req.query.slug ||
      ""
  ).trim();

  if (req.method === "DELETE") {
    if (queryId) previewMemoryCache.delete(queryId);
    return res.status(200).json({ success: true });
  }

  if (req.method === "GET") {
    if (!queryId) {
      return res
        .status(400)
        .json({ error: "Parâmetro id, token ou pageId obrigatório" });
    }

    const memHit = previewMemoryCache.get(queryId);
    const gasUrl = getGasEndpoint(req);

    if (gasUrl) {
      try {
        const urlObj = new URL(gasUrl);
        urlObj.searchParams.set("action", "GET_PUBLIC_LP");
        urlObj.searchParams.set("id", queryId);
        urlObj.searchParams.set("slug", queryId);
        urlObj.searchParams.set("lpId", queryId);
        urlObj.searchParams.set("t", Date.now().toString());

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const gasRes = await fetch(urlObj.toString(), {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const rawText = await gasRes.text();
        if (rawText && !rawText.trim().startsWith("<")) {
          const parsed = JSON.parse(rawText);
          let candidate = parsed?.landingPage || parsed?.lp || parsed?.page;
          if (!candidate && Array.isArray(parsed?.landingPages)) {
            candidate = findLpInList(parsed.landingPages, queryId);
          }
          if (!candidate && parsed?.database && Array.isArray(parsed.database.landingPages)) {
            candidate = findLpInList(parsed.database.landingPages, queryId);
          }
          if (candidate && candidate.id) {
            const norm = normalizeLp(candidate);
            const best = pickBestCandidate(memHit, norm);
            previewMemoryCache.set(best.id, best);
            if (best.slug) previewMemoryCache.set(best.slug, best);
            if (best.previewToken) previewMemoryCache.set(best.previewToken, best);
            return res.status(200).json({ success: true, page: best, landingPage: best });
          }
        }
      } catch {}
    }

    if (memHit) {
      return res.status(200).json({ success: true, page: memHit, landingPage: memHit });
    }

    return res.status(404).json({ error: "Página de preview não encontrada" });
  }

  if (req.method === "POST" || req.method === "PUT") {
    try {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const rawPage = body?.page || (body?.id ? body : null);
      if (!rawPage) {
        return res.status(400).json({ error: "Objeto page é obrigatório" });
      }

      const normalized = normalizeLp(rawPage);
      previewMemoryCache.set(normalized.id, normalized);
      if (normalized.slug) previewMemoryCache.set(normalized.slug, normalized);
      if (normalized.previewToken) previewMemoryCache.set(normalized.previewToken, normalized);

      const gasUrl = getGasEndpoint(req);
      if (gasUrl) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          await fetch(gasUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
              action: "SAVE_LANDING_PAGE",
              landingPage: normalized,
            }),
            redirect: "follow",
            signal: controller.signal,
          }).catch(() => {});
          clearTimeout(timeout);
        } catch {}
      }

      const token = normalized.previewToken || normalized.id;
      const previewUrl = `/preview?pageId=${normalized.id}&token=${token}&v=${Date.now()}`;

      return res.status(200).json({
        success: true,
        previewUrl,
        token,
        pageId: normalized.id,
        id: normalized.id,
        page: normalized,
      });
    } catch (e: any) {
      return res
        .status(500)
        .json({ error: e?.message || "Erro ao salvar preview" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
