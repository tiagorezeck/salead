import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GLOBAL_GAS_CONFIG, normalizeGasUrl } from "../../src/config/gasConfig";

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

function normalizeLp(raw: any, fallbackId?: string) {
  if (!raw || typeof raw !== "object") return raw;
  const heroModel =
    raw.hero?.model || raw.heroModel || raw.hero_model || "split_image";
  const ts = raw.updatedAt || raw.updated_at || new Date().toISOString();
  return {
    ...raw,
    id: raw.id || fallbackId,
    heroModel,
    hero_model: heroModel,
    hero: raw.hero ? { ...raw.hero, model: heroModel } : { model: heroModel },
    updatedAt: ts,
    updated_at: ts,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST,PUT,PATCH,DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const rawId = req.query.id;
  const lpId = String(Array.isArray(rawId) ? rawId[0] : rawId || "").trim();
  const gasUrl = getGasEndpoint(req);

  if (!lpId) {
    return res.status(400).json({ error: "ID obrigatório" });
  }

  if (req.method === "GET") {
    if (gasUrl) {
      try {
        const urlObj = new URL(gasUrl);
        urlObj.searchParams.set("action", "GET_PUBLIC_LP");
        urlObj.searchParams.set("id", lpId);
        urlObj.searchParams.set("slug", lpId);
        urlObj.searchParams.set("lpId", lpId);
        urlObj.searchParams.set("t", Date.now().toString());

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const gasRes = await fetch(urlObj.toString(), {
          method: "GET",
          redirect: "follow",
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const text = await gasRes.text();
        if (text && !text.trim().startsWith("<")) {
          const parsed = JSON.parse(text);
          let candidate = parsed?.landingPage || parsed?.lp || parsed?.page;
          if (!candidate && Array.isArray(parsed?.landingPages)) {
            const qLow = lpId.toLowerCase();
            candidate = parsed.landingPages.find(
              (p: any) =>
                p &&
                (String(p.id || "").toLowerCase() === qLow ||
                  String(p.slug || "").toLowerCase() === qLow)
            );
          }
          if (candidate && candidate.id) {
            const norm = normalizeLp(candidate, lpId);
            return res.status(200).json({ status: "success", success: true, landingPage: norm, page: norm });
          }
        }
      } catch {}
    }
    return res.status(404).json({ error: "Landing page não encontrada" });
  }

  if (req.method === "PUT" || req.method === "PATCH" || req.method === "POST") {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const rawPage = body?.landingPage || body?.page || body || {};
    const normalized = normalizeLp(rawPage, lpId);

    let synced = false;
    if (gasUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const gasRes = await fetch(gasUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "SAVE_LANDING_PAGE",
            landingPage: normalized,
          }),
          redirect: "follow",
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (gasRes.ok) synced = true;
      } catch {}
    }

    return res.status(200).json({
      status: "success",
      success: true,
      synced,
      landingPage: normalized,
      page: normalized,
    });
  }

  if (req.method === "DELETE") {
    if (gasUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        await fetch(gasUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "DELETE_LANDING_PAGE",
            lpId,
            id: lpId,
          }),
          redirect: "follow",
          signal: controller.signal,
        }).catch(() => {});
        clearTimeout(timeout);
      } catch {}
    }
    return res.status(200).json({ status: "success", success: true, id: lpId });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
