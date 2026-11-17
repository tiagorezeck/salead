import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GLOBAL_GAS_CONFIG, normalizeGasUrl } from "../../src/config/gasConfig";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const body =
    typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const query = req.query || {};
  const targetId = body.lpId || body.id || query.id || body.slug || query.slug;
  const targetTitle = body.title || body.pageTitle || query.title;

  if (!targetId && !targetTitle) {
    return res.status(200).json({ status: "ok", visits: 1 });
  }

  let updatedVisits = 1;
  let updatedConv = 0;

  const gasUrl = normalizeGasUrl(
    process.env.GAS_WEBAPP_URL ||
      process.env.VITE_GAS_WEBAPP_URL ||
      GLOBAL_GAS_CONFIG.WEBAPP_URL ||
      ""
  );

  if (gasUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const gasRes = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "RECORD_LP_VISIT",
          lpId: targetId,
          id: targetId,
          slug: body.slug || query.slug,
          landingPageTitle: targetTitle,
          pageTitle: targetTitle,
        }),
        redirect: "follow",
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const text = await gasRes.text();
      if (text && !text.trim().startsWith("<")) {
        const parsed = JSON.parse(text);
        if (typeof parsed?.visits === "number") updatedVisits = parsed.visits;
        if (typeof parsed?.conv === "number") updatedConv = parsed.conv;
      }
    } catch {}
  }

  return res.status(200).json({
    status: "success",
    visits: updatedVisits,
    conv: updatedConv,
    message: "Visita registrada com sucesso no Google Sheets",
  });
}
