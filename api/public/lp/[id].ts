import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GLOBAL_GAS_CONFIG, normalizeGasUrl } from "../../../src/config/gasConfig";

const publicLpMemoryCache = new Map<string, any>();

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
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rawId = req.query.id;
  const queryId = String(Array.isArray(rawId) ? rawId[0] : rawId || "").trim();
  if (!queryId) {
    return res.status(400).json({ error: "ID ou slug obrigatório" });
  }

  const memHit = publicLpMemoryCache.get(queryId);
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
          publicLpMemoryCache.set(norm.id, norm);
          if (norm.slug) publicLpMemoryCache.set(norm.slug, norm);
          if (norm.previewToken) publicLpMemoryCache.set(norm.previewToken, norm);
          return res.status(200).json({
            status: "success",
            success: true,
            landingPage: norm,
            page: norm,
          });
        }
      }
    } catch {}
  }

  if (memHit) {
    return res.status(200).json({
      status: "success",
      success: true,
      landingPage: memHit,
      page: memHit,
    });
  }

  return res.status(404).json({ error: "Landing page não encontrada" });
}
